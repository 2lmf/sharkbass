const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
let audioContext;
let analyser;
let micStream;
let isTuning = false;

const targetNoteEl = document.getElementById('target-note');
const centsOffsetEl = document.getElementById('cents-offset');
const needleEl = document.getElementById('needle');
const btnStart = document.getElementById('btn-start-tuner');
const noteDisplay = document.querySelector('.note-display');

// Tab Navigation
const tabs = document.querySelectorAll('.tab-btn');
const views = document.querySelectorAll('.view');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        tab.classList.add('active');
        const viewId = `view-${tab.dataset.view}`;
        document.getElementById(viewId).classList.add('active');
    });
});

async function initTuner() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(micStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        if (!window.pitchy) {
            throw new Error("Pitchy library not loaded.");
        }

        isTuning = true;
        btnStart.textContent = "ŠTIMANJE...";
        btnStart.style.opacity = "0.5";
        btnStart.disabled = true;

        updateTuner();
    } catch (err) {
        console.error("Mic access failed:", err);
        alert("Mikrofon nije dostupan. Provjeri dozvole.");
    }
}

btnStart.addEventListener('click', initTuner);

function updateTuner() {
    if (!isTuning) return;

    const inputBuffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(inputBuffer);

    const detector = pitchy.PitchDetector.forFloat32Array(inputBuffer.length);
    const [pitch, clarity] = detector.findPitch(inputBuffer, audioContext.sampleRate);

    if (clarity > 0.8 && pitch > 50 && pitch < 1000) {
        const { name, cents } = getNoteFromFreq(pitch);
        targetNoteEl.textContent = name;
        centsOffsetEl.textContent = cents.toFixed(1);

        // Map cents (-50 to +50) to rotation (-45 to 45 degrees)
        const rotation = (cents / 50) * 45;
        needleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;

        // Visual feedback
        if (Math.abs(cents) < 5) {
            noteDisplay.style.borderColor = "#2ecc71";
            noteDisplay.style.textShadow = "0 0 30px rgba(46, 204, 113, 0.6)";
        } else {
            noteDisplay.style.borderColor = "var(--glass-border)";
            noteDisplay.style.textShadow = "0 0 30px var(--accent-glow)";
        }
    }

    requestAnimationFrame(updateTuner);
}

// --- V2.1.1 LIBRARIES: EXPANDED CHORDS & SCALES ---

const GUITAR_CHORDS = {
    "C": {
        "major": { name: "C Dur", notes: "C E G", positions: [{ s: 5, f: 3, r: true }, { s: 4, f: 2 }, { s: 2, f: 1 }] },
        "minor": { name: "C Mol", notes: "C Eb G", positions: [{ s: 5, f: 3, r: true }, { s: 4, f: 5 }, { s: 3, f: 5 }, { s: 2, f: 4 }, { s: 1, f: 3 }] },
        "7": { name: "C7", notes: "C E G Bb", positions: [{ s: 5, f: 3, r: true }, { s: 4, f: 2 }, { s: 3, f: 3 }, { s: 2, f: 1 }] },
        "maj7": { name: "Cmaj7", notes: "C E G B", positions: [{ s: 5, f: 3, r: true }, { s: 4, f: 2 }, { s: 3, f: 0 }, { s: 2, f: 0 }] },
        "m7": { name: "Cm7", notes: "C Eb G Bb", positions: [{ s: 5, f: 3, r: true }, { s: 4, f: 5 }, { s: 3, f: 3 }, { s: 2, f: 4 }] }
    },
    "C#": {
        "major": { name: "C# Dur", notes: "C# F G#", positions: [{ s: 5, f: 4, r: true }, { s: 4, f: 6 }, { s: 3, f: 6 }, { s: 2, f: 6 }] },
        "minor": { name: "C# Mol", notes: "C# E G#", positions: [{ s: 5, f: 4, r: true }, { s: 4, f: 6 }, { s: 3, f: 6 }, { s: 2, f: 5 }] }
    },
    "D": {
        "major": { name: "D Dur", notes: "D F# A", positions: [{ s: 4, f: 0, r: true }, { s: 3, f: 2 }, { s: 2, f: 3 }, { s: 1, f: 2 }] },
        "minor": { name: "D Mol", notes: "D F A", positions: [{ s: 4, f: 0, r: true }, { s: 3, f: 2 }, { s: 2, f: 3 }, { s: 1, f: 1 }] },
        "7": { name: "D7", notes: "D F# A C", positions: [{ s: 4, f: 0, r: true }, { s: 3, f: 2 }, { s: 2, f: 1 }, { s: 1, f: 2 }] },
        "maj7": { name: "Dmaj7", notes: "D F# A C#", positions: [{ s: 4, f: 0, r: true }, { s: 3, f: 2 }, { s: 2, f: 2 }, { s: 1, f: 2 }] },
        "m7": { name: "Dm7", notes: "D F A C", positions: [{ s: 4, f: 0, r: true }, { s: 3, f: 2 }, { s: 2, f: 1 }, { s: 1, f: 1 }] }
    },
    "D#": {
        "major": { name: "D# Dur", notes: "D# G A#", positions: [{ s: 5, f: 6, r: true }, { s: 4, f: 8 }, { s: 3, f: 8 }, { s: 2, f: 8 }] }
    },
    "E": {
        "major": { name: "E Dur", notes: "E G# B", positions: [{ s: 6, f: 0, r: true }, { s: 5, f: 2 }, { s: 4, f: 2 }, { s: 3, f: 1 }] },
        "minor": { name: "E Mol", notes: "E G B", positions: [{ s: 6, f: 0, r: true }, { s: 5, f: 2 }, { s: 4, f: 2 }] },
        "7": { name: "E7", notes: "E G# B D", positions: [{ s: 6, f: 0, r: true }, { s: 5, f: 2 }, { s: 4, f: 0 }, { s: 3, f: 1 }, { s: 2, f: 0 }] },
        "maj7": { name: "Emaj7", notes: "E G# B D#", positions: [{ s: 6, f: 0, r: true }, { s: 5, f: 2 }, { s: 4, f: 1 }, { s: 3, f: 1 }] },
        "m7": { name: "Em7", notes: "E G B D", positions: [{ s: 6, f: 0, r: true }, { s: 5, f: 2 }] }
    },
    "F": {
        "major": { name: "F Dur", notes: "F A C", positions: [{ s: 6, f: 1, r: true }, { s: 5, f: 3 }, { s: 4, f: 3 }, { s: 3, f: 2 }, { s: 2, f: 1 }, { s: 1, f: 1 }] },
        "minor": { name: "F Mol", notes: "F Ab C", positions: [{ s: 6, f: 1, r: true }, { s: 5, f: 3 }, { s: 4, f: 3 }, { s: 3, f: 1 }, { s: 2, f: 1 }, { s: 1, f: 1 }] },
        "7": { name: "F7", notes: "F A C Eb", positions: [{ s: 6, f: 1, r: true }, { s: 5, f: 3 }, { s: 4, f: 1 }, { s: 3, f: 2 }, { s: 2, f: 1 }, { s: 1, f: 1 }] },
        "maj7": { name: "Fmaj7", notes: "F A C E", positions: [{ s: 4, f: 3, r: true }, { s: 3, f: 2 }, { s: 2, f: 1 }, { s: 1, f: 0 }] }
    },
    "F#": {
        "major": { name: "F# Dur", notes: "F# A# C#", positions: [{ s: 6, f: 2, r: true }, { s: 5, f: 4 }, { s: 4, f: 4 }, { s: 3, f: 3 }, { s: 2, f: 2 }, { s: 1, f: 2 }] }
    },
    "G": {
        "major": { name: "G Dur", notes: "G B D", positions: [{ s: 6, f: 3, r: true }, { s: 5, f: 2 }, { s: 4, f: 0 }, { s: 3, f: 0 }, { s: 2, f: 0 }, { s: 1, f: 3 }] },
        "minor": { name: "G Mol", notes: "G Bb D", positions: [{ s: 6, f: 3, r: true }, { s: 5, f: 5 }, { s: 4, f: 5 }, { s: 3, f: 3 }, { s: 2, f: 3 }, { s: 1, f: 3 }] },
        "7": { name: "G7", notes: "G B D F", positions: [{ s: 6, f: 3, r: true }, { s: 5, f: 2 }, { s: 4, f: 0 }, { s: 3, f: 0 }, { s: 2, f: 0 }, { s: 1, f: 1 }] },
        "maj7": { name: "Gmaj7", notes: "G B D F#", positions: [{ s: 6, f: 3, r: true }, { s: 1, f: 2 }] },
        "m7": { name: "Gm7", notes: "G Bb D F", positions: [{ s: 6, f: 3, r: true }, { s: 3, f: 3 }, { s: 2, f: 3 }, { s: 1, f: 3 }] }
    },
    "G#": {
        "major": { name: "G# Dur", notes: "G# C D#", positions: [{ s: 6, f: 4, r: true }, { s: 5, f: 6 }, { s: 4, f: 6 }, { s: 3, f: 5 }, { s: 2, f: 4 }, { s: 1, f: 4 }] }
    },
    "A": {
        "major": { name: "A Dur", notes: "A C# E", positions: [{ s: 5, f: 0, r: true }, { s: 4, f: 2 }, { s: 3, f: 2 }, { s: 2, f: 2 }] },
        "minor": { name: "A Mol", notes: "A C E", positions: [{ s: 5, f: 0, r: true }, { s: 4, f: 2 }, { s: 3, f: 2 }, { s: 2, f: 1 }] },
        "7": { name: "A7", notes: "A C# E G", positions: [{ s: 5, f: 0, r: true }, { s: 4, f: 2 }, { s: 2, f: 2 }] },
        "maj7": { name: "Amaj7", notes: "A C# E G#", positions: [{ s: 5, f: 0, r: true }, { s: 4, f: 2 }, { s: 3, f: 1 }, { s: 2, f: 2 }] },
        "m7": { name: "Am7", notes: "A C E G", positions: [{ s: 5, f: 0, r: true }, { s: 4, f: 2 }, { s: 2, f: 1 }] }
    },
    "A#": {
        "major": { name: "A# Dur", notes: "A# D F", positions: [{ s: 5, f: 1, r: true }, { s: 4, f: 3 }, { s: 3, f: 3 }, { s: 2, f: 3 }] }
    },
    "B": {
        "major": { name: "B Dur", notes: "B D# F#", positions: [{ s: 5, f: 2, r: true }, { s: 4, f: 4 }, { s: 3, f: 4 }, { s: 2, f: 4 }] },
        "minor": { name: "B Mol", notes: "B D F#", positions: [{ s: 5, f: 2, r: true }, { s: 4, f: 4 }, { s: 3, f: 4 }, { s: 2, f: 3 }] },
        "7": { name: "B7", notes: "B D# F# A", positions: [{ s: 5, f: 2, r: true }, { s: 4, f: 1 }, { s: 3, f: 2 }, { s: 2, f: 0 }, { s: 1, f: 2 }] },
        "maj7": { name: "Bmaj7", notes: "B D# F# A#", positions: [{ s: 5, f: 2, r: true }, { s: 4, f: 4 }, { s: 3, f: 3 }, { s: 2, f: 4 }] },
        "m7": { name: "Bm7", notes: "B D F# A", positions: [{ s: 5, f: 2, r: true }, { s: 4, f: 4 }, { s: 3, f: 2 }, { s: 2, f: 3 }] }
    }
};

const GUITAR_SCALES = {
    "C": {
        "major_penta": [{ s: 5, f: 3, r: true }, { s: 5, f: 5 }, { s: 4, f: 2 }, { s: 4, f: 5 }, { s: 3, f: 2 }, { s: 3, f: 5 }, { s: 2, f: 3 }, { s: 2, f: 5 }, { s: 1, f: 3 }, { s: 1, f: 5 }],
        "minor_penta": [{ s: 6, f: 8, r: true }, { s: 6, f: 11 }, { s: 5, f: 8 }, { s: 5, f: 10 }, { s: 4, f: 8 }, { s: 4, f: 10 }, { s: 3, f: 8 }, { s: 3, f: 10 }, { s: 2, f: 8 }, { s: 2, f: 11 }, { s: 1, f: 8 }, { s: 1, f: 11 }],
        "blues": [{ s: 5, f: 3, r: true }, { s: 5, f: 6 }, { s: 4, f: 3 }, { s: 4, f: 4 }, { s: 4, f: 5 }, { s: 3, f: 3 }, { s: 3, f: 5 }, { s: 2, f: 4 }, { s: 2, f: 6 }, { s: 1, f: 3 }]
    },
    "G": {
        "major_penta": [{ s: 6, f: 3, r: true }, { s: 6, f: 5 }, { s: 5, f: 2 }, { s: 5, f: 5 }, { s: 4, f: 2 }, { s: 4, f: 5 }, { s: 3, f: 2 }, { s: 3, f: 4 }, { s: 2, f: 3 }, { s: 2, f: 5 }, { s: 1, f: 3 }, { s: 1, f: 5 }],
        "minor_penta": [{ s: 6, f: 3, r: true }, { s: 6, f: 6 }, { s: 5, f: 3 }, { s: 5, f: 5 }, { s: 4, f: 3 }, { s: 4, f: 5 }, { s: 3, f: 3 }, { s: 3, f: 5 }, { s: 2, f: 3 }, { s: 2, f: 6 }, { s: 1, f: 3 }, { s: 1, f: 6 }],
        "blues": [{ s: 6, f: 3, r: true }, { s: 6, f: 6 }, { s: 5, f: 3 }, { s: 5, f: 4 }, { s: 5, f: 5 }, { s: 4, f: 3 }, { s: 4, f: 5 }, { s: 3, f: 3 }, { s: 3, f: 5 }, { s: 3, f: 6 }, { s: 2, f: 3 }, { s: 1, f: 3 }]
    },
    "A": {
        "major_penta": [{ s: 6, f: 5, r: true }, { s: 6, f: 7 }, { s: 5, f: 4 }, { s: 5, f: 7 }, { s: 4, f: 4 }, { s: 4, f: 7 }, { s: 3, f: 4 }, { s: 3, f: 6 }, { s: 2, f: 5 }, { s: 2, f: 7 }, { s: 1, f: 5 }, { s: 1, f: 7 }],
        "minor_penta": [{ s: 6, f: 5, r: true }, { s: 6, f: 8 }, { s: 5, f: 5 }, { s: 5, f: 7 }, { s: 4, f: 5 }, { s: 4, f: 7 }, { s: 3, f: 5 }, { s: 3, f: 7 }, { s: 2, f: 5 }, { s: 2, f: 8 }, { s: 1, f: 5 }, { s: 1, f: 8 }],
        "blues": [{ s: 6, f: 5, r: true }, { s: 6, f: 8 }, { s: 5, f: 5 }, { s: 5, f: 6 }, { s: 5, f: 7 }, { s: 4, f: 5 }, { s: 4, f: 7 }, { s: 3, f: 5 }, { s: 3, f: 7 }, { s: 3, f: 8 }, { s: 2, f: 5 }, { s: 1, f: 5 }]
    },
    "D": {
        "major_penta": [{ s: 5, f: 5, r: true }, { s: 5, f: 7 }, { s: 4, f: 4 }, { s: 4, f: 7 }, { s: 3, f: 4 }, { s: 3, f: 7 }, { s: 2, f: 5 }, { s: 2, f: 7 }, { s: 1, f: 5 }, { s: 1, f: 7 }],
        "minor_penta": [{ s: 5, f: 5, r: true }, { s: 5, f: 8 }, { s: 4, f: 5 }, { s: 4, f: 7 }, { s: 3, f: 5 }, { s: 3, f: 7 }, { s: 2, f: 6 }, { s: 2, f: 8 }, { s: 1, f: 5 }, { s: 1, f: 8 }],
        "blues": [{ s: 5, f: 5, r: true }, { s: 5, f: 8 }, { s: 4, f: 5 }, { s: 4, f: 6 }, { s: 4, f: 7 }, { s: 3, f: 5 }, { s: 3, f: 7 }, { s: 2, f: 6 }, { s: 2, f: 8 }, { s: 1, f: 5 }, { s: 1, f: 8 }]
    },
    "E": {
        "major_penta": [{ s: 6, f: 0, r: true }, { s: 6, f: 2 }, { s: 5, f: 0 }, { s: 5, f: 2 }, { s: 4, f: 0 }, { s: 4, f: 2 }, { s: 3, f: 1 }, { s: 3, f: 4 }, { s: 2, f: 0 }, { s: 2, f: 2 }, { s: 1, f: 0 }, { s: 1, f: 2 }],
        "minor_penta": [{ s: 6, f: 0, r: true }, { s: 6, f: 3 }, { s: 5, f: 0 }, { s: 5, f: 2 }, { s: 4, f: 0 }, { s: 4, f: 2 }, { s: 3, f: 0 }, { s: 3, f: 2 }, { s: 2, f: 0 }, { s: 2, f: 3 }, { s: 1, f: 0 }, { s: 1, f: 3 }],
        "blues": [{ s: 6, f: 0, r: true }, { s: 6, f: 3 }, { s: 5, f: 0 }, { s: 5, f: 1 }, { s: 5, f: 2 }, { s: 4, f: 0 }, { s: 4, f: 2 }, { s: 3, f: 0 }, { s: 3, f: 2 }, { s: 3, f: 3 }, { s: 2, f: 0 }, { s: 1, f: 0 }]
    },
    "B": {
        "major_penta": [{ s: 5, f: 2, r: true }, { s: 5, f: 4 }, { s: 4, f: 1 }, { s: 4, f: 4 }, { s: 3, f: 1 }, { s: 3, f: 4 }, { s: 2, f: 2 }, { s: 2, f: 4 }, { s: 1, f: 2 }, { s: 1, f: 4 }],
        "minor_penta": [{ s: 6, f: 7, r: true }, { s: 6, f: 10 }, { s: 5, f: 7 }, { s: 5, f: 9 }, { s: 4, f: 7 }, { s: 4, f: 9 }, { s: 3, f: 7 }, { s: 3, f: 9 }, { s: 2, f: 7 }, { s: 2, f: 10 }, { s: 1, f: 7 }, { s: 1, f: 10 }],
        "blues": [{ s: 6, f: 7, r: true }, { s: 6, f: 10 }, { s: 5, f: 7 }, { s: 5, f: 8 }, { s: 5, f: 9 }, { s: 4, f: 7 }, { s: 4, f: 9 }, { s: 3, f: 7 }, { s: 3, f: 9 }, { s: 3, f: 10 }, { s: 2, f: 7 }, { s: 1, f: 7 }]
    }
};

const chordRoot = document.getElementById('chord-root');
const chordType = document.getElementById('chord-type');
const chordFretboard = document.getElementById('chord-fretboard');

const scaleRoot = document.getElementById('scale-root');
const scaleType = document.getElementById('scale-type');
const scaleFretboard = document.getElementById('scale-fretboard');

function initLibraries() {
    [chordRoot, chordType].forEach(el => el.onchange = renderSelectedChord);
    [scaleRoot, scaleType].forEach(el => el.onchange = renderSelectedScale);
    renderSelectedChord();
    renderSelectedScale();
}

function renderSelectedChord() {
    const root = chordRoot.value;
    const type = chordType.value;
    const data = (GUITAR_CHORDS[root] && GUITAR_CHORDS[root][type]) || { name: `${root} ${type}`, notes: "-", positions: [] };

    document.getElementById('chord-name').textContent = data.name;
    document.getElementById('chord-notes').textContent = data.notes;
    drawFretboard(chordFretboard, data.positions);
}

function renderSelectedScale() {
    const root = scaleRoot.value;
    const type = scaleType.value;
    const positions = (GUITAR_SCALES[root] && GUITAR_SCALES[root][type]) || [];
    drawFretboard(scaleFretboard, positions);
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

        // Vertical position (String: 1 is High E, 6 is Low E)
        // USER REQUEST: Reverse order (6th string on TOP)
        const stringHeight = 100 / 6;
        const top = ((7 - pos.s) * stringHeight) - (stringHeight / 2);

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
