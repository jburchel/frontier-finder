class SpeechService {
    // Stub implementation for Node.js environment
    constructor() {}

    getVoices() {
        return Promise.resolve([]);
    }

    speak(text, options = {}) {
        // In Node.js environment, just log the text
        console.log('Would speak (if in browser):', text);
        return Promise.resolve();
    }
}

export const speechService = new SpeechService();
export default speechService;