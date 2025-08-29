// DOM Helper Class
export class DOMHelper {
    static getElement(id) {
        return document.getElementById(id);
    }

    static updateCharCount(count) {
        const charCount = this.getElement('char-count');
        charCount.textContent = `${count.toLocaleString('tr-TR')} karakter`;
    }

    static updateWebGPUStatus(isAvailable, message) {
        const webgpuStatus = this.getElement('webgpu-status');
        const statusText = webgpuStatus.querySelector('span');
        const statusDot = webgpuStatus.querySelector('div');

        const statusConfig = this.getStatusConfig(isAvailable, message);
        
        statusDot.className = statusConfig.dotClass;
        statusText.textContent = statusConfig.text;
        statusText.className = statusConfig.textClass;
        webgpuStatus.className = statusConfig.containerClass;
    }

    static getStatusConfig(isAvailable, message) {
        if (isAvailable) {
            return {
                dotClass: 'w-2 h-2 rounded-full bg-green-500',
                text: 'WebGPU hazır',
                textClass: 'text-xs font-medium text-green-600',
                containerClass: 'flex items-center space-x-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200'
            };
        }

        const isError = message.includes('desteklenmiyor') || message.includes('hatası');
        const color = isError ? 'red' : 'yellow';
        
        return {
            dotClass: `w-2 h-2 rounded-full bg-${color}-500`,
            text: message,
            textClass: `text-xs font-medium text-${color}-600`,
            containerClass: `flex items-center space-x-2 px-3 py-1.5 rounded-full bg-${color}-50 border border-${color}-200`
        };
    }
}
