// Grand Turbo City: Vice Neon — Procedural Canvas Textures (window.GTC.Textures)
(function () {
  'use strict';

  window.GTC = window.GTC || {};

  var cache = {};
  var initialized = false;

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function toTexture(canvas, repeatX, repeatY) {
    var tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (repeatX && repeatY) {
      tex.repeat.set(repeatX, repeatY);
    }
    tex.needsUpdate = true;
    return tex;
  }

  function createRoadTexture() {
    var c = makeCanvas(256, 256);
    var ctx = c.getContext('2d');

    // Dark asphalt base
    ctx.fillStyle = '#1e2433';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle asphalt grain
    for (var i = 0; i < 650; i++) {
      var gx = (i * 73) % 256;
      var gy = (i * 137) % 256;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(gx, gy, 3, 3);
    }

    // Outer white lines
    ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
    ctx.fillRect(10, 0, 6, 256);
    ctx.fillRect(240, 0, 6, 256);

    // Subtle Vice Neon curb glow on outer edges
    ctx.fillStyle = 'rgba(34, 211, 238, 0.35)';
    ctx.fillRect(0, 0, 5, 256);
    ctx.fillStyle = 'rgba(236, 72, 153, 0.35)';
    ctx.fillRect(251, 0, 5, 256);

    // Dashed yellow center line
    ctx.fillStyle = '#facc15';
    for (var y = 12; y < 256; y += 64) {
      ctx.fillRect(124, y, 8, 36);
    }

    return toTexture(c);
  }

  function createCrosswalkTexture() {
    var c = makeCanvas(256, 256);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#1e2433';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle grain
    for (var i = 0; i < 300; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect((i * 53) % 256, (i * 97) % 256, 3, 3);
    }

    // Crisp zebra stripes
    ctx.fillStyle = '#f8fafc';
    for (var x = 22; x < 236; x += 36) {
      ctx.fillRect(x, 24, 20, 208);
    }

    return toTexture(c);
  }

  function createBuildingTexture(variant) {
    var c = makeCanvas(256, 512);
    var ctx = c.getContext('2d');

    var palettes = [
      { wall: '#1e1b4b', trim: '#22d3ee', winA: '#67e8f9', winB: '#fde047', winOff: '#0f172a' },
      { wall: '#3b0764', trim: '#ec4899', winA: '#f472b6', winB: '#fef08a', winOff: '#1e1b4b' },
      { wall: '#0f2942', trim: '#38bdf8', winA: '#7dd3fc', winB: '#ffffff', winOff: '#081b2e' },
      { wall: '#3f1d38', trim: '#fb923c', winA: '#fed7aa', winB: '#f472b6', winOff: '#1f1024' }
    ];
    var p = palettes[variant % palettes.length];

    ctx.fillStyle = p.wall;
    ctx.fillRect(0, 0, 256, 512);

    // Vertical architectural stripes
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 0, 12, 512);
    ctx.fillRect(244, 0, 12, 512);

    // Horizontal neon accent bands
    ctx.fillStyle = p.trim;
    ctx.fillRect(0, 12, 256, 8);
    ctx.fillRect(0, 248, 256, 6);
    ctx.fillRect(0, 492, 256, 10);

    // Window grid
    var cols = 6;
    var rows = 12;
    var padX = 16;
    var padY = 30;
    var cellW = (256 - padX * 2) / cols;
    var cellH = (460 - padY) / rows;

    for (var r = 0; r < rows; r++) {
      for (var col = 0; col < cols; col++) {
        var wx = padX + col * cellW + 5;
        var wy = padY + r * cellH + 5;
        var ww = cellW - 10;
        var wh = cellH - 10;

        var hash = (r * 17 + col * 31 + variant * 13) % 10;
        if (hash < 2) {
          ctx.fillStyle = p.winOff;
        } else if (hash < 6) {
          ctx.fillStyle = p.winA;
        } else {
          ctx.fillStyle = p.winB;
        }
        ctx.fillRect(wx, wy, ww, wh);

        // Window mullion highlight
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(wx, wy, ww, 3);
      }
    }

    return toTexture(c);
  }

  function createSandTexture() {
    var c = makeCanvas(256, 256);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#f3d08a';
    ctx.fillRect(0, 0, 256, 256);

    // Soft wave ripples in sand
    ctx.fillStyle = 'rgba(255, 248, 220, 0.35)';
    for (var y = 0; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (var x = 0; x <= 256; x += 32) {
        ctx.lineTo(x, y + Math.sin((x / 256) * Math.PI * 2) * 5);
      }
      ctx.lineTo(256, y + 10);
      ctx.lineTo(0, y + 10);
      ctx.closePath();
      ctx.fill();
    }

    // Warm speckles
    for (var i = 0; i < 600; i++) {
      var sx = (i * 67) % 256;
      var sy = (i * 113) % 256;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(217, 155, 67, 0.35)' : 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(sx, sy, 2, 2);
    }

    return toTexture(c, 6, 18);
  }

  function createWaterTexture() {
    var c = makeCanvas(256, 256);
    var ctx = c.getContext('2d');

    var grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#06b6d4');
    grad.addColorStop(0.5, '#0891b2');
    grad.addColorStop(1, '#0284c7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Stylized turquoise foam waves
    ctx.strokeStyle = 'rgba(165, 243, 252, 0.55)';
    ctx.lineWidth = 4;
    for (var y = 16; y < 256; y += 32) {
      ctx.beginPath();
      for (var x = 0; x <= 256; x += 16) {
        var wy = y + Math.sin((x / 256) * Math.PI * 4 + y) * 5;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    // Bright sparkles
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (var i = 0; i < 45; i++) {
      ctx.fillRect((i * 89) % 250, (i * 149) % 250, 6, 2);
    }

    return toTexture(c, 8, 22);
  }

  function createGrassTexture() {
    var c = makeCanvas(256, 256);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle mowed stripes
    ctx.fillStyle = 'rgba(22, 163, 74, 0.28)';
    for (var x = 0; x < 256; x += 64) {
      ctx.fillRect(x, 0, 32, 256);
    }

    // Grass tufts
    for (var i = 0; i < 500; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(134, 239, 172, 0.35)' : 'rgba(21, 128, 61, 0.25)';
      ctx.fillRect((i * 47) % 256, (i * 83) % 256, 3, 4);
    }

    return toTexture(c, 6, 6);
  }

  function createPlazaTexture() {
    var c = makeCanvas(256, 256);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 256, 256);

    // Checker tiles
    var tile = 64;
    for (var y = 0; y < 256; y += tile) {
      for (var x = 0; x < 256; x += tile) {
        var even = ((x / tile) + (y / tile)) % 2 === 0;
        ctx.fillStyle = even ? '#e2e8f0' : '#bae6fd';
        ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
      }
    }

    // Neon accent dots at intersections
    ctx.fillStyle = '#ec4899';
    for (var dy = 0; dy <= 256; dy += 128) {
      for (var dx = 0; dx <= 256; dx += 128) {
        ctx.fillRect(dx - 3, dy - 3, 6, 6);
      }
    }

    return toTexture(c, 4, 4);
  }

  function createRampTexture() {
    var c = makeCanvas(256, 256);
    var ctx = c.getContext('2d');

    // Dark base
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, 256, 256);

    // Yellow/black checkered side borders
    var sq = 32;
    for (var y = 0; y < 256; y += sq) {
      var isYellow = (y / sq) % 2 === 0;
      ctx.fillStyle = isYellow ? '#facc15' : '#0f172a';
      ctx.fillRect(0, y, 28, sq);
      ctx.fillRect(228, y, 28, sq);
    }

    // Neon cyan & magenta forward chevrons (pointing toward top of canvas / launch lip)
    for (var cy = 220; cy >= 44; cy -= 56) {
      ctx.strokeStyle = (cy % 112 === 0) ? '#22d3ee' : '#ec4899';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(56, cy + 20);
      ctx.lineTo(128, cy - 16);
      ctx.lineTo(200, cy + 20);
      ctx.stroke();
    }

    return toTexture(c);
  }

  function createContainerTexture() {
    var c = makeCanvas(256, 128);
    var ctx = c.getContext('2d');

    // Neutral light base so material color tints it vibrantly
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 256, 128);

    // Corrugated ribs
    for (var x = 8; x < 248; x += 16) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.fillRect(x, 12, 6, 104);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(x + 6, 12, 4, 104);
    }

    // Top/bottom frame bars
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(0, 0, 256, 12);
    ctx.fillRect(0, 116, 256, 12);

    // Cargo stripe
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillRect(24, 54, 72, 20);

    return toTexture(c);
  }

  function makeSignTexture(text, bgColor, borderColor, textColor) {
    var c = makeCanvas(512, 128);
    var ctx = c.getContext('2d');

    ctx.fillStyle = bgColor || '#0f172a';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = borderColor || '#22d3ee';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 112);

    ctx.fillStyle = textColor || '#ffffff';
    ctx.font = 'bold 46px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 66);

    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function init() {
    if (initialized) return cache;
    cache.road = createRoadTexture();
    cache.crosswalk = createCrosswalkTexture();
    cache.building0 = createBuildingTexture(0);
    cache.building1 = createBuildingTexture(1);
    cache.building2 = createBuildingTexture(2);
    cache.building3 = createBuildingTexture(3);
    cache.sand = createSandTexture();
    cache.water = createWaterTexture();
    cache.grass = createGrassTexture();
    cache.plaza = createPlazaTexture();
    cache.ramp = createRampTexture();
    cache.container = createContainerTexture();
    initialized = true;
    return cache;
  }

  function get(name) {
    if (!initialized) init();
    return cache[name] || cache.road;
  }

  window.GTC.Textures = {
    init: init,
    get: get,
    makeSignTexture: makeSignTexture
  };
})();
