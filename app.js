// SharkTuner v1.0 Core Logic
console.log("SharkTuner v1.0 - Orange Edition Online");

// 1. Tab Switching Logic
const tabBtns = document.querySelectorAll('.tab-btn');
const views = document.querySelectorAll('.view');

tabBtns.forEach(btn => {
    btn.onclick = () => {
        const targetView = btn.dataset.view;

        // Update Buttons
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update Views
        views.forEach(v => {
            v.classList.remove('active');
            if (v.id === `view-${targetView}`) {
                v.classList.add('active');
            }
        });
    };
});

// 2. Tuner Variables
let audioContext;
let analyser;
let micStream;
let pitchDetector;
const noteDisplay = document.getElementById('target-note');
const centsDisplay = document.getElementById('cents-offset');
const needle = document.getElementById('needle');
const startBtn = document.getElementById('btn-start-tuner');
const debugLog = document.getElementById('debug-log');

function log(msg) {
    console.log(msg);
    if (debugLog) debugLog.innerHTML += `> ${msg}<br>`;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// 3. Start Tuner
startBtn.onclick = async () => {
    try {
        log("Inicijalizacija...");

        // Essential for Mobile: AudioContext MUST be created/resumed inside a click event
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            log("Audio sustav kreiran.");
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
            log("Audio sustav probuđen.");
        }

        // If already listening, this button acts as a reset
        if (micStream) {
            log("Resetiranje...");
            location.reload();
            return;
        }

        startBtn.textContent = "TRAŽIM DOZVOLU...";
        log("Tražim mikrofon...");

        // Request microphone access
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        log("Mikrofon odobren.");

        startBtn.textContent = "SLUŠAM...";
        startBtn.style.opacity = "0.5";
        const source = audioContext.createMediaStreamSource(micStream);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        log("Analizator povezan.");

        // Wait for window.pitchy if not ready
        if (!window.pitchy) {
            log("Čekam Pitchy biblioteku...");
            let waitCount = 0;
            while (!window.pitchy && waitCount < 50) {
                await new Promise(r => setTimeout(r, 100));
                waitCount++;
            }
        }

        if (!window.pitchy) {
            throw new Error("Biblioteka 'Pitchy' nije učitana!");
        }

        log("Pitchy spreman. Analiza započela.");
        const PitchDetector = window.pitchy.PitchDetector;
        pitchDetector = PitchDetector.forFloat32Array(analyser.fftSize);
        const inputBuffer = new Float32Array(pitchDetector.inputLength);

        updateTuner(inputBuffer);

    } catch (err) {
        log("POGREŠKA: " + err.name);
        console.error("Mic Access Error:", err);
        startBtn.textContent = "GREŠKA: " + err.name;
        startBtn.style.background = "#e74c3c";
        startBtn.style.opacity = "1";

        let msg = "Problem s mikrofonom.";
        if (err.name === 'NotAllowedError') msg = "Pritisnuo si 'Zabrani'. Osvježi i klikni 'Dopusti'.";
        if (err.name === 'NotFoundError') msg = "Mobitel ne vidi nijedan mikrofon.";
        if (err.name === 'NotReadableError') msg = "Mikrofon već koristi druga aplikacija (npr. poziv).";
        if (err.name === 'OverconstrainedError') msg = "Postavke mikrofona nisu podržane na ovom uređaju.";

        alert(msg + " (" + err.name + ")");
    }
};

function updateTuner(inputBuffer) {
    if (!audioContext) return;

    analyser.getFloatTimeDomainData(inputBuffer);
    const [pitch, clarity] = pitchDetector.findPitch(inputBuffer, audioContext.sampleRate);

    if (clarity > 0.8 && pitch > 0) {
        const noteData = getNoteFromFreq(pitch);

        // UI Updates
        noteDisplay.textContent = noteData.name;
        centsDisplay.textContent = noteData.cents > 0 ? `+${noteData.cents.toFixed(1)}` : noteData.cents.toFixed(1);

        // Rotate Needle (Mapping -50 to +50 cents to -45 to +45 degrees)
        const rotation = Math.max(-50, Math.min(50, noteData.cents)) * 0.9;
        needle.style.transform = `translateX(-50%) rotate(${rotation}deg)`;

        // Visual Feedback
        if (Math.abs(noteData.cents) < 5) {
            noteDisplay.style.color = "#2ecc71"; // Success Green
            noteDisplay.style.textShadow = "0 0 30px rgba(46, 204, 113, 0.6)";
        } else {
            noteDisplay.style.color = "var(--accent)";
            noteDisplay.style.textShadow = "0 0 30px var(--accent-glow)";
        }
    }

    requestAnimationFrame(() => updateTuner(inputBuffer));
}

function getNoteFromFreq(freq) {
    const semitones = 12 * (Math.log2(freq / 440));
    const noteNum = Math.round(semitones) + 69;
    const name = NOTE_NAMES[noteNum % 12];
    const cents = (semitones - Math.round(semitones)) * 100;
    return { name, cents };
}
