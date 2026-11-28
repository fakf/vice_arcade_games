// Grand Turbo City — Sculpted 3D Realistic Vehicles, Bikes & Terrain Physics (window.GTC.Vehicles)
(function () {
  'use strict';

  window.GTC = window.GTC || {};

  var CATALOG = {
    coupe: {
      id: 'coupe',
      name: 'Turbo Coupé GT',
      maxSpeed: 48,
      accel: 28,
      nitro: 70,
      turnRate: 2.6,
      maxShield: 100,
      radius: 2.1,
      jumpMult: 1.00,
      sandFactor: 0.78,
      pushesProps: false,
      isMoto: false,
      special: 'Desportivo equilibrado',
      requiresGold: false
    },
    moto: {
      id: 'moto',
      name: 'Moto Desportiva #46',
      maxSpeed: 54,
      accel: 36,
      nitro: 78,
      turnRate: 3.3,
      maxShield: 75,
      radius: 1.4,
      jumpMult: 1.28,
      sandFactor: 0.90,
      pushesProps: false,
      isMoto: true,
      special: 'Inclina nas curvas, saltos altos',
      requiresGold: false
    },
    buggy: {
      id: 'buggy',
      name: 'Buggy Off-Road',
      maxSpeed: 44,
      accel: 32,
      nitro: 66,
      turnRate: 3.0,
      maxShield: 95,
      radius: 1.9,
      jumpMult: 1.16,
      sandFactor: 1.00,
      pushesProps: false,
      isMoto: false,
      special: '100% tração na areia e dunas',
      requiresGold: false
    },
    van: {
      id: 'van',
      name: 'Furgão Expresso',
      maxSpeed: 38,
      accel: 22,
      nitro: 56,
      turnRate: 2.2,
      maxShield: 130,
      radius: 2.3,
      jumpMult: 0.90,
      sandFactor: 0.74,
      pushesProps: false,
      isMoto: false,
      special: 'Resistente, ideal para entregas',
      requiresGold: false
    },
    police: {
      id: 'police',
      name: 'Interceptor Policial',
      maxSpeed: 52,
      accel: 31,
      nitro: 74,
      turnRate: 2.7,
      maxShield: 125,
      radius: 2.2,
      jumpMult: 1.00,
      sandFactor: 0.75,
      pushesProps: false,
      isMoto: false,
      special: 'Sirene policial interativa (H)',
      requiresGold: false
    },
    truck: {
      id: 'truck',
      name: 'Pick-up 4x4 Blindada',
      maxSpeed: 36,
      accel: 19,
      nitro: 54,
      turnRate: 1.9,
      maxShield: 200,
      radius: 2.6,
      jumpMult: 0.85,
      sandFactor: 0.92,
      pushesProps: true,
      isMoto: false,
      special: 'Empurra cones sem perder velocidade',
      requiresGold: false
    },
    gold_supercar: {
      id: 'gold_supercar',
      name: 'Supercarro Dourado',
      maxSpeed: 60,
      accel: 40,
      nitro: 88,
      turnRate: 3.0,
      maxShield: 150,
      radius: 2.1,
      jumpMult: 1.12,
      sandFactor: 0.75,
      pushesProps: false,
      isMoto: false,
      special: 'Dourado metálico, o mais rápido',
      requiresGold: true
    }
  };

  // Automotive metallic paint palette (keeps full compatibility with existing saves)
  var COLORS = [
    { id: 'red',    name: 'Vermelho Monza',    hex: '#dc2626' },
    { id: 'cream',  name: 'Creme Clássico',    hex: '#f3e8c8' },
    { id: 'blue',   name: 'Azul Pacífico',     hex: '#2563eb' },
    { id: 'green',  name: 'Verde Racing #46',  hex: '#16a34a' },
    { id: 'black',  name: 'Preto Carbono',     hex: '#1e293b' },
    { id: 'white',  name: 'Branco Pérola',     hex: '#f8fafc' },
    { id: 'pink',   name: 'Rosa Metálico',     hex: '#ec4899' },
    { id: 'gold',   name: 'Dourado Metálico',  hex: '#fbbf24', requiresGold: true }
  ];

  var UNDERGLOWS = [
    { id: 'off',     name: 'Desligado',  hex: null },
    { id: 'cyan',    name: 'Xenon Azul', hex: '#22d3ee' },
    { id: 'magenta', name: 'Magenta',    hex: '#ec4899' },
    { id: 'lime',    name: 'Verde',      hex: '#84cc16' },
    { id: 'yellow',  name: 'Âmbar',      hex: '#facc15' },
    { id: 'rainbow', name: 'Arco-Íris',  hex: 'rainbow' }
  ];

  var nextVehicleUid = 1;
  var GRAVITY = -34;

  // Shared realistic materials
  var sharedRubberMat = null;
  var sharedChromeMat = null;
  var sharedDarkTrimMat = null;
  var sharedGlassMat = null;
  var numberBadgeTex46 = null;

  function ensureSharedMaterials() {
    if (sharedRubberMat) return;
    sharedRubberMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.88, metalness: 0.05 });
    sharedChromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.14, metalness: 0.90 });
    sharedDarkTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.62, metalness: 0.25 });
    sharedGlassMat = new THREE.MeshStandardMaterial({
      color: 0x101c2c,
      metalness: 0.85,
      roughness: 0.08,
      transparent: true,
      opacity: 0.86
    });

    // Racing #46 badge canvas texture (homage to NRG-500 in Reel!)
    var c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 122, 58);
    ctx.fillStyle = '#111827';
    ctx.font = 'italic bold 40px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('46', 64, 34);
    numberBadgeTex46 = new THREE.CanvasTexture(c);
    numberBadgeTex46.needsUpdate = true;
  }

  // Extrudes a side silhouette of [z, y] points along X width (+Z is vehicle front)
  function extrudeProfile(pointsZY, totalWidth, bevel) {
    var bev = bevel !== undefined ? bevel : 0.11;
    var depth = Math.max(0.1, totalWidth - bev * 2);
    var shape = new THREE.Shape();
    shape.moveTo(pointsZY[0][0], pointsZY[0][1]);
    for (var i = 1; i < pointsZY.length; i++) {
      shape.lineTo(pointsZY[i][0], pointsZY[i][1]);
    }
    shape.closePath();

    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: bev > 0,
      bevelThickness: bev,
      bevelSize: bev,
      bevelSegments: 3,
      curveSegments: 6
    });
    geo.translate(0, 0, -depth * 0.5);
    // Rotate -PI/2 around Y so shape X -> +Z (front), shape Y -> +Y (up), extrude Z -> X (width)
    geo.rotateY(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }

  // Detailed multi-spoke automotive wheel with steering pivot & spin group
  function makeWheel(radius, width, rimHex, canSteer) {
    ensureSharedMaterials();
    var pivot = new THREE.Group();
    var spin = new THREE.Group();
    pivot.add(spin);

    // Main tire tread
    var tire = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, width, 20),
      sharedRubberMat
    );
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    spin.add(tire);

    // Rounded sidewall shoulders
    var shoulder = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.93, radius * 0.93, width + 0.035, 18),
      sharedRubberMat
    );
    shoulder.rotation.z = Math.PI / 2;
    spin.add(shoulder);

    // Metallic rim barrel + brake disc
    var rimMat = rimHex
      ? new THREE.MeshStandardMaterial({ color: rimHex, metalness: 0.78, roughness: 0.22 })
      : sharedChromeMat;

    var barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.045, 14),
      sharedDarkTrimMat
    );
    barrel.rotation.z = Math.PI / 2;
    spin.add(barrel);

    var ring = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.64, radius * 0.64, width + 0.052, 16, 1, true),
      rimMat
    );
    ring.rotation.z = Math.PI / 2;
    spin.add(ring);

    // 5-spoke star alloy wheel on outer faces
    var spokeGeo = new THREE.BoxGeometry(width + 0.06, radius * 1.14, radius * 0.14);
    for (var s = 0; s < 3; s++) {
      var sp = new THREE.Mesh(spokeGeo, rimMat);
      sp.rotation.x = (s / 3) * Math.PI;
      spin.add(sp);
    }

    // Center hub cap
    var hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.19, radius * 0.19, width + 0.075, 10),
      sharedChromeMat
    );
    hub.rotation.z = Math.PI / 2;
    spin.add(hub);

    return {
      pivot: pivot,
      spin: spin,
      canSteer: !!canSteer
    };
  }

  // Articulated seated driver / motorcycle rider
  function makeDriver(isMotoRider, isPolice) {
    ensureSharedMaterials();
    var grp = new THREE.Group();

    var jacketHex = isPolice ? 0x1e3a8a : (isMotoRider ? 0xd97706 : 0xf8fafc); // Orange/tan jersey on moto like Reel!
    var pantsHex = isPolice ? 0x0f172a : (isMotoRider ? 0xe5e7eb : 0x1e3a8a);
    var skinMat = new THREE.MeshStandardMaterial({ color: 0xd99b6c, roughness: 0.65 });
    var jacketMat = new THREE.MeshStandardMaterial({ color: jacketHex, roughness: 0.72 });
    var pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.8 });

    // Torso
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.62, 8), jacketMat);
    torso.scale.set(1.15, 1, 0.78);
    torso.position.y = 0.34;
    torso.castShadow = true;
    grp.add(torso);

    // Head / Helmet
    if (isMotoRider) {
      // Sport helmet with dark visor
      var helm = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.35, roughness: 0.25 })
      );
      helm.scale.set(0.95, 1.02, 1.12);
      helm.position.set(0, 0.80, 0.04);
      helm.castShadow = true;
      grp.add(helm);

      var visor = new THREE.Mesh(
        new THREE.SphereGeometry(0.225, 10, 8, -Math.PI * 0.36, Math.PI * 0.72, Math.PI * 0.28, Math.PI * 0.34),
        sharedGlassMat
      );
      visor.rotation.y = Math.PI * 0.5;
      visor.position.set(0, 0.80, 0.05);
      grp.add(visor);

      // Rider arms reaching forward to handlebars
      var armGeo = new THREE.CylinderGeometry(0.068, 0.058, 0.58, 7);
      var armL = new THREE.Mesh(armGeo, skinMat);
      armL.position.set(-0.28, 0.50, 0.26);
      armL.rotation.set(1.18, 0, -0.18);
      grp.add(armL);
      var armR = armL.clone();
      armR.position.x = 0.28;
      armR.rotation.z = 0.18;
      grp.add(armR);

      // Rider legs gripping tank & bent back to footpegs
      var thighGeo = new THREE.CylinderGeometry(0.095, 0.08, 0.48, 7);
      var thighL = new THREE.Mesh(thighGeo, pantsMat);
      thighL.position.set(-0.22, 0.06, 0.14);
      thighL.rotation.set(1.05, 0, 0.16);
      grp.add(thighL);
      var thighR = thighL.clone();
      thighR.position.x = 0.22;
      thighR.rotation.z = -0.16;
      grp.add(thighR);

      var calfGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.44, 7);
      var calfL = new THREE.Mesh(calfGeo, pantsMat);
      calfL.position.set(-0.24, -0.18, 0.04);
      calfL.rotation.set(-0.65, 0, 0);
      grp.add(calfL);
      var calfR = calfL.clone();
      calfR.position.x = 0.24;
      grp.add(calfR);
    } else {
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 10), skinMat);
      head.position.y = 0.78;
      grp.add(head);

      if (isPolice) {
        var cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.21, 0.10, 10),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
        );
        cap.position.set(0, 0.92, 0.02);
        grp.add(cap);
      } else {
        var hair = new THREE.Mesh(
          new THREE.SphereGeometry(0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
          new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 })
        );
        hair.position.y = 0.80;
        grp.add(hair);

        var shades = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.08, 0.08),
          sharedDarkTrimMat
        );
        shades.position.set(0, 0.80, 0.18);
        grp.add(shades);
      }
    }

    return grp;
  }

  function addSideMirrors(parent, xOffset, yPos, zPos, mat) {
    var mGeo = new THREE.BoxGeometry(0.20, 0.12, 0.15);
    var mL = new THREE.Mesh(mGeo, mat);
    mL.position.set(-xOffset, yPos, zPos);
    var mR = mL.clone();
    mR.position.x = xOffset;
    parent.add(mL, mR);
  }

  function addDualExhausts(parent, xSpread, yPos, zPos) {
    var pipeGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.36, 10);
    pipeGeo.rotateX(Math.PI / 2);
    var exL = new THREE.Mesh(pipeGeo, sharedChromeMat);
    exL.position.set(-xSpread, yPos, zPos);
    var exR = exL.clone();
    exR.position.x = xSpread;
    parent.add(exL, exR);
  }

  // ===========================================================================
  // Build Sculpted 3D Vehicle Meshes
  // ===========================================================================
  function buildVehicleMesh(typeId, colorHex, underglowHex) {
    ensureSharedMaterials();
    var root = new THREE.Group();
    var bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    var isGold = colorHex === '#fbbf24' || typeId === 'gold_supercar';
    var effectiveColor = typeId === 'gold_supercar' && !colorHex ? '#fbbf24' : (colorHex || '#dc2626');
    if (typeId === 'police' && !colorHex) effectiveColor = '#f8fafc';

    // Automotive clearcoat metallic material (reflects scene.environment!)
    var bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(effectiveColor),
      metalness: isGold ? 0.88 : 0.56,
      roughness: isGold ? 0.14 : 0.23
    });

    var headMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    var brakeMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });

    var wheels = [];
    var sirenRed = null;
    var sirenBlue = null;
    var driverMesh = null;
    var ugW = 2.1;
    var ugL = 4.4;

    // -------------------------------------------------------------------------
    // 1. TURBO COUPÉ GT & SUPERCARRO DOURADO (San Andreas Sports Coupe / Exotic)
    // -------------------------------------------------------------------------
    if (typeId === 'coupe' || typeId === 'gold_supercar') {
      var isSuper = typeId === 'gold_supercar';

      var profile = isSuper
        ? [
            [-2.28, 0.34], [2.25, 0.28], [2.36, 0.48], [2.12, 0.72],
            [1.08, 0.88], [0.42, 1.32], [-0.58, 1.34], [-1.78, 0.94],
            [-2.28, 0.86], [-2.32, 0.52]
          ]
        : [
            [-2.26, 0.34], [2.18, 0.32], [2.32, 0.58], [2.15, 0.82],
            [0.98, 0.95], [0.28, 1.44], [-0.78, 1.43], [-1.72, 0.98],
            [-2.24, 0.92], [-2.30, 0.54]
          ];

      var hull = new THREE.Mesh(extrudeProfile(profile, isSuper ? 2.16 : 2.08, 0.12), bodyMat);
      hull.castShadow = true;
      hull.receiveShadow = true;
      bodyGroup.add(hull);

      // Tinted sculpted cabin glass slightly wider/taller inset for windshield & side windows
      var glassProfile = isSuper
        ? [[1.02, 0.89], [0.40, 1.30], [-0.56, 1.31], [-1.62, 0.95]]
        : [[0.92, 0.96], [0.26, 1.41], [-0.74, 1.40], [-1.62, 0.99]];
      var cabinGlass = new THREE.Mesh(extrudeProfile(glassProfile, isSuper ? 1.78 : 1.74, 0.04), sharedGlassMat);
      bodyGroup.add(cabinGlass);

      // Painted roof cap on top of glass
      var roofCap = new THREE.Mesh(
        new THREE.BoxGeometry(isSuper ? 1.56 : 1.54, 0.07, isSuper ? 0.96 : 1.02),
        bodyMat
      );
      roofCap.position.set(0, isSuper ? 1.34 : 1.44, -0.18);
      roofCap.castShadow = true;
      bodyGroup.add(roofCap);

      // Flared muscular wheel arches
      var archGeo = new THREE.CylinderGeometry(0.50, 0.50, 0.26, 14, 1, false, 0, Math.PI);
      archGeo.rotateZ(Math.PI / 2);
      var archCoords = [[-0.98, 0.44, 1.38], [0.98, 0.44, 1.38], [-0.98, 0.44, -1.38], [0.98, 0.44, -1.38]];
      for (var a = 0; a < 4; a++) {
        var arch = new THREE.Mesh(archGeo, bodyMat);
        arch.position.set(archCoords[a][0], archCoords[a][1], archCoords[a][2]);
        bodyGroup.add(arch);
      }

      // Front lower splitter, intake grille & side skirts
      var splitter = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.10, 0.36), sharedDarkTrimMat);
      splitter.position.set(0, 0.28, 2.22);
      bodyGroup.add(splitter);

      var grille = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.22, 0.08), sharedDarkTrimMat);
      grille.position.set(0, 0.50, 2.31);
      bodyGroup.add(grille);

      var skirt = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.11, 2.1), sharedDarkTrimMat);
      skirt.position.set(0, 0.30, 0);
      bodyGroup.add(skirt);

      addSideMirrors(bodyGroup, 1.06, 1.02, 0.62, bodyMat);

      // Sleek rear wing + wide San Andreas taillight bar + dual chrome exhausts!
      var wing = new THREE.Mesh(
        new THREE.BoxGeometry(isSuper ? 2.08 : 1.92, 0.08, 0.34),
        isSuper ? sharedDarkTrimMat : bodyMat
      );
      wing.position.set(0, isSuper ? 1.18 : 1.14, -2.08);
      wing.castShadow = true;
      bodyGroup.add(wing);

      var strutL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.20), sharedDarkTrimMat);
      strutL.position.set(-0.68, 1.0, -2.06);
      var strutR = strutL.clone();
      strutR.position.x = 0.68;
      bodyGroup.add(strutL, strutR);

      // Headlights
      var hlGeo = new THREE.BoxGeometry(0.46, 0.16, 0.10);
      var hlL = new THREE.Mesh(hlGeo, headMat);
      hlL.position.set(-0.70, 0.68, 2.28);
      var hlR = hlL.clone();
      hlR.position.x = 0.70;
      bodyGroup.add(hlL, hlR);

      // Wide iconic 90s/2000s red taillight bar + license plate
      var tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.19, 0.09), brakeMat);
      tailBar.position.set(0, 0.74, -2.28);
      bodyGroup.add(tailBar);

      var plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.18, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc })
      );
      plate.position.set(0, 0.50, -2.30);
      bodyGroup.add(plate);

      addDualExhausts(bodyGroup, 0.58, 0.32, -2.34);
      if (isSuper) addDualExhausts(bodyGroup, 0.38, 0.32, -2.34);

      driverMesh = makeDriver(false, false);
      driverMesh.position.set(-0.36, 0.48, -0.18);
      driverMesh.scale.set(0.78, 0.78, 0.78);
      bodyGroup.add(driverMesh);

      var wPos = [[-1.02, 0.42, 1.38], [1.02, 0.42, 1.38], [-1.04, 0.43, -1.38], [1.04, 0.43, -1.38]];
      for (var i = 0; i < 4; i++) {
        var cw = makeWheel(i >= 2 ? 0.43 : 0.42, 0.33, isSuper ? 0xfbbf24 : null, i < 2);
        cw.pivot.position.set(wPos[i][0], wPos[i][1], wPos[i][2]);
        bodyGroup.add(cw.pivot);
        wheels.push(cw);
      }
      ugW = 2.1;
      ugL = 4.3;

    // -------------------------------------------------------------------------
    // 2. MOTO DESPORTIVA #46 / MOTOCROSS (NRG-500 & Sanchez Reel Homage!)
    // -------------------------------------------------------------------------
    } else if (typeId === 'moto') {
      // Sculpted aerodynamic fuel tank, engine cradle & upswept tail cowl
      var motoProfile = [
        [-1.08, 1.06], [-0.55, 0.84], [-0.15, 0.86], [0.38, 1.14],
        [0.98, 1.08], [1.22, 0.86], [0.76, 0.56], [0.25, 0.40],
        [-0.35, 0.42], [-0.72, 0.74]
      ];
      var fairing = new THREE.Mesh(extrudeProfile(motoProfile, 0.48, 0.06), bodyMat);
      fairing.castShadow = true;
      bodyGroup.add(fairing);

      // Engine block & radiator detail
      var engine = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.56), sharedDarkTrimMat);
      engine.position.set(0, 0.54, 0.12);
      bodyGroup.add(engine);

      // Tinted sport windscreen bubble
      var screen = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.36), sharedGlassMat);
      screen.position.set(0, 1.18, 0.88);
      screen.rotation.x = 0.58;
      bodyGroup.add(screen);

      // #46 Racing number plate on nose & tail sides!
      var numMat = new THREE.MeshBasicMaterial({ map: numberBadgeTex46 });
      var noseNum = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.17), numMat);
      noseNum.position.set(0, 1.02, 1.18);
      noseNum.rotation.x = -0.35;
      bodyGroup.add(noseNum);

      // Black sculpted rider saddle
      var saddle = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.12, 0.62), sharedDarkTrimMat);
      saddle.position.set(0, 0.88, -0.26);
      bodyGroup.add(saddle);

      // Chrome telescopic front forks + steering assembly
      var forkGroup = new THREE.Group();
      forkGroup.position.set(0, 0.45, 1.02);
      var forkGeo = new THREE.CylinderGeometry(0.042, 0.038, 0.90, 8);
      var forkL = new THREE.Mesh(forkGeo, sharedChromeMat);
      forkL.position.set(-0.17, 0.36, -0.14);
      forkL.rotation.x = -0.34;
      var forkR = forkL.clone();
      forkR.position.x = 0.17;
      forkGroup.add(forkL, forkR);

      // Handlebars & grips
      var hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.88, 8), sharedChromeMat);
      hBar.rotation.z = Math.PI / 2;
      hBar.position.set(0, 0.74, -0.28);
      forkGroup.add(hBar);
      bodyGroup.add(forkGroup);

      // Rear swingarm + upswept chrome exhaust muffler
      var swing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.10, 0.72), sharedDarkTrimMat);
      swing.position.set(0, 0.48, -0.68);
      swing.rotation.x = 0.12;
      bodyGroup.add(swing);

      var muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.68, 10), sharedChromeMat);
      muffler.position.set(0.24, 0.72, -0.78);
      muffler.rotation.x = Math.PI / 2 - 0.35;
      bodyGroup.add(muffler);

      // Headlight & brake light
      var mHl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), headMat);
      mHl.position.set(0, 0.90, 1.22);
      bodyGroup.add(mHl);

      var mBl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.08), brakeMat);
      mBl.position.set(0, 1.02, -1.08);
      bodyGroup.add(mBl);

      // Realistic articulated rider leaning forward onto grips
      var rider = makeDriver(true, false);
      rider.position.set(0, 0.92, -0.22);
      rider.rotation.x = 0.36;
      bodyGroup.add(rider);
      driverMesh = rider;

      var fw = makeWheel(0.45, 0.22, null, true);
      fw.pivot.position.set(0, 0.45, 1.04);
      bodyGroup.add(fw.pivot);
      wheels.push(fw);

      var rw = makeWheel(0.47, 0.29, null, false);
      rw.pivot.position.set(0, 0.47, -0.98);
      bodyGroup.add(rw.pivot);
      wheels.push(rw);

      ugW = 1.0;
      ugL = 2.4;

    // -------------------------------------------------------------------------
    // 3. BUGGY OFF-ROAD (Desert Rail / Dakar Buggy)
    // -------------------------------------------------------------------------
    } else if (typeId === 'buggy') {
      var buggyProfile = [
        [-1.75, 0.48], [1.65, 0.44], [1.82, 0.68], [1.55, 0.88],
        [0.45, 0.92], [0.25, 0.72], [-0.85, 0.72], [-1.15, 1.02], [-1.78, 0.92]
      ];
      var tub = new THREE.Mesh(extrudeProfile(buggyProfile, 1.62, 0.08), bodyMat);
      tub.castShadow = true;
      bodyGroup.add(tub);

      // Tubular steel roll-cage
      var cageMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.65, roughness: 0.3 });
      var postGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.08, 8);
      var pCoords = [[-0.68, 1.32, -0.82, 0.12], [0.68, 1.32, -0.82, 0.12], [-0.68, 1.28, 0.58, -0.42], [0.68, 1.28, 0.58, -0.42]];
      for (var pc = 0; pc < 4; pc++) {
        var bar = new THREE.Mesh(postGeo, cageMat);
        bar.position.set(pCoords[pc][0], pCoords[pc][1], pCoords[pc][2]);
        bar.rotation.x = pCoords[pc][3];
        bar.castShadow = true;
        bodyGroup.add(bar);
      }
      var roofFrame = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.08, 1.28), cageMat);
      roofFrame.position.set(0, 1.80, -0.18);
      bodyGroup.add(roofFrame);

      // 3 Rally roof spotlights
      for (var sl = -1; sl <= 1; sl++) {
        var spot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 10), headMat);
        spot.rotation.x = Math.PI / 2;
        spot.position.set(sl * 0.38, 1.90, 0.44);
        bodyGroup.add(spot);
      }

      // Exposed rear V6 engine & twin exhaust headers
      var v6 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.44, 0.68), sharedChromeMat);
      v6.position.set(0, 0.88, -1.38);
      bodyGroup.add(v6);
      addDualExhausts(bodyGroup, 0.42, 0.82, -1.86);

      driverMesh = makeDriver(false, false);
      driverMesh.position.set(0, 0.68, -0.22);
      driverMesh.scale.set(0.85, 0.85, 0.85);
      bodyGroup.add(driverMesh);

      var bHl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 12), headMat);
      bHl1.rotation.x = Math.PI / 2;
      bHl1.position.set(-0.52, 0.78, 1.80);
      var bHl2 = bHl1.clone();
      bHl2.position.x = 0.52;
      bodyGroup.add(bHl1, bHl2);

      var bBl = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 0.08), brakeMat);
      bBl.position.set(0, 0.72, -1.78);
      bodyGroup.add(bBl);

      var bPos = [[-1.08, 0.50, 1.24], [1.08, 0.50, 1.24], [-1.14, 0.58, -1.24], [1.14, 0.58, -1.24]];
      for (var bi = 0; bi < 4; bi++) {
        var bw = makeWheel(bi >= 2 ? 0.58 : 0.50, 0.42, 0xd97706, bi < 2);
        bw.pivot.position.set(bPos[bi][0], bPos[bi][1], bPos[bi][2]);
        bodyGroup.add(bw.pivot);
        wheels.push(bw);
      }
      ugW = 2.0;
      ugL = 3.5;

    // -------------------------------------------------------------------------
    // 4. FURGÃO EXPRESSO (Aerodynamic Cargo Van)
    // -------------------------------------------------------------------------
    } else if (typeId === 'van') {
      var vanProfile = [
        [-2.42, 0.40], [2.25, 0.38], [2.44, 0.72], [2.32, 1.08],
        [1.58, 1.86], [-2.34, 1.88], [-2.44, 1.65]
      ];
      var vBody = new THREE.Mesh(extrudeProfile(vanProfile, 2.18, 0.11), bodyMat);
      vBody.castShadow = true;
      vBody.receiveShadow = true;
      bodyGroup.add(vBody);

      var vGlass = new THREE.Mesh(
        extrudeProfile([[2.28, 1.08], [1.56, 1.82], [0.75, 1.82], [0.75, 1.12]], 1.94, 0.03),
        sharedGlassMat
      );
      bodyGroup.add(vGlass);

      // Bumpers, grille & roof cargo rack
      var vBumperF = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.24, 0.22), sharedDarkTrimMat);
      vBumperF.position.set(0, 0.44, 2.40);
      var vBumperR = vBumperF.clone();
      vBumperR.position.z = -2.40;
      bodyGroup.add(vBumperF, vBumperR);

      var vGrille = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.34, 0.08), sharedDarkTrimMat);
      vGrille.position.set(0, 0.76, 2.43);
      bodyGroup.add(vGrille);

      var rack = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 2.8), sharedChromeMat);
      rack.position.set(0, 1.94, -0.45);
      bodyGroup.add(rack);

      addSideMirrors(bodyGroup, 1.16, 1.32, 1.45, sharedDarkTrimMat);

      var vHl1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.20, 0.08), headMat);
      vHl1.position.set(-0.78, 0.80, 2.43);
      var vHl2 = vHl1.clone();
      vHl2.position.x = 0.78;
      bodyGroup.add(vHl1, vHl2);

      var vBl1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.52, 0.08), brakeMat);
      vBl1.position.set(-0.92, 1.05, -2.43);
      var vBl2 = vBl1.clone();
      vBl2.position.x = 0.92;
      bodyGroup.add(vBl1, vBl2);

      var vPos = [[-1.08, 0.46, 1.50], [1.08, 0.46, 1.50], [-1.08, 0.46, -1.48], [1.08, 0.46, -1.48]];
      for (var vi = 0; vi < 4; vi++) {
        var vw = makeWheel(0.46, 0.34, null, vi < 2);
        vw.pivot.position.set(vPos[vi][0], vPos[vi][1], vPos[vi][2]);
        bodyGroup.add(vw.pivot);
        wheels.push(vw);
      }
      ugW = 2.25;
      ugL = 4.6;

    // -------------------------------------------------------------------------
    // 5. INTERCEPTOR POLICIAL (Classic LSPD / California Black & White Cruiser)
    // -------------------------------------------------------------------------
    } else if (typeId === 'police') {
      var cruiserBlackMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.55, roughness: 0.24 });

      var sedProfile = [
        [-2.35, 0.36], [2.25, 0.34], [2.38, 0.66], [2.18, 0.88],
        [1.05, 0.96], [0.42, 1.50], [-0.88, 1.50], [-1.52, 0.98],
        [-2.30, 0.94], [-2.38, 0.58]
      ];
      // Main black body shell
      var pShell = new THREE.Mesh(extrudeProfile(sedProfile, 2.12, 0.11), cruiserBlackMat);
      pShell.castShadow = true;
      pShell.receiveShadow = true;
      bodyGroup.add(pShell);

      // Contrast white (or custom bodyMat) center doors & roof section!
      var doorSection = new THREE.Mesh(
        extrudeProfile([[-1.02, 0.38], [1.02, 0.38], [1.02, 0.97], [0.40, 1.52], [-0.86, 1.52], [-1.02, 0.99]], 2.15, 0.08),
        bodyMat
      );
      doorSection.castShadow = true;
      bodyGroup.add(doorSection);

      var pGlass = new THREE.Mesh(
        extrudeProfile([[0.98, 0.98], [0.38, 1.47], [-0.84, 1.47], [-1.42, 1.0]], 1.80, 0.04),
        sharedGlassMat
      );
      bodyGroup.add(pGlass);

      // Front steel push-bumper ram bar
      var pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.52, 0.18), sharedDarkTrimMat);
      pushBar.position.set(0, 0.58, 2.44);
      bodyGroup.add(pushBar);

      addSideMirrors(bodyGroup, 1.10, 1.04, 0.72, cruiserBlackMat);
      addDualExhausts(bodyGroup, 0.62, 0.34, -2.40);

      // Visible patrol officer inside
      driverMesh = makeDriver(false, true);
      driverMesh.position.set(-0.36, 0.54, -0.10);
      driverMesh.scale.set(0.76, 0.76, 0.76);
      bodyGroup.add(driverMesh);

      // Aerodynamic roof siren lightbar
      var barMount = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.08, 0.30), sharedChromeMat);
      barMount.position.set(0, 1.58, -0.18);
      bodyGroup.add(barMount);

      sirenRed = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.15, 0.26),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      sirenRed.position.set(-0.35, 1.68, -0.18);
      bodyGroup.add(sirenRed);

      sirenBlue = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.15, 0.26),
        new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
      );
      sirenBlue.position.set(0.35, 1.68, -0.18);
      bodyGroup.add(sirenBlue);

      var pHl1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.08), headMat);
      pHl1.position.set(-0.72, 0.72, 2.38);
      var pHl2 = pHl1.clone();
      pHl2.position.x = 0.72;
      bodyGroup.add(pHl1, pHl2);

      var pBl1 = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.20, 0.08), brakeMat);
      pBl1.position.set(-0.68, 0.76, -2.38);
      var pBl2 = pBl1.clone();
      pBl2.position.x = 0.68;
      bodyGroup.add(pBl1, pBl2);

      var pPos = [[-1.04, 0.44, 1.44], [1.04, 0.44, 1.44], [-1.04, 0.44, -1.44], [1.04, 0.44, -1.44]];
      for (var pi = 0; pi < 4; pi++) {
        var pw = makeWheel(0.44, 0.33, null, pi < 2);
        pw.pivot.position.set(pPos[pi][0], pPos[pi][1], pPos[pi][2]);
        bodyGroup.add(pw.pivot);
        wheels.push(pw);
      }
      ugW = 2.2;
      ugL = 4.6;

    // -------------------------------------------------------------------------
    // 6. PICK-UP 4x4 BLINDADA (Heavy Lifted Off-Road Truck)
    // -------------------------------------------------------------------------
    } else if (typeId === 'truck') {
      var trkProfile = [
        [-2.68, 0.62], [2.56, 0.60], [2.72, 1.05], [2.58, 1.42],
        [1.36, 1.48], [0.82, 2.22], [-0.62, 2.22], [-0.66, 1.46],
        [-2.62, 1.44], [-2.70, 0.92]
      ];
      var tBody = new THREE.Mesh(extrudeProfile(trkProfile, 2.48, 0.12), bodyMat);
      tBody.castShadow = true;
      tBody.receiveShadow = true;
      bodyGroup.add(tBody);

      var tGlass = new THREE.Mesh(
        extrudeProfile([[1.30, 1.49], [0.78, 2.16], [-0.56, 2.16], [-0.58, 1.50]], 2.18, 0.04),
        sharedGlassMat
      );
      bodyGroup.add(tGlass);

      // Chrome grille & heavy bullbar
      var tGrille = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.48, 0.09), sharedChromeMat);
      tGrille.position.set(0, 1.12, 2.71);
      bodyGroup.add(tGrille);

      var bullbar = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.68, 0.26), sharedDarkTrimMat);
      bullbar.position.set(0, 0.88, 2.82);
      bullbar.castShadow = true;
      bodyGroup.add(bullbar);

      // Bed rollbar + 4 roof spotlights
      var rollBar = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.78, 0.14), sharedChromeMat);
      rollBar.position.set(0, 1.85, -0.82);
      bodyGroup.add(rollBar);
      for (var rl = -1.5; rl <= 1.5; rl += 1) {
        var rLight = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 10), headMat);
        rLight.rotation.x = Math.PI / 2;
        rLight.position.set(rl * 0.44, 2.32, -0.80);
        bodyGroup.add(rLight);
      }

      addSideMirrors(bodyGroup, 1.34, 1.65, 1.05, sharedDarkTrimMat);
      addDualExhausts(bodyGroup, 0.85, 0.58, -2.72);

      var tHl1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.08), headMat);
      tHl1.position.set(-0.98, 1.16, 2.71);
      var tHl2 = tHl1.clone();
      tHl2.position.x = 0.98;
      bodyGroup.add(tHl1, tHl2);

      var tBl1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.46, 0.08), brakeMat);
      tBl1.position.set(-1.08, 1.10, -2.70);
      var tBl2 = tBl1.clone();
      tBl2.position.x = 1.08;
      bodyGroup.add(tBl1, tBl2);

      var tPos = [[-1.30, 0.66, 1.72], [1.30, 0.66, 1.72], [-1.30, 0.66, -1.72], [1.30, 0.66, -1.72]];
      for (var ti = 0; ti < 4; ti++) {
        var tw = makeWheel(0.66, 0.50, null, ti < 2);
        tw.pivot.position.set(tPos[ti][0], tPos[ti][1], tPos[ti][2]);
        bodyGroup.add(tw.pivot);
        wheels.push(tw);
      }
      ugW = 2.6;
      ugL = 5.3;
    }

    // Soft diffused ground underglow (when equipped)
    var glowTex = (window.GTC.Textures && window.GTC.Textures.get) ? window.GTC.Textures.get('puff') : null;
    var ugMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: (underglowHex && underglowHex !== 'rainbow') ? new THREE.Color(underglowHex) : new THREE.Color(0x22d3ee),
      transparent: true,
      opacity: underglowHex ? 0.62 : 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var underglowMesh = new THREE.Mesh(new THREE.PlaneGeometry(ugW + 1.3, ugL + 1.3), ugMat);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.y = 0.06;
    underglowMesh.visible = !!underglowHex;
    root.add(underglowMesh);

    return {
      root: root,
      bodyGroup: bodyGroup,
      bodyMat: bodyMat,
      brakeMat: brakeMat,
      wheels: wheels,
      driverMesh: driverMesh,
      sirenRed: sirenRed,
      sirenBlue: sirenBlue,
      underglowMesh: underglowMesh,
      underglowMat: ugMat
    };
  }

  function createVehicle(typeId, opts) {
    var o = opts || {};
    var spec = CATALOG[typeId] || CATALOG.coupe;
    var color = o.color !== undefined ? o.color : (typeId === 'gold_supercar' ? '#fbbf24' : (typeId === 'police' ? '#f8fafc' : '#dc2626'));
    var underglow = o.underglow !== undefined ? o.underglow : null;

    var parts = buildVehicleMesh(spec.id, color, underglow);
    var x = o.x || 0;
    var y = o.y || 0;
    var z = o.z || 0;
    var angle = o.angle !== undefined ? o.angle : Math.PI;

    parts.root.position.set(x, y, z);
    parts.root.rotation.y = angle;
    if (parts.driverMesh) {
      parts.driverMesh.visible = !!(o.isAI || o.occupied);
    }

    if (o.scene) {
      o.scene.add(parts.root);
    }

    return {
      id: 'veh_' + (nextVehicleUid++),
      typeId: spec.id,
      spec: spec,
      mesh: parts.root,
      bodyGroup: parts.bodyGroup,
      bodyMat: parts.bodyMat,
      brakeMat: parts.brakeMat,
      wheels: parts.wheels,
      driverMesh: parts.driverMesh,
      sirenRed: parts.sirenRed,
      sirenBlue: parts.sirenBlue,
      underglowMesh: parts.underglowMesh,
      underglowMat: parts.underglowMat,
      x: x,
      y: y,
      z: z,
      vy: 0,
      angle: angle,
      speed: 0,
      steerAngle: 0,
      shield: spec.maxShield,
      maxShield: spec.maxShield,
      nitro: 100,
      nitroLocked: false,
      airtime: 0,
      isGrounded: true,
      jumpStartX: x,
      jumpStartZ: z,
      jumpPeakHeight: 0,
      prevGroundY: y,
      color: color,
      underglow: underglow,
      sirenOn: !!o.sirenOn,
      isAI: !!o.isAI,
      aiRole: o.aiRole || null,
      isBoss: false,
      empCooldown: 0,
      hitCooldown: 0,
      stuckTimer: 0,
      lastPos: { x: x, z: z }
    };
  }

  // ===========================================================================
  // Mega-Camião Boss: American Long-Nose Heavy Rig + Armored Energy Trailer
  // ===========================================================================
  function createBossTruck(opts) {
    ensureSharedMaterials();
    var o = opts || {};
    var root = new THREE.Group();
    var bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    var bodyMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      metalness: 0.62,
      roughness: 0.25,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    var trailerMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.55,
      roughness: 0.35
    });
    var warnMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    var coreMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });

    // Long-nose American semi tractor cab (+Z front)
    var cabProfile = [
      [1.4, 0.9], [5.1, 0.9], [5.25, 2.25], [3.6, 2.40],
      [3.2, 3.65], [1.4, 3.65]
    ];
    var cab = new THREE.Mesh(extrudeProfile(cabProfile, 4.4, 0.14), bodyMat);
    cab.castShadow = true;
    cab.receiveShadow = true;
    bodyGroup.add(cab);

    // Massive vertical chrome grille & ram bumper
    var grille = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.45, 0.16), sharedChromeMat);
    grille.position.set(0, 1.75, 5.26);
    bodyGroup.add(grille);

    var bumper = new THREE.Mesh(new THREE.BoxGeometry(5.3, 1.15, 0.55), sharedChromeMat);
    bumper.position.set(0, 1.0, 5.42);
    bumper.castShadow = true;
    bodyGroup.add(bumper);

    var visor = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.72, 0.14), sharedGlassMat);
    visor.position.set(0, 2.95, 3.45);
    visor.rotation.x = -0.25;
    bodyGroup.add(visor);

    // Twin tall chrome vertical exhaust stacks behind cab!
    var stackGeo = new THREE.CylinderGeometry(0.18, 0.20, 3.6, 10);
    var stackL = new THREE.Mesh(stackGeo, sharedChromeMat);
    stackL.position.set(-2.35, 2.8, 1.55);
    stackL.castShadow = true;
    var stackR = stackL.clone();
    stackR.position.x = 2.35;
    bodyGroup.add(stackL, stackR);

    // Heavy armored trailer
    var trailer = new THREE.Mesh(new THREE.BoxGeometry(5.1, 3.1, 6.8), trailerMat);
    trailer.position.set(0, 2.45, -2.0);
    trailer.castShadow = true;
    trailer.receiveShadow = true;
    bodyGroup.add(trailer);

    // Glowing EMP core on top of trailer
    var core = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.9, 16), coreMat);
    core.position.set(0, 4.25, -2.0);
    bodyGroup.add(core);

    var stripL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.30, 6.6), warnMat);
    stripL.position.set(-2.58, 2.45, -2.0);
    var stripR = stripL.clone();
    stripR.position.x = 2.58;
    bodyGroup.add(stripL, stripR);

    var wheels = [];
    var wZ = [3.8, -0.6, -3.8];
    for (var i = 0; i < wZ.length; i++) {
      var wl = makeWheel(1.02, 0.70, null, i === 0);
      wl.pivot.position.set(-2.55, 1.02, wZ[i]);
      bodyGroup.add(wl.pivot);
      wheels.push(wl);

      var wr = makeWheel(1.02, 0.70, null, i === 0);
      wr.pivot.position.set(2.55, 1.02, wZ[i]);
      bodyGroup.add(wr.pivot);
      wheels.push(wr);
    }

    var ugMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var underglowMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 11.4), ugMat);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.y = 0.08;
    root.add(underglowMesh);

    var x = o.x !== undefined ? o.x : -40;
    var y = o.y || 0;
    var z = o.z !== undefined ? o.z : -40;
    var angle = o.angle !== undefined ? o.angle : 0;
    root.position.set(x, y, z);
    root.rotation.y = angle;
    if (o.scene) o.scene.add(root);

    var bossSpec = {
      id: 'boss_truck',
      name: 'Mega-Camião Rebelde',
      maxSpeed: 32,
      accel: 22,
      nitro: 32,
      turnRate: 2.0,
      maxShield: 500,
      radius: 3.6,
      jumpMult: 0.5,
      sandFactor: 0.9,
      pushesProps: true,
      isMoto: false
    };

    return {
      id: 'boss_' + (nextVehicleUid++),
      typeId: 'boss_truck',
      spec: bossSpec,
      mesh: root,
      bodyGroup: bodyGroup,
      bodyMat: bodyMat,
      brakeMat: null,
      wheels: wheels,
      sirenRed: null,
      sirenBlue: null,
      underglowMesh: underglowMesh,
      underglowMat: ugMat,
      x: x,
      y: y,
      z: z,
      vy: 0,
      angle: angle,
      speed: 0,
      steerAngle: 0,
      shield: 500,
      maxShield: 500,
      hp: 5,
      maxHp: 5,
      nitro: 0,
      airtime: 0,
      isGrounded: true,
      jumpStartX: x,
      jumpStartZ: z,
      jumpPeakHeight: 0,
      prevGroundY: y,
      color: '#7f1d1d',
      underglow: '#ef4444',
      sirenOn: false,
      isAI: true,
      aiRole: 'boss',
      isBoss: true,
      empCooldown: 0,
      empFlashTimer: 0,
      hitCooldown: 0,
      stuckTimer: 0,
      lastPos: { x: x, z: z }
    };
  }

  function applyCustomization(vehicle, colorHex, underglowHex) {
    if (!vehicle) return;
    if (colorHex !== undefined && vehicle.bodyMat) {
      vehicle.color = colorHex;
      vehicle.bodyMat.color.set(colorHex);
      var isGold = colorHex === '#fbbf24';
      vehicle.bodyMat.metalness = isGold ? 0.88 : 0.56;
      vehicle.bodyMat.roughness = isGold ? 0.14 : 0.23;
    }
    if (underglowHex !== undefined && vehicle.underglowMesh && vehicle.underglowMat) {
      vehicle.underglow = underglowHex;
      if (!underglowHex) {
        vehicle.underglowMesh.visible = false;
        vehicle.underglowMat.opacity = 0;
      } else {
        vehicle.underglowMesh.visible = true;
        vehicle.underglowMat.opacity = 0.45;
        if (underglowHex !== 'rainbow') {
          vehicle.underglowMat.color.set(underglowHex);
        }
      }
    }
  }

  function updateUnderglow(vehicle, time) {
    if (!vehicle) return;
    if (vehicle.underglow === 'rainbow' && vehicle.underglowMat) {
      vehicle.underglowMat.color.setHSL((time * 0.25) % 1, 1, 0.55);
    }
    if (vehicle.sirenRed && vehicle.sirenBlue) {
      if (vehicle.sirenOn) {
        var blink = Math.floor(time * 9) % 2 === 0;
        vehicle.sirenRed.material.color.setHex(blink ? 0xff2222 : 0x450a0a);
        vehicle.sirenBlue.material.color.setHex(blink ? 0x172554 : 0x38bdf8);
      } else {
        vehicle.sirenRed.material.color.setHex(0x991b1b);
        vehicle.sirenBlue.material.color.setHex(0x1e3a8a);
      }
    }
    if (vehicle.isBoss && vehicle.bodyMat) {
      if (vehicle.empFlashTimer > 0) {
        var fBlink = Math.floor(time * 24) % 2 === 0;
        vehicle.bodyMat.emissive.setHex(fBlink ? 0x22d3ee : 0x000000);
        vehicle.bodyMat.emissiveIntensity = fBlink ? 0.9 : 0;
      } else {
        vehicle.bodyMat.emissive.setHex(0x000000);
        vehicle.bodyMat.emissiveIntensity = 0;
      }
    }
  }

  function resolveAABB(x, y, z, r, colliders) {
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      if (c.blocksVehicles === false) continue;
      if (c.minY !== undefined && y + 1.8 < c.minY) continue;
      if (c.maxY !== undefined && y > c.maxY) continue;
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        return true;
      }
    }
    return false;
  }

  // ===========================================================================
  // Arcade + Terrain Physics Step
  // ===========================================================================
  function stepPhysics(vehicle, input, dt, city, allVehicles, cones) {
    var events = {
      hitWallSpeed: 0,
      hitVehicleSpeed: 0,
      hitVehicle: null,
      hitCone: false,
      hitBossEmp: false,
      hitBossNoNitro: false,
      landedBigJump: false,
      airtime: 0,
      jumpDistance: 0,
      jumpHeight: 0,
      hitBoundary: false,
      waterSplash: false,
      nitroActive: false,
      braking: false,
      drifting: false,
      onSand: false
    };

    if (!vehicle || !city) return events;

    var spec = vehicle.spec;
    var inp = input || {};

    var throttle = inp.throttle !== undefined ? inp.throttle : ((inp.forward ? 1 : 0) - (inp.backward ? 1 : 0));
    var steer = inp.steer !== undefined ? inp.steer : ((inp.right ? 1 : 0) - (inp.left ? 1 : 0));
    var drift = !!inp.drift;
    var wantNitro = !!inp.nitro;

    if (vehicle.empCooldown > 0) vehicle.empCooldown = Math.max(0, vehicle.empCooldown - dt);
    if (vehicle.hitCooldown > 0) vehicle.hitCooldown = Math.max(0, vehicle.hitCooldown - dt);
    if (vehicle.empFlashTimer > 0) vehicle.empFlashTimer = Math.max(0, vehicle.empFlashTimer - dt);

    // Nitro hysteresis
    if (vehicle.nitro <= 0) {
      vehicle.nitro = 0;
      vehicle.nitroLocked = true;
    } else if (vehicle.nitro >= 8) {
      vehicle.nitroLocked = false;
    }

    var nitroActive = false;
    if (wantNitro && !vehicle.nitroLocked && vehicle.nitro > 2 && throttle >= 0) {
      nitroActive = true;
      vehicle.nitro = Math.max(0, vehicle.nitro - 28 * dt);
      if (vehicle.nitro <= 0) vehicle.nitroLocked = true;
    } else {
      vehicle.nitro = Math.min(100, vehicle.nitro + 12 * dt);
    }
    events.nitroActive = nitroActive;

    var onSand = city.isOnSand ? city.isOnSand(vehicle.x, vehicle.z) : false;
    events.onSand = onSand;
    var maxFwd = (nitroActive ? spec.nitro : spec.maxSpeed) * (onSand ? spec.sandFactor : 1.0);
    var maxRev = -0.42 * spec.maxSpeed;

    var braking = false;
    if (throttle > 0.05) {
      if (vehicle.speed < 0) {
        braking = true;
        vehicle.speed = Math.min(0, vehicle.speed + 45 * dt);
      } else {
        var accelBoost = nitroActive ? 1.55 : 1.0;
        vehicle.speed += spec.accel * accelBoost * throttle * dt;
      }
    } else if (throttle < -0.05) {
      if (vehicle.speed > 0) {
        braking = true;
        vehicle.speed = Math.max(0, vehicle.speed - 45 * dt);
      } else {
        vehicle.speed += spec.accel * 0.75 * throttle * dt;
      }
    } else {
      if (vehicle.speed > 0) vehicle.speed = Math.max(0, vehicle.speed - 18 * dt);
      else if (vehicle.speed < 0) vehicle.speed = Math.min(0, vehicle.speed + 18 * dt);
    }
    events.braking = braking;

    if (vehicle.speed > maxFwd) vehicle.speed = Math.max(maxFwd, vehicle.speed - 24 * dt);
    if (vehicle.speed < maxRev) vehicle.speed = maxRev;

    var speedFactor = Math.min(1, Math.abs(vehicle.speed) / 8);
    var dirSign = vehicle.speed >= 0 ? 1 : -1;
    var isDrifting = drift && vehicle.speed > 10 && vehicle.isGrounded;
    events.drifting = isDrifting;
    var turnMult = isDrifting ? 1.35 : 1.0;

    if (isDrifting) {
      vehicle.speed *= Math.max(0.5, 1 - 0.35 * dt);
      vehicle.nitro = Math.min(100, vehicle.nitro + 10 * dt);
    }

    vehicle.steerAngle = steer;
    vehicle.angle -= steer * spec.turnRate * turnMult * speedFactor * dirSign * dt;

    var fx = Math.sin(vehicle.angle);
    var fz = Math.cos(vehicle.angle);
    var dx = fx * vehicle.speed * dt;
    var dz = fz * vehicle.speed * dt;

    var prevGround = city.getGroundHeight ? city.getGroundHeight(vehicle.x, vehicle.z, vehicle.y) : 0;

    var r = spec.radius;
    var hitWall = false;
    var prevSpeed = vehicle.speed;

    var tryX = vehicle.x + dx;
    if (resolveAABB(tryX, vehicle.y, vehicle.z, r, city.colliders)) {
      hitWall = true;
    } else {
      vehicle.x = tryX;
    }

    var tryZ = vehicle.z + dz;
    if (resolveAABB(vehicle.x, vehicle.y, tryZ, r, city.colliders)) {
      hitWall = true;
    } else {
      vehicle.z = tryZ;
    }

    // Continuous terrain + bridge elevation
    var baseTerrainY = city.getGroundHeight ? city.getGroundHeight(vehicle.x, vehicle.z, vehicle.y) : 0;
    var bridgeInfo = city.getBridgeElevation ? city.getBridgeElevation(vehicle.x, vehicle.z, vehicle.y) : { onBridge: false, y: 0, slopeBoost: 0 };
    var onRampGroundY = baseTerrainY;
    var hitRampSide = false;
    var moveDirX = vehicle.speed >= 0 ? fx : -fx;
    var moveDirZ = vehicle.speed >= 0 ? fz : -fz;

    // Launch off the iconic Red Suspension Bridge stunt girder!
    if (bridgeInfo.slopeBoost > 0 && vehicle.speed > 14 && vehicle.vy <= 3) {
      vehicle.vy = Math.min(26, vehicle.speed * 0.42) * spec.jumpMult;
      vehicle.isGrounded = false;
    }

    // Check Ramps OBB
    if (city.ramps) {
      for (var ri = 0; ri < city.ramps.length; ri++) {
        var rm = city.ramps[ri];
        var rmBaseY = (rm.x < -132 && city.getGroundHeight) ? city.getGroundHeight(rm.x, rm.z, 0) : 0;
        var relX = vehicle.x - rm.x;
        var relZ = vehicle.z - rm.z;
        var along = relX * rm.dirX + relZ * rm.dirZ;
        var across = Math.abs(relX * (-rm.dirZ) + relZ * rm.dirX);
        var hl = rm.length / 2;
        var hw = rm.width / 2;

        if (along >= -hl - 0.5 && along <= hl + 0.5 && across <= hw + 0.5) {
          var dot = moveDirX * rm.dirX + moveDirZ * rm.dirZ;
          if (dot > 0.5 || vehicle.y >= rmBaseY + 1.2) {
            var frac = Math.max(0, Math.min(1, (along + hl) / rm.length));
            var rampY = rmBaseY + frac * rm.height;
            if (rampY > onRampGroundY) onRampGroundY = rampY;

            if (frac > 0.86 && vehicle.speed > 12 && vehicle.vy <= 2 && dot > 0.5) {
              vehicle.vy = Math.min(24, vehicle.speed * 0.38) * spec.jumpMult;
              vehicle.isGrounded = false;
            }
          } else if (vehicle.y < rmBaseY + 1.2 && Math.abs(along) < hl && across < hw) {
            hitRampSide = true;
            vehicle.x -= dx;
            vehicle.z -= dz;
          }
        }
      }
    }

    if (hitWall || hitRampSide) {
      if (Math.abs(prevSpeed) > 22) {
        events.hitWallSpeed = Math.abs(prevSpeed);
        vehicle.speed = -prevSpeed * 0.25;
        if (!vehicle.isAI && vehicle.hitCooldown <= 0) {
          var wallDmg = Math.max(5, Math.min(15, Math.round((Math.abs(prevSpeed) - 20) * 0.45)));
          vehicle.shield = Math.max(0, vehicle.shield - wallDmg);
          vehicle.hitCooldown = 0.6;
        }
      } else {
        vehicle.speed *= 0.6;
      }
    }

    // World BOUNDS clamp
    var b = city.BOUNDS;
    if (vehicle.x < b.minX + r) {
      vehicle.x = b.minX + r + 0.5;
      vehicle.speed *= 0.4;
      events.hitBoundary = true;
    } else if (vehicle.x > b.maxX - r) {
      vehicle.x = b.maxX - r - 0.5;
      vehicle.speed *= 0.4;
      events.hitBoundary = true;
    }
    if (vehicle.z < b.minZ + r) {
      vehicle.z = b.minZ + r + 0.5;
      vehicle.speed *= 0.4;
      events.hitBoundary = true;
    } else if (vehicle.z > b.maxZ - r) {
      vehicle.z = b.maxZ - r - 0.5;
      vehicle.speed *= 0.4;
      events.hitBoundary = true;
    }

    // Natural dune crest launch: if grounded on rising desert slope and cresting fast
    if (vehicle.isGrounded && vehicle.x < -134 && Math.abs(vehicle.speed) > 22) {
      var terrainVelY = (onRampGroundY - prevGround) / Math.max(0.008, dt);
      var prevVelY = vehicle.prevTerrainVelY || 0;
      vehicle.prevTerrainVelY = terrainVelY;
      if (prevVelY > 3.5 && terrainVelY < prevVelY - 3.2) {
        vehicle.vy = Math.min(18, prevVelY * 0.95 * spec.jumpMult);
        vehicle.isGrounded = false;
      }
    } else {
      vehicle.prevTerrainVelY = 0;
    }

    // Vertical physics & Stunt distance/height tracking
    var wasGrounded = vehicle.isGrounded;
    if (!vehicle.isGrounded || vehicle.y > onRampGroundY + 0.14 || vehicle.vy > 0) {
      if (wasGrounded) {
        vehicle.jumpStartX = vehicle.x;
        vehicle.jumpStartZ = vehicle.z;
        vehicle.jumpPeakHeight = 0;
      }
      vehicle.vy += GRAVITY * dt;
      vehicle.y += vehicle.vy * dt;
      var curClearance = Math.max(0, vehicle.y - baseTerrainY);
      if (curClearance > (vehicle.jumpPeakHeight || 0)) {
        vehicle.jumpPeakHeight = curClearance;
      }

      if (vehicle.y <= onRampGroundY) {
        vehicle.y = onRampGroundY;
        var horizDist = Math.hypot(vehicle.x - (vehicle.jumpStartX || vehicle.x), vehicle.z - (vehicle.jumpStartZ || vehicle.z)) * 1.65;
        var peakH = (vehicle.jumpPeakHeight || 0) * 1.45;
        if (vehicle.airtime >= 0.60 || (vehicle.airtime >= 0.45 && horizDist >= 22)) {
          events.landedBigJump = true;
          events.airtime = vehicle.airtime;
          events.jumpDistance = horizDist;
          events.jumpHeight = Math.max(1.2, peakH);
          vehicle.nitro = Math.min(100, vehicle.nitro + 25);
        }
        vehicle.vy = 0;
        vehicle.airtime = 0;
        vehicle.jumpPeakHeight = 0;
        vehicle.isGrounded = true;
      } else {
        vehicle.isGrounded = false;
        vehicle.airtime += dt;
      }
    } else {
      vehicle.y = onRampGroundY;
      vehicle.vy = 0;
      vehicle.isGrounded = true;
    }

    // Safe ocean splash recovery if jumping off bridge into deep water
    if (city.isInDeepWater && city.isInDeepWater(vehicle.x, vehicle.z, vehicle.y)) {
      var safePt = city.findNearestRoadPoint(vehicle.x, vehicle.z);
      vehicle.x = safePt.x;
      vehicle.z = safePt.z;
      vehicle.y = 0.2;
      vehicle.vy = 0;
      vehicle.speed = 0;
      vehicle.airtime = 0;
      vehicle.isGrounded = true;
      events.waterSplash = true;
    }

    // Vehicle <-> Vehicle collisions
    if (allVehicles && allVehicles.length > 1) {
      for (var vi = 0; vi < allVehicles.length; vi++) {
        var other = allVehicles[vi];
        if (!other || other === vehicle) continue;
        if (Math.abs(vehicle.y - other.y) > 2.6) continue;

        var cdx = vehicle.x - other.x;
        var cdz = vehicle.z - other.z;
        var minDist = vehicle.spec.radius + other.spec.radius;
        var distSq = cdx * cdx + cdz * cdz;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          var dist = Math.sqrt(distSq);
          var nx = cdx / dist;
          var nz = cdz / dist;
          var overlap = minDist - dist;

          var pushSelf = other.isBoss ? 0.85 : 0.5;
          var pushOther = 1 - pushSelf;
          vehicle.x += nx * overlap * pushSelf;
          vehicle.z += nz * overlap * pushSelf;
          other.x -= nx * overlap * pushOther;
          other.z -= nz * overlap * pushOther;

          var v1x = fx * vehicle.speed;
          var v1z = fz * vehicle.speed;
          var v2x = Math.sin(other.angle) * other.speed;
          var v2z = Math.cos(other.angle) * other.speed;
          var relSpeed = Math.hypot(v1x - v2x, v1z - v2z);

          if (other.isBoss || other.aiRole === 'boss') {
            if (nitroActive) {
              if (other.empCooldown <= 0) {
                events.hitBossEmp = true;
                events.hitVehicle = other;
                other.empCooldown = 1.2;
                other.empFlashTimer = 0.65;
                vehicle.speed *= 0.55;
              }
            } else {
              events.hitBossNoNitro = true;
              events.hitVehicle = other;
              vehicle.speed = -Math.max(8, Math.abs(vehicle.speed) * 0.35);
              if (!vehicle.isAI && vehicle.hitCooldown <= 0) {
                vehicle.shield = Math.max(0, vehicle.shield - 12);
                vehicle.hitCooldown = 1.0;
              }
            }
          } else {
            if (relSpeed > events.hitVehicleSpeed) {
              events.hitVehicleSpeed = relSpeed;
              events.hitVehicle = other;
            }
            if (!vehicle.isAI && relSpeed > 14 && vehicle.hitCooldown <= 0) {
              vehicle.shield = Math.max(0, vehicle.shield - 6);
              vehicle.hitCooldown = 0.8;
            }
            vehicle.speed *= 0.65;
            other.speed *= 0.75;
          }
        }
      }
    }

    // Cones / Barriers collisions
    if (cones && cones.length > 0) {
      for (var ci = 0; ci < cones.length; ci++) {
        var cone = cones[ci];
        if (!cone || cone.knocked) continue;
        var kdx = vehicle.x - cone.x;
        var kdz = vehicle.z - cone.z;
        var cr = vehicle.spec.radius + (cone.radius || 0.75);
        if (kdx * kdx + kdz * kdz < cr * cr) {
          cone.knocked = true;
          if (cone.mesh) {
            cone.mesh.rotation.x = Math.PI / 2;
            cone.mesh.position.y = 0.25;
            cone.mesh.position.x += fx * 2.2;
            cone.mesh.position.z += fz * 2.2;
          }
          if (!spec.pushesProps) {
            vehicle.speed *= 0.65;
            events.hitCone = true;
            if (!vehicle.isAI && vehicle.hitCooldown <= 0) {
              vehicle.shield = Math.max(0, vehicle.shield - 5);
              vehicle.hitCooldown = 0.6;
            }
          }
        }
      }
    }

    // Sync Three.js transforms & realistic suspension pitch/roll/steering animations
    vehicle.mesh.position.set(vehicle.x, vehicle.y, vehicle.z);
    vehicle.mesh.rotation.y = vehicle.angle;

    if (vehicle.bodyGroup) {
      // Compute terrain pitch when grounded, or ballistic nose pitch in air!
      var targetPitch = 0;
      if (vehicle.isGrounded && city.getGroundHeight) {
        var gFront = city.getGroundHeight(vehicle.x + fx * 1.6, vehicle.z + fz * 1.6, vehicle.y + 1);
        var gBack  = city.getGroundHeight(vehicle.x - fx * 1.6, vehicle.z - fz * 1.6, vehicle.y + 1);
        targetPitch = -Math.atan2(gFront - gBack, 3.2);
        // Subtle acceleration squat / brake dive
        if (braking) targetPitch += 0.035;
        else if (nitroActive) targetPitch -= 0.03;
      } else {
        targetPitch = Math.max(-0.38, Math.min(0.38, -vehicle.vy * 0.022));
      }
      vehicle.bodyGroup.rotation.x += (targetPitch - vehicle.bodyGroup.rotation.x) * Math.min(1, dt * 10);

      // Motorcycle lean vs Car suspension roll
      var targetRoll = spec.isMoto
        ? (steer * 0.44 * speedFactor)
        : (-steer * (isDrifting ? 0.075 : 0.045) * speedFactor);
      vehicle.bodyGroup.rotation.z += (targetRoll - vehicle.bodyGroup.rotation.z) * Math.min(1, dt * 10);
    }

    // Wheel spin & front wheel visual steering!
    if (vehicle.wheels && vehicle.wheels.length) {
      var spinDelta = vehicle.speed * dt * 1.85;
      var targetSteerVis = -steer * 0.42;
      for (var wi = 0; wi < vehicle.wheels.length; wi++) {
        var wh = vehicle.wheels[wi];
        if (wh.spin) {
          wh.spin.rotation.x += spinDelta;
          if (wh.canSteer && wh.pivot) {
            wh.pivot.rotation.y += (targetSteerVis - wh.pivot.rotation.y) * Math.min(1, dt * 14);
          }
        } else {
          wh.rotation.x += spinDelta;
        }
      }
    }

    if (vehicle.brakeMat) {
      vehicle.brakeMat.color.setHex(braking || isDrifting ? 0xff2222 : 0x7f1d1d);
    }

    return events;
  }

  window.GTC.Vehicles = {
    CATALOG: CATALOG,
    COLORS: COLORS,
    UNDERGLOWS: UNDERGLOWS,
    createVehicle: createVehicle,
    createBossTruck: createBossTruck,
    applyCustomization: applyCustomization,
    updateUnderglow: updateUnderglow,
    stepPhysics: stepPhysics
  };
})();
