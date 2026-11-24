// Grand Turbo City: Vice Neon — Vehicle Fleet, Customization & Arcade Physics (window.GTC.Vehicles)
(function () {
  'use strict';

  window.GTC = window.GTC || {};

  var CATALOG = {
    coupe: {
      id: 'coupe',
      name: 'Turbo Coupé',
      maxSpeed: 48,
      accel: 28,
      nitro: 70,
      turnRate: 2.6,
      maxShield: 100,
      radius: 2.1,
      jumpMult: 1.00,
      sandFactor: 0.72,
      pushesProps: false,
      isMoto: false,
      special: 'Equilibrado',
      requiresGold: false
    },
    moto: {
      id: 'moto',
      name: 'Moto Néon',
      maxSpeed: 54,
      accel: 36,
      nitro: 78,
      turnRate: 3.3,
      maxShield: 75,
      radius: 1.4,
      jumpMult: 1.28,
      sandFactor: 0.72,
      pushesProps: false,
      isMoto: true,
      special: 'Inclina nas curvas, saltos altos',
      requiresGold: false
    },
    buggy: {
      id: 'buggy',
      name: 'Buggy da Praia',
      maxSpeed: 44,
      accel: 32,
      nitro: 66,
      turnRate: 3.0,
      maxShield: 95,
      radius: 1.9,
      jumpMult: 1.15,
      sandFactor: 1.00,
      pushesProps: false,
      isMoto: false,
      special: 'Sem penalização na areia',
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
      sandFactor: 0.72,
      pushesProps: false,
      isMoto: false,
      special: 'Resistente, ideal para entregas',
      requiresGold: false
    },
    police: {
      id: 'police',
      name: 'Patrulha da Cidade',
      maxSpeed: 52,
      accel: 31,
      nitro: 74,
      turnRate: 2.7,
      maxShield: 125,
      radius: 2.2,
      jumpMult: 1.00,
      sandFactor: 0.72,
      pushesProps: false,
      isMoto: false,
      special: 'Sirene policial interativa (H)',
      requiresGold: false
    },
    truck: {
      id: 'truck',
      name: 'Camião Blindado 4x4',
      maxSpeed: 36,
      accel: 19,
      nitro: 54,
      turnRate: 1.9,
      maxShield: 200,
      radius: 2.6,
      jumpMult: 0.85,
      sandFactor: 0.85,
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
      jumpMult: 1.10,
      sandFactor: 0.72,
      pushesProps: false,
      isMoto: false,
      special: 'Dourado metálico, o mais rápido',
      requiresGold: true
    }
  };

  var COLORS = [
    { id: 'pink',   name: 'Rosa Néon',        hex: '#ec4899' },
    { id: 'cyan',   name: 'Ciano Elétrico',   hex: '#22d3ee' },
    { id: 'yellow', name: 'Amarelo Turbo',    hex: '#facc15' },
    { id: 'red',    name: 'Vermelho Fogo',    hex: '#ef4444' },
    { id: 'lime',   name: 'Verde Lima',       hex: '#84cc16' },
    { id: 'purple', name: 'Roxo Vice',        hex: '#a855f7' },
    { id: 'white',  name: 'Branco Pérola',    hex: '#f8fafc' },
    { id: 'gold',   name: 'Dourado Metálico', hex: '#fbbf24', requiresGold: true }
  ];

  var UNDERGLOWS = [
    { id: 'off',     name: 'Desligado',  hex: null },
    { id: 'cyan',    name: 'Ciano',      hex: '#22d3ee' },
    { id: 'magenta', name: 'Magenta',    hex: '#ec4899' },
    { id: 'lime',    name: 'Verde Lima', hex: '#84cc16' },
    { id: 'yellow',  name: 'Amarelo',    hex: '#facc15' },
    { id: 'rainbow', name: 'Arco-Íris',  hex: 'rainbow' }
  ];

  var nextVehicleUid = 1;
  var GRAVITY = -34;

  function makeWheel(radius, width, rimHex) {
    var grp = new THREE.Group();
    var tire = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, width, 14),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 })
    );
    tire.rotation.z = Math.PI / 2;
    grp.add(tire);

    var rim = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width + 0.04, 10),
      new THREE.MeshStandardMaterial({ color: rimHex || 0xe2e8f0, metalness: 0.6, roughness: 0.25 })
    );
    rim.rotation.z = Math.PI / 2;
    grp.add(rim);
    return grp;
  }

  function makeDriver(hasHelmet, isPolice) {
    var grp = new THREE.Group();
    var jacketColor = isPolice ? 0x1d4ed8 : 0xec4899;
    var torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.62, 0.36),
      new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.6 })
    );
    torso.position.y = 0.32;
    grp.add(torso);

    var headColor = hasHelmet ? 0x22d3ee : 0xfde68a;
    var head = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, 0.42),
      new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.45 })
    );
    head.position.y = 0.86;
    grp.add(head);

    if (hasHelmet) {
      var visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.16, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x0f172a })
      );
      visor.position.set(0, 0.88, 0.2);
      grp.add(visor);
    } else if (isPolice) {
      var cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.15, 0.48),
        new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 })
      );
      cap.position.set(0, 1.12, 0.04);
      grp.add(cap);
    } else {
      var shades = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.12, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x0f172a })
      );
      shades.position.set(0, 0.9, 0.21);
      grp.add(shades);
    }
    return grp;
  }

  function buildVehicleMesh(typeId, colorHex, underglowHex) {
    var root = new THREE.Group();
    var bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    var isGold = colorHex === '#fbbf24' || typeId === 'gold_supercar';
    var effectiveColor = typeId === 'gold_supercar' && !colorHex ? '#fbbf24' : (colorHex || '#ec4899');
    if (typeId === 'police' && !colorHex) effectiveColor = '#f8fafc';

    var bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(effectiveColor),
      metalness: isGold ? 0.75 : 0.35,
      roughness: isGold ? 0.25 : 0.4
    });
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    var glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.6,
      roughness: 0.15,
      transparent: true,
      opacity: 0.85
    });
    var headMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    var brakeMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });

    var wheels = [];
    var sirenRed = null;
    var sirenBlue = null;
    var driverMesh = null;
    var ugW = 2.2;
    var ugL = 4.4;

    if (typeId === 'coupe' || typeId === 'gold_supercar') {
      var isSuper = typeId === 'gold_supercar';
      // Sleek wedge sports body (+Z is front)
      var chassis = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.65, 4.55), bodyMat);
      chassis.position.set(0, 0.62, 0);
      bodyGroup.add(chassis);

      var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.56, 2.05), glassMat);
      cabin.position.set(0, 1.18, -0.25);
      bodyGroup.add(cabin);

      var roof = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.12, 1.5), bodyMat);
      roof.position.set(0, 1.48, -0.3);
      bodyGroup.add(roof);

      // Rear spoiler
      var wing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.45), isSuper ? bodyMat : darkMat);
      wing.position.set(0, 1.32, -2.05);
      bodyGroup.add(wing);
      var postL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.22), darkMat);
      postL.position.set(-0.75, 1.1, -2.02);
      bodyGroup.add(postL);
      var postR = postL.clone();
      postR.position.x = 0.75;
      bodyGroup.add(postR);

      // Headlights (+Z) & brake lights (-Z)
      var hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.12), headMat);
      hl1.position.set(-0.68, 0.68, 2.26);
      bodyGroup.add(hl1);
      var hl2 = hl1.clone();
      hl2.position.x = 0.68;
      bodyGroup.add(hl2);

      var bl1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.12), brakeMat);
      bl1.position.set(-0.66, 0.7, -2.26);
      bodyGroup.add(bl1);
      var bl2 = bl1.clone();
      bl2.position.x = 0.66;
      bodyGroup.add(bl2);

      var wPos = [[-1.08, 0.42, 1.4], [1.08, 0.42, 1.4], [-1.08, 0.42, -1.4], [1.08, 0.42, -1.4]];
      for (var i = 0; i < wPos.length; i++) {
        var w = makeWheel(0.42, 0.34, isSuper ? 0xfbbf24 : 0x22d3ee);
        w.position.set(wPos[i][0], wPos[i][1], wPos[i][2]);
        bodyGroup.add(w);
        wheels.push(w);
      }
      ugW = 2.2;
      ugL = 4.4;
    } else if (typeId === 'moto') {
      // Neon Superbike with visible rider
      var frame = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.62, 2.15), bodyMat);
      frame.position.set(0, 0.75, 0.05);
      bodyGroup.add(frame);

      var nose = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.72), bodyMat);
      nose.position.set(0, 0.98, 0.92);
      nose.rotation.x = 0.35;
      bodyGroup.add(nose);

      var bars = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.12), darkMat);
      bars.position.set(0, 1.18, 0.68);
      bodyGroup.add(bars);

      var mHl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.12), headMat);
      mHl.position.set(0, 1.0, 1.28);
      bodyGroup.add(mHl);

      var mBl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.12), brakeMat);
      mBl.position.set(0, 0.92, -1.04);
      bodyGroup.add(mBl);

      var rider = makeDriver(true, false);
      rider.position.set(0, 0.98, -0.15);
      rider.rotation.x = 0.22;
      bodyGroup.add(rider);
      driverMesh = rider;

      var fw = makeWheel(0.46, 0.28, 0x22d3ee);
      fw.position.set(0, 0.46, 1.05);
      bodyGroup.add(fw);
      wheels.push(fw);

      var rw = makeWheel(0.48, 0.34, 0xec4899);
      rw.position.set(0, 0.48, -1.0);
      bodyGroup.add(rw);
      wheels.push(rw);

      ugW = 1.1;
      ugL = 2.6;
    } else if (typeId === 'buggy') {
      // Open Beach Dune Buggy with roll cage & visible driver
      var tub = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 3.6), bodyMat);
      tub.position.set(0, 0.68, 0);
      bodyGroup.add(tub);

      var cageMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
      var p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.15, 6), cageMat);
      p1.position.set(-0.78, 1.4, -0.8);
      bodyGroup.add(p1);
      var p2 = p1.clone(); p2.position.x = 0.78; bodyGroup.add(p2);
      var p3 = p1.clone(); p3.position.set(-0.78, 1.32, 0.75); p3.rotation.x = -0.35; bodyGroup.add(p3);
      var p4 = p3.clone(); p4.position.x = 0.78; bodyGroup.add(p4);
      var topBar = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.1, 1.45), cageMat);
      topBar.position.set(0, 1.95, -0.15);
      bodyGroup.add(topBar);

      var driver = makeDriver(false, false);
      driver.position.set(0, 0.88, -0.15);
      bodyGroup.add(driver);
      driverMesh = driver;

      var bHl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10), headMat);
      bHl1.rotation.x = Math.PI / 2;
      bHl1.position.set(-0.6, 0.88, 1.82);
      bodyGroup.add(bHl1);
      var bHl2 = bHl1.clone(); bHl2.position.x = 0.6; bodyGroup.add(bHl2);

      var bBl = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.12), brakeMat);
      bBl.position.set(0, 0.85, -1.82);
      bodyGroup.add(bBl);

      var bPos = [[-1.12, 0.52, 1.25], [1.12, 0.52, 1.25], [-1.16, 0.58, -1.22], [1.16, 0.58, -1.22]];
      for (var bi = 0; bi < bPos.length; bi++) {
        var bw = makeWheel(bi >= 2 ? 0.58 : 0.50, 0.44, 0xfacc15);
        bw.position.set(bPos[bi][0], bPos[bi][1], bPos[bi][2]);
        bodyGroup.add(bw);
        wheels.push(bw);
      }
      ugW = 2.0;
      ugL = 3.6;
    } else if (typeId === 'van') {
      // Delivery Van
      var vBody = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.55, 4.85), bodyMat);
      vBody.position.set(0, 1.25, 0);
      bodyGroup.add(vBody);

      var vWind = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 0.14), glassMat);
      vWind.position.set(0, 1.55, 2.42);
      bodyGroup.add(vWind);

      var stripe = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 0.24, 4.6),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      stripe.position.set(0, 1.05, 0);
      bodyGroup.add(stripe);

      var vHl1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.12), headMat);
      vHl1.position.set(-0.72, 0.82, 2.44);
      bodyGroup.add(vHl1);
      var vHl2 = vHl1.clone(); vHl2.position.x = 0.72; bodyGroup.add(vHl2);

      var vBl1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.4, 0.12), brakeMat);
      vBl1.position.set(-0.82, 0.95, -2.44);
      bodyGroup.add(vBl1);
      var vBl2 = vBl1.clone(); vBl2.position.x = 0.82; bodyGroup.add(vBl2);

      var vPos = [[-1.12, 0.46, 1.5], [1.12, 0.46, 1.5], [-1.12, 0.46, -1.5], [1.12, 0.46, -1.5]];
      for (var vi = 0; vi < vPos.length; vi++) {
        var vw = makeWheel(0.46, 0.36, 0xe2e8f0);
        vw.position.set(vPos[vi][0], vPos[vi][1], vPos[vi][2]);
        bodyGroup.add(vw);
        wheels.push(vw);
      }
      ugW = 2.3;
      ugL = 4.7;
    } else if (typeId === 'police') {
      // Cartoon Police Cruiser with flashing siren & cartoon officer
      var pBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.72, 4.7), bodyMat);
      pBase.position.set(0, 0.68, 0);
      bodyGroup.add(pBase);

      var blueTrim = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 });
      var pStripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.24, 4.5), blueTrim);
      pStripe.position.set(0, 0.72, 0);
      bodyGroup.add(pStripe);

      var pCab = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.64, 2.1), glassMat);
      pCab.position.set(0, 1.32, -0.15);
      bodyGroup.add(pCab);

      var pRoof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 1.7), bodyMat);
      pRoof.position.set(0, 1.66, -0.15);
      bodyGroup.add(pRoof);

      // Visible cartoon officer inside
      var officer = makeDriver(false, true);
      officer.position.set(0.32, 0.72, -0.05);
      officer.scale.set(0.75, 0.75, 0.75);
      bodyGroup.add(officer);

      // Siren lightbar
      var barBase = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 0.32), darkMat);
      barBase.position.set(0, 1.76, -0.1);
      bodyGroup.add(barBase);

      sirenRed = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.2, 0.28),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      sirenRed.position.set(-0.34, 1.88, -0.1);
      bodyGroup.add(sirenRed);

      sirenBlue = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.2, 0.28),
        new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
      );
      sirenBlue.position.set(0.34, 1.88, -0.1);
      bodyGroup.add(sirenBlue);

      var pHl1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.12), headMat);
      pHl1.position.set(-0.7, 0.74, 2.36);
      bodyGroup.add(pHl1);
      var pHl2 = pHl1.clone(); pHl2.position.x = 0.7; bodyGroup.add(pHl2);

      var pBl1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.12), brakeMat);
      pBl1.position.set(-0.7, 0.74, -2.36);
      bodyGroup.add(pBl1);
      var pBl2 = pBl1.clone(); pBl2.position.x = 0.7; bodyGroup.add(pBl2);

      var pPos = [[-1.12, 0.44, 1.45], [1.12, 0.44, 1.45], [-1.12, 0.44, -1.45], [1.12, 0.44, -1.45]];
      for (var pi = 0; pi < pPos.length; pi++) {
        var pw = makeWheel(0.44, 0.34, 0xe2e8f0);
        pw.position.set(pPos[pi][0], pPos[pi][1], pPos[pi][2]);
        bodyGroup.add(pw);
        wheels.push(pw);
      }
      ugW = 2.25;
      ugL = 4.6;
    } else if (typeId === 'truck') {
      // Armored 4x4 Truck with heavy bullbar
      var tBed = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.2, 5.4), bodyMat);
      tBed.position.set(0, 1.25, 0);
      bodyGroup.add(tBed);

      var tCab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.05, 2.2), bodyMat);
      tCab.position.set(0, 2.25, 0.75);
      bodyGroup.add(tCab);

      var tGlass = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.65, 0.16), glassMat);
      tGlass.position.set(0, 2.32, 1.86);
      bodyGroup.add(tGlass);

      // Heavy front bullbar
      var bullbar = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.75, 0.32), darkMat);
      bullbar.position.set(0, 1.05, 2.82);
      bodyGroup.add(bullbar);

      var tHl1 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.12), headMat);
      tHl1.position.set(-0.88, 1.28, 2.74);
      bodyGroup.add(tHl1);
      var tHl2 = tHl1.clone(); tHl2.position.x = 0.88; bodyGroup.add(tHl2);

      var tBl1 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.34, 0.12), brakeMat);
      tBl1.position.set(-0.92, 1.2, -2.72);
      bodyGroup.add(tBl1);
      var tBl2 = tBl1.clone(); tBl2.position.x = 0.92; bodyGroup.add(tBl2);

      var tPos = [[-1.38, 0.68, 1.75], [1.38, 0.68, 1.75], [-1.38, 0.68, -1.75], [1.38, 0.68, -1.75]];
      for (var ti = 0; ti < tPos.length; ti++) {
        var tw = makeWheel(0.68, 0.52, 0xfacc15);
        tw.position.set(tPos[ti][0], tPos[ti][1], tPos[ti][2]);
        bodyGroup.add(tw);
        wheels.push(tw);
      }
      ugW = 2.7;
      ugL = 5.3;
    }

    // Underglow neon plane beneath chassis
    var ugMat = new THREE.MeshBasicMaterial({
      color: (underglowHex && underglowHex !== 'rainbow') ? new THREE.Color(underglowHex) : new THREE.Color(0x22d3ee),
      transparent: true,
      opacity: underglowHex ? 0.58 : 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var underglowMesh = new THREE.Mesh(new THREE.PlaneGeometry(ugW + 0.6, ugL + 0.6), ugMat);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.y = 0.08;
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
    var color = o.color !== undefined ? o.color : (typeId === 'gold_supercar' ? '#fbbf24' : (typeId === 'police' ? '#f8fafc' : '#ec4899'));
    var underglow = o.underglow !== undefined ? o.underglow : (o.isAI ? null : '#22d3ee');

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

    var vehicle = {
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

    return vehicle;
  }

  function createBossTruck(opts) {
    var o = opts || {};
    var root = new THREE.Group();
    var bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    // Mega-Camião Boss: 5.5 x 4.2 x 11 u, radius: 3.6, hp: 5, maxHp: 5
    var bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3b0764,
      metalness: 0.45,
      roughness: 0.35,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    var armorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.5 });
    var neonMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    var coreMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });

    // Massive trailer + cab (total 5.5 wide x 4.2 tall x 11 long)
    var trailer = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.2, 7.6), bodyMat);
    trailer.position.set(0, 2.3, -1.6);
    bodyGroup.add(trailer);

    var cab = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.0, 3.2), bodyMat);
    cab.position.set(0, 2.2, 3.7);
    bodyGroup.add(cab);

    // Glowing windshield visor
    var visor = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 0.2), neonMat);
    visor.position.set(0, 2.8, 5.32);
    bodyGroup.add(visor);

    // Heavy front ram bumper
    var bumper = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.3, 0.6), armorMat);
    bumper.position.set(0, 1.1, 5.4);
    bodyGroup.add(bumper);

    // Glowing energy core on top of trailer
    var core = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.9, 12), coreMat);
    core.position.set(0, 4.1, -1.6);
    bodyGroup.add(core);

    // Neon side strips
    var stripL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 10.2), neonMat);
    stripL.position.set(-2.65, 2.0, -0.2);
    bodyGroup.add(stripL);
    var stripR = stripL.clone();
    stripR.position.x = 2.65;
    bodyGroup.add(stripR);

    // 6 oversized wheels
    var wheels = [];
    var wZ = [3.6, -0.6, -3.8];
    for (var i = 0; i < wZ.length; i++) {
      var wl = makeWheel(1.05, 0.72, 0xef4444);
      wl.position.set(-2.65, 1.05, wZ[i]);
      bodyGroup.add(wl);
      wheels.push(wl);

      var wr = makeWheel(1.05, 0.72, 0xef4444);
      wr.position.set(2.65, 1.05, wZ[i]);
      bodyGroup.add(wr);
      wheels.push(wr);
    }

    var ugMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var underglowMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 11.6), ugMat);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.y = 0.08;
    root.add(underglowMesh);

    var x = o.x !== undefined ? o.x : -40;
    var y = o.y || 0;
    var z = o.z !== undefined ? o.z : -40;
    var angle = o.angle !== undefined ? o.angle : 0;
    root.position.set(x, y, z);
    root.rotation.y = angle;

    if (o.scene) {
      o.scene.add(root);
    }

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
      color: '#3b0764',
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
      vehicle.bodyMat.metalness = isGold ? 0.75 : 0.35;
      vehicle.bodyMat.roughness = isGold ? 0.25 : 0.4;
    }
    if (underglowHex !== undefined && vehicle.underglowMesh && vehicle.underglowMat) {
      vehicle.underglow = underglowHex;
      if (!underglowHex) {
        vehicle.underglowMesh.visible = false;
        vehicle.underglowMat.opacity = 0;
      } else {
        vehicle.underglowMesh.visible = true;
        vehicle.underglowMat.opacity = 0.58;
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
    // Also animate police siren lightbar if active
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
    // Boss EMP flash feedback
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

  function resolveAABB(x, z, r, colliders) {
    var hit = false;
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      if (c.blocksVehicles === false) continue;
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        hit = true;
        break;
      }
    }
    return hit;
  }

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
      hitBoundary: false,
      nitroActive: false
    };

    if (!vehicle || !city) return events;

    var spec = vehicle.spec;
    var inp = input || {};

    // Normalize input: throttle (-1..1), steer (-1 = left, +1 = right)
    var throttle = inp.throttle !== undefined ? inp.throttle : ((inp.forward ? 1 : 0) - (inp.backward ? 1 : 0));
    var steer = inp.steer !== undefined ? inp.steer : ((inp.right ? 1 : 0) - (inp.left ? 1 : 0));
    var drift = !!inp.drift;
    var wantNitro = !!inp.nitro;

    if (vehicle.empCooldown > 0) vehicle.empCooldown = Math.max(0, vehicle.empCooldown - dt);
    if (vehicle.hitCooldown > 0) vehicle.hitCooldown = Math.max(0, vehicle.hitCooldown - dt);
    if (vehicle.empFlashTimer > 0) vehicle.empFlashTimer = Math.max(0, vehicle.empFlashTimer - dt);

    // Nitro logic with hysteresis (SPEC 4.3)
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
    var maxFwd = (nitroActive ? spec.nitro : spec.maxSpeed) * (onSand ? spec.sandFactor : 1.0);
    var maxRev = -0.42 * spec.maxSpeed;

    // Acceleration / braking / natural friction
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
      // Natural friction (18 u/s^2)
      if (vehicle.speed > 0) {
        vehicle.speed = Math.max(0, vehicle.speed - 18 * dt);
      } else if (vehicle.speed < 0) {
        vehicle.speed = Math.min(0, vehicle.speed + 18 * dt);
      }
    }

    // Smoothly cap speed to effective max
    if (vehicle.speed > maxFwd) {
      vehicle.speed = Math.max(maxFwd, vehicle.speed - 24 * dt);
    }
    if (vehicle.speed < maxRev) {
      vehicle.speed = maxRev;
    }

    // Steering & Drift
    var speedFactor = Math.min(1, Math.abs(vehicle.speed) / 8);
    var dirSign = vehicle.speed >= 0 ? 1 : -1;
    var isDrifting = drift && vehicle.speed > 10 && vehicle.isGrounded;
    var turnMult = isDrifting ? 1.35 : 1.0;

    if (isDrifting) {
      vehicle.speed *= Math.max(0.5, 1 - 0.35 * dt);
      vehicle.nitro = Math.min(100, vehicle.nitro + 10 * dt);
    }

    vehicle.steerAngle = steer;
    // steer = -1 (left) increases angle (CCW from above); steer = +1 (right) decreases angle
    vehicle.angle -= steer * spec.turnRate * turnMult * speedFactor * dirSign * dt;

    var fx = Math.sin(vehicle.angle);
    var fz = Math.cos(vehicle.angle);
    var dx = fx * vehicle.speed * dt;
    var dz = fz * vehicle.speed * dt;

    // Separate X then Z AABB collision resolution against city.colliders
    var r = spec.radius;
    var hitWall = false;
    var prevSpeed = vehicle.speed;

    var tryX = vehicle.x + dx;
    if (resolveAABB(tryX, vehicle.z, r, city.colliders)) {
      hitWall = true;
    } else {
      vehicle.x = tryX;
    }

    var tryZ = vehicle.z + dz;
    if (resolveAABB(vehicle.x, tryZ, r, city.colliders)) {
      hitWall = true;
    } else {
      vehicle.z = tryZ;
    }

    // Check Ramps OBB
    var onRampGroundY = 0;
    var hitRampSide = false;
    var moveDirX = vehicle.speed >= 0 ? fx : -fx;
    var moveDirZ = vehicle.speed >= 0 ? fz : -fz;

    if (city.ramps) {
      for (var ri = 0; ri < city.ramps.length; ri++) {
        var rm = city.ramps[ri];
        var relX = vehicle.x - rm.x;
        var relZ = vehicle.z - rm.z;
        // Project onto ramp forward (dirX, dirZ) and right (-dirZ, dirX)
        var along = relX * rm.dirX + relZ * rm.dirZ;
        var across = Math.abs(relX * (-rm.dirZ) + relZ * rm.dirX);
        var hl = rm.length / 2;
        var hw = rm.width / 2;

        if (along >= -hl - 0.5 && along <= hl + 0.5 && across <= hw + 0.5) {
          var dot = moveDirX * rm.dirX + moveDirZ * rm.dirZ;
          if (dot > 0.5 || vehicle.y >= 1.2) {
            var frac = Math.max(0, Math.min(1, (along + hl) / rm.length));
            var rampY = frac * rm.height;
            if (rampY > onRampGroundY) onRampGroundY = rampY;

            // Launch when reaching top edge with speed > 12
            if (frac > 0.86 && vehicle.speed > 12 && vehicle.vy <= 2 && dot > 0.5) {
              vehicle.vy = Math.min(24, vehicle.speed * 0.38) * spec.jumpMult;
              vehicle.isGrounded = false;
            }
          } else if (vehicle.y < 1.2 && Math.abs(along) < hl && across < hw) {
            // Side/back collision with ramp acts as solid block
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

    // World BOUNDS clamp with smooth 0.5u bounce-back
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

    // Vertical physics (gravity, ramps & airtime)
    if (!vehicle.isGrounded || vehicle.y > onRampGroundY + 0.05 || vehicle.vy > 0) {
      vehicle.vy += GRAVITY * dt;
      vehicle.y += vehicle.vy * dt;
      if (vehicle.y <= onRampGroundY) {
        vehicle.y = onRampGroundY;
        if (vehicle.airtime >= 0.65) {
          events.landedBigJump = true;
          events.airtime = vehicle.airtime;
          vehicle.nitro = Math.min(100, vehicle.nitro + 25);
        }
        vehicle.vy = 0;
        vehicle.airtime = 0;
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

    // Vehicle <-> Vehicle collisions
    if (allVehicles && allVehicles.length > 1) {
      for (var vi = 0; vi < allVehicles.length; vi++) {
        var other = allVehicles[vi];
        if (!other || other === vehicle) continue;
        // Skip vertical separation if jumping right over another car
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

          // Push apart
          var pushSelf = other.isBoss ? 0.85 : 0.5;
          var pushOther = 1 - pushSelf;
          vehicle.x += nx * overlap * pushSelf;
          vehicle.z += nz * overlap * pushSelf;
          other.x -= nx * overlap * pushOther;
          other.z -= nz * overlap * pushOther;

          // Relative speed
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
            // Elastic impulse
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

    // Sync Three.js transforms & visual animations
    vehicle.mesh.position.set(vehicle.x, vehicle.y, vehicle.z);
    vehicle.mesh.rotation.y = vehicle.angle;

    // Moto leans up to +-24 deg (0.42 rad) into turns (steer -1 = left -> -Z roll, +1 = right -> +Z roll)
    if (spec.isMoto && vehicle.bodyGroup) {
      var targetRoll = steer * 0.42 * speedFactor;
      vehicle.bodyGroup.rotation.z += (targetRoll - vehicle.bodyGroup.rotation.z) * Math.min(1, dt * 10);
    }

    // Wheel spin
    if (vehicle.wheels && vehicle.wheels.length) {
      var spinDelta = vehicle.speed * dt * 1.8;
      for (var wi = 0; wi < vehicle.wheels.length; wi++) {
        vehicle.wheels[wi].rotation.x += spinDelta;
      }
    }

    // Brake light brightness
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
