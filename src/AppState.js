// State Management
export class AppState {
    constructor() {
        this.shaderCode = '';
        this.device = null;
    }

    setShaderCode(code) {
        this.shaderCode = code;
    }

    setDevice(device) {
        this.device = device;
    }

    getDevice() {
        return this.device;
    }

    getShaderCode() {
        return this.shaderCode;
    }
}

export const appState = new AppState();
