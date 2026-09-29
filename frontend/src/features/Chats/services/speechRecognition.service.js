let recognition = null;

let mediaStream = null;
let audioContext = null;
let analyser = null;
let microphoneSource = null;
let animationFrameId = null;

let isListening = false;

export function isSpeechRecognitionSupported() {
    return (
        "SpeechRecognition" in window ||
        "webkitSpeechRecognition" in window
    );
}


async function startAudioAnalyser(onAudioLevel) {

    mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true
    });

    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;

    microphoneSource = audioContext.createMediaStreamSource( mediaStream);

    microphoneSource.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);


    const updateLevel = () => {

        if (!analyser) {
            return;
        }

        analyser.getByteFrequencyData(dataArray);

        let sum = 0;

        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }

        const average = sum / dataArray.length;

        const normalizedLevel = Math.min(average / 80, 1);

        onAudioLevel?.(normalizedLevel);

        animationFrameId = requestAnimationFrame(updateLevel);
    };

    updateLevel();
}

function stopAudioAnalyser() {

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (microphoneSource) {
        microphoneSource.disconnect();
        microphoneSource = null;
    }

    if (analyser) {
        analyser.disconnect();
        analyser = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    if (mediaStream) {

        mediaStream.getTracks().forEach(track => {
            track.stop();
        });

        mediaStream = null;
    }
}

export async function startSpeechRecognition({
    initialText = "",
    onResult,
    onStart,
    onEnd,
    onError,
    onAudioLevel,
    language = "en-IN"
}) {

    if (!isSpeechRecognitionSupported()) {

        onError?.(new Error("Speech recognition is not supported in this browser.")
        );

        return;
    }

    if (isListening) {
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    isListening = true;

    let finalTranscript =
        initialText.trim();


    try {
        await startAudioAnalyser(
            onAudioLevel
        );

        recognition.onstart = () => {
            onStart?.();
        };


        recognition.onresult = (event) => {

            let interimTranscript = "";

            for(let i = event.resultIndex; i < event.results.length; i++){

                const transcript =  event.results[i][0].transcript;

                if(event.results[i].isFinal){

                    finalTranscript += (finalTranscript ? " " : "") + transcript.trim();

                } else {

                    interimTranscript += transcript;
                }
            }

            const combinedText = finalTranscript +
                (
                    interimTranscript ? ` ${interimTranscript}` : ""
                );

            onResult?.(combinedText.trim());
        };


        recognition.onerror = (event) => {

            console.error("Speech recognition error:", event.error);

            if(event.error !== "aborted"){
                onError?.(event);
            }
        };


        recognition.onend = () => {
            isListening = false;
            stopAudioAnalyser();
            onAudioLevel?.(0);
            onEnd?.();
            recognition = null;
        };


        recognition.start();

    } catch (error) {

        console.error("Failed to start speech recognition:",error);
        isListening = false;
        stopAudioAnalyser();
        onAudioLevel?.(0);
        recognition = null;
        onError?.(error);
    }
}

export function stopSpeechRecognition() {

    if (!recognition) {
        stopAudioAnalyser();
        return;
    }

    isListening = false;

    try {
        recognition.stop();
    } catch (error) {
        console.error("Failed to stop recognition:", error);
    }

    stopAudioAnalyser();
}


export function isCurrentlyListening() {
    return isListening;
}