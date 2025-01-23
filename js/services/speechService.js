class SpeechService {
    constructor() {
        this.synth = window.speechSynthesis;
    }

    // Get available voices
    getVoices() {
        return new Promise((resolve) => {
            let voices = this.synth.getVoices();
            if (voices.length) {
                resolve(voices);
            } else {
                // Chrome loads voices asynchronously
                speechSynthesis.onvoiceschanged = () => {
                    voices = this.synth.getVoices();
                    resolve(voices);
                };
            }
        });
    }

    // Speak text
    speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.synth) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            // Cancel any ongoing speech
            this.synth.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            
            // Configure options
            if (options.voice) utterance.voice = options.voice;
            if (options.rate) utterance.rate = options.rate;
            if (options.pitch) utterance.pitch = options.pitch;
            if (options.volume) utterance.volume = options.volume;

            utterance.onend = () => resolve();
            utterance.onerror = (error) => reject(error);

            this.synth.speak(utterance);
        });
    }
}

export const speechService = new SpeechService();
export default speechService; 