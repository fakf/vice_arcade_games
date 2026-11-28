// Grand Turbo City — Realistic Web Audio Engine, V8 Interceptor & Police Siren DSP (window.GTC.Audio)
(function () {
  'use strict';

  window.GTC = window.GTC || {};

  var ctx = null;
  var masterGain = null;
  var musicGain = null;
  var engineGain = null;
  var sfxGain = null;

  // Dual-oscillator realistic engine synth
  var engineOsc1 = null;
  var engineOsc2 = null;
  var engineSubGain = null;
  var engineFilter = null;
  var engineLevel = null;
  var lastGear = 1;

  // Realistic Compression-Horn Police Siren + Multi-Cruiser Chorus + Urban Echo
  var sirenOscMain = null;
  var sirenOscHarm = null;
  var sirenOscUnit2 = null;
  var sirenUnit2Gain = null;
  var sirenHornPeak = null;
  var sirenLowpass = null;
  var sirenLevel = null;
  var sirenEchoDelay = null;
  var sirenEchoGain = null;

  var sirenActive = false;
  var sirenUpdateTimer = null;
  var sirenPhase = 0;
  var sirenPhase2 = 0.37;
  var sirenMode = 'wail';     // 'wail' | 'yelp' | 'piercer'
  var sirenTargetGain = 0.24;
  var sirenDoppler = 1.0;
  var sirenCutoff = 3100;
  var sirenMultiUnit = false;
  var dispatchCooldown = 5.0;

  var muted = false;
  var radioStation = 0; // 0 = West Coast Synth, 1 = Pop, 2 = Silêncio
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

  var SYNTH_BASS = ['A2','A2','A2','A2','F2','F2','F2','F2','C3','C3','C3','C3','G2','G2','G2','G2'];
  var SYNTH_ARP  = ['A3','C4','E4','A4','F3','A3','C4','F4','C4','E4','G4','C5','G3','B3','D4','G4'];

  var POP_MELODY = ['C4','E4','G4','C5','A4','G4','E4','G4','F4','A4','G4','E4','D4','F4','E4','D4'];
  var POP_BASS   = ['C3','C3','G2','G2','A2','A2','E2','E2','F2','F2','C3','C3','G2','G2','G2','B2'];

  function createNoiseBuffer(audioCtx) {
    var len = Math.floor(audioCtx.sampleRate * 0.6);
    var buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  // Mild analog compression-driver saturation curve
  function makeHornSaturationCurve() {
    var samples = 512;
    var curve = new Float32Array(samples);
    for (var i = 0; i < samples; i++) {
      var x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 2.1) * 0.88;
    }
    return curve;
  }

  function unlock() {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!ctx) {
        ctx = new AudioCtx();

        masterGain = ctx.createGain();
        masterGain.gain.value = muted ? 0 : 0.72;
        masterGain.connect(ctx.destination);

        musicGain = ctx.createGain();
        musicGain.gain.value = 0.20;
        musicGain.connect(masterGain);

        engineGain = ctx.createGain();
        engineGain.gain.value = 0.14;
        engineGain.connect(masterGain);

        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.48;
        sfxGain.connect(masterGain);

        noiseBuffer = createNoiseBuffer(ctx);

        // -------------------------------------------------------------------
        // 1. Realistic Dual-Oscillator Automotive / V8 Interceptor Engine
        // -------------------------------------------------------------------
        engineOsc1 = ctx.createOscillator();
        engineOsc1.type = 'sawtooth';
        engineOsc1.frequency.value = 52;

        engineOsc2 = ctx.createOscillator();
        engineOsc2.type = 'triangle';
        engineOsc2.frequency.value = 26;

        engineSubGain = ctx.createGain();
        engineSubGain.gain.value = 0.55;

        engineFilter = ctx.createBiquadFilter();
        engineFilter.type = 'lowpass';
        engineFilter.frequency.value = 300;
        engineFilter.Q.value = 2.2;

        engineLevel = ctx.createGain();
        engineLevel.gain.value = 0.0001;

        engineOsc1.connect(engineFilter);
        engineOsc2.connect(engineSubGain);
        engineSubGain.connect(engineFilter);
        engineFilter.connect(engineLevel);
        engineLevel.connect(engineGain);
        engineOsc1.start();
        engineOsc2.start();

        // -------------------------------------------------------------------
        // 2. Realistic Compression-Horn Police Siren + Urban Slapback Echo
        // -------------------------------------------------------------------
        var sirenBus = ctx.createGain();
        sirenBus.gain.value = 1.0;

        // Primary squad car siren (sawtooth + square blend for PA300 horn bite)
        sirenOscMain = ctx.createOscillator();
        sirenOscMain.type = 'sawtooth';
        sirenOscMain.frequency.value = 620;

        sirenOscHarm = ctx.createOscillator();
        sirenOscHarm.type = 'square';
        sirenOscHarm.frequency.value = 622;
        var harmMix = ctx.createGain();
        harmMix.gain.value = 0.28;

        // Secondary squad car siren (active during multi-star chases!)
        sirenOscUnit2 = ctx.createOscillator();
        sirenOscUnit2.type = 'sawtooth';
        sirenOscUnit2.frequency.value = 720;
        sirenUnit2Gain = ctx.createGain();
        sirenUnit2Gain.gain.value = 0.0001;

        sirenOscMain.connect(sirenBus);
        sirenOscHarm.connect(harmMix);
        harmMix.connect(sirenBus);
        sirenOscUnit2.connect(sirenUnit2Gain);
        sirenUnit2Gain.connect(sirenBus);

        // Horn high-pass (460 Hz) -> Horn throat resonance (1280 Hz) -> Soft clip -> Distance lowpass
        var hornHighpass = ctx.createBiquadFilter();
        hornHighpass.type = 'highpass';
        hornHighpass.frequency.value = 460;

        sirenHornPeak = ctx.createBiquadFilter();
        sirenHornPeak.type = 'peaking';
        sirenHornPeak.frequency.value = 1280;
        sirenHornPeak.Q.value = 1.65;
        sirenHornPeak.gain.value = 5.5;

        var shaper = ctx.createWaveShaper();
        shaper.curve = makeHornSaturationCurve();
        shaper.oversample = '2x';

        sirenLowpass = ctx.createBiquadFilter();
        sirenLowpass.type = 'lowpass';
        sirenLowpass.frequency.value = 3100;
        sirenLowpass.Q.value = 0.7;

        sirenLevel = ctx.createGain();
        sirenLevel.gain.value = 0.0001;

        // City street canyon slapback echo (128ms)
        sirenEchoDelay = ctx.createDelay(0.4);
        sirenEchoDelay.delayTime.value = 0.128;
        var echoFeedback = ctx.createGain();
        echoFeedback.gain.value = 0.22;
        var echoFilter = ctx.createBiquadFilter();
        echoFilter.type = 'bandpass';
        echoFilter.frequency.value = 1350;
        echoFilter.Q.value = 0.9;
        sirenEchoGain = ctx.createGain();
        sirenEchoGain.gain.value = 0.20;

        sirenBus.connect(hornHighpass);
        hornHighpass.connect(sirenHornPeak);
        sirenHornPeak.connect(shaper);
        shaper.connect(sirenLowpass);
        sirenLowpass.connect(sirenLevel);

        // Dry + Urban Echo to sfxGain
        sirenLevel.connect(sfxGain);
        sirenLevel.connect(sirenEchoDelay);
        sirenEchoDelay.connect(echoFilter);
        echoFilter.connect(sirenEchoGain);
        sirenEchoGain.connect(sfxGain);
        echoFilter.connect(echoFeedback);
        echoFeedback.connect(sirenEchoDelay);

        sirenOscMain.start();
        sirenOscHarm.start();
        sirenOscUnit2.start();

        restartSequencer();
      }

      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {
      // Safe fallback when audio is blocked
    }
  }

  function setMuted(flag) {
    muted = !!flag;
    try {
      if (ctx && masterGain) {
        masterGain.gain.setTargetAtTime(muted ? 0 : 0.72, ctx.currentTime, 0.03);
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

  function playNoiseHit(filterType, freq, dur, peakGain, dest, startOffset) {
    try {
      if (!ctx || ctx.state !== 'running' || !noiseBuffer) return;
      var t0 = ctx.currentTime + (startOffset || 0);
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;

      var f = ctx.createBiquadFilter();
      f.type = filterType || 'bandpass';
      f.frequency.setValueAtTime(freq || 1800, t0);
      f.Q.value = 1.6;

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
      var bassF = NOTE_FREQ[SYNTH_BASS[step]];
      var arpF = NOTE_FREQ[SYNTH_ARP[step]];
      if (bassF) playTone(bassF, 'sawtooth', 0, 0.12, 0.35, musicGain, 420);
      if (arpF) playTone(arpF, 'triangle', 0, 0.11, 0.22, musicGain);
      if (step === 0 || step === 4 || step === 8 || step === 12) playKick(musicGain);
      if (step === 4 || step === 12) playNoiseHit('bandpass', 1600, 0.09, 0.22, musicGain);
    } else if (radioStation === 1) {
      var melF = NOTE_FREQ[POP_MELODY[step]];
      var pBassF = NOTE_FREQ[POP_BASS[step]];
      if (melF) playTone(melF, 'square', 0, 0.10, 0.18, musicGain, 1800);
      if (pBassF) playTone(pBassF, 'triangle', 0, 0.11, 0.32, musicGain);
      if (step % 2 === 1) playNoiseHit('highpass', 7000, 0.04, 0.14, musicGain);
      if (step === 0 || step === 4 || step === 8 || step === 12) playKick(musicGain);
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

  // ===========================================================================
  // Realistic 4-Gear Engine + Police V8 Interceptor Burble
  // ===========================================================================
  function updateEngine(speedNorm, vehTypeOrIsMoto, active) {
    try {
      if (!ctx || !engineOsc1 || !engineLevel) return;
      var t = ctx.currentTime;
      if (!active || muted) {
        engineLevel.gain.setTargetAtTime(0.0001, t, 0.06);
        return;
      }

      var isMoto = vehTypeOrIsMoto === true || vehTypeOrIsMoto === 'moto';
      var isPolice = vehTypeOrIsMoto === 'police';
      var isHeavy = vehTypeOrIsMoto === 'truck' || vehTypeOrIsMoto === 'van';

      var s = Math.max(0, Math.min(1.35, speedNorm || 0));

      // Simulate realistic 4-speed automatic transmission RPM climb!
      var gearThresholds = [0, 0.24, 0.50, 0.78, 1.40];
      var gear = 1;
      for (var g = 0; g < 4; g++) {
        if (s >= gearThresholds[g]) gear = g + 1;
      }
      var gMin = gearThresholds[gear - 1];
      var gMax = gearThresholds[gear];
      var inGearFrac = Math.max(0, Math.min(1, (s - gMin) / (gMax - gMin)));
      // Blend overall speed with per-gear RPM climb so shifts sound punchy & natural
      var rpmNorm = s < 0.03 ? 0 : (0.18 + 0.52 * inGearFrac + 0.35 * Math.min(1, s));

      var idleHz = isMoto ? 88 : (isPolice ? 46 : (isHeavy ? 40 : 52));
      var redlineHz = isMoto ? 295 : (isPolice ? 178 : (isHeavy ? 142 : 192));
      var targetF = idleHz + (redlineHz - idleHz) * rpmNorm;

      // V8 cross-plane sub-harmonic burble stronger on Police Interceptor & Truck
      var subRatio = isMoto ? 0.5 : (isPolice ? 0.75 : 0.5);
      var subMix = isMoto ? 0.22 : (isPolice ? 0.85 : (isHeavy ? 0.80 : 0.52));

      engineOsc1.frequency.setTargetAtTime(targetF, t, 0.042);
      engineOsc2.frequency.setTargetAtTime(targetF * subRatio, t, 0.042);
      engineSubGain.gain.setTargetAtTime(subMix, t, 0.05);

      var filterHz = isMoto
        ? (480 + rpmNorm * 620)
        : (isPolice ? (280 + rpmNorm * 560) : (260 + rpmNorm * 420));
      engineFilter.frequency.setTargetAtTime(filterHz, t, 0.045);

      var targetVol = (isPolice ? 0.42 : 0.34) + 0.46 * Math.min(1, s);
      engineLevel.gain.setTargetAtTime(targetVol, t, 0.05);

      if (gear > lastGear && s > 0.18) {
        // Subtle exhaust pop on upshift
        playNoiseHit('lowpass', 420, 0.045, 0.08, engineGain);
      }
      lastGear = gear;
    } catch (e) {}
  }

  // ===========================================================================
  // Authentic Sweeping American Siren Curve (Federal Signal PA300 Wail/Yelp/Piercer)
  // ===========================================================================
  function evalSirenSweep(phase01, mode) {
    // Asymmetric capacitor charge/discharge curve: steep initial rise, rounded crest, longer decay
    var u;
    if (mode === 'yelp') {
      // Fast urgent triangle-exponential sweep (650 Hz .. 1460 Hz)
      var tri = phase01 < 0.46 ? (phase01 / 0.46) : (1 - (phase01 - 0.46) / 0.54);
      u = Math.pow(Math.max(0, tri), 0.78);
      return 650 * Math.pow(1460 / 650, u);
    }
    if (mode === 'piercer') {
      // Ultra-urgent close-range priority phaser (760 Hz .. 1540 Hz)
      var pTri = phase01 < 0.5 ? (phase01 * 2) : (2 - phase01 * 2);
      return 760 * Math.pow(1540 / 760, pTri);
    }
    // Classic American WAIL: 4.3s cycle — rises 0..0.44, lingers near peak, falls 0.44..1.0
    if (phase01 < 0.44) {
      var r = phase01 / 0.44;
      u = 1 - Math.pow(1 - r, 2.15);
    } else {
      var f = (phase01 - 0.44) / 0.56;
      u = Math.pow(1 - f, 1.45);
    }
    return 585 * Math.pow(1360 / 585, u);
  }

  function stepSirenDSP() {
    try {
      if (!ctx || !sirenActive || muted || ctx.state !== 'running') return;
      var dt = 0.030; // 33 Hz smooth control rate
      var t = ctx.currentTime;

      var rate = sirenMode === 'piercer' ? 9.5 : (sirenMode === 'yelp' ? 3.25 : 0.235);
      sirenPhase = (sirenPhase + dt * rate) % 1.0;
      sirenPhase2 = (sirenPhase2 + dt * (sirenMode === 'wail' ? 0.275 : 2.85)) % 1.0;

      var freq1 = evalSirenSweep(sirenPhase, sirenMode) * sirenDoppler;
      var freq2 = evalSirenSweep(sirenPhase2, sirenMode === 'piercer' ? 'yelp' : 'wail') * (2 - sirenDoppler);

      sirenOscMain.frequency.setTargetAtTime(freq1, t, 0.022);
      sirenOscHarm.frequency.setTargetAtTime(freq1 * 1.003, t, 0.022);
      sirenOscUnit2.frequency.setTargetAtTime(freq2, t, 0.025);

      sirenLowpass.frequency.setTargetAtTime(sirenCutoff, t, 0.06);
      sirenLevel.gain.setTargetAtTime(sirenTargetGain, t, 0.06);
      sirenUnit2Gain.gain.setTargetAtTime(sirenMultiUnit ? 0.42 : 0.0001, t, 0.12);

      // Subtle VHF Police Dispatch Radio squelch chatter every ~12s during chases
      dispatchCooldown -= dt;
      if (dispatchCooldown <= 0) {
        dispatchCooldown = 10.5 + Math.random() * 5.5;
        playPoliceRadioDispatch();
      }
    } catch (e) {}
  }

  function setSirenActive(active, modeOpt) {
    var nextActive = !!active;
    if (modeOpt) sirenMode = modeOpt;

    if (nextActive === sirenActive) return;
    sirenActive = nextActive;

    try {
      if (sirenUpdateTimer) {
        clearInterval(sirenUpdateTimer);
        sirenUpdateTimer = null;
      }
      if (!ctx || !sirenLevel) return;
      var t = ctx.currentTime;

      if (!sirenActive) {
        sirenLevel.gain.setTargetAtTime(0.0001, t, 0.06);
        if (sirenUnit2Gain) sirenUnit2Gain.gain.setTargetAtTime(0.0001, t, 0.06);
        return;
      }

      sirenPhase = 0.04;
      dispatchCooldown = 4.5;
      sirenLevel.gain.setTargetAtTime(sirenTargetGain, t, 0.06);
      sirenUpdateTimer = setInterval(stepSirenDSP, 30);
    } catch (e) {}
  }

  // Updates 3D distance attenuation, horn muffling, Doppler shift & Wail/Yelp urgency!
  function updatePoliceContext(opts) {
    var o = opts || {};
    if (o.playerSirenMode) {
      // Player is driving the Police Interceptor with roof siren ON!
      sirenMode = o.playerSirenMode; // 'wail' | 'yelp'
      sirenTargetGain = 0.24;
      sirenCutoff = 3250;
      sirenDoppler = 1.0;
      sirenMultiUnit = (o.policeCount || 0) >= 1;
      if (!sirenActive) setSirenActive(true, sirenMode);
      return;
    }

    var count = o.policeCount || 0;
    if (count <= 0) {
      if (sirenActive) setSirenActive(false);
      return;
    }

    var dist = o.minDist !== undefined ? o.minDist : 40;
    var closingVel = o.closingSpeed || 0; // + when police approaching, - when pulling away

    // Automatic pursuit escalation based on proximity!
    if (dist < 11.5) {
      sirenMode = 'piercer';
    } else if (dist < 32) {
      sirenMode = 'yelp';
    } else {
      sirenMode = 'wail';
    }

    // Realistic inverse-distance volume & building occlusion lowpass filter
    var prox = Math.max(0, Math.min(1, 1 - (dist - 8) / 115));
    sirenTargetGain = 0.055 + prox * 0.21;
    sirenCutoff = 1250 + prox * 2150;
    sirenDoppler = Math.max(0.94, Math.min(1.06, 1 + closingVel * 0.0014));
    sirenMultiUnit = count >= 2;

    if (!sirenActive) setSirenActive(true, sirenMode);
  }

  // Authentic American Police Double-Chirp ("WHOOP! WHOOP!")
  function playPoliceChirp() {
    try {
      if (!ctx || ctx.state !== 'running' || muted) return;
      for (var c = 0; c < 2; c++) {
        var t0 = ctx.currentTime + c * 0.145;
        var osc = ctx.createOscillator();
        var osc2 = ctx.createOscillator();
        var bp = ctx.createBiquadFilter();
        var g = ctx.createGain();

        osc.type = 'sawtooth';
        osc2.type = 'square';
        osc.frequency.setValueAtTime(520, t0);
        osc.frequency.exponentialRampToValueAtTime(1480, t0 + 0.115);
        osc2.frequency.setValueAtTime(524, t0);
        osc2.frequency.exponentialRampToValueAtTime(1490, t0 + 0.115);

        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1300, t0);
        bp.Q.value = 1.2;

        g.gain.setValueAtTime(0.001, t0);
        g.gain.linearRampToValueAtTime(0.32, t0 + 0.012);
        g.gain.setValueAtTime(0.28, t0 + 0.095);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);

        osc.connect(bp);
        osc2.connect(bp);
        bp.connect(g);
        g.connect(sfxGain);

        osc.start(t0);
        osc2.start(t0);
        osc.stop(t0 + 0.14);
        osc2.stop(t0 + 0.14);
      }
    } catch (e) {}
  }

  // Authentic Grover Electronic Police Bullhorn / Air Horn ("BWAAAH!")
  function playPoliceAirHorn() {
    try {
      if (!ctx || ctx.state !== 'running' || muted) return;
      var t0 = ctx.currentTime;
      var freqs = [155.56, 207.65, 311.13]; // Brassy dissonant police air-horn triad
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1650, t0);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(0.34, t0 + 0.018);
      g.gain.setValueAtTime(0.30, t0 + 0.22);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.30);

      lp.connect(g);
      g.connect(sfxGain);

      for (var i = 0; i < freqs.length; i++) {
        var o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(freqs[i], t0);
        o.connect(lp);
        o.start(t0);
        o.stop(t0 + 0.32);
      }
    } catch (e) {}
  }

  // Subtle VHF Police Dispatch Radio Squelch + Bandpassed Voice Cadence + Motorola Beep
  function playPoliceRadioDispatch() {
    try {
      if (!ctx || ctx.state !== 'running' || muted) return;
      var t0 = ctx.currentTime;

      // Opening static squelch click ("Kshh!")
      playNoiseHit('bandpass', 2300, 0.055, 0.11, sfxGain, 0);

      // Muffled VHF dispatch speech syllables (narrow 900..2100 Hz radio bandpass)
      var syllables = 3 + Math.floor(Math.random() * 2);
      var offset = 0.06;
      for (var s = 0; s < syllables; s++) {
        var dur = 0.075 + Math.random() * 0.065;
        var pitch = 155 + Math.random() * 65;
        var vOsc = ctx.createOscillator();
        var vBp = ctx.createBiquadFilter();
        var vG = ctx.createGain();

        vOsc.type = 'sawtooth';
        vOsc.frequency.setValueAtTime(pitch, t0 + offset);
        vOsc.frequency.linearRampToValueAtTime(pitch * (0.92 + Math.random() * 0.18), t0 + offset + dur);

        vBp.type = 'bandpass';
        vBp.frequency.setValueAtTime(1150 + Math.random() * 550, t0 + offset);
        vBp.Q.value = 3.8;

        vG.gain.setValueAtTime(0.0001, t0 + offset);
        vG.gain.linearRampToValueAtTime(0.085, t0 + offset + 0.015);
        vG.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + dur);

        vOsc.connect(vBp);
        vBp.connect(vG);
        vG.connect(sfxGain);
        vOsc.start(t0 + offset);
        vOsc.stop(t0 + offset + dur + 0.01);

        offset += dur + 0.03;
      }

      // Closing Motorola MDC-style acknowledgment tone + static squelch tail
      playTone(1200, 'sine', offset, 0.035, 0.07, sfxGain);
      playTone(1800, 'sine', offset + 0.035, 0.04, 0.07, sfxGain);
      playNoiseHit('bandpass', 2400, 0.065, 0.10, sfxGain, offset + 0.07);
    } catch (e) {}
  }

  function playSfx(type) {
    try {
      if (!ctx) unlock();
      if (!ctx || ctx.state !== 'running' || muted) return;
      var t0 = ctx.currentTime;

      switch (type) {
        case 'horn':
          playTone(415, 'sawtooth', 0, 0.28, 0.24, sfxGain, 1300);
          playTone(523, 'sawtooth', 0, 0.28, 0.21, sfxGain, 1300);
          break;

        case 'sirenToggle':
        case 'policeChirp':
          playPoliceChirp();
          break;

        case 'policeHorn':
          playPoliceAirHorn();
          break;

        case 'sirenOff':
          playNoiseHit('bandpass', 2200, 0.05, 0.14, sfxGain, 0);
          playTone(540, 'triangle', 0, 0.06, 0.16, sfxGain);
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
          // Realistic short police siren yelp burst + air horn pull-over!
          playPoliceChirp();
          playPoliceAirHorn();
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
    setSirenActive: setSirenActive,
    updatePoliceContext: updatePoliceContext
  };
})();
