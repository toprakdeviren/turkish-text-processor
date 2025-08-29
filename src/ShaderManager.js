import { DOMHelper } from './DOMHelper.js';
import { appState } from './AppState.js';

// Shader Management
export class ShaderManager {
    static async loadShaderCode() {
        try {
            const response = await fetch('src/shaders/01_preprocess.wgsl');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const shaderCode = await response.text();
            appState.setShaderCode(shaderCode);
            console.log('✅ WGSL shader kodu başarıyla yüklendi.');
        } catch (error) {
            console.error('❌ WGSL dosyası yüklenemedi:', error);
            throw new Error('İşlem için gerekli olan "src/shaders/01_preprocess.wgsl" dosyası yüklenemedi.');
        }
    }

    static async checkStatus() {
        try {
            await this.loadShaderCode();
        } catch (error) {
            this.handleShaderError(error);
        }
    }

    static handleShaderError(error) {
        DOMHelper.getElement('process-btn').disabled = true;
        DOMHelper.getElement('process-text').textContent = 'WGSL Hatası';
        
        const resultsContainer = DOMHelper.getElement('results-container');
        resultsContainer.innerHTML = this.getErrorHTML(error.message);
    }

    static getErrorHTML(message) {
        return `
            <div class="flex flex-col items-center justify-center h-full text-center">
                <div class="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
                <h3 class="text-base font-medium text-red-900 mb-2">Shader Yüklenemedi</h3>
                <p class="text-sm text-red-600 max-w-xs">${message}</p>
            </div>`;
    }
}
