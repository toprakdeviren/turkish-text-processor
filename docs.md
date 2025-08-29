# 📚 Türkçe Metin İşleyici - Teknik Dokümantasyon

## 🎯 Genel Bakış

Bu proje, modern web teknolojileri kullanarak Türkçe metin işleme ve normalizasyon işlemlerini GPU üzerinde paralel olarak gerçekleştiren gelişmiş bir araçtır. WebGPU API ve WGSL compute shader'ları kullanılarak yüksek performanslı metin analizi sağlanır.

## Proje yapısı

```
src/
├── shaders/          # WGSL shader dosyaları
├── config.js         # Yapılandırma sabitleri
├── AppState.js       # Uygulama durumu yönetimi
├── DOMHelper.js      # DOM manipülasyonu
├── WebGPUHelper.js   # WebGPU API wrapper
├── ShaderManager.js  # Shader yükleme ve yönetimi
├── GPUProcessor.js   # GPU işlem sınıfı
├── UIComponents.js   # UI bileşenleri
├── EventHandlers.js  # Event işleyicileri
├── Application.js    # Ana uygulama sınıfı
└── main.js           # Uygulama giriş noktası
```

## Teknik Detaylar

### 1. WebGPU Başlatma Süreci

#### WebGPU Desteği Kontrolü
```javascript
async checkSupport() {
    if (!navigator.gpu) {
        // WebGPU desteklenmiyor
        return false;
    }
    
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        // GPU adaptörü bulunamadı
        return false;
    }
    
    return true;
}
```

#### Cihaz Oluşturma
```javascript
async getDevice() {
    const device = await adapter.requestDevice();
    return device;
}
```

### 2. Shader Yönetimi

#### WGSL Shader Yükleme
```javascript
async loadShaderCode() {
    const response = await fetch('src/shaders/01_preprocess.wgsl');
    const shaderCode = await response.text();
    return shaderCode;
}
```

#### Shader Modülü Oluşturma
```javascript
const shaderModule = device.createShaderModule({ 
    code: shaderCode 
});
```

### 3. Buffer Yönetimi

#### Giriş Buffer'ı
```javascript
const inputBuffer = device.createBuffer({
    size: Math.max(MIN_BUFFER_SIZE, Math.ceil(inputSize / 4) * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
});
```

#### Çıkış Buffer'ları
- **codepoints**: Unicode kod noktaları
- **boundaries**: Kelime sınırları
- **seq_ids**: Sıra numaraları
- **validation_flags**: Doğrulama bayrakları
- **stats**: İstatistikler

### 4. Compute Pipeline

#### Pipeline Yapılandırması
```javascript
const pipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ 
        bindGroupLayouts: [bindGroupLayout] 
    }),
    compute: { 
        module: shaderModule, 
        entryPoint: 'turkish_preprocess' 
    }
});
```

#### Workgroup Yapılandırması
- **Workgroup Boyutu**: 256 thread
- **Element Sayısı**: Thread başına 8 byte
- **Paralelleştirme**: Otomatik workgroup dağıtımı

## 🎯 WGSL Shader Analizi

### 1. Veri Yapıları

#### İstatistik Yapısı
```wgsl
struct PreprocessingStats {
    ascii_count: atomic<u32>,      // ASCII karakter sayısı
    turkish_char_count: atomic<u32>, // Türkçe karakter sayısı
    other_utf8_count: atomic<u32>, // Diğer UTF-8 karakterler
    invalid_count: atomic<u32>,    // Geçersiz bayt sayısı
    boundary_count: atomic<u32>,   // Kelime sınırı sayısı
}
```

#### Parametre Yapısı
```wgsl
struct Params {
    input_len: u32,              // Giriş uzunluğu
    elements_per_thread: u32,    // Thread başına element
}
```

### 2. Buffer Binding'leri

```wgsl
@group(0) @binding(0) var<storage, read> input: array<u32>;
@group(0) @binding(1) var<storage, read_write> codepoints: array<u32>;
@group(0) @binding(2) var<storage, read_write> boundaries: array<u32>;
@group(0) @binding(3) var<storage, read_write> seq_ids: array<u32>;
@group(0) @binding(4) var<storage, read_write> validation_flags: array<u32>;
@group(0) @binding(5) var<storage, read_write> stats: PreprocessingStats;
@group(0) @binding(6) var<uniform> params: Params;
```

### 3. UTF-8 Decoding Algoritması

#### Byte Okuma Fonksiyonu
```wgsl
fn get_byte(idx: u32) -> u32 {
    let word_idx = idx >> 2u;
    let byte_offset = idx & 3u;
    let word = input[word_idx];
    return (word >> (byte_offset << 3u)) & 0xFFu;
}
```

#### Karakter Türü Tespiti

**ASCII Karakterler (1 byte)**
```wgsl
if ((byte & 0x80u) == 0u) {
    // ASCII karakter işleme
    cp = byte;
    valid = true;
    boundary = // sınır kontrolü
}
```

**2-Byte UTF-8**
```wgsl
else if ((byte & 0xE0u) == 0xC0u) {
    // 2-byte UTF-8 karakter işleme
    let b0 = byte;
    let b1 = get_byte(i + 1u);
    cp = ((b0 & 0x1Fu) << 6u) | (b1 & 0x3Fu);
}
```

**3-Byte UTF-8**
```wgsl
else if ((byte & 0xF0u) == 0xE0u) {
    // 3-byte UTF-8 karakter işleme
    let b0 = byte;
    let b1 = get_byte(i + 1u);
    let b2 = get_byte(i + 2u);
    cp = ((b0 & 0x0Fu) << 12u) | ((b1 & 0x3Fu) << 6u) | (b2 & 0x3Fu);
}
```

### 4. Türkçe Karakter Tespiti

#### Türkçe Unicode Kod Noktaları
```wgsl
// Küçük harfler: ç, ğ, ı, ö, ş, ü
if (cp == 0x00E7u || // ç
    cp == 0x011Fu || // ğ
    cp == 0x0131u || // ı
    cp == 0x00F6u || // ö
    cp == 0x015Fu || // ş
    cp == 0x00FCu) { // ü
    atomicAdd(&stats.turkish_char_count, 1u);
}
// Büyük harfler: Ç, Ğ, İ, Ö, Ş, Ü
else if (cp == 0x00C7u || // Ç
         cp == 0x011Eu || // Ğ
         cp == 0x0130u || // İ
         cp == 0x00D6u || // Ö
         cp == 0x015Eu || // Ş
         cp == 0x00DCu) { // Ü
    atomicAdd(&stats.turkish_char_count, 1u);
}
```

## Optimizasyonlar

### 1. Paralelleştirme
- **Workgroup Paralelleştirme**: 256 thread'lik workgroup'lar
- **SIMD İşlemler**: Vectorized byte işleme
- **Memory Coalescing**: Optimal bellek erişimi

### 2. Bellek Yönetimi
- **Buffer Alignment**: 4-byte hizalama
- **Minimal Allocation**: Gereksiz bellek kullanımını önleme
- **Atomic Operations**: Thread-safe istatistik toplama

### 3. Compute
- **Early Exit**: Geçersiz karakter tespitinde erken çıkış
- **Branch Optimization**: Koşullu işlemlerin optimize edilmesi
- **Memory Access Patterns**: Öngörülebilir bellek erişimi

## Lifecycle

### 1. Başlatma
1. **WebGPU Desteği Kontrolü**: Tarayıcı uyumluluğu
2. **Cihaz Oluşturma**: GPU adaptörü seçimi
3. **Shader Yükleme**: WGSL dosyasının okunması
4. **Buffer Hazırlama**: Giriş/çıkış buffer'larının oluşturulması

### 2. İşleme
1. **Veri Hazırlama**: Metin verisinin buffer'a kopyalanması
2. **Pipeline Kurulumu**: Compute pipeline'ının yapılandırılması
3. **Dispatch**: Workgroup'ların çalıştırılması
4. **Asenkron Bekleme**: GPU işleminin tamamlanması

### 3. Sonuç Toplama
1. **İstatistik Okuma**: Atomic counter'ların okunması
2. **Performans Hesaplama**: İşlem süresi ve throughput
3. **UI Güncelleme**: Sonuçların kullanıcı arayüzünde gösterilmesi

## Hata Yönetimi

### 1. WebGPU Hataları
- **Destek Kontrolü**: WebGPU API varlığı
- **Adaptör Bulunamama**: GPU uyumluluğu
- **Cihaz Oluşturma Hatası**: Bellek yetersizliği

### 2. Shader Hataları
- **Dosya Bulunamama**: WGSL dosyası yüklenememesi
- **Syntax Hatası**: WGSL kod hataları
- **Compilation Hatası**: Shader derleme başarısızlığı

### 3. İşleme Hataları
- **Bellek Taşması**: Buffer boyutu yetersizliği
- **Geçersiz Veri**: Bozuk UTF-8 sekansları
- **Timeout**: Uzun süren işlemler