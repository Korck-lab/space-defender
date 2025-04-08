// js/audio.js

class AudioManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.isInitialized = false;
    this.musicNodes = []; // To keep track of active music oscillators/sources
    this.musicInterval = null;
    this.currentBeat = 0;
    this.beatsPerMinute = 90; // Starting BPM
    this.maxBpm = 150;
    this.minBpm = 90;
    this.activeMusicLayers = 1; // Start with just bass
    this.maxMusicLayers = 4; // Bass, Drums, Arp, Pad
  }

  // --- Initialization ---
  // IMPORTANT: Must be called after a user interaction (e.g., button click)
  initAudioContext() {
    if (this.isInitialized) return;
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();

      // Master Volume
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(0.6, this.audioContext.currentTime); // Overall volume
      this.masterGain.connect(this.audioContext.destination);

      // SFX Volume
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.audioContext.currentTime); // SFX volume relative to master
      this.sfxGain.connect(this.masterGain);

      // Music Volume
      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.setValueAtTime(0.4, this.audioContext.currentTime); // Music volume relative to master
      this.musicGain.connect(this.masterGain);

      this.isInitialized = true;
      console.log("AudioContext Initialized.");
    } catch (e) {
      console.error("Web Audio API is not supported in this browser", e);
    }
  }

  // --- Sound Effect Playback ---
  playSound(type, options = {}) {
    if (!this.isInitialized) return;
    const time = this.audioContext.currentTime;
    let destination = this.sfxGain; // Default to SFX gain

    switch (type) {
      case "laser":
        this.playLaserSound(time, destination, options);
        break;
      case "explosion":
        this.playExplosionSound(time, destination, options);
        break;
      case "playerHit":
        this.playPlayerHitSound(time, destination, options);
        break;
      case "levelUp":
        this.playLevelUpSound(time, destination, options);
        break;
      case "itemPickup":
        this.playItemPickupSound(time, destination, options);
        break;
      case "unlock":
        this.playUnlockSound(time, destination, options);
        break;
      case "abilityActivate":
        this.playAbilityActivateSound(time, destination, options);
        break;
      // Add more sound types as needed
    }
  }

  // --- Sound Effect Definitions ---

  playLaserSound(time, destination, { pitch = 1 }) {
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    osc.connect(gainNode);
    gainNode.connect(destination);

    osc.type = "sawtooth";
    const baseFreq = 220 * pitch; // A3, adjust pitch slightly maybe
    osc.frequency.setValueAtTime(baseFreq * 2, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, time + 0.05); // Quick pitch drop

    gainNode.gain.setValueAtTime(0.3, time);
    gainNode.gain.linearRampToValueAtTime(0, time + 0.1); // Fast decay

    osc.start(time);
    osc.stop(time + 0.1);
  }

  playExplosionSound(time, destination, { size = 1 }) {
    // White noise approach
    const bufferSize = this.audioContext.sampleRate * 0.5; // 0.5 seconds
    const noiseBuffer = this.audioContext.createBuffer(
      1,
      bufferSize,
      this.audioContext.sampleRate
    );
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1; // Generate white noise
    }

    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000 * size, time); // Higher freq for small explosion
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.3 * size); // Sweep down

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.6 * size, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.4 * size);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);

    noiseSource.start(time);
    noiseSource.stop(time + 0.5 * size);

    // Add a low-freq punch
    const punchOsc = this.audioContext.createOscillator();
    const punchGain = this.audioContext.createGain();
    punchOsc.connect(punchGain);
    punchGain.connect(destination);

    punchOsc.type = "sine";
    punchOsc.frequency.setValueAtTime(100 * (1 / size), time); // Lower freq for bigger explosion
    punchOsc.frequency.exponentialRampToValueAtTime(30, time + 0.15);

    punchGain.gain.setValueAtTime(0.8 * size, time);
    punchGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    punchOsc.start(time);
    punchOsc.stop(time + 0.2);
  }

  playPlayerHitSound(time, destination, options) {
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc1.type = "square";
    osc1.frequency.setValueAtTime(160, time); // Slightly detuned
    osc2.type = "square";
    osc2.frequency.setValueAtTime(155, time); // Dissonance

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(destination);

    gainNode.gain.setValueAtTime(0.5, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc1.start(time);
    osc1.stop(time + 0.3);
    osc2.start(time);
    osc2.stop(time + 0.3);
  }

  playLevelUpSound(time, destination, options) {
    // Simple ascending arpeggio
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
    const noteDuration = 0.1;
    let noteTime = time;

    notes.forEach((freq) => {
      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      osc.connect(gainNode);
      gainNode.connect(destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, noteTime);

      gainNode.gain.setValueAtTime(0, noteTime);
      gainNode.gain.linearRampToValueAtTime(0.4, noteTime + 0.02); // Quick attack
      gainNode.gain.linearRampToValueAtTime(0, noteTime + noteDuration);

      osc.start(noteTime);
      osc.stop(noteTime + noteDuration);
      noteTime += noteDuration * 0.8; // Slight overlap
    });
  }

  playItemPickupSound(time, destination, { itemType = "xp" }) {
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    osc.connect(gainNode);
    gainNode.connect(destination);

    osc.type = "sine";
    let freq = 440; // A4 for XP
    let duration = 0.1;
    let volume = 0.3;

    if (itemType === "life") {
      freq = 659.25; // E5
      duration = 0.15;
      volume = 0.4;
    } else if (itemType === "bomb") {
      freq = 329.63; // E4
      duration = 0.15;
      volume = 0.4;
    }

    osc.frequency.setValueAtTime(freq * 1.1, time); // Slight pitch start high
    osc.frequency.linearRampToValueAtTime(freq, time + duration * 0.5);

    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.linearRampToValueAtTime(0, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  playUnlockSound(time, destination, options) {
    const osc = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gainNode = this.audioContext.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, time); // A4
    osc.detune.setValueAtTime(0, time);
    osc.detune.linearRampToValueAtTime(1200, time + 0.5); // Detune up one octave

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, time);
    filter.frequency.linearRampToValueAtTime(3000, time + 0.4); // Filter sweep up
    filter.Q.setValueAtTime(5, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.4, time + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, time + 0.6);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);

    osc.start(time);
    osc.stop(time + 0.6);
  }

  playAbilityActivateSound(time, destination, { abilityKey = "unknown" }) {
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    osc.connect(gainNode);
    gainNode.connect(destination);

    osc.type = "square";
    let freq = 330; // E4
    let duration = 0.2;

    switch (abilityKey) {
      case "rocket":
        freq = 220;
        break; // A3
      case "wingman":
        freq = 440;
        break; // A4
      case "miniShip":
        freq = 660;
        break; // E5
    }

    osc.frequency.setValueAtTime(freq * 0.9, time);
    osc.frequency.linearRampToValueAtTime(freq * 1.1, time + duration); // Pitch rise

    gainNode.gain.setValueAtTime(0.45, time);
    gainNode.gain.linearRampToValueAtTime(0, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  // --- Background Music ---

  startMusic() {
    if (!this.isInitialized || this.musicInterval) return;
    console.log("Starting music sequence...");
    this.currentBeat = 0;
    this.activeMusicLayers = 1; // Start with bass only
    this.beatsPerMinute = this.minBpm;

    const secondsPerBeat = 60.0 / this.beatsPerMinute;
    const scheduleAheadTime = 0.1; // How far ahead to schedule notes (in seconds)
    const lookahead = 25.0; // How often to wake up and schedule (in ms)

    let nextNoteTime = this.audioContext.currentTime;

    const scheduler = () => {
      while (nextNoteTime < this.audioContext.currentTime + scheduleAheadTime) {
        this.scheduleMusicNotes(this.currentBeat, nextNoteTime);
        nextNoteTime += 60.0 / this.beatsPerMinute / 4; // Schedule 16th notes

        this.currentBeat++;
        if (this.currentBeat >= 16) {
          // Loop every 4 beats (16 sixteenth notes)
          this.currentBeat = 0;
        }
      }
      this.musicInterval = setTimeout(scheduler, lookahead);
    };

    scheduler(); // Start the scheduler loop
  }

  stopMusic() {
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
    // Fade out and stop existing nodes (optional, could just cut)
    this.musicNodes.forEach((node) => {
      try {
        if (node.gainNode && node.gainNode.gain) {
          node.gainNode.gain.cancelScheduledValues(
            this.audioContext.currentTime
          );
          node.gainNode.gain.linearRampToValueAtTime(
            0,
            this.audioContext.currentTime + 0.5
          );
          // Schedule stop after fade
          if (node.osc) node.osc.stop(this.audioContext.currentTime + 0.6);
          if (node.source)
            node.source.stop(this.audioContext.currentTime + 0.6);
        } else {
          if (node.osc) node.osc.stop(this.audioContext.currentTime);
          if (node.source) node.source.stop(this.audioContext.currentTime);
        }
      } catch (e) {
        console.warn("Error stopping music node:", e);
      }
    });
    this.musicNodes = [];
    this.currentBeat = 0;
    console.log("Music Stopped.");
  }

  scheduleMusicNotes(beat, time) {
    // Layer 1: Bassline (Always active) - Simple repeating pattern
    const bassNotes = [55, 55, 62, 55]; // A1, A1, D2, A1 (root, root, fourth, root)
    if (beat % 4 === 0) {
      // Play on quarter notes
      const noteIndex = Math.floor(beat / 4) % bassNotes.length;
      this.playSynthNote(time, this.musicGain, {
        freq: bassNotes[noteIndex],
        duration: 0.2, // sixteenth note duration * 2
        volume: 0.8,
        type: "square",
        filterFreq: 400,
        isMusic: true,
      });
    }

    // Layer 2: Drums (Kick & Snare/Hat) - Active from layer 2+
    if (this.activeMusicLayers >= 2) {
      // Kick drum on beats 0, 4, 8, 12 (quarter notes)
      if (beat % 4 === 0) {
        this.playDrumSound(time, this.musicGain, {
          type: "kick",
          volume: 1.0,
          isMusic: true,
        });
      }
      // Snare/Hat on beats 2, 6, 10, 14 (off-beats - eighth notes)
      if (beat % 4 === 2) {
        // Play on the '+' of 1 and 3
        this.playDrumSound(time, this.musicGain, {
          type: "snare",
          volume: 0.6,
          isMusic: true,
        });
      }
      // Hi-hat on every 16th note (more intense)
      if (this.activeMusicLayers >= 3 && this.beatsPerMinute > 110) {
        this.playDrumSound(time, this.musicGain, {
          type: "hat",
          volume: 0.2,
          isMusic: true,
        });
      }
    }

    // Layer 3: Arpeggiator - Active from layer 3+
    if (this.activeMusicLayers >= 3) {
      const arpNotes = [220, 277.18, 330, 440]; // A3, C#4, E4, A4 (A Major arp)
      const noteIndex = beat % arpNotes.length;
      this.playSynthNote(time, this.musicGain, {
        freq: arpNotes[noteIndex],
        duration: 0.1, // short 16th note
        volume: 0.4,
        type: "sawtooth",
        filterFreq: 1500,
        isMusic: true,
      });
    }

    // Layer 4: Pad - Simple sustained chord - Active from layer 4
    if (this.activeMusicLayers >= 4) {
      // Play root note of chord on beat 0 only
      if (beat === 0) {
        this.playSynthNote(time, this.musicGain, {
          freq: 110, // A2
          duration: 1.5, // Hold for almost a full measure
          volume: 0.3,
          type: "sawtooth",
          filterFreq: 800,
          attack: 0.2, // Slow attack/release for pad
          release: 0.5,
          isMusic: true,
        });
      }
    }
  }

  playSynthNote(
    time,
    destination,
    {
      freq = 440,
      duration = 0.1,
      volume = 0.5,
      type = "sine",
      filterFreq = 20000,
      attack = 0.01,
      release = 0.05,
      isMusic = false,
    }
  ) {
    const osc = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gainNode = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFreq, time); // Set filter cutoff

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volume, time + attack); // Attack
    gainNode.gain.setValueAtTime(volume, time + duration - release); // Sustain point
    gainNode.gain.linearRampToValueAtTime(0, time + duration); // Release

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);

    osc.start(time);
    osc.stop(time + duration + 0.1); // Stop slightly after fade

    if (isMusic) {
      // Track music nodes to stop them later if needed
      this.musicNodes.push({ osc: osc, gainNode: gainNode });
      // Auto-cleanup (remove node after it should have stopped)
      setTimeout(() => {
        this.musicNodes = this.musicNodes.filter((n) => n.osc !== osc);
      }, (duration + 0.2) * 1000);
    }
  }

  playDrumSound(
    time,
    destination,
    { type = "kick", volume = 1.0, isMusic = false }
  ) {
    if (type === "kick") {
      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      osc.connect(gainNode);
      gainNode.connect(destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.1); // Pitch drop

      gainNode.gain.setValueAtTime(volume, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

      osc.start(time);
      osc.stop(time + 0.2);
      if (isMusic) this.musicNodes.push({ osc, gainNode }); // Track if music
    } else if (type === "snare" || type === "hat") {
      // Noise-based snare/hat
      const bufferSize = this.audioContext.sampleRate * 0.2;
      const noiseBuffer = this.audioContext.createBuffer(
        1,
        bufferSize,
        this.audioContext.sampleRate
      );
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noiseSource = this.audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const filter = this.audioContext.createBiquadFilter();
      filter.type = type === "snare" ? "bandpass" : "highpass";
      filter.frequency.setValueAtTime(type === "snare" ? 1500 : 5000, time);
      filter.Q.setValueAtTime(type === "snare" ? 1 : 0.1, time);

      const gainNode = this.audioContext.createGain();
      const decayTime = type === "snare" ? 0.15 : 0.05;
      gainNode.gain.setValueAtTime(volume, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + decayTime);

      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(destination);
      noiseSource.start(time);
      noiseSource.stop(time + decayTime + 0.1);
      if (isMusic) this.musicNodes.push({ source: noiseSource, gainNode }); // Track if music
    }
  }

  // --- Music Intensity Update ---
  updateMusicIntensity(level, alienCount) {
    if (!this.isInitialized || !this.musicInterval) return;

    // Adjust BPM based on level and alien count (example logic)
    const levelFactor = Math.min(level / 10, 1); // Scale up to level 10
    const alienFactor = Math.min(alienCount / 15, 1); // Scale up to 15 aliens
    const intensity = clamp((levelFactor + alienFactor) / 2, 0, 1);

    this.beatsPerMinute = this.minBpm + (this.maxBpm - this.minBpm) * intensity;

    // Adjust active layers based on intensity
    const targetLayers = Math.max(
      1,
      Math.ceil(intensity * this.maxMusicLayers)
    );
    if (targetLayers !== this.activeMusicLayers) {
      console.log(
        `Changing music layers from ${
          this.activeMusicLayers
        } to ${targetLayers} (BPM: ${this.beatsPerMinute.toFixed(0)})`
      );
      this.activeMusicLayers = targetLayers;
    }
  }
}
