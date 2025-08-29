import { DOMHelper } from './DOMHelper.js';
import { appState } from './AppState.js';

// WebGPU Helper Class
export class WebGPUHelper {
    static async checkSupport() {
        try {
            if (!navigator.gpu) {
                DOMHelper.updateWebGPUStatus(false, 'WebGPU desteklenmiyor');
                return false;
            }
            
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                DOMHelper.updateWebGPUStatus(false, 'GPU adaptörü bulunamadı');
                return false;
            }
            
            DOMHelper.updateWebGPUStatus(true);
            DOMHelper.getElement('process-btn').disabled = false;
            return true;
        } catch (error) {
            DOMHelper.updateWebGPUStatus(false, 'WebGPU hatası');
            return false;
        }
    }

    static async getDevice() {
        if (appState.getDevice()) return appState.getDevice();
        
        if (!navigator.gpu) throw new Error('WebGPU desteklenmiyor.');
        
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error('WebGPU adapter bulunamadı.');
        
        const device = await adapter.requestDevice();
        appState.setDevice(device);
        return device;
    }
}
