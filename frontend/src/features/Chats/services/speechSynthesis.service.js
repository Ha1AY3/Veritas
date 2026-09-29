export function isSpeechSynthesisSupported() {
    return "speechSynthesis" in window;
}

function cleanTextForSpeech(text) {
    if (!text) return "";

    return text
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, " ")
        .replace(/https?:\/\/\S+/gi, " ")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/[→←↔↦⇒⇐⇔]/g, " ")
        .replace(/[*_~`]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function speakText(text, onEnd) {
    if (!text?.trim()) return;

    if (!isSpeechSynthesisSupported()) {
        return;
    }

    window.speechSynthesis.cancel();

    const speechText = cleanTextForSpeech(text);

    if (!speechText) {
        return;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);

    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
        onEnd?.();
    };

    utterance.onerror = () => {
        onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
    if (!isSpeechSynthesisSupported()) {
        return;
    }

    window.speechSynthesis.cancel();
}