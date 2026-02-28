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

// --- V2.0 LIBRARIES: CHORDS & SCALES ---

const GUITAR_CHORDS = {
    "C": {
        "major": { name: "C Dur", notes: "C E G", positions: [{ s: 5, f: 3, r: true }, { s: 4, f: 2 }, { s: 2, f: 1 }] },
        "minor": { name: "C Mol", notes: "C Eb G", positions: [{ s: 5, f: 3, r: true }, { s: 4, f: 5 }, { s: 3, f: 5 }, { s: 2, f: 4 }] },
        "7": { name: "C7", notes: "C E G Bb", positions: [{ s: 5, f: 3, r: true }, { s: 4, f: 2 }, { s: 3, f: 3 }, { s: 2, f: 1 }] }
    },
    "D": {
        "major": { name: "D Dur", notes: "D F# A", positions: [{ s: 4, f: 0, r: true }, { s: 3, f: 2 }, { s: 2, f: 3 }, { s: 1, f: 2 }] },
        "minor": { name: "D Mol", notes: "D F A", positions: [{ s: 4, f: 0, r: true }, { s: 3, f: 2 }, { s: 2, f: 3 }, { s: 1, f: 1 }] }
    },
    "E": {
        "major": { name: "E Dur", notes: "E G# B", positions: [{ s: 6, f: 0, r: true }, { s: 5, f: 2 }, { s: 4, f: 2 }, { s: 3, f: 1 }] },
        "minor": { name: "E Mol", notes: "E G B", positions: [{ s: 6, f: 0, r: true }, { s: 5, f: 2 }, { s: 4, f: 2 }] }
    },
    "G": {
        "major": { name: "G Dur", notes: "G B D", positions: [{ s: 6, f: 3, r: true }, { s: 5, f: 2 }, { s: 1, f: 3 }] }
    },
    "A": {
        "major": { name: "A Dur", notes: "A C# E", positions: [{ s: 5, f: 0, r: true }, { s: 4, f: 2 }, { s: 3, f: 2 }, { s: 2, f: 2 }] },
        "minor": { name: "A Mol", notes: "A C E", positions: [{ s: 5, f: 0, r: true }, { s: 4, f: 2 }, { s: 3, f: 2 }, { s: 2, f: 1 }] }
    }
};

const chordRoot = document.getElementById('chord-root');
const chordType = document.getElementById('chord-type');
const chordFretboard = document.getElementById('chord-fretboard');

// --- SCALES DATABASE ---
const GUITAR_SCALES = {
    "C": {
        "major_penta": [{ s: 5, f: 3, r: true }, { s: 5, f: 5 }, { s: 4, f: 2 }, { s: 4, f: 5 }, { s: 3, f: 2 }, { s: 3, f: 5 }, { s: 2, f: 3 }, { s: 2, f: 5 }, { s: 1, f: 3 }, { s: 1, f: 5 }]
    },
    "G": {
        "major_penta": [{ s: 6, f: 3, r: true }, { s: 6, f: 5 }, { s: 5, f: 2 }, { s: 5, f: 5 }, { s: 4, f: 2 }, { s: 4, f: 5 }, { s: 3, f: 2 }, { s: 3, f: 4 }, { s: 2, f: 3 }, { s: 2, f: 5 }, { s: 1, f: 3 }, { s: 1, f: 5 }]
    },
    "A": {
        "minor_penta": [{ s: 6, f: 5, r: true }, { s: 6, f: 8 }, { s: 5, f: 5 }, { s: 5, f: 7 }, { s: 4, f: 5 }, { s: 4, f: 7 }, { s: 3, f: 5 }, { s: 3, f: 7 }, { s: 2, f: 5 }, { s: 2, f: 8 }, { s: 1, f: 5 }, { s: 1, f: 8 }]
    }
};

const scaleRoot = document.getElementById('scale-root');
const scaleType = document.getElementById('scale-type');
const scaleFretboard = document.getElementById('scale-fretboard');

function initLibraries() {
    [chordRoot, chordType].forEach(el => el.onchange = renderSelectedChord);
    [scaleRoot, scaleType].forEach(el => el.onchange = renderSelectedScale);
    renderSelectedChord();
    renderSelectedScale();
}

function renderSelectedScale() {
    const root = scaleRoot.value;
    const type = scaleType.value;
    const positions = (GUITAR_SCALES[root] && GUITAR_SCALES[root][type]) || [];
    drawFretboard(scaleFretboard, positions);
}

function renderSelectedChord() {
    const root = chordRoot.value;
    const type = chordType.value;
    const data = (GUITAR_CHORDS[root] && GUITAR_CHORDS[root][type]) || { name: `${root} ${type}`, notes: "-", positions: [] };

    document.getElementById('chord-name').textContent = data.name;
    document.getElementById('chord-notes').textContent = data.notes;
    drawFretboard(chordFretboard, data.positions);
}

function drawFretboard(container, positions) {
    container.innerHTML = "";
    // Create 12 frets
    for (let i = 0; i < 13; i++) {
        const fret = document.createElement('div');
        fret.className = 'fret';
        container.appendChild(fret);
    }

    // Place Markers
    positions.forEach(pos => {
        const marker = document.createElement('div');
        marker.className = `note-marker ${pos.r ? 'root' : ''}`;

        // Horizontal position (Fret)
        const fretWidth = 100 / 12.5;
        const left = (pos.f * fretWidth) + (fretWidth / 2);

        // Vertical position (String: 1 is top/high E, 6 is bottom/low E)
        const stringHeight = 100 / 6;
        const top = (pos.s * stringHeight) - (stringHeight / 2);

        marker.style.left = `${left}%`;
        marker.style.top = `${top}%`;
        marker.textContent = pos.f === 0 ? "O" : ""; // Open string mark

        container.appendChild(marker);
    });
}

// Start everything
initLibraries();

function getNoteFromFreq(freq) {
    const semitones = 12 * (Math.log2(freq / 440));
    const noteNum = Math.round(semitones) + 69;
    if (noteNum < 0) return { name: "--", cents: 0 };
    const name = NOTE_NAMES[noteNum % 12];
    const cents = (semitones - Math.round(semitones)) * 100;
    return { name, cents };
}
