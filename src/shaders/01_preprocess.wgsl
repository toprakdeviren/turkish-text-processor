// Statistics structure for tracking character type counts during text preprocessing.
// This structure uses atomic counters to safely accumulate statistics across multiple
// compute shader invocations running in parallel.
//
// Fields:
// - ascii_count: Number of ASCII characters (0-127) encountered
// - turkish_char_count: Number of Turkish-specific characters (ç, ğ, ı, ö, ş, ü, etc.)
// - other_utf8_count: Number of other valid UTF-8 characters
// - invalid_count: Number of invalid or malformed character sequences
// - boundary_count: Number of word/token boundaries detected
struct PreprocessingStats {
    ascii_count: atomic<u32>,
    turkish_char_count: atomic<u32>,
    other_utf8_count: atomic<u32>,
    invalid_count: atomic<u32>,
    boundary_count: atomic<u32>,
}

/// Parameters structure for preprocessing operations.
/// 
/// @member input_len The total length of the input data to be processed
/// @member elements_per_thread The number of elements each thread should handle during processing
struct Params {
    input_len: u32,
    elements_per_thread: u32,
}

/**
 * GPU buffer bindings for UTF-8 text preprocessing compute shader
 * 
 * @group(0) @binding(0) input - Input buffer containing raw UTF-8 bytes stored as u32 array
 * @group(0) @binding(1) codepoints - Output buffer for decoded Unicode codepoints
 * @group(0) @binding(2) boundaries - Output buffer marking character/token boundaries
 * @group(0) @binding(3) seq_ids - Output buffer for sequence identifiers
 * @group(0) @binding(4) validation_flags - Output buffer containing UTF-8 validation status flags
 * @group(0) @binding(5) stats - Read-write buffer for preprocessing statistics and metrics
 * @group(0) @binding(6) params - Uniform buffer containing preprocessing parameters
 */
@group(0) @binding(0) var<storage, read> input: array<u32>; // u8 olarak okunacak
@group(0) @binding(1) var<storage, read_write> codepoints: array<u32>;
@group(0) @binding(2) var<storage, read_write> boundaries: array<u32>;
@group(0) @binding(3) var<storage, read_write> seq_ids: array<u32>;
@group(0) @binding(4) var<storage, read_write> validation_flags: array<u32>;
@group(0) @binding(5) var<storage, read_write> stats: PreprocessingStats;
@group(0) @binding(6) var<uniform> params: Params;

/// Extracts a single byte from the input buffer at the specified byte index.
///
/// This function treats the input buffer as a contiguous array of bytes,
/// where each 32-bit word contains 4 bytes in little-endian format.
///
/// @param idx The byte index to extract from (0-based)
/// @return The byte value at the specified index (0-255)
fn get_byte(idx: u32) -> u32 {
    let word_idx = idx >> 2u;  // Divide by 4 using bit shift (more efficient)
    let byte_offset = idx & 3u;  // Modulo 4 using bitwise AND (more efficient)
    let word = input[word_idx];
    return (word >> (byte_offset << 3u)) & 0xFFu;
}

/**
 * Turkish text preprocessing compute shader that processes UTF-8 encoded input text.
 * 
 * This function performs parallel UTF-8 decoding and Turkish character recognition
 * on input bytes, identifying word boundaries and validating character sequences.
 * Each workgroup processes chunks of the input data concurrently.
 * 
 * Processing includes:
 * - UTF-8 decoding (1-4 byte sequences)
 * - ASCII and UTF-8 character validation
 * - Turkish character detection (ğ, ü, ö, ç, ş, ı and their uppercase variants)
 * - Word boundary detection for punctuation and whitespace
 * - Statistical counting of character types
 * 
 * @param global_id Built-in global invocation ID for compute shader threading
 * 
 * Outputs:
 * - codepoints[]: Decoded Unicode code points
 * - boundaries[]: Word boundary flags (1 = boundary, 0 = not boundary)
 * - seq_ids[]: Sequence identifiers (copy of code points)
 * - validation_flags[]: Character validity flags (1 = valid, 0 = invalid)
 * 
 * Statistics updated atomically:
 * - ascii_count: Count of ASCII characters
 * - turkish_char_count: Count of Turkish-specific characters
 * - other_utf8_count: Count of other valid UTF-8 characters
 * - invalid_count: Count of invalid UTF-8 sequences
 * - boundary_count: Count of word boundaries detected
 * 
 * @workgroup_size(256) Uses 256 threads per workgroup for optimal GPU utilization
 */
@compute @workgroup_size(256)
fn turkish_preprocess(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let tid = global_id.x;
    let start_idx = tid * params.elements_per_thread;
    let end_idx = min(start_idx + params.elements_per_thread, params.input_len);
    
    var i = start_idx;
    while (i < end_idx) {
        let byte = get_byte(i);
        var cp = 0u;
        var boundary = 0u;
        var valid = false;
        var advance = 1u;
        
        if ((byte & 0x80u) == 0u) {
            // ASCII
            cp = byte;
            valid = true;
            boundary = select(0u, 1u,
                (byte <= 32u) ||
                ((byte >= 33u) && (byte <= 47u)) ||
                ((byte >= 58u) && (byte <= 64u)) ||
                ((byte >= 91u) && (byte <= 96u)) ||
                ((byte >= 123u) && (byte <= 126u))
            );
            
            atomicAdd(&stats.ascii_count, 1u);
        }
        else if ((byte & 0xE0u) == 0xC0u) {
            // 2-byte UTF-8
            if (i + 1u < params.input_len && (get_byte(i + 1u) & 0xC0u) == 0x80u) {
                let b0 = byte;
                let b1 = get_byte(i + 1u);
                cp = ((b0 & 0x1Fu) << 6u) | (b1 & 0x3Fu);
                
                if (cp < 0x80u) {
                    cp = 0xFFFDu;
                    valid = false;
                    atomicAdd(&stats.invalid_count, 1u);
                } else {
                    valid = true;
                    boundary = select(0u, 1u, (cp == 0x00A0u) || (cp == 0x3000u));
                    
                    // Türkçe karakterler
                    if (cp == 0x011Fu || cp == 0x00FCu || cp == 0x00F6u || cp == 0x00E7u ||
                        cp == 0x015Fu || cp == 0x0131u || cp == 0x011Eu || cp == 0x00DCu ||
                        cp == 0x00D6u || cp == 0x00C7u || cp == 0x015Eu || cp == 0x0130u) {
                        atomicAdd(&stats.turkish_char_count, 1u);
                    } else {
                        atomicAdd(&stats.other_utf8_count, 1u);
                    }
                }
                advance = 2u;
            } else {
                cp = 0xFFFDu;
                valid = false;
                atomicAdd(&stats.invalid_count, 1u);
                advance = 1u;
            }
        }
        else if ((byte & 0xF0u) == 0xE0u) {
            // 3-byte UTF-8
            if (i + 2u < params.input_len &&
                (get_byte(i + 1u) & 0xC0u) == 0x80u &&
                (get_byte(i + 2u) & 0xC0u) == 0x80u) {
                let b0 = byte;
                let b1 = get_byte(i + 1u);
                let b2 = get_byte(i + 2u);
                cp = ((b0 & 0x0Fu) << 12u) | ((b1 & 0x3Fu) << 6u) | (b2 & 0x3Fu);
                
                if (cp < 0x800u || (cp >= 0xD800u && cp <= 0xDFFFu)) {
                    cp = 0xFFFDu;
                    valid = false;
                    atomicAdd(&stats.invalid_count, 1u);
                } else {
                    valid = true;
                    boundary = select(0u, 1u,
                        (cp >= 0x2000u && cp <= 0x200Au) ||
                        (cp == 0x200Bu) ||
                        (cp == 0x200Cu) ||
                        (cp == 0x200Du) ||
                        (cp == 0x2060u) ||
                        (cp == 0x3000u)
                    );
                    atomicAdd(&stats.other_utf8_count, 1u);
                }
                advance = 3u;
            } else {
                cp = 0xFFFDu;
                valid = false;
                atomicAdd(&stats.invalid_count, 1u);
                advance = 1u;
            }
        }
        else if ((byte & 0xF8u) == 0xF0u) {
            // 4-byte UTF-8
            if (i + 3u < params.input_len &&
                (get_byte(i + 1u) & 0xC0u) == 0x80u &&
                (get_byte(i + 2u) & 0xC0u) == 0x80u &&
                (get_byte(i + 3u) & 0xC0u) == 0x80u) {
                let b0 = byte;
                let b1 = get_byte(i + 1u);
                let b2 = get_byte(i + 2u);
                let b3 = get_byte(i + 3u);
                cp = ((b0 & 0x07u) << 18u) | ((b1 & 0x3Fu) << 12u) | 
                     ((b2 & 0x3Fu) << 6u) | (b3 & 0x3Fu);
                
                if (cp < 0x10000u || cp > 0x10FFFFu) {
                    cp = 0xFFFDu;
                    valid = false;
                    atomicAdd(&stats.invalid_count, 1u);
                } else {
                    valid = true;
                    boundary = 0u;
                    atomicAdd(&stats.other_utf8_count, 1u);
                }
                advance = 4u;
            } else {
                cp = 0xFFFDu;
                valid = false;
                atomicAdd(&stats.invalid_count, 1u);
                advance = 1u;
            }
        }
        else if ((byte & 0xC0u) == 0x80u) {
            // Devam baytı
            cp = 0u;
            valid = false;
            advance = 1u;
        }
        else {
            // Geçersiz başlangıç
            cp = 0xFFFDu;
            valid = false;
            atomicAdd(&stats.invalid_count, 1u);
            advance = 1u;
        }
        
        if (boundary == 1u) {
            atomicAdd(&stats.boundary_count, 1u);
        }
        
        codepoints[i] = cp;
        boundaries[i] = boundary;
        seq_ids[i] = cp;
        validation_flags[i] = select(0u, 1u, valid);
        
        if (advance > 1u) {
            let limit = min(end_idx, i + advance);
            var j = i + 1u;
            while (j < limit) {
                codepoints[j] = 0u;
                boundaries[j] = 0u;
                seq_ids[j] = 0u;
                validation_flags[j] = 0u;
                j = j + 1u;
            }
            i = i + (advance - 1u);
        }
        
        i = i + 1u;
    }
}