import { CONFIG } from './config.js';
import { DOMHelper } from './DOMHelper.js';
import { UIComponents } from './UIComponents.js';
import { GPUProcessor } from './GPUProcessor.js';

// Event Handlers
export class EventHandlers {
    static setupInputEvents() {
        const inputText = DOMHelper.getElement('input-text');
        
        inputText.addEventListener('input', () => {
            const count = inputText.value.length;
            DOMHelper.updateCharCount(count);
        });
    }

    static setupButtonEvents() {
        // Load example
        DOMHelper.getElement('load-example').addEventListener('click', () => {
            const inputText = DOMHelper.getElement('input-text');
            inputText.value = UIComponents.getExampleText();
            inputText.dispatchEvent(new Event('input'));
        });

        // Clear input
        DOMHelper.getElement('clear-input').addEventListener('click', () => {
            const inputText = DOMHelper.getElement('input-text');
            inputText.value = '';
            inputText.dispatchEvent(new Event('input'));
            
            DOMHelper.getElement('stats-grid').classList.add('hidden');
            DOMHelper.getElement('processing-time').classList.add('hidden');
            DOMHelper.getElement('results-container').innerHTML = UIComponents.getEmptyStateHTML();
        });

        // Process button
        DOMHelper.getElement('process-btn').addEventListener('click', this.handleProcess);
    }

    static async handleProcess() {
        const inputText = DOMHelper.getElement('input-text');
        const processBtn = DOMHelper.getElement('process-btn');
        const processIcon = DOMHelper.getElement('process-icon');
        const processText = DOMHelper.getElement('process-text');
        const resultsContainer = DOMHelper.getElement('results-container');

        const text = inputText.value.trim();
        if (!text) return;

        processBtn.disabled = true;
        processText.textContent = 'İşleniyor...';
        processIcon.classList.add('animate-spin');

        try {
            const result = await GPUProcessor.process(text);

            resultsContainer.innerHTML = UIComponents.getSuccessResultsHTML(result);

            DOMHelper.getElement('stat-chars').textContent = result.inputSize.toLocaleString(CONFIG.LOCALE);
            DOMHelper.getElement('stat-turkish').textContent = result.stats.turkishCharCount.toLocaleString(CONFIG.LOCALE);
            DOMHelper.getElement('time-value').textContent = result.processingTime.toFixed(2);
            
            DOMHelper.getElement('processing-time').classList.remove('hidden');
            DOMHelper.getElement('stats-grid').classList.remove('hidden');

        } catch (error) {
            resultsContainer.innerHTML = UIComponents.getErrorResultsHTML(error);
        } finally {
            processBtn.disabled = false;
            processText.textContent = 'GPU ile İşle';
            processIcon.classList.remove('animate-spin');
        }
    }
}
