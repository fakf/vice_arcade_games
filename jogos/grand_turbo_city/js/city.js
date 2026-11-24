// Grand Turbo City: Vice Neon — 3D World, Landmarks, Ramps & Pedestrians (window.GTC.City)
(function () {
  'use strict';

  window.GTC = window.GTC || {};

  var BOUNDS = { minX: -172, maxX: 150, minZ: -172, maxZ: 172 };
  var ROAD_X = [-120, -40, 40, 108];
  var ROAD_Z = [-120, -40, 40, 120];
  var ROAD_WIDTH = 16;

  var RAMPS_DEF = [
    { id: 1, name: 'Praia Norte',           x: 128, z: -80, dirX:  0, dirZ:  1, length: 12, width: 7, height: 3.2 },
    { id: 2, name: 'Praia Sul',             x: 128, z:  60, dirX:  0, dirZ: -1, length: 12, width: 7, height: 3.2 },
    { id: 3, name: 'Parque Oeste',          x: -80, z: -22, dirX:  1, dirZ:  0, length: 12, width: 7, height: 3.2 },
    { id: 4, name: 'Parque Este',           x: -64, z:  22, dirX: -1, dirZ:  0, length: 12, width: 7, height: 3.2 },
    { id: 5, name: 'Avenida Central Norte', x: -40, z: -80, dirX:  0, dirZ:  1, length: 12, width: 7, height: 3.2 },
    { id: 6, name: 'Avenida Central Sul',   x:  40, z:  80, dirX:  0, dirZ: -1, length: 12, width: 7, height: 3.2 },
    { id: 7, name: 'Marina Oeste',          x: -80, z:  82, dirX:  1, dirZ:  0, length: 12, width: 7, height: 3.2 },
    { id: 8, name: 'Marina Este',           x:  74, z:  82, dirX: -1, dirZ:  0, length: 12, width: 7, height: 3.2 }
  ];

  var LANDMARKS = {
    paintShop: { x: -32, z: 0, radius: 8 },
    garage:    { x: -108, z: -72, radius: 8 },
    techLab:   { x: 36, z: -108, radius: 8 },
    plazas: [
      { id: 'north',  name: 'Praça Norte',  x:   0, z: -80, radius: 14, openSide: 'south' },
      { id: 'center', name: 'Praça Centro', x:  74, z:   0, radius: 14, openSide: 'west' },
      { id: 'park',   name: 'Praça Parque', x: -80, z:   0, radius: 14, openSide: 'all' }
    ]
  };

  var PARKED_SPAWNS = [
    { typeId: 'coupe',  x:  -40, z: -16, angle: 0 },
    { typeId: 'moto',   x:  108, z: -20, angle: Math.PI },
    { typeId: 'buggy',  x:  124, z:  10, angle: Math.PI },
    { typeId: 'van',    x: -120, z:  15, angle: 0 },
    { typeId: 'police', x:   40, z: -15, angle: Math.PI },
    { typeId: 'truck',  x: -120, z:  85, angle: 0 },
    { typeId: 'coupe',  x:   40, z: 120, angle: Math.PI / 2 },
    { typeId: 'moto',   x:  -40, z: 120, angle: -Math.PI / 2 }
  ];

  var NITRO_SPAWNS = [
    { x:  -40, z: -40 },
    { x:   40, z: -40 },
    { x:  108, z: -40 },
    { x: -120, z:  40 },
    { x:  -40, z:  40 },
    { x:   40, z:  40 },
    { x:  108, z:  40 },
    { x:    0, z: 120 }
  ];

  // Build 16 road nodes (4x4 grid)
  var ROAD_NODES = [];
  (function initNodes() {
    for (var iz = 0; iz < ROAD_Z.length; iz++) {
      for (var ix = 0; ix < ROAD_X.length; ix++) {
        var id = iz * ROAD_X.length + ix;
        var neighbors = [];
        if (ix > 0) neighbors.push(iz * ROAD_X.length + (ix - 1));
        if (ix < ROAD_X.length - 1) neighbors.push(iz * ROAD_X.length + (ix + 1));
        if (iz > 0) neighbors.push((iz - 1) * ROAD_X.length + ix);
        if (iz < ROAD_Z.length - 1) neighbors.push((iz + 1) * ROAD_X.length + ix);
        ROAD_NODES.push({
          id: id,
          x: ROAD_X[ix],
          z: ROAD_Z[iz],
          neighbors: neighbors
        });
      }
    }
  })();

  var colliders = [];
  var pedestrians = [];
  var cityGroup = null;
  var sceneRef = null;
  var dirLight = null;
  var hemiLight = null;
  var sunDisc = null;
  var waterMesh = null;
  var waterTex = null;
  var paintArchMat = null;
  var fountainRing = null;
  var buildingMats = [];
  var neonMats = [];
  var currentTimeOfDay = 'sunset';

  function addCollider(minX, maxX, minZ, maxZ, blocksVehicles, blocksPedestrian) {
    colliders.push({
      minX: minX,
      maxX: maxX,
      minZ: minZ,
      maxZ: maxZ,
      blocksVehicles: blocksVehicles !== undefined ? blocksVehicles : true,
      blocksPedestrian: blocksPedestrian !== undefined ? blocksPedestrian : true
    });
  }

  function addBox(parent, w, h, d, x, y, z, mat, colliderOpts) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    if (colliderOpts) {
      addCollider(
        x - w / 2, x + w / 2,
        z - d / 2, z + d / 2,
        colliderOpts.blocksVehicles,
        colliderOpts.blocksPedestrian
      );
    }
    return mesh;
  }

  var palmQueue = [];
  var bollardQueue = [];

  function addPalmTree(parent, x, z, scale) {
    palmQueue.push({ x: x, z: z, s: scale || 1 });
  }

  function flushInstancedProps(parent) {
    var dummy = new THREE.Object3D();

    if (palmQueue.length > 0 && THREE.InstancedMesh) {
      var trunkGeo = new THREE.CylinderGeometry(0.26, 0.34, 2.1, 6);
      var trunkMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
      var frondGeo = new THREE.BoxGeometry(0.9, 0.16, 3.6);
      var leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });

      var trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palmQueue.length * 4);
      var frondInst = new THREE.InstancedMesh(frondGeo, leafMat, palmQueue.length * 6);
      var ti = 0;
      var fi = 0;

      for (var p = 0; p < palmQueue.length; p++) {
        var pm = palmQueue[p];
        var s = pm.s;
        for (var i = 0; i < 4; i++) {
          var segScale = s * (1 - i * 0.08);
          dummy.position.set(pm.x + i * 0.16 * s, (i * 2.0 + 1.0) * s, pm.z);
          dummy.rotation.set(0, 0, -0.06 * i);
          dummy.scale.set(segScale, s, segScale);
          dummy.updateMatrix();
          trunkInst.setMatrixAt(ti++, dummy.matrix);
        }
        var topX = pm.x + 0.55 * s;
        var topY = 8.1 * s;
        for (var f = 0; f < 6; f++) {
          var ang = (f / 6) * Math.PI * 2;
          dummy.position.set(topX + Math.sin(ang) * 1.6 * s, topY - 0.15 * s, pm.z + Math.cos(ang) * 1.6 * s);
          dummy.rotation.set(0.35, ang, 0);
          dummy.scale.set(s, s, s);
          dummy.updateMatrix();
          frondInst.setMatrixAt(fi++, dummy.matrix);
        }
      }
      trunkInst.instanceMatrix.needsUpdate = true;
      frondInst.instanceMatrix.needsUpdate = true;
      parent.add(trunkInst);
      parent.add(frondInst);
    }

    if (bollardQueue.length > 0 && THREE.InstancedMesh) {
      var bolGeo = new THREE.CylinderGeometry(0.28, 0.32, 1.35, 8);
      var bolMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xd97706, emissiveIntensity: 0.35, roughness: 0.4 });
      var bolInst = new THREE.InstancedMesh(bolGeo, bolMat, bollardQueue.length);
      for (var b = 0; b < bollardQueue.length; b++) {
        dummy.position.set(bollardQueue[b].x, 0.675, bollardQueue[b].z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bolInst.setMatrixAt(b, dummy.matrix);
      }
      bolInst.instanceMatrix.needsUpdate = true;
      parent.add(bolInst);
    }
  }

  function addSmallTree(parent, x, z) {
    var group = new THREE.Group();
    group.position.set(x, 0, z);
    var trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
    );
    trunk.position.y = 1.2;
    group.add(trunk);

    var crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.8, 0),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 })
    );
    crown.position.y = 3.2;
    group.add(crown);
    parent.add(group);
  }

  function addBuilding(parent, x, z, w, d, h, variant, neonHex) {
    var tex = window.GTC.Textures.get('building' + (variant % 4));
    var mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.55,
      metalness: 0.15,
      emissive: new THREE.Color(neonHex || 0x22d3ee),
      emissiveMap: tex,
      emissiveIntensity: 0.35
    });
    buildingMats.push(mat);

    addBox(parent, w, h, d, x, h / 2, z, mat, { blocksVehicles: true, blocksPedestrian: true });

    // Rooftop neon trim
    var nMat = new THREE.MeshBasicMaterial({ color: neonHex || 0xec4899 });
    neonMats.push(nMat);
    var trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.45, d + 0.3), nMat);
    trim.position.set(x, h + 0.22, z);
    parent.add(trim);
  }

  function buildRoadsAndGround(parent) {
    var T = window.GTC.Textures;

    // Base city ground (sidewalk slate)
    var baseGround = new THREE.Mesh(
      new THREE.PlaneGeometry(360, 380),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 })
    );
    baseGround.rotation.x = -Math.PI / 2;
    baseGround.position.set(-20, -0.05, 0);
    parent.add(baseGround);

    // Beach sand strip X in [116, 152]
    var sandMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(38, 380),
      new THREE.MeshStandardMaterial({ map: T.get('sand'), roughness: 0.95 })
    );
    sandMesh.rotation.x = -Math.PI / 2;
    sandMesh.position.set(135, 0.01, 0);
    parent.add(sandMesh);

    // Animated Ocean X > 150
    waterTex = T.get('water');
    waterMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 420),
      new THREE.MeshStandardMaterial({
        map: waterTex,
        roughness: 0.25,
        metalness: 0.1,
        emissive: new THREE.Color(0x0369a1),
        emissiveIntensity: 0.22
      })
    );
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(220, -0.15, 0);
    parent.add(waterMesh);

    // Road strips (N-S avenues)
    var roadTexNS = T.get('road').clone();
    roadTexNS.wrapS = THREE.RepeatWrapping;
    roadTexNS.wrapT = THREE.RepeatWrapping;
    roadTexNS.repeat.set(1, 22);
    roadTexNS.needsUpdate = true;
    var roadMatNS = new THREE.MeshStandardMaterial({ map: roadTexNS, roughness: 0.85 });

    for (var i = 0; i < ROAD_X.length; i++) {
      var rNS = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, 344), roadMatNS);
      rNS.rotation.x = -Math.PI / 2;
      rNS.position.set(ROAD_X[i], 0.03, 0);
      parent.add(rNS);
    }

    // Road strips (E-W avenues)
    var roadTexEW = T.get('road').clone();
    roadTexEW.wrapS = THREE.RepeatWrapping;
    roadTexEW.wrapT = THREE.RepeatWrapping;
    roadTexEW.repeat.set(1, 20);
    roadTexEW.needsUpdate = true;
    var roadMatEW = new THREE.MeshStandardMaterial({ map: roadTexEW, roughness: 0.85 });

    for (var j = 0; j < ROAD_Z.length; j++) {
      var rEW = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, 316), roadMatEW);
      rEW.rotation.x = -Math.PI / 2;
      rEW.rotation.z = Math.PI / 2;
      rEW.position.set(-12, 0.035, ROAD_Z[j]);
      parent.add(rEW);
    }

    // Intersections & crosswalk accents
    var interMat = new THREE.MeshStandardMaterial({ color: 0x1e2433, roughness: 0.85 });
    var crossMat = new THREE.MeshStandardMaterial({ map: T.get('crosswalk'), roughness: 0.85 });
    for (var ix = 0; ix < ROAD_X.length; ix++) {
      for (var iz = 0; iz < ROAD_Z.length; iz++) {
        var cx = ROAD_X[ix];
        var cz = ROAD_Z[iz];
        var sq = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH + 0.4, ROAD_WIDTH + 0.4), interMat);
        sq.rotation.x = -Math.PI / 2;
        sq.position.set(cx, 0.045, cz);
        parent.add(sq);

        // Crosswalks on N/S sides of intersection
        var cw1 = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH - 2, 3.2), crossMat);
        cw1.rotation.x = -Math.PI / 2;
        cw1.position.set(cx, 0.05, cz - 9.6);
        parent.add(cw1);

        var cw2 = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH - 2, 3.2), crossMat);
        cw2.rotation.x = -Math.PI / 2;
        cw2.position.set(cx, 0.05, cz + 9.6);
        parent.add(cw2);
      }
    }

    // Palm trees along beach boulevard X = 117 (skipping intersections so beach entry is open)
    for (var pz = -155; pz <= 155; pz += 18) {
      var nearRoad = false;
      for (var rz = 0; rz < ROAD_Z.length; rz++) {
        if (Math.abs(pz - ROAD_Z[rz]) < 14) nearRoad = true;
      }
      if (!nearRoad) {
        addPalmTree(parent, 117, pz, 1.05);
      }
    }

    // Outer perimeter palms & low neon sea/city border wall
    var borderMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.7 });
    addBox(parent, 340, 2.5, 2, -12, 1.25, -175, borderMat, null);
    addBox(parent, 340, 2.5, 2, -12, 1.25, 175, borderMat, null);
    addBox(parent, 2, 2.5, 352, -175, 1.25, 0, borderMat, null);
    for (var bx = -160; bx <= 100; bx += 26) {
      addPalmTree(parent, bx, -170, 0.9);
      addPalmTree(parent, bx, 170, 0.9);
    }
    for (var bz = -150; bz <= 150; bz += 26) {
      addPalmTree(parent, -170, bz, 0.9);
    }
  }

  function buildLandmarksAndPlazas(parent) {
    var T = window.GTC.Textures;

    // 1. OFICINA TURBO (Paint & Spray) at (-32, 0), open to West (X = -40), clear at (-32, 8) for Garage preview
    var shopGroup = new THREE.Group();
    var shopFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 13),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
    );
    shopFloor.rotation.x = -Math.PI / 2;
    shopFloor.position.set(-26, 0.06, 0);
    shopGroup.add(shopFloor);

    // Glowing trigger pad
    var padMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35 });
    var shopPad = new THREE.Mesh(new THREE.RingGeometry(5.5, 6.5, 32), padMat);
    shopPad.rotation.x = -Math.PI / 2;
    shopPad.position.set(-32, 0.08, 0);
    shopGroup.add(shopPad);

    var wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    // Back wall & canopy (leaves (-32, 0) and (-32, 8) completely unobstructed!)
    addBox(shopGroup, 2, 6.5, 13, -19.5, 3.25, 0, wallMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(shopGroup, 12, 0.8, 13, -25, 6.5, 0, wallMat, null);

    // Rainbow neon arch at entrance X = -30.5
    paintArchMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
    addBox(shopGroup, 0.8, 6.2, 0.8, -30.5, 3.1, -6.2, paintArchMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(shopGroup, 0.8, 6.2, 0.8, -30.5, 3.1,  6.2, paintArchMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(shopGroup, 0.8, 0.8, 13.2, -30.5, 6.3, 0, paintArchMat, null);

    // Sign "OFICINA TURBO"
    var shopSignTex = T.makeSignTexture('OFICINA TURBO', '#1e1b4b', '#ec4899', '#facc15');
    var shopSign = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 2.6),
      new THREE.MeshBasicMaterial({ map: shopSignTex, side: THREE.DoubleSide })
    );
    shopSign.position.set(-31, 7.6, 0);
    shopSign.rotation.y = -Math.PI / 2;
    shopGroup.add(shopSign);
    parent.add(shopGroup);

    // 2. GARAGEM SECRETA at (-108, -72), open to West (X = -120) & clear at (-108, -68) / (-108, -60)
    var garMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.6 });
    var garNeon = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
    neonMats.push(garNeon);

    addBox(parent, 3, 6.5, 14, -95.5, 3.25, -72, garMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 12, 0.8, 14, -101, 6.5, -72, garMat, null);
    addBox(parent, 0.8, 6.2, 0.8, -106.5, 3.1, -78.5, garNeon, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 0.8, 6.2, 0.8, -106.5, 3.1, -65.5, garNeon, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 0.8, 0.8, 13.8, -106.5, 6.3, -72, garNeon, null);

    var garSignTex = T.makeSignTexture('GARAGEM SECRETA', '#052e16', '#4ade80', '#bbf7d0');
    var garSign = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 2.4),
      new THREE.MeshBasicMaterial({ map: garSignTex, side: THREE.DoubleSide })
    );
    garSign.position.set(-107, 7.6, -72);
    garSign.rotation.y = -Math.PI / 2;
    parent.add(garSign);

    var garPad = new THREE.Mesh(
      new THREE.RingGeometry(5.5, 6.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.35 })
    );
    garPad.rotation.x = -Math.PI / 2;
    garPad.position.set(-108, 0.08, -72);
    parent.add(garPad);

    // 3. LABORATÓRIO TECH at (36, -108) — keep (36, -108) and (36, -96) clear!
    var labMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.2 });
    var labNeon = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    neonMats.push(labNeon);

    // Main lab building just west of trigger pad
    addBox(parent, 14, 11, 14, 21, 5.5, -103, labMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 14.4, 0.5, 14.4, 21, 11.2, -103, labNeon, null);
    // Canopy over (36, -108)
    addBox(parent, 10, 0.6, 10, 34, 6.4, -108, labMat, null);
    addBox(parent, 10.4, 0.35, 10.4, 34, 6.8, -108, labNeon, null);

    var labSignTex = T.makeSignTexture('LAB TECH', '#0c4a6e', '#22d3ee', '#e0f2fe');
    var labSign = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 2.3),
      new THREE.MeshBasicMaterial({ map: labSignTex, side: THREE.DoubleSide })
    );
    labSign.position.set(34, 8.1, -113.2);
    parent.add(labSign);

    var labPad = new THREE.Mesh(
      new THREE.RingGeometry(5.5, 6.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35 })
    );
    labPad.rotation.x = -Math.PI / 2;
    labPad.position.set(36, 0.08, -108);
    parent.add(labPad);

    // 4. THREE PEDESTRIAN PLAZAS (Used in Level 8)
    var plazaMat = new THREE.MeshStandardMaterial({ map: T.get('plaza'), roughness: 0.75 });
    var hedgeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
    var bollardMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xd97706, emissiveIntensity: 0.35, roughness: 0.4 });

    function addBollardRow(x1, z1, x2, z2, count) {
      for (var b = 0; b < count; b++) {
        var t = count === 1 ? 0.5 : b / (count - 1);
        var bx = x1 + (x2 - x1) * t;
        var bz = z1 + (z2 - z1) * t;
        bollardQueue.push({ x: bx, z: bz });
      }
      // Single vehicle-blocking, pedestrian-passable collider along the bollard line
      var minX = Math.min(x1, x2) - 0.6;
      var maxX = Math.max(x1, x2) + 0.6;
      var minZ = Math.min(z1, z2) - 0.6;
      var maxZ = Math.max(z1, z2) + 0.6;
      addCollider(minX, maxX, minZ, maxZ, true, false);
    }

    // 4a. Praça Norte (0, -80), open South at Z = -66
    var pnFloor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), plazaMat);
    pnFloor.rotation.x = -Math.PI / 2;
    pnFloor.position.set(0, 0.05, -80);
    parent.add(pnFloor);
    addBox(parent, 26, 1.8, 1.6, 0, 0.9, -93, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 1.6, 1.8, 26, -13, 0.9, -80, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 1.6, 1.8, 26, 13, 0.9, -80, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 6.5, 1.8, 1.6, -9.8, 0.9, -67, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 6.5, 1.8, 1.6, 9.8, 0.9, -67, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBollardRow(-5.2, -67, 5.2, -67, 5); // 2.6u gaps visually

    // 4b. Praça Centro (74, 0), open West at X = 62
    var pcFloor = new THREE.Mesh(new THREE.PlaneGeometry(24, 26), plazaMat);
    pcFloor.rotation.x = -Math.PI / 2;
    pcFloor.position.set(74, 0.05, 0);
    parent.add(pcFloor);
    addBox(parent, 24, 1.8, 1.6, 74, 0.9, -13, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 24, 1.8, 1.6, 74, 0.9, 13, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 1.6, 1.8, 26, 86, 0.9, 0, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 1.6, 1.8, 6.5, 62, 0.9, -9.8, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 1.6, 1.8, 6.5, 62, 0.9, 9.8, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBollardRow(62, -5.2, 62, 5.2, 5);

    // 4c. Parque Central (-80, 0) + Praça Parque around Fountain
    var grassMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(58, 58),
      new THREE.MeshStandardMaterial({ map: T.get('grass'), roughness: 0.9 })
    );
    grassMesh.rotation.x = -Math.PI / 2;
    grassMesh.position.set(-80, 0.02, 0);
    parent.add(grassMesh);

    // Cross paths in Park
    var path1 = new THREE.Mesh(new THREE.PlaneGeometry(8, 58), plazaMat);
    path1.rotation.x = -Math.PI / 2;
    path1.position.set(-80, 0.04, 0);
    parent.add(path1);
    var path2 = new THREE.Mesh(new THREE.PlaneGeometry(58, 8), plazaMat);
    path2.rotation.x = -Math.PI / 2;
    path2.position.set(-80, 0.04, 0);
    parent.add(path2);

    // Central Plaza around fountain (-80, 0)
    var ppFloor = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), plazaMat);
    ppFloor.rotation.x = -Math.PI / 2;
    ppFloor.position.set(-80, 0.05, 0);
    parent.add(ppFloor);

    // Fountain with glowing water ring
    var fBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.6, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
    );
    fBase.position.set(-80, 0.6, 0);
    parent.add(fBase);
    addCollider(-83, -77, -3, 3, true, true);

    var fWater = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.4, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    fWater.position.set(-80, 1.15, 0);
    parent.add(fWater);

    fountainRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.8, 0.18, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    fountainRing.rotation.x = Math.PI / 2;
    fountainRing.position.set(-80, 1.4, 0);
    parent.add(fountainRing);

    // Park plaza perimeter bollards (4 entrances) + corner hedges
    addBox(parent, 5.5, 1.4, 1.4, -88.2, 0.7, -11, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 5.5, 1.4, 1.4, -71.8, 0.7, -11, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 5.5, 1.4, 1.4, -88.2, 0.7,  11, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 5.5, 1.4, 1.4, -71.8, 0.7,  11, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBollardRow(-83.9, -11, -76.1, -11, 4);
    addBollardRow(-83.9,  11, -76.1,  11, 4);
    addBollardRow(-91, -3.9, -91, 3.9, 4);
    addBollardRow(-69, -3.9, -69, 3.9, 4);

    // Park decorative trees (keeping clear of Ramps 3 & 4 at (-80,-22) and (-64,22))
    addSmallTree(parent, -102, -22);
    addSmallTree(parent, -102, 22);
    addSmallTree(parent, -58, -22);
    addSmallTree(parent, -102, 0);
    addSmallTree(parent, -58, 0);
  }

  function buildDistricts(parent) {
    var T = window.GTC.Textures;
    var neonColors = [0xec4899, 0x22d3ee, 0xfacc15, 0xa855f7, 0xfb923c];

    // Downtown / Financial Center skyscrapers (X in [-30, 98], Z in [-110, 30])
    // Carefully placed to avoid Oficina Turbo (-32,0), Tech Lab (36,-108), Praça Norte (0,-80), Praça Centro (74,0)
    var buildings = [
      // Block (-30..30, -30..30) — East of Oficina Turbo
      { x: -4,  z: -16, w: 16, d: 16, h: 34, v: 0, n: 0 },
      { x: 16,  z: -16, w: 16, d: 16, h: 44, v: 1, n: 1 },
      { x: -4,  z:  16, w: 16, d: 16, h: 28, v: 2, n: 2 },
      { x: 16,  z:  16, w: 16, d: 16, h: 38, v: 3, n: 3 },

      // Block (50..98, -110..-50) — Northeast Downtown
      { x: 64,  z: -94, w: 18, d: 18, h: 46, v: 1, n: 0 },
      { x: 86,  z: -94, w: 16, d: 18, h: 32, v: 0, n: 1 },
      { x: 64,  z: -66, w: 18, d: 18, h: 38, v: 2, n: 4 },
      { x: 86,  z: -66, w: 16, d: 18, h: 26, v: 3, n: 2 },

      // Block (-30..30, -110..-50) — Side towers flanking Praça Norte
      { x: -21, z: -96, w: 12, d: 14, h: 24, v: 0, n: 1 },
      { x: -21, z: -64, w: 12, d: 14, h: 20, v: 3, n: 0 },

      // Block (50..98, -30..30) — Slim towers north/south of Praça Centro
      { x: 74,  z: -23, w: 22, d: 9,  h: 30, v: 1, n: 1 },
      { x: 74,  z:  23, w: 22, d: 9,  h: 26, v: 2, n: 0 },

      // Northwest District (X in [-110, -50], Z in [-110, -50]) — East of Secret Garage
      { x: -72, z: -94, w: 18, d: 18, h: 22, v: 2, n: 3 },
      { x: -72, z: -64, w: 18, d: 16, h: 18, v: 0, n: 1 },

      // Far West Strip (X in [-164, -134])
      { x: -150, z: -90, w: 18, d: 24, h: 26, v: 1, n: 0 },
      { x: -150, z: -10, w: 18, d: 28, h: 30, v: 3, n: 1 },
      { x: -150, z:  80, w: 18, d: 24, h: 22, v: 2, n: 2 },

      // North Perimeter Strip (Z in [-162, -134])
      { x: -80, z: -150, w: 24, d: 16, h: 24, v: 0, n: 1 },
      { x:   0, z: -150, w: 26, d: 16, h: 36, v: 1, n: 0 },
      { x:  74, z: -150, w: 24, d: 16, h: 30, v: 2, n: 4 },

      // South Perimeter Strip (Z in [134, 162])
      { x: -80, z: 150, w: 24, d: 16, h: 20, v: 3, n: 2 },
      { x:   0, z: 150, w: 26, d: 16, h: 24, v: 0, n: 1 },
      { x:  74, z: 150, w: 24, d: 16, h: 22, v: 1, n: 0 }
    ];

    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      addBuilding(parent, b.x, b.z, b.w, b.d, b.h, b.v, neonColors[b.n % neonColors.length]);
    }

    // Marina & Port (X in [-110, 98], Z in [50, 110])
    // Colorful containers & low warehouses with wide corridors (keeping Ramps 7 (-80,82), 8 (74,82) and Truck (74,100) clear!)
    var contTex = T.get('container');
    var contColors = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981, 0xf97316, 0xa855f7];

    var containers = [
      // West Marina block (-110..-50, 50..110), Ramp 7 is at (-80, 82)
      { x: -96, z: 60, w: 12, d: 4.5, h: 4.2, c: 0 },
      { x: -64, z: 60, w: 12, d: 4.5, h: 4.2, c: 1 },
      { x: -96, z: 102, w: 12, d: 4.5, h: 4.2, c: 2 },
      { x: -64, z: 102, w: 12, d: 4.5, h: 4.2, c: 3 },

      // Center Marina block (-30..30, 50..110)
      { x: -14, z: 64, w: 14, d: 5, h: 4.4, c: 4 },
      { x:  14, z: 64, w: 14, d: 5, h: 4.4, c: 5 },
      { x: -14, z: 96, w: 14, d: 5, h: 4.4, c: 1 },
      { x:  14, z: 96, w: 14, d: 5, h: 4.4, c: 0 },
      // Stacked second-tier container for visual flavor
      { x: -14, z: 64, w: 12, d: 4.6, h: 4.0, c: 2, yOff: 4.4 },

      // East Marina block (50..98, 50..110), Ramp 8 at (74, 82), Truck at (74, 100)
      { x: 64, z: 60, w: 12, d: 4.5, h: 4.2, c: 3 },
      { x: 86, z: 60, w: 12, d: 4.5, h: 4.2, c: 4 }
    ];

    for (var k = 0; k < containers.length; k++) {
      var ct = containers[k];
      var cMat = new THREE.MeshStandardMaterial({
        map: contTex,
        color: contColors[ct.c % contColors.length],
        roughness: 0.65
      });
      var cy = (ct.yOff || 0) + ct.h / 2;
      addBox(
        parent, ct.w, ct.h, ct.d, ct.x, cy, ct.z, cMat,
        ct.yOff ? null : { blocksVehicles: true, blocksPedestrian: true }
      );
    }
  }

  function buildRamps(parent) {
    var rampTex = window.GTC.Textures.get('ramp');
    var topMat = new THREE.MeshStandardMaterial({
      map: rampTex,
      roughness: 0.45,
      emissive: new THREE.Color(0x22d3ee),
      emissiveIntensity: 0.2
    });
    var sideMat = new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.6 });
    var neonEdgeMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });

    for (var i = 0; i < RAMPS_DEF.length; i++) {
      var r = RAMPS_DEF[i];
      var group = new THREE.Group();
      group.position.set(r.x, 0, r.z);
      group.rotation.y = Math.atan2(r.dirX, r.dirZ);

      var hw = r.width / 2;
      var hl = r.length / 2;
      var h = r.height;

      // Sloped top deck plane (length = hypot(length, height))
      var slopeLen = Math.sqrt(r.length * r.length + h * h);
      var slopeAngle = Math.atan2(h, r.length);
      var deck = new THREE.Mesh(new THREE.PlaneGeometry(r.width, slopeLen), topMat);
      deck.position.set(0, h / 2 + 0.04, 0);
      deck.rotation.x = -Math.PI / 2 - slopeAngle;
      // Rotate Z by PI so canvas top chevrons point toward +Z (high lip)
      deck.rotation.z = Math.PI;
      group.add(deck);

      // Solid wedge body underneath (ExtrudeGeometry in YZ extruded along X)
      var shape = new THREE.Shape();
      shape.moveTo(-hl, 0);
      shape.lineTo(hl, 0);
      shape.lineTo(hl, h);
      shape.closePath();

      var extrudeGeo = new THREE.ExtrudeGeometry(shape, { depth: r.width, bevelEnabled: false });
      extrudeGeo.translate(0, 0, -hw);
      // Shape is in XY; rotate so X becomes Z and Z becomes X
      var wedge = new THREE.Mesh(extrudeGeo, sideMat);
      wedge.rotation.y = -Math.PI / 2;
      group.add(wedge);

      // Glowing neon launch lip bar
      var lip = new THREE.Mesh(new THREE.BoxGeometry(r.width + 0.2, 0.22, 0.28), neonEdgeMat);
      lip.position.set(0, h + 0.08, hl);
      group.add(lip);

      parent.add(group);
    }
  }

  function buildPedestrians(parent) {
    pedestrians = [];
    var shirtColors = [0xec4899, 0x22d3ee, 0xfacc15, 0x4ade80, 0xa855f7, 0xfb923c, 0x38bdf8];
    var pantsColors = [0x1e293b, 0x334155, 0x1d4ed8, 0x7c2d12];
    var skinColors  = [0xfde68a, 0xfdba74, 0xd97706, 0x92400e];

    // 28 cartoon pedestrians distributed along sidewalks (offset ±9.5 from roads)
    for (var i = 0; i < 28; i++) {
      var alongNS = i % 2 === 0;
      var roadIdx = Math.floor(i / 2) % 4;
      var sideSign = (i % 4 < 2) ? 1 : -1;
      var x, z, dirX, dirZ;

      if (alongNS) {
        x = ROAD_X[roadIdx] + sideSign * 9.5;
        z = -110 + ((i * 37) % 220);
        dirX = 0;
        dirZ = (i % 3 === 0) ? 1 : -1;
      } else {
        x = -110 + ((i * 41) % 210);
        z = ROAD_Z[roadIdx] + sideSign * 9.5;
        dirX = (i % 3 === 0) ? 1 : -1;
        dirZ = 0;
      }

      var group = new THREE.Group();
      var shirtMat = new THREE.MeshStandardMaterial({ color: shirtColors[i % shirtColors.length], roughness: 0.7 });
      var pantsMat = new THREE.MeshStandardMaterial({ color: pantsColors[i % pantsColors.length], roughness: 0.8 });
      var skinMat  = new THREE.MeshStandardMaterial({ color: skinColors[i % skinColors.length], roughness: 0.7 });

      var torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.38), shirtMat);
      torso.position.y = 1.15;
      group.add(torso);

      var head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), skinMat);
      head.position.y = 1.85;
      group.add(head);

      var legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), pantsMat);
      legL.position.set(-0.17, 0.36, 0);
      group.add(legL);

      var legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), pantsMat);
      legR.position.set(0.17, 0.36, 0);
      group.add(legR);

      var armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.68, 0.22), shirtMat);
      armL.position.set(-0.46, 1.18, 0);
      group.add(armL);

      var armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.68, 0.22), shirtMat);
      armR.position.set(0.46, 1.18, 0);
      group.add(armR);

      group.position.set(x, 0, z);
      parent.add(group);

      pedestrians.push({
        mesh: group,
        legL: legL,
        legR: legR,
        armL: armL,
        armR: armR,
        x: x,
        z: z,
        dirX: dirX,
        dirZ: dirZ,
        speed: 2.6 + (i % 4) * 0.45,
        phase: i * 1.1,
        jumpTimer: 0,
        dodgeVx: 0,
        dodgeVz: 0
      });
    }
  }

  function isBlockedForPed(x, z) {
    if (x < BOUNDS.minX + 2 || x > BOUNDS.maxX - 2 || z < BOUNDS.minZ + 2 || z > BOUNDS.maxZ - 2) {
      return true;
    }
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      if (!c.blocksPedestrian) continue;
      if (x > c.minX - 0.5 && x < c.maxX + 0.5 && z > c.minZ - 0.5 && z < c.maxZ + 0.5) {
        return true;
      }
    }
    return false;
  }

  function computeAwayFromRoadDir(px, pz) {
    // Find nearest road centerline (X or Z) and move AWAY from it toward the interior of the block
    var bestDist = Infinity;
    var ax = 0;
    var az = 0;

    for (var i = 0; i < ROAD_X.length; i++) {
      var dx = px - ROAD_X[i];
      var adx = Math.abs(dx);
      if (adx < bestDist) {
        bestDist = adx;
        ax = dx >= 0 ? 1 : -1;
        az = 0;
      }
    }
    for (var j = 0; j < ROAD_Z.length; j++) {
      var dz = pz - ROAD_Z[j];
      var adz = Math.abs(dz);
      if (adz < bestDist) {
        bestDist = adz;
        ax = 0;
        az = dz >= 0 ? 1 : -1;
      }
    }
    return { x: ax, z: az };
  }

  function buildLightsAndSky(scene) {
    hemiLight = new THREE.HemisphereLight(0xf472b6, 0x1e1b4b, 0.75);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xff9e5e, 1.15);
    dirLight.position.set(110, 95, -60);
    scene.add(dirLight);

    // Stylized Vice City sun over the eastern ocean
    sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(28, 32),
      new THREE.MeshBasicMaterial({ color: 0xfb7185, fog: false })
    );
    sunDisc.position.set(270, 52, -40);
    sunDisc.rotation.y = -Math.PI / 2;
    scene.add(sunDisc);
  }

  function setTimeOfDay(mode) {
    if (!sceneRef) return;
    currentTimeOfDay = mode || 'sunset';

    var emissiveVal = 0.35;
    if (currentTimeOfDay === 'day') {
      sceneRef.background = new THREE.Color(0x38bdf8);
      sceneRef.fog = new THREE.Fog(0xbae6fd, 110, 330);
      if (dirLight) { dirLight.color.setHex(0xfffbeb); dirLight.intensity = 1.35; }
      if (hemiLight) { hemiLight.color.setHex(0xe0f2fe); hemiLight.groundColor.setHex(0x334155); hemiLight.intensity = 0.85; }
      if (sunDisc) { sunDisc.material.color.setHex(0xfef08a); sunDisc.visible = true; }
      emissiveVal = 0.15;
    } else if (currentTimeOfDay === 'night') {
      sceneRef.background = new THREE.Color(0x060a18);
      sceneRef.fog = new THREE.Fog(0x0f172a, 75, 260);
      if (dirLight) { dirLight.color.setHex(0x60a5fa); dirLight.intensity = 0.55; }
      if (hemiLight) { hemiLight.color.setHex(0x312e81); hemiLight.groundColor.setHex(0x020617); hemiLight.intensity = 0.50; }
      if (sunDisc) { sunDisc.material.color.setHex(0xe2e8f0); sunDisc.visible = true; }
      emissiveVal = 0.85;
    } else {
      // 'sunset' (default)
      sceneRef.background = new THREE.Color(0x2d1654);
      sceneRef.fog = new THREE.Fog(0x5b2a6e, 90, 300);
      if (dirLight) { dirLight.color.setHex(0xff9e5e); dirLight.intensity = 1.15; }
      if (hemiLight) { hemiLight.color.setHex(0xf472b6); hemiLight.groundColor.setHex(0x1e1b4b); hemiLight.intensity = 0.75; }
      if (sunDisc) { sunDisc.material.color.setHex(0xfb7185); sunDisc.visible = true; }
      emissiveVal = 0.42;
    }

    for (var i = 0; i < buildingMats.length; i++) {
      buildingMats[i].emissiveIntensity = emissiveVal;
    }
  }

  function build(scene) {
    sceneRef = scene;
    colliders.length = 0;
    buildingMats.length = 0;
    neonMats.length = 0;
    palmQueue.length = 0;
    bollardQueue.length = 0;

    if (window.GTC.Textures) {
      window.GTC.Textures.init();
    }

    if (cityGroup) {
      scene.remove(cityGroup);
    }
    cityGroup = new THREE.Group();
    scene.add(cityGroup);

    buildLightsAndSky(scene);
    buildRoadsAndGround(cityGroup);
    buildLandmarksAndPlazas(cityGroup);
    buildDistricts(cityGroup);
    buildRamps(cityGroup);
    flushInstancedProps(cityGroup);
    buildPedestrians(cityGroup);

    setTimeOfDay('sunset');
    return cityGroup;
  }

  function update(dt, time, vehicles) {
    // Animate ocean water
    if (waterTex) {
      waterTex.offset.y = (time * 0.08) % 1;
      waterTex.offset.x = Math.sin(time * 0.4) * 0.05;
    }

    // Animate Oficina Turbo rainbow arch
    if (paintArchMat) {
      paintArchMat.color.setHSL((time * 0.25) % 1, 0.95, 0.58);
    }

    // Animate Park fountain ring
    if (fountainRing) {
      var pulse = 1 + Math.sin(time * 3.0) * 0.05;
      fountainRing.scale.set(pulse, pulse, 1);
    }

    // Animate cartoon pedestrians & safe dodge away from vehicles
    var vList = vehicles || [];
    for (var i = 0; i < pedestrians.length; i++) {
      var p = pedestrians[i];

      if (p.jumpTimer <= 0) {
        // Check proximity to any vehicle (< 6.5 u)
        for (var v = 0; v < vList.length; v++) {
          var veh = vList[v];
          if (!veh) continue;
          var dx = p.x - veh.x;
          var dz = p.z - veh.z;
          if (dx * dx + dz * dz < 6.5 * 6.5) {
            var away = computeAwayFromRoadDir(p.x, p.z);
            p.jumpTimer = 0.45;
            p.dodgeVx = away.x * 7.5;
            p.dodgeVz = away.z * 7.5;
            break;
          }
        }
      }

      if (p.jumpTimer > 0) {
        p.jumpTimer -= dt;
        var prog = 1 - Math.max(0, p.jumpTimer) / 0.45;
        var jumpY = Math.sin(prog * Math.PI) * 1.2;

        var nx = p.x + p.dodgeVx * dt;
        var nz = p.z + p.dodgeVz * dt;
        if (!isBlockedForPed(nx, nz)) {
          p.x = nx;
          p.z = nz;
        }
        p.mesh.position.set(p.x, jumpY, p.z);
        // Raise both arms in friendly wave!
        p.armL.rotation.x = -Math.PI * 0.85;
        p.armR.rotation.x = -Math.PI * 0.85;
        p.legL.rotation.x = 0.35;
        p.legR.rotation.x = -0.35;
      } else {
        var stepX = p.x + p.dirX * p.speed * dt;
        var stepZ = p.z + p.dirZ * p.speed * dt;
        if (stepX < -135 || stepX > 118 || stepZ < -135 || stepZ > 135 || isBlockedForPed(stepX, stepZ)) {
          p.dirX = -p.dirX;
          p.dirZ = -p.dirZ;
        } else {
          p.x = stepX;
          p.z = stepZ;
        }

        p.phase += dt * p.speed * 2.4;
        var swing = Math.sin(p.phase) * 0.55;
        p.legL.rotation.x = swing;
        p.legR.rotation.x = -swing;
        p.armL.rotation.x = -swing * 0.6;
        p.armR.rotation.x = swing * 0.6;

        p.mesh.position.set(p.x, 0, p.z);
        p.mesh.rotation.y = Math.atan2(p.dirX, p.dirZ);
      }
    }
  }

  function findNearestRoadPoint(x, z) {
    var bestDistSq = Infinity;
    var best = { x: -40, z: 0, angle: Math.PI };

    // Check N-S avenues
    var clampedZ = Math.max(-120, Math.min(120, z));
    for (var i = 0; i < ROAD_X.length; i++) {
      var rx = ROAD_X[i];
      var dx = x - rx;
      var dz = z - clampedZ;
      var d2 = dx * dx + dz * dz;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        best = { x: rx, z: clampedZ, angle: Math.PI };
      }
    }

    // Check E-W avenues
    var clampedX = Math.max(-120, Math.min(108, x));
    for (var j = 0; j < ROAD_Z.length; j++) {
      var rz = ROAD_Z[j];
      var dx2 = x - clampedX;
      var dz2 = z - rz;
      var d2b = dx2 * dx2 + dz2 * dz2;
      if (d2b < bestDistSq) {
        bestDistSq = d2b;
        best = { x: clampedX, z: rz, angle: Math.PI / 2 };
      }
    }

    return best;
  }

  function isOnSand(x, z) {
    return x >= 118 && x <= 150;
  }

  window.GTC.City = {
    BOUNDS: BOUNDS,
    ROAD_X: ROAD_X,
    ROAD_Z: ROAD_Z,
    ROAD_WIDTH: ROAD_WIDTH,
    colliders: colliders,
    ramps: RAMPS_DEF,
    landmarks: LANDMARKS,
    roadNodes: ROAD_NODES,
    parkedSpawns: PARKED_SPAWNS,
    nitroSpawns: NITRO_SPAWNS,
    build: build,
    setTimeOfDay: setTimeOfDay,
    update: update,
    findNearestRoadPoint: findNearestRoadPoint,
    isOnSand: isOnSand
  };
})();
