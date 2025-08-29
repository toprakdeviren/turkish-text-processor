import { EventHandlers } from './EventHandlers.js';
import { WebGPUHelper } from './WebGPUHelper.js';
import { ShaderManager } from './ShaderManager.js';
import { UIComponents } from './UIComponents.js';
import { DOMHelper } from './DOMHelper.js';

// Application Initialization
export class Application {
    static async initialize() {
        EventHandlers.setupInputEvents();
        EventHandlers.setupButtonEvents();
        
        await WebGPUHelper.checkSupport();
        await ShaderManager.checkStatus();
        
        // Set initial empty state
        DOMHelper.getElement('results-container').innerHTML = UIComponents.getEmptyStateHTML();
    }
}
