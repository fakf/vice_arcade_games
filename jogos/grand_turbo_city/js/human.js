// Grand Turbo City — Realistic Sculpted 3D Human Characters & Multi-Joint Rig (window.GTC.Human)
(function () {
  'use strict';

  window.GTC = window.GTC || {};

  var geos = null;
  var faceTexCache = {};
  var shirtTexCache = {};
  var pantsTexCache = {};
  var shoeTexCache = {};

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // ===========================================================================
  // 1. Sculpted Organic BufferGeometries (Cached once, shared by all humans!)
  // ===========================================================================
  function createLimbLathe(rTop, rMid, rBot, len, midPosFrac, scaleX, scaleZ) {
    // Profile goes from bottom (-len) up to rounded joint ball (+rTop * 0.55)
    // so outward normals face correctly and bent joints have ZERO gaps!
    var pts = [];
    var steps = 10;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps; // 0 = bottom (-len), 1 = top (0)
      var y = -len * (1 - t);
      var r;
      if (t < midPosFrac) {
        var u = t / midPosFrac;
        // Smooth muscle curve from ankle/wrist up to calf/bicep belly
        r = rBot + (rMid - rBot) * Math.sin(u * Math.PI * 0.5);
      } else {
        var v = (t - midPosFrac) / (1 - midPosFrac);
        r = rMid + (rTop - rMid) * (v * v);
      }
      pts.push(new THREE.Vector2(Math.max(0.01, r), y));
    }
    // Rounded spherical joint cap above y = 0 for seamless knee/elbow/hip/shoulder bending
    pts.push(new THREE.Vector2(rTop * 0.88, rTop * 0.28));
    pts.push(new THREE.Vector2(rTop * 0.52, rTop * 0.50));
    pts.push(new THREE.Vector2(0.002, rTop * 0.58));

    var geo = new THREE.LatheGeometry(pts, 14);
    // Rotate so UV seam sits at -Z (back of limb)
    geo.rotateY(-Math.PI / 2);

    if (scaleX || scaleZ) {
      var sx = scaleX || 1;
      var sz = scaleZ || 1;
      var pos = geo.attributes.position;
      for (var k = 0; k < pos.count; k++) {
        pos.setX(k, pos.getX(k) * sx);
        pos.setZ(k, pos.getZ(k) * sz);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }

  function createTorsoGeo() {
    // Anatomical profile from pelvis base (y=0) -> hips -> waist -> chest -> shoulders -> collar (y=0.62)
    var profile = [
      [0.005, 0.00],
      [0.105, 0.02],
      [0.148, 0.07], // Glutes / Hips
      [0.152, 0.13], // Belt / Waistband
      [0.134, 0.23], // Natural waist taper
      [0.148, 0.34], // Lower ribcage
      [0.170, 0.45], // Chest / Pectorals
      [0.178, 0.53], // Upper chest / Lats
      [0.168, 0.57], // Deltoid / Shoulder line
      [0.108, 0.60], // Trapezius slope
      [0.064, 0.625] // Neck collar base
    ];
    var pts = [];
    for (var i = 0; i < profile.length; i++) {
      pts.push(new THREE.Vector2(profile[i][0], profile[i][1]));
    }
    var geo = new THREE.LatheGeometry(pts, 20);
    // Align UV center u=0.5 to +Z (chest) and seam to -Z (spine)
    geo.rotateY(-Math.PI / 2);

    var pos = geo.attributes.position;
    for (var k = 0; k < pos.count; k++) {
      var x = pos.getX(k);
      var y = pos.getY(k);
      var z = pos.getZ(k);
      var hFrac = Math.max(0, Math.min(1, y / 0.625));

      // Broaden shoulders laterally while keeping waist athletic
      var widthMult = 1.08 + 0.18 * Math.pow(hFrac, 1.5);
      // Flatten front-to-back depth naturally (human ribcage is wider than deep)
      var depthMult = 0.72 + 0.06 * Math.sin(hFrac * Math.PI);

      x *= widthMult;
      z *= depthMult;

      // Subtle anatomical chest projection (+Z) and lumbar/glute curve (-Z)
      if (z > 0 && hFrac > 0.52 && hFrac < 0.88) {
        z += Math.sin(((hFrac - 0.52) / 0.36) * Math.PI) * 0.018;
      }
      if (z < 0 && hFrac < 0.25) {
        z -= Math.sin((hFrac / 0.25) * Math.PI) * 0.016;
      }

      pos.setXYZ(k, x, y, z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function createHeadGeo() {
    var geo = new THREE.SphereGeometry(0.112, 22, 18);
    // Put u=0.5 at +Z (front of face) and seam at -Z (back of skull)
    geo.rotateY(-Math.PI / 2);

    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i);
      var y = pos.getY(i);
      var z = pos.getZ(i);

      // Natural vertical head proportion
      y *= 1.18;
      x *= 0.92;
      z *= 0.98;

      // Cheekbones, tapered jawline & chin on lower half (y < 0)
      if (y < 0) {
        var jawT = Math.min(1, -y / 0.132);
        x *= (1.0 - jawT * 0.30);
        if (z < 0) {
          // Tuck back of skull neatly above neck
          z *= (1.0 - jawT * 0.28);
        } else {
          // Subtle forward chin contour
          z *= (1.0 - jawT * 0.08);
          if (jawT > 0.55 && Math.abs(x) < 0.045) {
            z += 0.010 * (1 - Math.abs(x) / 0.045);
          }
        }
      }

      // Subtle nose bridge & tip on front center (+Z)
      if (z > 0.06 && Math.abs(x) < 0.024 && y > -0.036 && y < 0.026) {
        var noseProfile = 1 - Math.abs(y + 0.008) / 0.034;
        var noseLat = 1 - Math.abs(x) / 0.024;
        z += Math.max(0, noseProfile * noseLat) * 0.020;
      }

      pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function createHairShortGeo() {
    // Sculpted short fade / crop cap hugging the upper & back cranium
    var geo = new THREE.SphereGeometry(0.117, 18, 14);
    geo.rotateY(-Math.PI / 2);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i) * 0.93;
      var y = pos.getY(i) * 1.19;
      var z = pos.getZ(i) * 1.00;

      // Cut away front face opening cleanly so forehead, eyes & ears are uncovered
      if (z > -0.01 && y < 0.055) {
        z = Math.min(z, -0.01);
        y = Math.max(y, 0.045);
      }
      if (y < -0.045) {
        y = -0.045;
        x *= 0.78;
        z *= 0.78;
      }
      pos.setXYZ(i, x, y + 0.008, z - 0.004);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function createHairVolumeGeo() {
    // Fuller wavy / medium hair for variety on pedestrians
    var geo = new THREE.SphereGeometry(0.124, 18, 14);
    geo.rotateY(-Math.PI / 2);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i) * 0.98;
      var y = pos.getY(i) * 1.22;
      var z = pos.getZ(i) * 1.03;

      if (z > 0.015 && y < 0.052) {
        z = 0.012;
        y = Math.max(y, 0.048);
      }
      if (y < -0.085) {
        y = -0.085;
      }
      pos.setXYZ(i, x, y + 0.006, z - 0.008);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function createSneakerGeo() {
    // Side silhouette of a real sneaker in [z, y], extruded across foot width X
    var pts = [
      [-0.095, 0.00],  // Heel sole bottom
      [ 0.155, 0.00],  // Toe sole bottom
      [ 0.170, 0.024], // Rounded toe bumper
      [ 0.145, 0.052], // Toe box top
      [ 0.035, 0.092], // Laces & tongue crest
      [-0.015, 0.082], // Ankle opening front
      [-0.078, 0.084], // Heel collar top
      [-0.102, 0.042]  // Heel counter back
    ];
    var shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i][0], pts[i][1]);
    }
    shape.closePath();

    var bev = 0.016;
    var depth = 0.098 - bev * 2;
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: true,
      bevelThickness: bev,
      bevelSize: bev,
      bevelSegments: 2
    });
    geo.translate(0, 0, -depth * 0.5);
    geo.rotateY(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }

  function createHandGeo() {
    var geo = new THREE.SphereGeometry(0.042, 10, 8);
    geo.scale(0.78, 1.22, 0.95);
    return geo;
  }

  function ensureGeometries() {
    if (geos) return geos;
    geos = {
      torso: createTorsoGeo(),
      neck: new THREE.CylinderGeometry(0.050, 0.058, 0.10, 12),
      head: createHeadGeo(),
      ear: new THREE.SphereGeometry(0.024, 8, 8),
      hairShort: createHairShortGeo(),
      hairVol: createHairVolumeGeo(),
      // Upper arm: shoulder (0.062) -> bicep (0.056) -> elbow (0.044), len 0.27
      upperArm: createLimbLathe(0.060, 0.055, 0.043, 0.265, 0.45, 0.96, 1.02),
      // Sleeve cuff over deltoid
      sleeve: createLimbLathe(0.068, 0.065, 0.058, 0.125, 0.40, 1.0, 1.04),
      // Forearm: elbow (0.044) -> forearm belly (0.046) -> wrist (0.033), len 0.24
      forearm: createLimbLathe(0.044, 0.045, 0.032, 0.235, 0.62, 0.95, 1.0),
      hand: createHandGeo(),
      // Thigh: hip (0.086) -> quad/hamstring (0.078) -> knee (0.058), len 0.41
      thigh: createLimbLathe(0.086, 0.078, 0.057, 0.41, 0.52, 0.98, 1.06),
      // Calf: knee (0.056) -> gastrocnemius calf (0.058) -> ankle (0.038), len 0.39
      calf: createLimbLathe(0.056, 0.057, 0.038, 0.39, 0.64, 0.95, 1.04),
      sneaker: createSneakerGeo(),
      soleStrip: new THREE.BoxGeometry(0.104, 0.022, 0.258),
      capCrown: new THREE.SphereGeometry(0.119, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.48),
      capBrim: new THREE.CylinderGeometry(0.115, 0.115, 0.012, 14, 1, false, -Math.PI * 0.36, Math.PI * 0.72),
      shadesFrame: new THREE.BoxGeometry(0.162, 0.032, 0.018),
      shadesTemple: new THREE.BoxGeometry(0.010, 0.012, 0.095),
      helmetShell: new THREE.SphereGeometry(0.142, 20, 16),
      helmetVisor: new THREE.SphereGeometry(0.145, 16, 10, -Math.PI * 0.34, Math.PI * 0.68, Math.PI * 0.30, Math.PI * 0.28)
    };
    geos.ear.scale(0.45, 1.05, 0.72);
    geos.helmetShell.scale(0.94, 1.05, 1.12);
    geos.helmetVisor.rotateY(Math.PI * 0.5);
    geos.helmetVisor.scale(0.94, 1.05, 1.12);
    return geos;
  }

  // ===========================================================================
  // 2. Procedural Skin/Face, Shirt/Jersey & Jeans CanvasTextures
  // ===========================================================================
  function getFaceTexture(skinHex, hairHex, eyeHex) {
    var key = skinHex + '_' + hairHex;
    if (faceTexCache[key]) return faceTexCache[key];

    var c = makeCanvas(256, 256);
    var ctx = c.getContext('2d');

    ctx.fillStyle = skinHex;
    ctx.fillRect(0, 0, 256, 256);

    // Warm cheek & forehead subtle skin shading around front center (x = 128, y = 128)
    var cheekG = ctx.createRadialGradient(128, 136, 12, 128, 136, 68);
    cheekG.addColorStop(0, 'rgba(255, 220, 195, 0.18)');
    cheekG.addColorStop(0.65, 'rgba(185, 105, 75, 0.10)');
    cheekG.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
    ctx.fillStyle = cheekG;
    ctx.fillRect(0, 0, 256, 256);

    // Neck & jaw underside natural shadow
    var jawShadow = ctx.createLinearGradient(0, 190, 0, 256);
    jawShadow.addColorStop(0, 'rgba(0,0,0,0)');
    jawShadow.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = jawShadow;
    ctx.fillRect(0, 190, 256, 66);

    // Eyebrows (centered symmetrically around x=128, y=108)
    ctx.fillStyle = hairHex || '#27272a';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(104, 103, 17, 4.5, 2) : ctx.fillRect(104, 103, 17, 4.5);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(135, 103, 17, 4.5, 2) : ctx.fillRect(135, 103, 17, 4.5);
    ctx.fill();

    // Realistic eyes (sclera + iris + pupil + upper lash line)
    var eyeXs = [112.5, 143.5];
    for (var e = 0; e < 2; e++) {
      var ex = eyeXs[e];
      var ey = 116;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 6.8, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = eyeHex || '#3b2f2f';
      ctx.beginPath();
      ctx.arc(ex, ey, 3.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(ex, ey, 1.7, 0, Math.PI * 2);
      ctx.fill();

      // Tiny catchlight glint
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex - 1.5, ey - 2.2, 1.6, 1.6);

      // Upper eyelid crease
      ctx.strokeStyle = 'rgba(30, 20, 15, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(ex, ey + 1, 7.2, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    }

    // Nose bridge & nostrils shadow
    ctx.fillStyle = 'rgba(90, 45, 25, 0.24)';
    ctx.fillRect(126, 118, 4, 18);
    ctx.beginPath();
    ctx.arc(125, 138, 2.2, 0, Math.PI * 2);
    ctx.arc(131, 138, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Natural relaxed mouth / lips
    ctx.strokeStyle = 'rgba(120, 52, 42, 0.72)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(118, 153);
    ctx.quadraticCurveTo(128, 156, 138, 153);
    ctx.stroke();

    ctx.fillStyle = 'rgba(165, 82, 70, 0.32)';
    ctx.fillRect(121, 154, 14, 3);

    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    faceTexCache[key] = tex;
    return tex;
  }

  function getShirtTexture(primaryHex, style, badgeNumber, pantsHex) {
    var pHex = pantsHex || '#1d4ed8';
    var key = primaryHex + '_' + (style || 'tee') + '_' + (badgeNumber || '') + '_' + pHex;
    if (shirtTexCache[key]) return shirtTexCache[key];

    var c = makeCanvas(256, 256);
    var ctx = c.getContext('2d');

    ctx.fillStyle = primaryHex;
    ctx.fillRect(0, 0, 256, 200);

    // Seamless pelvis/hips base matching the exact pants/jeans color!
    ctx.fillStyle = pHex;
    ctx.fillRect(0, 196, 256, 60);

    // Vertical cloth shading & realistic torso side/drape folds
    var sideGrad = ctx.createLinearGradient(0, 0, 256, 0);
    sideGrad.addColorStop(0.00, 'rgba(0,0,0,0.08)');
    sideGrad.addColorStop(0.25, 'rgba(0,0,0,0.16)');
    sideGrad.addColorStop(0.50, 'rgba(255,255,255,0.08)');
    sideGrad.addColorStop(0.75, 'rgba(0,0,0,0.16)');
    sideGrad.addColorStop(1.00, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = sideGrad;
    ctx.fillRect(0, 0, 256, 256);

    // Subtle fabric crease lines
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 3;
    for (var f = 0; f < 5; f++) {
      ctx.beginPath();
      ctx.moveTo(45 + f * 32, 85 + (f % 2) * 18);
      ctx.quadraticCurveTo(128, 118 + f * 12, 210 - f * 24, 105 + f * 14);
      ctx.stroke();
    }

    // Collar trim at top (y = 0..14)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(0, 0, 256, 12);

    // Note on LatheGeometry UVs after rotateY(-PI/2):
    // u = 0 / 1 (x = 0 & 256) is FRONT (+Z), and u = 0.5 (x = 128) is BACK (-Z)!
    if (style === 'tank') {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      for (var rx = 0; rx < 256; rx += 6) {
        ctx.fillRect(rx, 0, 2, 192);
      }
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, 256, 10);
    } else if (style === 'police') {
      // Front placket at x=0/256 + gold badge on front-left chest (x ~ 22)
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 14, 4, 178);
      ctx.fillRect(252, 14, 4, 178);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(24, 62, 7.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'jersey') {
      // Racing jersey / jacket with sporty contrast stripe & centered BACK number (#46) at x=128!
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillRect(0, 36, 256, 10);
      var numTxt = badgeNumber || '46';
      ctx.font = 'bold 54px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(numTxt, 128, 96);
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 3.5;
      ctx.strokeText(numTxt, 128, 96);
    } else if (style === 'jacket') {
      // Open casual jacket over white inner tee at front center (x = 0..18 and 238..256)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 12, 18, 180);
      ctx.fillRect(238, 12, 18, 180);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(18, 12, 3, 180);
      ctx.fillRect(235, 12, 3, 180);
    }

    // Leather belt cleanly bridging shirt hem and jeans (y = 190..202)
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 190, 256, 12);
    // Silver buckle at front (x = 0 / 256)
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 191, 8, 10);
    ctx.fillRect(248, 191, 8, 10);

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    shirtTexCache[key] = tex;
    return tex;
  }

  function getPantsTexture(pantsHex) {
    if (pantsTexCache[pantsHex]) return pantsTexCache[pantsHex];

    var c = makeCanvas(128, 256);
    var ctx = c.getContext('2d');

    ctx.fillStyle = pantsHex;
    ctx.fillRect(0, 0, 128, 256);

    // Subtle stonewash denim thigh highlight (seamless across knee joint!)
    var g = ctx.createRadialGradient(64, 115, 8, 64, 115, 62);
    g.addColorStop(0, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0.06)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 256);

    // Subtle side-seam stitching
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(32, 0, 2, 256);
    ctx.fillRect(94, 0, 2, 256);

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    pantsTexCache[pantsHex] = tex;
    return tex;
  }

  // ===========================================================================
  // 3. Complete Sculpted & Articulated Human Builder
  // ===========================================================================
  function createHuman(opts) {
    var o = opts || {};
    var g = ensureGeometries();

    var skinHex  = o.skinHex  || '#d99b6c';
    var hairHex  = o.hairHex  || '#1c1917';
    var shirtHex = o.shirtHex || '#f8fafc';
    var pantsHex = o.pantsHex || '#1e3a8a';
    var shoeHex  = o.shoeHex  || '#f8fafc';
    var style    = o.shirtStyle || 'tee'; // 'tank' | 'tee' | 'jacket' | 'jersey' | 'police'
    var isShortSleeve = (style === 'tank') ? false : true;
    var castShad = o.castShadow !== false;

    var skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(skinHex), roughness: 0.64 });
    var faceMat = new THREE.MeshStandardMaterial({ map: getFaceTexture(skinHex, hairHex), roughness: 0.62 });
    var hairMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(hairHex), roughness: 0.88 });
    var shirtMat = new THREE.MeshStandardMaterial({
      map: getShirtTexture(shirtHex, style, o.badgeNumber, pantsHex),
      roughness: 0.76
    });
    var sleeveMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(shirtHex), roughness: 0.76 });
    var pantsMat = new THREE.MeshStandardMaterial({
      map: getPantsTexture(pantsHex),
      roughness: 0.84
    });
    var shoeUpperMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(shoeHex), roughness: 0.55 });
    var soleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.75 });
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.25, metalness: 0.6 });

    var root = new THREE.Group();

    // Pelvis / Center of gravity pivot at y = 0.88 (total standing height ~ 1.78m)
    var pelvis = new THREE.Group();
    pelvis.position.set(0, 0.88, 0);
    root.add(pelvis);

    // Sculpted Torso (extends upward from pelvis y=0..0.625)
    var torsoPivot = new THREE.Group();
    pelvis.add(torsoPivot);

    var torsoMesh = new THREE.Mesh(g.torso, shirtMat);
    torsoMesh.castShadow = castShad;
    torsoMesh.receiveShadow = true;
    torsoPivot.add(torsoMesh);

    // Neck & Sculpted Head (pivot at base of neck y = 0.61)
    var neckPivot = new THREE.Group();
    neckPivot.position.set(0, 0.61, 0.005);
    torsoPivot.add(neckPivot);

    var neckMesh = new THREE.Mesh(g.neck, skinMat);
    neckMesh.position.y = 0.045;
    neckPivot.add(neckMesh);

    var headGroup = new THREE.Group();
    headGroup.position.set(0, 0.165, 0.012);
    neckPivot.add(headGroup);

    if (o.hasHelmet) {
      var helmMat = new THREE.MeshStandardMaterial({
        color: o.helmetHex || 0xf8fafc,
        metalness: 0.42,
        roughness: 0.22
      });
      var helm = new THREE.Mesh(g.helmetShell, helmMat);
      helm.castShadow = castShad;
      headGroup.add(helm);

      var visor = new THREE.Mesh(g.helmetVisor, darkMat);
      visor.position.set(0, 0.005, 0.006);
      headGroup.add(visor);
    } else {
      var headMesh = new THREE.Mesh(g.head, faceMat);
      headMesh.castShadow = castShad;
      headGroup.add(headMesh);

      // Ears
      var earL = new THREE.Mesh(g.ear, skinMat);
      earL.position.set(-0.106, -0.005, -0.008);
      var earR = earL.clone();
      earR.position.x = 0.106;
      headGroup.add(earL, earR);

      // Hair
      var hairMesh = new THREE.Mesh(o.fullHair ? g.hairVol : g.hairShort, hairMat);
      hairMesh.castShadow = castShad;
      headGroup.add(hairMesh);

      // Optional Cap (Player / Officer / Pedestrians)
      if (o.capHex) {
        var capMat = new THREE.MeshStandardMaterial({ color: o.capHex, roughness: 0.65 });
        var crown = new THREE.Mesh(g.capCrown, capMat);
        crown.position.y = 0.022;
        headGroup.add(crown);

        var brim = new THREE.Mesh(g.capBrim, capMat);
        brim.position.set(0, 0.036, 0.075);
        brim.rotation.x = 0.12;
        headGroup.add(brim);
      }

      // Optional Wrap-around Sunglasses hugging nose bridge & ears
      if (o.hasShades) {
        var shades = new THREE.Mesh(g.shadesFrame, darkMat);
        shades.position.set(0, 0.014, 0.094);
        var tempL = new THREE.Mesh(g.shadesTemple, darkMat);
        tempL.position.set(-0.082, 0.014, 0.046);
        var tempR = tempL.clone();
        tempR.position.x = 0.082;
        headGroup.add(shades, tempL, tempR);
      }
    }

    // -------------------------------------------------------------------------
    // 2-Joint Articulated Arms (Shoulder -> UpperArm -> Elbow -> Forearm + Hand)
    // -------------------------------------------------------------------------
    var armUpperMat = (style === 'jacket' || style === 'jersey') ? sleeveMat : skinMat;

    function buildArm(sideSign) {
      var shoulder = new THREE.Group();
      shoulder.position.set(sideSign * 0.205, 0.545, 0);

      if (isShortSleeve && style !== 'jacket' && style !== 'jersey') {
        var slv = new THREE.Mesh(g.sleeve, sleeveMat);
        slv.castShadow = castShad;
        shoulder.add(slv);
      }

      var upper = new THREE.Mesh(g.upperArm, armUpperMat);
      upper.castShadow = castShad;
      shoulder.add(upper);

      // Slight natural resting abduction so arms don't clip into ribcage
      shoulder.rotation.z = sideSign * 0.08;

      var elbow = new THREE.Group();
      elbow.position.set(0, -0.255, 0);
      shoulder.add(elbow);

      var forearm = new THREE.Mesh(g.forearm, skinMat);
      forearm.castShadow = castShad;
      elbow.add(forearm);

      var hand = new THREE.Mesh(g.hand, skinMat);
      hand.position.set(0, -0.245, 0.008);
      elbow.add(hand);

      torsoPivot.add(shoulder);
      return { shoulder: shoulder, elbow: elbow };
    }

    var armL = buildArm(-1);
    var armR = buildArm(1);

    // -------------------------------------------------------------------------
    // 2-Joint Articulated Legs (Hip -> Thigh -> Knee -> Calf + Sculpted Sneaker)
    // -------------------------------------------------------------------------
    function buildLeg(sideSign) {
      var hip = new THREE.Group();
      hip.position.set(sideSign * 0.095, 0.03, 0);

      var thigh = new THREE.Mesh(g.thigh, pantsMat);
      thigh.castShadow = castShad;
      hip.add(thigh);

      var knee = new THREE.Group();
      knee.position.set(0, -0.405, 0);
      hip.add(knee);

      var calfMat = o.wearsShorts ? skinMat : pantsMat;
      var calf = new THREE.Mesh(g.calf, calfMat);
      calf.castShadow = castShad;
      knee.add(calf);

      var foot = new THREE.Group();
      foot.position.set(0, -0.475, 0);
      knee.add(foot);

      var shoe = new THREE.Mesh(g.sneaker, shoeUpperMat);
      shoe.castShadow = castShad;
      foot.add(shoe);

      var sole = new THREE.Mesh(g.soleStrip, soleMat);
      sole.position.set(0, 0.011, 0.028);
      foot.add(sole);

      pelvis.add(hip);
      return { hip: hip, knee: knee, foot: foot };
    }

    var legL = buildLeg(-1);
    var legR = buildLeg(1);

    var scale = o.scale || 1.0;
    if (scale !== 1.0) {
      root.scale.set(scale, scale, scale);
    }

    return {
      root: root,
      pelvis: pelvis,
      torso: torsoPivot,
      neck: neckPivot,
      head: headGroup,
      armL: armL,
      armR: armR,
      legL: legL,
      legR: legR
    };
  }

  // ===========================================================================
  // 4. Biomechanical Locomotion & Vehicle Riding Poses
  // ===========================================================================
  function animateLocomotion(human, opts) {
    if (!human) return;
    var o = opts || {};
    var phase = o.phase || 0;
    var speedNorm = Math.max(0, Math.min(1.5, o.speedNorm || 0)); // 0 = idle, 0.6 = walk, 1.0+ = run
    var isAirborne = !!o.isAirborne;
    var isDodging = !!o.isDodging;
    var waveTimer = o.waveTimer || 0;
    var time = o.time || 0;

    if (isDodging) {
      // Friendly athletic dodge-hop with raised waving arms
      human.pelvis.position.y = 0.88;
      human.torso.rotation.set(0.10, 0, 0);
      human.legL.hip.rotation.set(-0.45, 0, -0.10);
      human.legL.knee.rotation.x = 0.75;
      human.legR.hip.rotation.set(0.25, 0, 0.10);
      human.legR.knee.rotation.x = 0.55;
      human.armL.shoulder.rotation.set(-2.35, 0, -0.35);
      human.armL.elbow.rotation.x = -0.35;
      human.armR.shoulder.rotation.set(-2.35, 0, 0.35);
      human.armR.elbow.rotation.x = -0.35;
      return;
    }

    if (isAirborne) {
      // Athletic mid-air jump tuck!
      human.pelvis.position.y = 0.88;
      human.torso.rotation.set(0.16, 0, 0);
      human.legL.hip.rotation.set(-0.58, 0, -0.05);
      human.legL.knee.rotation.x = 0.92;
      human.legR.hip.rotation.set(-0.22, 0, 0.05);
      human.legR.knee.rotation.x = 0.68;
      human.armL.shoulder.rotation.set(-0.65, 0, -0.28);
      human.armL.elbow.rotation.x = -0.65;
      human.armR.shoulder.rotation.set(-0.45, 0, 0.28);
      human.armR.elbow.rotation.x = -0.65;
      return;
    }

    if (speedNorm < 0.05) {
      // Natural relaxed breathing idle stance
      var breath = Math.sin(time * 2.4) * 0.008;
      human.pelvis.position.y = 0.88;
      human.torso.rotation.set(breath, Math.sin(time * 1.1) * 0.03, 0);
      human.neck.rotation.y = -Math.sin(time * 1.1) * 0.02;

      human.legL.hip.rotation.set(-0.03, 0, -0.03);
      human.legL.knee.rotation.x = 0.06;
      human.legL.foot.rotation.x = -0.03;

      human.legR.hip.rotation.set(0.03, 0, 0.03);
      human.legR.knee.rotation.x = 0.06;
      human.legR.foot.rotation.x = -0.03;

      human.armL.shoulder.rotation.set(0.04, 0, -0.09);
      human.armL.elbow.rotation.x = -0.18;

      if (waveTimer > 0) {
        human.armR.shoulder.rotation.set(-2.35, 0, 0.35 + Math.sin(time * 16) * 0.28);
        human.armR.elbow.rotation.x = -0.45 + Math.sin(time * 16) * 0.22;
      } else {
        human.armR.shoulder.rotation.set(-0.02, 0, 0.09);
        human.armR.elbow.rotation.x = -0.18;
      }
      return;
    }

    // Realistic Walk / Sprint Biomechanics!
    var isRun = Math.max(0, Math.min(1, (speedNorm - 0.62) / 0.38));
    var hipAmp = 0.50 + isRun * 0.36;
    var kneeScale = 0.72 + isRun * 0.48;
    var armAmp = 0.42 + isRun * 0.46;

    var sinP = Math.sin(phase);
    var cosP = Math.cos(phase);

    // Subtle double-frequency vertical stride bounce + forward sprint lean + spine counter-twist!
    var bob = Math.abs(Math.cos(phase)) * (0.026 + isRun * 0.032);
    human.pelvis.position.y = 0.875 + bob;
    human.torso.rotation.x = 0.05 + isRun * 0.16;
    human.torso.rotation.y = -sinP * (0.09 + isRun * 0.06);
    human.torso.rotation.z = cosP * 0.025;
    human.neck.rotation.x = -(0.04 + isRun * 0.12);
    human.neck.rotation.y = sinP * 0.06;

    // Left Leg (+sinP = back push-off, -sinP = forward swing; -cosP peaks during forward swing!)
    human.legL.hip.rotation.set(sinP * hipAmp, 0, -0.02);
    var kneeL = Math.max(0.06, (-cosP * 0.68 + 0.24) * kneeScale);
    human.legL.knee.rotation.x = kneeL;
    human.legL.foot.rotation.x = -kneeL * 0.32;

    // Right Leg (180° opposite phase)
    human.legR.hip.rotation.set(-sinP * hipAmp, 0, 0.02);
    var kneeR = Math.max(0.06, (cosP * 0.68 + 0.24) * kneeScale);
    human.legR.knee.rotation.x = kneeR;
    human.legR.foot.rotation.x = -kneeR * 0.32;

    // Left Arm (swings forward when right leg swings forward, i.e. when sinP > 0)
    human.armL.shoulder.rotation.set(-sinP * armAmp, 0, -0.09);
    human.armL.elbow.rotation.x = -(0.22 + isRun * 0.68 + Math.max(0, sinP) * 0.28);

    // Right Arm (or friendly wave while walking!)
    if (waveTimer > 0) {
      human.armR.shoulder.rotation.set(-2.35, 0, 0.35 + Math.sin(time * 16) * 0.28);
      human.armR.elbow.rotation.x = -0.45 + Math.sin(time * 16) * 0.22;
    } else {
      human.armR.shoulder.rotation.set(sinP * armAmp, 0, 0.09);
      human.armR.elbow.rotation.x = -(0.22 + isRun * 0.68 + Math.max(0, -sinP) * 0.28);
    }
  }

  function poseMotoRider(human, steerNorm) {
    if (!human) return;
    var st = steerNorm || 0;
    // Rider pelvis sits on saddle; torso leans forward (+X), head looks ahead (-X relative to torso)
    human.pelvis.position.set(0, 0.0, 0);
    human.torso.rotation.set(0.48, -st * 0.12, st * 0.14);
    human.neck.rotation.set(-0.38, -st * 0.14, 0);

    // Thighs grip fuel tank forward & outward; knees bend sharply back to rearset footpegs!
    human.legL.hip.rotation.set(-1.12, 0.14, -0.28);
    human.legL.knee.rotation.x = 1.48;
    human.legL.foot.rotation.x = 0.22;

    human.legR.hip.rotation.set(-1.12, -0.14, 0.28);
    human.legR.knee.rotation.x = 1.48;
    human.legR.foot.rotation.x = 0.22;

    // Arms reach forward onto handlebar grips with natural elbow bend
    human.armL.shoulder.rotation.set(-1.18, -0.12, -0.16);
    human.armL.elbow.rotation.x = -0.34;

    human.armR.shoulder.rotation.set(-1.18, 0.12, 0.16);
    human.armR.elbow.rotation.x = -0.34;
  }

  function poseCarDriver(human) {
    if (!human) return;
    human.pelvis.position.set(0, 0.0, 0);
    human.torso.rotation.set(-0.08, 0, 0);
    human.neck.rotation.set(0.06, 0, 0);

    // Seated thighs forward, knees bent down into footwell
    human.legL.hip.rotation.set(-1.35, 0, -0.08);
    human.legL.knee.rotation.x = 1.15;
    human.legR.hip.rotation.set(-1.35, 0, 0.08);
    human.legR.knee.rotation.x = 1.15;

    // Hands forward holding steering wheel!
    human.armL.shoulder.rotation.set(-0.88, -0.15, -0.08);
    human.armL.elbow.rotation.x = -0.45;
    human.armR.shoulder.rotation.set(-0.88, 0.15, 0.08);
    human.armR.elbow.rotation.x = -0.45;
  }

  window.GTC.Human = {
    create: createHuman,
    animateLocomotion: animateLocomotion,
    poseMotoRider: poseMotoRider,
    poseCarDriver: poseCarDriver
  };
})();
