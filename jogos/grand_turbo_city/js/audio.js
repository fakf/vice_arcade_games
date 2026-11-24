// Grand Turbo City: Vice Neon — Web Audio API Synthesizer & Radio (window.GTC.Audio)
(function () {
  'use strict';

  window.GTC = window.GTC || {};

  var ctx = null;
  var masterGain = null;
  var musicGain = null;
  var engineGain = null;
  var sfxGain = null;

  var engineOsc = null;
  var engineFilter = null;
  var engineLevel = null;

  var sirenOsc = null;
  var sirenLevel = null;
  var sirenActive = false;
  var sirenTimer = null;
  var sirenHigh = false;

  var muted = false;
  var radioStation = 0; // 0 = Vice Synthwave, 1 = Pop Arcade, 2 = Silêncio
  var seqTimer = null;
  var seqStep = 0;
  var noiseBuffer = null;

  var NOTE_FREQ = {
    E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50, E6: 1318.51
  };

  // Station 0: Vice Synthwave (112 BPM, step = 134ms)
  var SYNTH_BASS = ['A2','A2','A2','A2','F2','F2','F2','F2','C3','C3','C3','C3','G2','G2','G2','G2'];
  var SYNTH_ARP  = ['A3','C4','E4','A4','F3','A3','C4','F4','C4','E4','G4','C5','G3','B3','D4','G4'];

  // Station 1: Pop Arcade (126 BPM, step = 119ms)
  var POP_MELODY = ['C4','E4','G4','C5','A4','G4','E4','G4','F4','A4','G4','E4','D4','F4','E4','D4'];
  var POP_BASS   = ['C3','C3','G2','G2','A2','A2','E2','E2','F2','F2','C3','C3','G2','G2','G2','B2'];

  function createNoiseBuffer(audioCtx) {
    var len = Math.floor(audioCtx.sampleRate * 0.5);
    var buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  function unlock() {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!ctx) {
        ctx = new AudioCtx();

        masterGain = ctx.createGain();
        masterGain.gain.value = muted ? 0 : 0.7;
        masterGain.connect(ctx.destination);

        musicGain = ctx.createGain();
        musicGain.gain.value = 0.22;
        musicGain.connect(masterGain);

        engineGain = ctx.createGain();
        engineGain.gain.value = 0.12;
        engineGain.connect(masterGain);

        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.45;
        sfxGain.connect(masterGain);

        noiseBuffer = createNoiseBuffer(ctx);

        // Continuous engine oscillator
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 55;

        engineFilter = ctx.createBiquadFilter();
        engineFilter.type = 'lowpass';
        engineFilter.frequency.value = 320;

        engineLevel = ctx.createGain();
        engineLevel.gain.value = 0.0001;

        engineOsc.connect(engineFilter);
        engineFilter.connect(engineLevel);
        engineLevel.connect(engineGain);
        engineOsc.start();

        // Continuous police siren oscillator
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'triangle';
        sirenOsc.frequency.value = 660;

        sirenLevel = ctx.createGain();
        sirenLevel.gain.value = 0.0001;

        sirenOsc.connect(sirenLevel);
        sirenLevel.connect(sfxGain);
        sirenOsc.start();

        restartSequencer();
      }

      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {
      // Safe fallback when audio is blocked or unsupported
    }
  }

  function setMuted(flag) {
    muted = !!flag;
    try {
      if (ctx && masterGain) {
        masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.03);
      }
    } catch (e) {}
  }

  function isMuted() {
    return muted;
  }

  function playTone(freq, type, startOffset, dur, peakGain, dest, filterFreq) {
    try {
      if (!ctx || ctx.state !== 'running') return;
      var t0 = ctx.currentTime + (startOffset || 0);
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(freq, t0);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peakGain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      if (filterFreq) {
        var f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(filterFreq, t0);
        osc.connect(f);
        f.connect(g);
      } else {
        osc.connect(g);
      }

      g.connect(dest || musicGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) {}
  }

  function playKick(dest) {
    try {
      if (!ctx || ctx.state !== 'running') return;
      var t0 = ctx.currentTime;
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, t0);
      osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.11);

      g.gain.setValueAtTime(0.42, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);

      osc.connect(g);
      g.connect(dest || musicGain);
      osc.start(t0);
      osc.stop(t0 + 0.16);
    } catch (e) {}
  }

  function playNoiseHit(filterType, freq, dur, peakGain, dest) {
    try {
      if (!ctx || ctx.state !== 'running' || !noiseBuffer) return;
      var t0 = ctx.currentTime;
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;

      var f = ctx.createBiquadFilter();
      f.type = filterType || 'bandpass';
      f.frequency.setValueAtTime(freq || 1800, t0);

      var g = ctx.createGain();
      g.gain.setValueAtTime(peakGain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      src.connect(f);
      f.connect(g);
      g.connect(dest || musicGain);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    } catch (e) {}
  }

  function runSequencerStep() {
    if (!ctx || ctx.state !== 'running' || muted || radioStation === 2) return;
    var step = seqStep % 16;
    seqStep = (seqStep + 1) % 16;

    if (radioStation === 0) {
      // Vice Synthwave (112 BPM)
      var bassF = NOTE_FREQ[SYNTH_BASS[step]];
      var arpF = NOTE_FREQ[SYNTH_ARP[step]];
      if (bassF) playTone(bassF, 'sawtooth', 0, 0.12, 0.35, musicGain, 420);
      if (arpF) playTone(arpF, 'triangle', 0, 0.11, 0.22, musicGain);
      if (step === 0 || step === 4 || step === 8 || step === 12) {
        playKick(musicGain);
      }
      if (step === 4 || step === 12) {
        playNoiseHit('bandpass', 1600, 0.09, 0.22, musicGain);
      }
    } else if (radioStation === 1) {
      // Pop Arcade (126 BPM)
      var melF = NOTE_FREQ[POP_MELODY[step]];
      var pBassF = NOTE_FREQ[POP_BASS[step]];
      if (melF) playTone(melF, 'square', 0, 0.10, 0.18, musicGain, 1800);
      if (pBassF) playTone(pBassF, 'triangle', 0, 0.11, 0.32, musicGain);
      if (step % 2 === 1) {
        playNoiseHit('highpass', 7000, 0.04, 0.14, musicGain);
      }
      if (step === 0 || step === 4 || step === 8 || step === 12) {
        playKick(musicGain);
      }
    }
  }

  function restartSequencer() {
    if (seqTimer) {
      clearInterval(seqTimer);
      seqTimer = null;
    }
    if (radioStation === 2) return;
    var stepMs = radioStation === 0 ? 134 : 119;
    seqTimer = setInterval(runSequencerStep, stepMs);
  }

  function setRadioStation(idx) {
    var next = parseInt(idx, 10);
    if (isNaN(next) || next < 0 || next > 2) next = 0;
    radioStation = next;
    seqStep = 0;
    if (ctx) restartSequencer();
  }

  function getRadioStation() {
    return radioStation;
  }

  function updateEngine(speedNorm, isMoto, active) {
    try {
      if (!ctx || !engineOsc || !engineLevel) return;
      var t = ctx.currentTime;
      if (!active || muted) {
        engineLevel.gain.setTargetAtTime(0.0001, t, 0.06);
        return;
      }
      var s = Math.max(0, Math.min(1.4, speedNorm || 0));
      var baseF = isMoto ? 95 : 55;
      var maxF = isMoto ? 290 : 185;
      var targetF = baseF + (maxF - baseF) * Math.min(1, s);
      var targetVol = 0.32 + 0.45 * Math.min(1, s);

      engineOsc.frequency.setTargetAtTime(targetF, t, 0.05);
      engineFilter.frequency.setTargetAtTime(isMoto ? 520 + s * 300 : 320 + s * 220, t, 0.05);
      engineLevel.gain.setTargetAtTime(targetVol, t, 0.05);
    } catch (e) {}
  }

  function setSirenActive(active) {
    sirenActive = !!active;
    try {
      if (sirenTimer) {
        clearInterval(sirenTimer);
        sirenTimer = null;
      }
      if (!ctx || !sirenLevel || !sirenOsc) return;
      var t = ctx.currentTime;
      if (!sirenActive) {
        sirenLevel.gain.setTargetAtTime(0.0001, t, 0.05);
        return;
      }
      sirenLevel.gain.setTargetAtTime(0.22, t, 0.05);
      sirenHigh = true;
      sirenOsc.frequency.setTargetAtTime(920, t, 0.08);
      sirenTimer = setInterval(function () {
        try {
          if (!ctx || !sirenActive) return;
          sirenHigh = !sirenHigh;
          sirenOsc.frequency.setTargetAtTime(sirenHigh ? 920 : 620, ctx.currentTime, 0.09);
        } catch (e) {}
      }, 360);
    } catch (e) {}
  }

  function playSfx(type) {
    try {
      if (!ctx) unlock();
      if (!ctx || ctx.state !== 'running' || muted) return;
      var t0 = ctx.currentTime;

      switch (type) {
        case 'horn':
          playTone(415, 'sawtooth', 0, 0.28, 0.25, sfxGain, 1200);
          playTone(523, 'sawtooth', 0, 0.28, 0.22, sfxGain, 1200);
          break;

        case 'sirenToggle':
          playTone(760, 'triangle', 0, 0.08, 0.3, sfxGain);
          playTone(1080, 'triangle', 0.07, 0.1, 0.3, sfxGain);
          break;

        case 'nitro':
          playNoiseHit('bandpass', 900, 0.32, 0.32, sfxGain);
          var nOsc = ctx.createOscillator();
          var nGain = ctx.createGain();
          nOsc.type = 'sawtooth';
          nOsc.frequency.setValueAtTime(180, t0);
          nOsc.frequency.exponentialRampToValueAtTime(580, t0 + 0.28);
          nGain.gain.setValueAtTime(0.22, t0);
          nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
          nOsc.connect(nGain);
          nGain.connect(sfxGain);
          nOsc.start(t0);
          nOsc.stop(t0 + 0.32);
          break;

        case 'jump':
          playTone(NOTE_FREQ.C5, 'triangle', 0.00, 0.10, 0.35, sfxGain);
          playTone(NOTE_FREQ.E5, 'triangle', 0.07, 0.10, 0.35, sfxGain);
          playTone(NOTE_FREQ.G5, 'triangle', 0.14, 0.12, 0.38, sfxGain);
          playTone(NOTE_FREQ.C6, 'triangle', 0.21, 0.22, 0.42, sfxGain);
          break;

        case 'pickup':
          playTone(NOTE_FREQ.E5, 'sine', 0.00, 0.09, 0.35, sfxGain);
          playTone(NOTE_FREQ.B5, 'sine', 0.06, 0.10, 0.35, sfxGain);
          playTone(NOTE_FREQ.E6, 'sine', 0.12, 0.16, 0.38, sfxGain);
          break;

        case 'paint':
          playNoiseHit('bandpass', 2400, 0.26, 0.28, sfxGain);
          playTone(NOTE_FREQ.C5, 'triangle', 0.12, 0.12, 0.3, sfxGain);
          playTone(NOTE_FREQ.E5, 'triangle', 0.20, 0.12, 0.32, sfxGain);
          playTone(NOTE_FREQ.G5, 'triangle', 0.28, 0.14, 0.34, sfxGain);
          playTone(NOTE_FREQ.C6, 'triangle', 0.36, 0.24, 0.38, sfxGain);
          break;

        case 'hit':
          var hOsc = ctx.createOscillator();
          var hGain = ctx.createGain();
          hOsc.type = 'sine';
          hOsc.frequency.setValueAtTime(150, t0);
          hOsc.frequency.exponentialRampToValueAtTime(42, t0 + 0.14);
          hGain.gain.setValueAtTime(0.45, t0);
          hGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
          hOsc.connect(hGain);
          hGain.connect(sfxGain);
          hOsc.start(t0);
          hOsc.stop(t0 + 0.18);
          playNoiseHit('lowpass', 700, 0.10, 0.28, sfxGain);
          break;

        case 'emp':
          var eOsc = ctx.createOscillator();
          var eGain = ctx.createGain();
          eOsc.type = 'sawtooth';
          eOsc.frequency.setValueAtTime(920, t0);
          eOsc.frequency.exponentialRampToValueAtTime(140, t0 + 0.28);
          eGain.gain.setValueAtTime(0.35, t0);
          eGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.30);
          eOsc.connect(eGain);
          eGain.connect(sfxGain);
          eOsc.start(t0);
          eOsc.stop(t0 + 0.32);
          playKick(sfxGain);
          break;

        case 'ticket':
          // Friendly cartoon police whistle trill
          for (var i = 0; i < 6; i++) {
            playTone(i % 2 === 0 ? 2200 : 2550, 'sine', i * 0.06, 0.055, 0.22, sfxGain);
          }
          break;

        case 'victory':
          playTone(NOTE_FREQ.C5, 'triangle', 0.00, 0.16, 0.36, sfxGain);
          playTone(NOTE_FREQ.E5, 'triangle', 0.12, 0.16, 0.36, sfxGain);
          playTone(NOTE_FREQ.G5, 'triangle', 0.24, 0.16, 0.38, sfxGain);
          playTone(NOTE_FREQ.C6, 'triangle', 0.38, 0.42, 0.44, sfxGain);
          playTone(NOTE_FREQ.G5, 'triangle', 0.38, 0.42, 0.25, sfxGain);
          break;

        case 'wave':
          playTone(620, 'sine', 0.00, 0.08, 0.26, sfxGain);
          playTone(880, 'sine', 0.07, 0.12, 0.28, sfxGain);
          break;
      }
    } catch (e) {}
  }

  window.GTC.Audio = {
    unlock: unlock,
    setMuted: setMuted,
    isMuted: isMuted,
    setRadioStation: setRadioStation,
    getRadioStation: getRadioStation,
    updateEngine: updateEngine,
    playSfx: playSfx,
    setSirenActive: setSirenActive
  };
})();
