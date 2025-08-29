import { CONFIG } from './config.js';

// UI Components
export class UIComponents {
    static getExampleText() {
        return `Merhaba dünya! Bu bir Türkçe metin örneğidir.
İçinde şu Türkçe karakterler var: ç, ğ, ı, ö, ş, ü, Ç, Ğ, İ, Ö, Ş, Ü.
ASCII karakterler: Hello World! 123 @#$%
Özel UTF-8 karakterler: 🚀 🌟 💻 🎯

Bu metin GPU üzerinde işlenecek ve çeşitli ön işleme adımlarından geçecektir.
Türkçe karakterlerin doğru şekilde tanınması ve işlenmesi test edilmektedir. 
WebGPU'nun gücüyle metin analizi hiç bu kadar hızlı olmamıştı!`;
    }

    static getEmptyStateHTML() {
        return `
            <div class="flex flex-col items-center justify-center h-full text-center">
                <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                </div>
                <h3 class="text-base font-medium text-gray-900 mb-2">İşlemeye Hazır</h3>
                <p class="text-sm text-gray-500 max-w-xs">Metninizi girin ve GPU ile işleyin. Sonuçlar burada görüntülenecektir.</p>
            </div>`;
    }

    static getSuccessResultsHTML(result) {
        return `
            <div class="space-y-6 animate-fade-in">
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">İşleme Süresi</p>
                        <p class="text-2xl font-bold text-gray-900">${result.processingTime.toFixed(2)}<span class="text-sm font-normal text-gray-500 ml-1">ms</span></p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Throughput</p>
                        <p class="text-2xl font-bold text-gray-900">${result.throughput.toFixed(1)}<span class="text-sm font-normal text-gray-500 ml-1">MB/s</span></p>
                    </div>
                </div>

                <div>
                    <h3 class="text-sm font-semibold text-gray-900 mb-3">Karakter Analizi</h3>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between py-2 border-b border-gray-100">
                            <span class="text-sm text-gray-600">ASCII Karakterler</span>
                            <span class="text-sm font-semibold text-gray-900">${result.stats.asciiCount.toLocaleString(CONFIG.LOCALE)}</span>
                        </div>
                        <div class="flex items-center justify-between py-2 border-b border-gray-100">
                            <span class="text-sm text-gray-600">Türkçe Karakterler</span>
                            <span class="text-sm font-semibold text-green-600">${result.stats.turkishCharCount.toLocaleString(CONFIG.LOCALE)}</span>
                        </div>
                        <div class="flex items-center justify-between py-2 border-b border-gray-100">
                            <span class="text-sm text-gray-600">Diğer UTF-8</span>
                            <span class="text-sm font-semibold text-gray-900">${result.stats.otherUtf8Count.toLocaleString(CONFIG.LOCALE)}</span>
                        </div>
                        <div class="flex items-center justify-between py-2 border-b border-gray-100">
                            <span class="text-sm text-gray-600">Geçersiz Baytlar</span>
                            <span class="text-sm font-semibold ${result.stats.invalidCount > 0 ? 'text-red-600' : 'text-gray-900'}">${result.stats.invalidCount.toLocaleString(CONFIG.LOCALE)}</span>
                        </div>
                        <div class="flex items-center justify-between py-2">
                            <span class="text-sm text-gray-600">Kelime Sınırları</span>
                            <span class="text-sm font-semibold text-gray-900">${result.stats.boundaryCount.toLocaleString(CONFIG.LOCALE)}</span>
                        </div>
                    </div>
                </div>

                <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div class="flex items-center">
                        <svg class="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        <p class="text-sm text-green-800">Metin başarıyla GPU üzerinde işlendi.</p>
                    </div>
                </div>
            </div>`;
    }

    static getErrorResultsHTML(error) {
        return `
            <div class="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div class="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
                <h3 class="text-base font-medium text-red-900 mb-2">İşleme Başarısız</h3>
                <p class="text-sm text-red-600 max-w-xs">${error.message}</p>
            </div>`;
    }
}
