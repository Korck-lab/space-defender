/* File: ./js/audio.js */

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.currentSource = null;
        this.nextSource = null; // For crossfading/looping
        this.fadeDuration = 1.5; // Seconds for fade in/out
        this.loopFadeDuration = 1.0; // Shorter fade for looping the same track
        this.audioBuffers = {}; // Cache for loaded audio data
        this.currentTrackKey = null;
        this.isMuted = true; // Start muted
        this.currentVolume = 0.5; // Default volume
        this.isPlaying = false;
        this.fadeTimeout = null;
        this.loopTimeout = null;
        this.stopRequested = false; // Flag to prevent looping after explicit stop

        // Define track mapping based on filenames/levels
        this.trackMap = {
            intro: 'assets/sound/intro.wav', // For start/game over (optional)
            level1_5: 'assets/sound/1-5.wav',
            level6_15: 'assets/sound/6-15.wav',
            level16plus: 'assets/sound/16-.wav',
        };

        this.loadState(); // Load volume/mute state from localStorage
    }

    // Must be called after user interaction (e.g., clicking Start)
    async initContext() {
        if (!this.audioContext) {
            try {
                console.log("Attempting to create AudioContext...");
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.connect(this.audioContext.destination);
                this.setVolume(this.currentVolume); // Apply initial/loaded volume
                console.log("AudioContext Initialized.");
                // If context starts suspended, log it. Resume will be attempted on next interaction.
                if (this.audioContext.state === 'suspended') {
                    console.log("AudioContext is initially suspended.");
                }
            } catch (e) {
                console.error("Web Audio API is not supported in this browser:", e);
                throw e; // Re-throw error so callers know it failed
            }
        }
        // Always try to resume if context exists and is suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                console.log("Attempting to resume suspended AudioContext...");
                await this.audioContext.resume();
                console.log("AudioContext Resumed. State:", this.audioContext.state);
            } catch (e) {
                console.error("Failed to resume AudioContext:", e);
                // Don't throw here, maybe next interaction will work
            }
        }
        // Return the context state for potential checks elsewhere
        // return this.audioContext ? this.audioContext.state : 'unavailable';
    }

    async loadTrack(key) {
        if (!this.audioContext) await this.initContext(); // Ensure context exists
        if (!this.audioContext) return null; // Still no context? Abort.
        if (this.audioBuffers[key]) return this.audioBuffers[key]; // Return cached buffer

        const url = this.trackMap[key];
        if (!url) {
            console.error(`Track key '${key}' not found in trackMap.`);
            return null;
        }

        try {
            console.log(`Loading track: ${key} (${url})`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers[key] = audioBuffer;
            console.log(`Track loaded: ${key}`);
            return audioBuffer;
        } catch (error) {
            console.error(`Error loading or decoding audio file ${url}:`, error);
            return null;
        }
    }

    getTrackKeyForLevel(level) {
        if (level >= 16) return 'level16plus';
        if (level >= 6) return 'level6_15';
        if (level >= 1) return 'level1_5';
        return 'intro'; // Fallback or default
    }

    async playTrackForLevel(level) {
        if (!this.audioContext) await this.initContext();
        if (!this.audioContext) return;

        const newTrackKey = this.getTrackKeyForLevel(level);
        this.isIntroPlaying = false; // Game level music is not intro music

        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // Avoid restarting if the correct non-intro track is already playing
        if (this.isPlaying && !this.isIntroPlaying && this.currentTrackKey === newTrackKey) {
            console.log(`Track ${newTrackKey} is already playing.`);
            return;
        }

        const buffer = await this.loadTrack(newTrackKey);
        if (!buffer) {
            console.error(`Failed to load buffer for track ${newTrackKey}`);
            this.stopAll();
            return;
        }

        this.stopRequested = false;
        console.log(`Requesting play for level ${level} -> track ${newTrackKey}`);
        this._crossfade(newTrackKey, buffer);
    }

    async playIntroMusic() {
        if (!this.audioContext) await this.initContext();
        if (!this.audioContext) return; // No audio possible

        const introTrackKey = 'intro';

        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // Don't restart if intro is already playing
        if (this.isPlaying && this.isIntroPlaying) {
            console.log(`Intro track is already playing.`);
            return;
        }

        const buffer = await this.loadTrack(introTrackKey);
        if (!buffer) {
            console.error(`Failed to load buffer for intro track`);
            this.stopAll(); // Stop if loading fails
            return;
        }

        this.stopRequested = false; // Reset stop flag
        console.log(`Requesting play for intro track`);
        this.isIntroPlaying = true; // Set flag
        this._crossfade(introTrackKey, buffer);
    }

    _crossfade(newTrackKey, buffer, isLoop = false) {
        if (!this.audioContext) return;
        const now = this.audioContext.currentTime;
        // Use loop fade duration if looping the *same* track OR transitioning *from* intro
        const fadeDuration = (isLoop || this.isIntroPlaying) ? this.loopFadeDuration : this.fadeDuration;


        // Stop any pending fades/loops
        clearTimeout(this.fadeTimeout);
        clearTimeout(this.loopTimeout);

        // Fade out current source if it exists
        if (this.currentSource && this.isPlaying) {
            console.log(`Fading out track: ${this.currentTrackKey}`);
            const oldSource = this.currentSource;
            const oldGain = oldSource.gainNode;

            oldGain.gain.cancelScheduledValues(now);
            oldGain.gain.setValueAtTime(oldGain.gain.value, now);
            oldGain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);

            this.fadeTimeout = setTimeout(() => {
                if (oldSource && oldSource.source) {
                    try { oldSource.source.stop(); } catch (e) {/* ignore */ }
                    oldSource.source.disconnect();
                    oldGain.disconnect();
                    console.log(`Stopped faded-out source: ${oldSource.trackKey}`);
                }
            }, fadeDuration * 1000 + 100);
        } else {
            // If nothing is playing, ensure the intro flag is correctly set based on the new track
            this.isIntroPlaying = (newTrackKey === 'intro');
        }

        // Create and fade in the new source
        const newSourceNode = this.audioContext.createBufferSource();
        newSourceNode.buffer = buffer;
        const newGainNode = this.audioContext.createGain();

        newSourceNode.connect(newGainNode).connect(this.masterGain);
        newGainNode.gain.setValueAtTime(0.0001, now);
        newGainNode.gain.linearRampToValueAtTime(1.0, now + fadeDuration);

        newSourceNode.start(now);
        console.log(`Fading in track: ${newTrackKey} at ${now}`);
        this.isPlaying = true;
        this.currentTrackKey = newTrackKey;
        this.currentSource = { source: newSourceNode, gainNode: newGainNode, trackKey: newTrackKey };
        this.isIntroPlaying = (newTrackKey === 'intro'); // Update flag based on the track starting


        // Schedule the next loop (slightly before the end to allow overlap)
        const loopStartTime = now + buffer.duration - this.loopFadeDuration;
        this.loopTimeout = setTimeout(() => {
            // Only loop if the CURRENT source is the one that's about to end,
            // it hasn't been stopped, and it's not being replaced by game start etc.
            if (this.isPlaying && !this.stopRequested && this.currentSource && this.currentSource.source === newSourceNode) {
                console.log(`Scheduling loop for: ${newTrackKey}`);
                this._crossfade(newTrackKey, buffer, true); // Crossfade into the same track
            } else {
                console.log(`Loop cancelled for ${newTrackKey} (stopRequested: ${this.stopRequested}, isPlaying: ${this.isPlaying}, sourceMatch: ${this.currentSource && this.currentSource.source === newSourceNode})`);
            }
        }, (loopStartTime - now) * 1000);


        // Handle actual end of buffer slightly after loop fade starts
        newSourceNode.onended = () => {
            // Check if this source is *still* the current one (it shouldn't be if looping worked)
            if (this.currentSource && this.currentSource.source === newSourceNode && !this.stopRequested) {
                console.warn(`Source ended unexpectedly before loop for ${newTrackKey}.`);
                // Don't automatically restart here, as it might conflict with intended stops
            } else if (this.currentSource && this.currentSource.source !== newSourceNode) {
                try { newGainNode.disconnect(); newSourceNode.disconnect(); } catch (e) { }
            } else if (!this.currentSource) { // If nothing is current (e.g., after stopAll)
                try { newGainNode.disconnect(); newSourceNode.disconnect(); } catch (e) { }
            }
        };
    }

    stopAll() {
        if (!this.audioContext || !this.isPlaying) return;
        this.stopRequested = true; // Prevent loops from restarting
        clearTimeout(this.fadeTimeout);
        clearTimeout(this.loopTimeout);

        const now = this.audioContext.currentTime;

        if (this.currentSource) {
            console.log(`Stopping current source: ${this.currentTrackKey}`);
            const src = this.currentSource;
            src.gainNode.gain.cancelScheduledValues(now);
            src.gainNode.gain.setValueAtTime(src.gainNode.gain.value, now);
            src.gainNode.gain.linearRampToValueAtTime(0.0001, now + this.fadeDuration / 2); // Faster fade out
            this.fadeTimeout = setTimeout(() => {
                if (src && src.source) {
                    try { src.source.stop(); } catch (e) {/* ignore */ }
                    src.source.disconnect();
                    src.gainNode.disconnect();
                }
            }, (this.fadeDuration / 2) * 1000 + 50);
            this.currentSource = null;
        }
        // Also handle nextSource if mid-crossfade
        if (this.nextSource) {
            // ... (similar logic if nextSource was tracked separately) ...
            this.nextSource = null;
        }

        this.isPlaying = false;
        this.currentTrackKey = null;
        this.isIntroPlaying = false; // Reset intro flag

        console.log("Music stopped.");
    }

    setVolume(value) {
        this.currentVolume = parseFloat(value);
        if (this.masterGain) {
            // Apply volume only if not muted
            this.masterGain.gain.value = this.isMuted ? 0 : this.currentVolume;
        }
        this.saveState(); // Save volume change
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.currentVolume;
        }
        console.log(`Music Muted: ${this.isMuted}`);
        this.saveState(); // Save mute state
        return this.isMuted;
    }

    // --- State Persistence ---
    saveState() {
        try {
            localStorage.setItem('spaceDefenderAudioVolume', this.currentVolume);
            localStorage.setItem('spaceDefenderAudioMuted', this.isMuted);
        } catch (e) {
            console.warn("Could not save audio state to localStorage:", e);
        }
    }

    loadState() {
        try {
            const storedVolume = localStorage.getItem('spaceDefenderAudioVolume');
            // Game always starts muted, so this is not needed
            // const storedMuted = localStorage.getItem('spaceDefenderAudioMuted');

            if (storedVolume !== null) {
                this.currentVolume = parseFloat(storedVolume);
            }
            // if (storedMuted !== null) {
            //     this.isMuted = storedMuted === 'true';
            // }
            console.log(`Loaded audio state - Volume: ${this.currentVolume}, Muted: ${this.isMuted}`);

        } catch (e) {
            console.warn("Could not load audio state from localStorage:", e);
        }
        // Apply loaded state when context is ready
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.currentVolume;
        }
    }
}

// Export AudioManager for ES module imports
export { AudioManager };