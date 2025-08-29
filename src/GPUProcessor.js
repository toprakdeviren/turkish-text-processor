import { CONFIG } from './config.js';
import { appState } from './AppState.js';
import { WebGPUHelper } from './WebGPUHelper.js';

// GPU Processing Class
export class GPUProcessor {
    static async process(text) {
        const shaderCode = appState.getShaderCode();
        if (!shaderCode) throw new Error('WGSL shader kodu henüz yüklenmedi.');
        
        return await this.initializeWebGPU(text);
    }

    static async initializeWebGPU(text) {
        const device = await WebGPUHelper.getDevice();
        
        const inputData = new TextEncoder().encode(text);
        const inputSize = inputData.byteLength;
        if (inputSize === 0) throw new Error("Giriş metni boş olamaz.");

        const numThreads = Math.ceil(inputSize / CONFIG.ELEMENTS_PER_THREAD);
        const shaderModule = device.createShaderModule({ code: appState.getShaderCode() });

        const buffers = this.setupBuffers(device, inputData, inputSize);
        const pipeline = this.setupComputePipeline(device, shaderModule);
        const bindGroup = this.setupBindGroup(device, pipeline, buffers);

        return await this.executeCompute(device, pipeline, bindGroup, buffers, numThreads, inputSize);
    }

    static setupBuffers(device, inputData, inputSize) {
        const inputBuffer = device.createBuffer({
            size: Math.max(CONFIG.MIN_BUFFER_SIZE, Math.ceil(inputSize / 4) * 4),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint8Array(inputBuffer.getMappedRange()).set(inputData);
        inputBuffer.unmap();

        const bufferSize = Math.max(CONFIG.MIN_BUFFER_SIZE, inputSize * 4);
        const codepointsBuffer = device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.STORAGE });
        const boundariesBuffer = device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.STORAGE });
        const seqIdsBuffer = device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.STORAGE });
        const validationFlagsBuffer = device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.STORAGE });

        const statsBuffer = device.createBuffer({
            size: CONFIG.STATS_BUFFER_SIZE,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        });

        const paramsBuffer = device.createBuffer({
            size: CONFIG.PARAMS_BUFFER_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([inputSize, CONFIG.ELEMENTS_PER_THREAD]));
        device.queue.writeBuffer(statsBuffer, 0, new Uint32Array(5).fill(0));

        return {
            inputBuffer,
            codepointsBuffer,
            boundariesBuffer,
            seqIdsBuffer,
            validationFlagsBuffer,
            statsBuffer,
            paramsBuffer
        };
    }

    static setupComputePipeline(device, shaderModule) {
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
            ]
        });
        
        return device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            compute: { module: shaderModule, entryPoint: 'turkish_preprocess' }
        });
    }

    static setupBindGroup(device, pipeline, buffers) {
        return device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: buffers.inputBuffer } },
                { binding: 1, resource: { buffer: buffers.codepointsBuffer } },
                { binding: 2, resource: { buffer: buffers.boundariesBuffer } },
                { binding: 3, resource: { buffer: buffers.seqIdsBuffer } },
                { binding: 4, resource: { buffer: buffers.validationFlagsBuffer } },
                { binding: 5, resource: { buffer: buffers.statsBuffer } },
                { binding: 6, resource: { buffer: buffers.paramsBuffer } }
            ]
        });
    }

    static async executeCompute(device, pipeline, bindGroup, buffers, numThreads, inputSize) {
        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(numThreads / CONFIG.WORKGROUP_SIZE));
        passEncoder.end();

        const t0 = performance.now();
        device.queue.submit([commandEncoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        const t1 = performance.now();

        const stats = await this.readStats(device, buffers.statsBuffer);
        const processingTime = t1 - t0;
        const throughput = (inputSize / (processingTime / 1000)) / (1024 * 1024);

        return {
            stats: {
                asciiCount: stats[0],
                turkishCharCount: stats[1],
                otherUtf8Count: stats[2],
                invalidCount: stats[3],
                boundaryCount: stats[4]
            },
            processingTime,
            inputSize,
            throughput
        };
    }

    static async readStats(device, statsBuffer) {
        const statsReadBuffer = device.createBuffer({
            size: CONFIG.STATS_BUFFER_SIZE,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        
        const copyEncoder = device.createCommandEncoder();
        copyEncoder.copyBufferToBuffer(statsBuffer, 0, statsReadBuffer, 0, CONFIG.STATS_BUFFER_SIZE);
        device.queue.submit([copyEncoder.finish()]);

        await statsReadBuffer.mapAsync(GPUMapMode.READ);
        const statsArray = new Uint32Array(statsReadBuffer.getMappedRange().slice(0));
        statsReadBuffer.unmap();
        
        return statsArray;
    }
}
