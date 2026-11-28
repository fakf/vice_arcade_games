// Grand Turbo City — Realistic Procedural HD Textures & Sky Maps (window.GTC.Textures)
(function () {
  'use strict';

  window.GTC = window.GTC || {};

  var cache = {};
  var initialized = false;
  var maxAniso = 4;

  // Deterministic PRNG for rich, repeatable surface grain
  function hash2(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  }

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function toTexture(canvas, repeatX, repeatY, clampVertical) {
    var tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = clampVertical ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    if (repeatX && repeatY) {
      tex.repeat.set(repeatX, repeatY);
    }
    tex.anisotropy = maxAniso;
    tex.needsUpdate = true;
    return tex;
  }

  // ---------------------------------------------------------------------------
  // 1. Weathered Urban Asphalt Road (512x512)
  // ---------------------------------------------------------------------------
  function createRoadTexture() {
    var c = makeCanvas(512, 512);
    var ctx = c.getContext('2d');

    // Realistic sun-baked dark grey asphalt
    ctx.fillStyle = '#2d3036';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle darker tire-wear tracks in the two lanes
    var lanePositions = [115, 175, 337, 397];
    for (var lp = 0; lp < lanePositions.length; lp++) {
      var lg = ctx.createLinearGradient(lanePositions[lp] - 26, 0, lanePositions[lp] + 26, 0);
      lg.addColorStop(0, 'rgba(15,17,20,0)');
      lg.addColorStop(0.5, 'rgba(15,17,20,0.26)');
      lg.addColorStop(1, 'rgba(15,17,20,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lanePositions[lp] - 26, 0, 52, 512);
    }

    // Fine mineral aggregate noise
    for (var i = 0; i < 5500; i++) {
      var gx = Math.floor(hash2(i, 1.3) * 512);
      var gy = Math.floor(hash2(i, 7.9) * 512);
      var bright = hash2(i, 3.7);
      if (bright > 0.62) {
        ctx.fillStyle = 'rgba(215, 220, 228, 0.06)';
      } else if (bright < 0.35) {
        ctx.fillStyle = 'rgba(10, 12, 16, 0.12)';
      } else {
        ctx.fillStyle = 'rgba(140, 130, 118, 0.05)';
      }
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Subtle tar crack seal lines
    ctx.strokeStyle = 'rgba(18, 20, 24, 0.45)';
    ctx.lineWidth = 2;
    for (var cr = 0; cr < 5; cr++) {
      ctx.beginPath();
      var cx = 70 + cr * 85;
      var cy = (cr * 113) % 420;
      ctx.moveTo(cx, cy);
      for (var s = 1; s <= 5; s++) {
        ctx.lineTo(cx + (hash2(cr, s) - 0.5) * 28, cy + s * 18);
      }
      ctx.stroke();
    }

    // Concrete gutter & curb strip on outer edges
    ctx.fillStyle = '#787d85';
    ctx.fillRect(0, 0, 14, 512);
    ctx.fillRect(498, 0, 14, 512);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(14, 0, 4, 512);
    ctx.fillRect(494, 0, 4, 512);
    // Curb expansion joints
    ctx.fillStyle = 'rgba(30,32,36,0.45)';
    for (var cj = 0; cj < 512; cj += 64) {
      ctx.fillRect(0, cj, 14, 2);
      ctx.fillRect(498, cj, 14, 2);
    }

    // Worn white shoulder lines
    ctx.fillStyle = 'rgba(236, 238, 240, 0.82)';
    ctx.fillRect(24, 0, 8, 512);
    ctx.fillRect(480, 0, 8, 512);

    // Classic California double-yellow center divider with slight road wear
    ctx.fillStyle = '#eab308';
    ctx.fillRect(248, 0, 6, 512);
    ctx.fillRect(258, 0, 6, 512);

    // Scuff wear over paint lines
    for (var w = 0; w < 380; w++) {
      var wy = Math.floor(hash2(w, 19.1) * 512);
      ctx.fillStyle = 'rgba(45, 48, 54, 0.25)';
      ctx.fillRect(246, wy, 20, 3);
    }

    return toTexture(c);
  }

  // ---------------------------------------------------------------------------
  // 2. Elevated Bridge / Freeway Deck Texture (512x512)
  // ---------------------------------------------------------------------------
  function createHighwayTexture() {
    var c = makeCanvas(512, 512);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#33373f';
    ctx.fillRect(0, 0, 512, 512);

    for (var i = 0; i < 4000; i++) {
      var gx = Math.floor(hash2(i, 2.1) * 512);
      var gy = Math.floor(hash2(i, 8.4) * 512);
      ctx.fillStyle = (i % 2 === 0) ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.09)';
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Steel expansion joint across bridge deck
    ctx.fillStyle = '#525866';
    ctx.fillRect(0, 252, 512, 6);
    ctx.fillStyle = '#1f232a';
    ctx.fillRect(0, 254, 512, 2);

    // Yellow left shoulder, white right shoulder, dashed white lane line
    ctx.fillStyle = '#facc15';
    ctx.fillRect(22, 0, 8, 512);
    ctx.fillRect(482, 0, 8, 512);

    ctx.fillStyle = 'rgba(245, 247, 250, 0.88)';
    for (var y = 20; y < 512; y += 96) {
      ctx.fillRect(252, y, 8, 52);
    }

    return toTexture(c);
  }

  // ---------------------------------------------------------------------------
  // 3. Concrete Sidewalk Pavers (512x512)
  // ---------------------------------------------------------------------------
  function createSidewalkTexture() {
    var c = makeCanvas(512, 512);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, 0, 512, 512);

    var step = 64;
    for (var y = 0; y < 512; y += step) {
      for (var x = 0; x < 512; x += step) {
        var v = 148 + Math.floor((hash2(x, y) - 0.5) * 18);
        ctx.fillStyle = 'rgb(' + v + ',' + (v - 2) + ',' + (v - 6) + ')';
        ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
      }
    }

    // Subtle concrete grain
    for (var i = 0; i < 2800; i++) {
      var sx = Math.floor(hash2(i, 4.4) * 512);
      var sy = Math.floor(hash2(i, 9.2) * 512);
      ctx.fillStyle = (i % 2 === 0) ? 'rgba(255,255,255,0.08)' : 'rgba(30,30,30,0.08)';
      ctx.fillRect(sx, sy, 2, 2);
    }

    return toTexture(c, 28, 28);
  }

  // ---------------------------------------------------------------------------
  // 4. Crosswalk Texture (512x512)
  // ---------------------------------------------------------------------------
  function createCrosswalkTexture() {
    var c = makeCanvas(512, 512);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#2d3036';
    ctx.fillRect(0, 0, 512, 512);

    for (var i = 0; i < 1800; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(Math.floor(hash2(i, 1.7) * 512), Math.floor(hash2(i, 5.3) * 512), 2, 2);
    }

    // Continental crosswalk bars with subtle tire scuffing
    for (var x = 36; x < 476; x += 68) {
      ctx.fillStyle = 'rgba(241, 245, 249, 0.88)';
      ctx.fillRect(x, 42, 38, 428);
      ctx.fillStyle = 'rgba(45, 48, 54, 0.22)';
      ctx.fillRect(x, 210, 38, 90);
    }

    return toTexture(c);
  }

  // ---------------------------------------------------------------------------
  // 5. Six Realistic Architectural Facades + Separate Emissive Window Masks
  // ---------------------------------------------------------------------------
  function createBuildingPair(variant) {
    var diffCanvas = makeCanvas(512, 1024);
    var dCtx = diffCanvas.getContext('2d');
    var emCanvas = makeCanvas(512, 1024);
    var eCtx = emCanvas.getContext('2d');

    // Black base on emissive mask so concrete/brick NEVER glows
    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 512, 1024);

    var styles = [
      // 0: California Sandstone / Los Santos Stucco Mid-Rise
      {
        wall: '#d6c5ad', wallAlt: '#c4b095', cornice: '#9c876e',
        groundBase: '#57534e', awning: '#b91c1c',
        winDayA: '#334e68', winDayB: '#486581', frame: '#f5f0e6',
        litWarm: '#fef08a', litSoft: '#fed7aa', cols: 5, rows: 10
      },
      // 1: Downtown Glass & Steel Curtain-Wall Skyscraper
      {
        wall: '#334155', wallAlt: '#1e293b', cornice: '#64748b',
        groundBase: '#0f172a', awning: '#0284c7',
        winDayA: '#38678f', winDayB: '#5282a8', frame: '#94a3b8',
        litWarm: '#fde68a', litSoft: '#bae6fd', cols: 8, rows: 16
      },
      // 2: Classic Red-Brick Urban Apartment Building
      {
        wall: '#8c3f32', wallAlt: '#753227', cornice: '#d6d3d1',
        groundBase: '#44403c', awning: '#15803d',
        winDayA: '#293845', winDayB: '#3b4d5e', frame: '#e7e5e4',
        litWarm: '#fde047', litSoft: '#fdba74', cols: 5, rows: 11
      },
      // 3: Santa Monica / Coastal Art Deco Hotel (Warm Terracotta & Cream)
      {
        wall: '#e7d8c5', wallAlt: '#dfc7ac', cornice: '#d97706',
        groundBase: '#78716c', awning: '#0d9488',
        winDayA: '#2c5263', winDayB: '#3d6e82', frame: '#ffffff',
        litWarm: '#fef08a', litSoft: '#fbcfe8', cols: 6, rows: 11
      },
      // 4: Modern Concrete & Charcoal Residential Tower
      {
        wall: '#9499a1', wallAlt: '#7b818a', cornice: '#4b5563',
        groundBase: '#27272a', awning: '#d97706',
        winDayA: '#273c4f', winDayB: '#39556e', frame: '#e5e7eb',
        litWarm: '#fef3c7', litSoft: '#e0f2fe', cols: 6, rows: 13
      },
      // 5: Executive Bronze & Dark Granite Financial Tower
      {
        wall: '#292524', wallAlt: '#1c1917', cornice: '#a16207',
        groundBase: '#0c0a09', awning: '#a16207',
        winDayA: '#3f4e4f', winDayB: '#526566', frame: '#78716c',
        litWarm: '#fde68a', litSoft: '#fef9c3', cols: 7, rows: 15
      }
    ];

    var st = styles[variant % styles.length];

    // Wall base
    dCtx.fillStyle = st.wall;
    dCtx.fillRect(0, 0, 512, 1024);

    // Subtle stone/brick/stucco texture
    for (var n = 0; n < 4500; n++) {
      var nx = Math.floor(hash2(n, variant + 1.1) * 512);
      var ny = Math.floor(hash2(n, variant + 6.7) * 1024);
      dCtx.fillStyle = (n % 2 === 0) ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
      dCtx.fillRect(nx, ny, 3, 2);
    }

    // Brick mortar courses on brick style
    if (variant % 6 === 2) {
      dCtx.fillStyle = 'rgba(220,210,200,0.14)';
      for (var by = 0; by < 920; by += 10) {
        dCtx.fillRect(0, by, 512, 1);
      }
    }

    // Vertical pilasters on outer edges & center
    dCtx.fillStyle = st.wallAlt;
    dCtx.fillRect(0, 0, 22, 1024);
    dCtx.fillRect(490, 0, 22, 1024);
    dCtx.fillRect(248, 0, 16, 920);

    // Top cornice & floor slab bands
    dCtx.fillStyle = st.cornice;
    dCtx.fillRect(0, 0, 512, 24);
    dCtx.fillStyle = 'rgba(0,0,0,0.28)';
    dCtx.fillRect(0, 24, 512, 6);

    // Ground-floor commercial storefront zone (bottom 104px)
    dCtx.fillStyle = st.groundBase;
    dCtx.fillRect(0, 916, 512, 108);
    dCtx.fillStyle = st.cornice;
    dCtx.fillRect(0, 910, 512, 10);

    // Storefront glass bays & awnings
    for (var sf = 0; sf < 3; sf++) {
      var sx = 34 + sf * 156;
      // Awning
      dCtx.fillStyle = st.awning;
      dCtx.fillRect(sx - 4, 926, 132, 18);
      dCtx.fillStyle = 'rgba(255,255,255,0.28)';
      for (var stp = sx; stp < sx + 124; stp += 20) {
        dCtx.fillRect(stp, 926, 8, 18);
      }
      // Shop window
      dCtx.fillStyle = '#f5d08a';
      dCtx.fillRect(sx + 4, 948, 116, 66);
      dCtx.fillStyle = '#1e293b';
      dCtx.fillRect(sx + 56, 948, 12, 66);

      // Warm storefront glow on emissive mask
      eCtx.fillStyle = '#fde68a';
      eCtx.fillRect(sx + 6, 950, 48, 60);
      eCtx.fillRect(sx + 70, 950, 48, 60);
    }

    // Upper floor windows
    var padX = 28;
    var topY = 42;
    var botY = 900;
    var cellW = (512 - padX * 2) / st.cols;
    var cellH = (botY - topY) / st.rows;

    for (var r = 0; r < st.rows; r++) {
      // Subtle horizontal floor ledge
      var rowBottom = topY + (r + 1) * cellH;
      dCtx.fillStyle = 'rgba(0,0,0,0.12)';
      dCtx.fillRect(20, rowBottom - 3, 472, 2);

      for (var col = 0; col < st.cols; col++) {
        var wx = padX + col * cellW + 7;
        var wy = topY + r * cellH + 7;
        var ww = cellW - 14;
        var wh = cellH - 15;

        // Recessed shadow frame
        dCtx.fillStyle = 'rgba(0,0,0,0.38)';
        dCtx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);

        // Window frame
        dCtx.fillStyle = st.frame;
        dCtx.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);

        var hVal = hash2(r * 13 + variant * 7, col * 29 + variant * 3);
        var isLit = hVal > 0.56;

        // Sky reflection gradient on glass pane
        var gGrad = dCtx.createLinearGradient(wx, wy, wx, wy + wh);
        if (isLit) {
          gGrad.addColorStop(0, hVal > 0.8 ? st.litWarm : st.litSoft);
          gGrad.addColorStop(1, '#9a7b4f');
        } else {
          gGrad.addColorStop(0, st.winDayB);
          gGrad.addColorStop(0.6, st.winDayA);
          gGrad.addColorStop(1, '#1b2836');
        }
        dCtx.fillStyle = gGrad;
        dCtx.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);

        // Window sill & cross-mullion
        dCtx.fillStyle = st.frame;
        dCtx.fillRect(wx - 3, wy + wh - 1, ww + 6, 4);
        dCtx.fillStyle = 'rgba(15,23,42,0.45)';
        dCtx.fillRect(wx + 1, wy + Math.floor(wh * 0.45), ww - 2, 2);

        // Balcony railing or AC box on select residential buildings
        if ((variant === 0 || variant === 2 || variant === 4) && (r + col) % 5 === 0) {
          dCtx.fillStyle = '#cbd5e1';
          dCtx.fillRect(wx + ww - 14, wy + wh - 12, 13, 10);
          dCtx.fillStyle = '#475569';
          dCtx.fillRect(wx + ww - 12, wy + wh - 10, 9, 6);
        }

        // Emissive mask ONLY for lit interior windows
        if (isLit) {
          eCtx.fillStyle = hVal > 0.8 ? st.litWarm : st.litSoft;
          eCtx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        }
      }
    }

    return {
      map: toTexture(diffCanvas, 1, 1, true),
      emissiveMap: toTexture(emCanvas, 1, 1, true)
    };
  }

  // ---------------------------------------------------------------------------
  // 6. Beach Sand & Bone County Desert Dirt/Sand (512x512)
  // ---------------------------------------------------------------------------
  function createSandTexture(isDesert) {
    var c = makeCanvas(512, 512);
    var ctx = c.getContext('2d');

    ctx.fillStyle = isDesert ? '#c9a66b' : '#e3c58e';
    ctx.fillRect(0, 0, 512, 512);

    // Organic wind-blown sand ripples
    ctx.fillStyle = isDesert ? 'rgba(168, 126, 67, 0.24)' : 'rgba(255, 246, 224, 0.28)';
    for (var y = 0; y < 512; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (var x = 0; x <= 512; x += 32) {
        ctx.lineTo(x, y + Math.sin((x / 512) * Math.PI * 4 + y * 0.1) * 5);
      }
      ctx.lineTo(512, y + 10);
      ctx.lineTo(0, y + 10);
      ctx.closePath();
      ctx.fill();
    }

    // Pebbles, grains & dry desert scrub patches
    for (var i = 0; i < 4200; i++) {
      var sx = Math.floor(hash2(i, isDesert ? 9.1 : 3.1) * 512);
      var sy = Math.floor(hash2(i, isDesert ? 2.7 : 8.5) * 512);
      var r = hash2(i, 5.5);
      if (isDesert && r > 0.96) {
        ctx.fillStyle = 'rgba(104, 112, 68, 0.35)';
        ctx.fillRect(sx, sy, 6, 5);
      } else if (r > 0.5) {
        ctx.fillStyle = 'rgba(255, 245, 220, 0.2)';
        ctx.fillRect(sx, sy, 2, 2);
      } else {
        ctx.fillStyle = 'rgba(120, 82, 40, 0.22)';
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    return toTexture(c, isDesert ? 10 : 6, isDesert ? 14 : 18);
  }

  // ---------------------------------------------------------------------------
  // 7. Stratified Red-Rock Canyon Sandstone (512x512)
  // ---------------------------------------------------------------------------
  function createRockTexture() {
    var c = makeCanvas(512, 512);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#9a5238';
    ctx.fillRect(0, 0, 512, 512);

    var strata = ['#85412b', '#b06444', '#783824', '#c27c56', '#8f4931'];
    var y = 0;
    var idx = 0;
    while (y < 512) {
      var h = 14 + Math.floor(hash2(idx, 2.3) * 28);
      ctx.fillStyle = strata[idx % strata.length];
      ctx.fillRect(0, y, 512, h);
      y += h;
      idx++;
    }

    // Vertical erosion crevices
    for (var i = 0; i < 2600; i++) {
      var rx = Math.floor(hash2(i, 6.2) * 512);
      var ry = Math.floor(hash2(i, 1.9) * 512);
      ctx.fillStyle = (i % 3 === 0) ? 'rgba(40,18,10,0.18)' : 'rgba(235,195,160,0.09)';
      ctx.fillRect(rx, ry, 3, 5);
    }

    return toTexture(c, 2, 1);
  }

  // ---------------------------------------------------------------------------
  // 8. Realistic Pacific Ocean Water (512x512)
  // ---------------------------------------------------------------------------
  function createWaterTexture() {
    var c = makeCanvas(512, 512);
    var ctx = c.getContext('2d');

    // Seamless periodic ocean tile (zero grid seams!)
    ctx.fillStyle = '#075985';
    ctx.fillRect(0, 0, 512, 512);

    for (var y = 16; y < 512; y += 32) {
      ctx.strokeStyle = (y % 64 === 0) ? 'rgba(186, 230, 253, 0.22)' : 'rgba(12, 74, 110, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (var x = 0; x <= 512; x += 16) {
        var wy = y + Math.sin((x / 512) * Math.PI * 4) * 5 + Math.cos((x / 512) * Math.PI * 2) * 3;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (var i = 0; i < 95; i++) {
      ctx.fillRect(Math.floor(hash2(i, 3.3) * 496) + 8, Math.floor(hash2(i, 9.7) * 496) + 8, 7, 2);
    }

    return toTexture(c, 7, 16);
  }

  // ---------------------------------------------------------------------------
  // 9. Natural Park Grass & Stone Courtyard Plaza (512x512)
  // ---------------------------------------------------------------------------
  function createGrassTexture() {
    var c = makeCanvas(512, 512);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#3f6a34';
    ctx.fillRect(0, 0, 512, 512);

    for (var i = 0; i < 6000; i++) {
      var gx = Math.floor(hash2(i, 1.4) * 512);
      var gy = Math.floor(hash2(i, 7.1) * 512);
      var v = hash2(i, 4.9);
      if (v > 0.65) ctx.fillStyle = 'rgba(101, 148, 74, 0.35)';
      else if (v < 0.3) ctx.fillStyle = 'rgba(38, 68, 30, 0.35)';
      else ctx.fillStyle = 'rgba(138, 168, 88, 0.22)';
      ctx.fillRect(gx, gy, 3, 4);
    }

    return toTexture(c, 8, 8);
  }

  function createPlazaTexture() {
    var c = makeCanvas(512, 512);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, 0, 512, 512);

    var tile = 64;
    for (var y = 0; y < 512; y += tile) {
      for (var x = 0; x < 512; x += tile) {
        var even = ((x / tile) + (y / tile)) % 2 === 0;
        ctx.fillStyle = even ? '#d6cfc2' : '#c2b8a8';
        ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
      }
    }

    return toTexture(c, 5, 5);
  }

  // ---------------------------------------------------------------------------
  // 10. Realistic Construction / Stunt Ramp & Cargo Container
  // ---------------------------------------------------------------------------
  function createRampTexture() {
    var c = makeCanvas(512, 512);
    var ctx = c.getContext('2d');

    // Brushed dark steel & timber stunt deck
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, 512, 512);

    // Horizontal steel grip ribs
    for (var y = 0; y < 512; y += 16) {
      ctx.fillStyle = (y % 32 === 0) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.22)';
      ctx.fillRect(36, y, 440, 4);
    }

    // Hazard yellow/black side rails
    var sq = 42;
    for (var hy = 0; hy < 512; hy += sq) {
      var isYellow = Math.floor(hy / sq) % 2 === 0;
      ctx.fillStyle = isYellow ? '#eab308' : '#18181b';
      ctx.fillRect(0, hy, 36, sq);
      ctx.fillRect(476, hy, 36, sq);
    }

    // Stenciled white/amber stunt arrows pointing toward top launch lip
    for (var cy = 430; cy >= 85; cy -= 115) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
      ctx.lineWidth = 20;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(125, cy + 36);
      ctx.lineTo(256, cy - 28);
      ctx.lineTo(387, cy + 36);
      ctx.stroke();
    }

    // Tire rubber marks up the center of the ramp
    ctx.fillStyle = 'rgba(15, 17, 20, 0.35)';
    ctx.fillRect(145, 0, 38, 512);
    ctx.fillRect(329, 0, 38, 512);

    return toTexture(c);
  }

  function createContainerTexture() {
    var c = makeCanvas(512, 256);
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#d4d8dd';
    ctx.fillRect(0, 0, 512, 256);

    for (var x = 14; x < 498; x += 24) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
      ctx.fillRect(x, 20, 9, 216);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(x + 9, 20, 6, 216);
    }

    ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
    ctx.fillRect(0, 0, 512, 20);
    ctx.fillRect(0, 236, 512, 20);

    // Stencil logistics markings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(42, 46, 110, 28);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.fillRect(380, 46, 80, 14);
    ctx.fillRect(380, 68, 60, 10);

    return toTexture(c);
  }

  // ---------------------------------------------------------------------------
  // 11. Soft Volumetric Smoke / Dust Particle Sprite (128x128)
  // ---------------------------------------------------------------------------
  function createPuffTexture() {
    var c = makeCanvas(128, 128);
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    g.addColorStop(0, 'rgba(255,255,255,0.92)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.48)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  // ---------------------------------------------------------------------------
  // 12. 360° Atmospheric Sky Dome & Reflection Maps (Sunset / Day / Night)
  // ---------------------------------------------------------------------------
  function createSkyTexture(mode) {
    var c = makeCanvas(1024, 512);
    var ctx = c.getContext('2d');

    var grad = ctx.createLinearGradient(0, 0, 0, 512);
    if (mode === 'day') {
      // Clear California turquoise-blue sky with warm horizon haze
      grad.addColorStop(0.00, '#1d5fa7');
      grad.addColorStop(0.32, '#3b8fd4');
      grad.addColorStop(0.47, '#8ecae6');
      grad.addColorStop(0.52, '#dbeafe');
      grad.addColorStop(0.58, '#94a3b8');
      grad.addColorStop(1.00, '#334155');
    } else if (mode === 'night') {
      grad.addColorStop(0.00, '#040814');
      grad.addColorStop(0.35, '#0b152b');
      grad.addColorStop(0.48, '#1e293b');
      grad.addColorStop(0.53, '#334155');
      grad.addColorStop(1.00, '#090d16');
    } else {
      // Classic GTA San Andreas golden-amber California sunset smog/glow
      grad.addColorStop(0.00, '#2a3559');
      grad.addColorStop(0.22, '#6b496b');
      grad.addColorStop(0.38, '#c86b4b');
      grad.addColorStop(0.47, '#f59e42');
      grad.addColorStop(0.51, '#fcd37d');
      grad.addColorStop(0.56, '#8c6249');
      grad.addColorStop(1.00, '#2b2528');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Soft wispy clouds in upper hemisphere (y in 90..235)
    if (mode !== 'night') {
      var cloudCol = mode === 'day' ? 'rgba(255,255,255,0.34)' : 'rgba(254, 215, 150, 0.28)';
      for (var cl = 0; cl < 28; cl++) {
        var cx = hash2(cl, 4.1) * 1024;
        var cy = 95 + hash2(cl, 8.3) * 130;
        var rw = 50 + hash2(cl, 2.9) * 110;
        var rh = 10 + hash2(cl, 6.4) * 18;
        var cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, rw);
        cg.addColorStop(0, cloudCol);
        cg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, rh / rw);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(0, 0, rw, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else {
      // Subtle stars at night
      for (var s = 0; s < 220; s++) {
        var sx = Math.floor(hash2(s, 3.8) * 1024);
        var sy = Math.floor(hash2(s, 9.4) * 215);
        var a = 0.25 + hash2(s, 1.2) * 0.65;
        ctx.fillStyle = 'rgba(241, 245, 249, ' + a.toFixed(2) + ')';
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    if (THREE.EquirectangularReflectionMapping) {
      tex.mapping = THREE.EquirectangularReflectionMapping;
    }
    tex.needsUpdate = true;
    return tex;
  }

  function makeSignTexture(text, bgColor, borderColor, textColor) {
    var c = makeCanvas(512, 128);
    var ctx = c.getContext('2d');

    var grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, bgColor || '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);

    // Brushed metallic outer frame
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.strokeStyle = borderColor || '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, 484, 100);

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 44px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 259, 69);

    ctx.fillStyle = textColor || '#f8fafc';
    ctx.fillText(text, 256, 66);

    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = maxAniso;
    tex.needsUpdate = true;
    return tex;
  }

  function init(rendererMaxAniso) {
    if (rendererMaxAniso && rendererMaxAniso > 0) {
      maxAniso = Math.min(8, rendererMaxAniso);
    }
    if (initialized) return cache;

    cache.road = createRoadTexture();
    cache.highway = createHighwayTexture();
    cache.sidewalk = createSidewalkTexture();
    cache.crosswalk = createCrosswalkTexture();

    for (var b = 0; b < 6; b++) {
      var pair = createBuildingPair(b);
      cache['building' + b] = pair.map;
      cache['buildingEmissive' + b] = pair.emissiveMap;
    }

    cache.sand = createSandTexture(false);
    cache.desert = createSandTexture(true);
    cache.rock = createRockTexture();
    cache.water = createWaterTexture();
    cache.grass = createGrassTexture();
    cache.plaza = createPlazaTexture();
    cache.ramp = createRampTexture();
    cache.container = createContainerTexture();
    cache.puff = createPuffTexture();

    cache.sky_sunset = createSkyTexture('sunset');
    cache.sky_day = createSkyTexture('day');
    cache.sky_night = createSkyTexture('night');

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
