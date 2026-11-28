// Grand Turbo City — Realistic 3D World, Suspension Bridge, Desert Dunes & Lighting (window.GTC.City)
(function () {
  'use strict';

  window.GTC = window.GTC || {};

  // Expanded world bounds: West = Bone Canyon Desert (-236..-134), Center = City (-132..116),
  // East = Beach (116..150) + Red Bay Suspension Bridge over Ocean (150..192)
  var BOUNDS = { minX: -236, maxX: 192, minZ: -176, maxZ: 176 };
  var ROAD_X = [-120, -40, 40, 108];
  var ROAD_Z = [-120, -40, 40, 120];
  var ROAD_WIDTH = 16;

  // Keep indices 0..7 identical for Level 3 compatibility, with avenue ramps cleanly in one lane!
  var RAMPS_DEF = [
    { id: 1,  name: 'Praia Norte',           x: 128,   z: -80, dirX:  0, dirZ:  1, length: 12, width: 7.0, height: 3.2 },
    { id: 2,  name: 'Praia Sul',             x: 128,   z:  60, dirX:  0, dirZ: -1, length: 12, width: 7.0, height: 3.2 },
    { id: 3,  name: 'Parque Oeste',          x: -80,   z: -22, dirX:  1, dirZ:  0, length: 12, width: 7.0, height: 3.2 },
    { id: 4,  name: 'Parque Este',           x: -64,   z:  22, dirX: -1, dirZ:  0, length: 12, width: 7.0, height: 3.2 },
    { id: 5,  name: 'Avenida Central Norte', x: -44.2, z: -60, dirX:  0, dirZ:  1, length: 12, width: 5.6, height: 3.2 },
    { id: 6,  name: 'Avenida Central Sul',   x:  44.2, z:  60, dirX:  0, dirZ: -1, length: 12, width: 5.6, height: 3.2 },
    { id: 7,  name: 'Marina Oeste',          x: -80,   z:  82, dirX:  1, dirZ:  0, length: 12, width: 7.0, height: 3.2 },
    { id: 8,  name: 'Marina Este',           x:  74,   z:  82, dirX: -1, dirZ:  0, length: 12, width: 7.0, height: 3.2 },
    { id: 9,  name: 'Salto da Marginal',     x: 119.5, z: -12, dirX:  0, dirZ: -1, length: 14, width: 6.4, height: 3.8 },
    { id: 10, name: 'Canyon Oeste',          x: -156,  z: -38, dirX: -1, dirZ:  0, length: 15, width: 8.0, height: 4.4 }
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
    { typeId: 'coupe',  x:  -40, z: -16,  angle: 0,             color: '#f3e8c8' }, // Pale cream coupe (Reel!)
    { typeId: 'moto',   x:  108, z: -22,  angle: Math.PI,       color: '#16a34a' }, // #46 Green sportbike (Reel!)
    { typeId: 'buggy',  x:  124, z:  10,  angle: Math.PI,       color: '#eab308' },
    { typeId: 'van',    x: -120, z:  15,  angle: 0,             color: '#e2e8f0' },
    { typeId: 'police', x:   40, z: -15,  angle: Math.PI,       color: '#f8fafc' },
    { typeId: 'truck',  x: -120, z:  85,  angle: 0,             color: '#334155' },
    { typeId: 'coupe',  x:   40, z: 120,  angle: Math.PI / 2,   color: '#dc2626' },
    { typeId: 'moto',   x:  -40, z: 120,  angle: -Math.PI / 2,  color: '#2563eb' },
    { typeId: 'moto',   x: -178, z: -14,  angle: 0,             color: '#f8fafc' }, // Desert Sanchez dirtbike (Reel!)
    { typeId: 'buggy',  x: -186, z:  18,  angle: Math.PI * 0.4, color: '#ea580c' }
  ];

  var NITRO_SPAWNS = [
    { x:  -40, z: -40 },
    { x:   40, z: -40 },
    { x:  108, z: -40 },
    { x: -120, z:  40 },
    { x:  -40, z:  40 },
    { x:   40, z:  40 },
    { x:  108, z:  40 },
    { x:    0, z: 120 },
    { x:  176, z:  65 }, // On the Red Suspension Bridge before the stunt beam!
    { x: -182, z: -55 }  // In Bone Canyon Desert
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
  var rendererRef = null;
  var envMaps = {};

  var dirLight = null;
  var dirLightOffset = new THREE.Vector3(85, 110, -55);
  var hemiLight = null;
  var skyDome = null;
  var skyDomeMat = null;
  var sunDisc = null;
  var sunHalo = null;
  var waterMesh = null;
  var waterTex = null;
  var paintArchMat = null;
  var fountainRing = null;
  var buildingMats = [];
  var streetLampBulbMat = null;
  var currentTimeOfDay = 'sunset';

  function smoothstep(edge0, edge1, x) {
    var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  // ===========================================================================
  // Continuous 3D Elevation Model: Desert Dunes + Red Suspension Bridge
  // ===========================================================================
  function getDesertHeight(x, z) {
    if (x >= -132) return 0;
    var blend = smoothstep(-132, -154, x);

    // Multi-wave Bone County desert dunes & ridges
    var h = 2.8
      + Math.sin(x * 0.068 + 0.9) * 2.4
      + Math.cos(z * 0.052 - 0.4) * 2.1
      + Math.sin((x + z) * 0.042) * 1.65
      + Math.cos((x - z * 0.7) * 0.085) * 0.85;

    // Flatten the trailer-park basin around (-182, 4) so RVs sit on level ground at bottom of hill!
    var dx = x - (-182);
    var dz = z - 4;
    var distCamp = Math.sqrt(dx * dx + dz * dz);
    var campMask = smoothstep(10, 30, distCamp);
    var campBase = 1.15;
    h = campBase + (h - campBase) * campMask;

    // High western ridge near boundary for big downhill motocross runs
    var westRidge = smoothstep(-206, -234, x) * 5.2;

    return Math.max(0, (h + westRidge) * blend);
  }

  function getBridgeElevation(x, z, currentY) {
    var deckY = 9.0;
    var curY = currentY !== undefined ? currentY : 999;

    // 1. North & South Approach Viaducts: X in [114, 168], Z around -120 or +120
    if (x >= 114 && x <= 168.2) {
      var inNorth = Math.abs(z - (-120)) <= 8.2;
      var inSouth = Math.abs(z - 120) <= 8.2;
      if (inNorth || inSouth) {
        var t = smoothstep(114, 168, x);
        var rampH = t * deckY;
        if (curY >= rampH - 2.8) {
          return { onBridge: true, y: rampH, slopeBoost: 0 };
        }
      }
    }

    // 2. Main North-South Suspension Span: X in [167.8, 184.2], Z in [-128.2, 128.2]
    if (x >= 167.8 && x <= 184.2 && z >= -128.2 && z <= 128.2) {
      if (curY >= deckY - 3.5) {
        var yOut = deckY;
        var boost = 0;

        // Iconic Gant Bridge Sloped Suspension-Girder Stunt Ramp along East lane!
        // Climbs Northward from Z = 48 (Y = 9.0) up to Z = -8 (Y = 20.6)
        if (x >= 180.1 && x <= 184.1 && z <= 48 && z >= -9.5) {
          var stFrac = Math.max(0, Math.min(1, (48 - z) / 56));
          var beamY = deckY + stFrac * 11.6;
          if (curY >= beamY - 2.6 || stFrac < 0.18) {
            yOut = beamY;
            if (stFrac > 0.88) boost = 1.0;
          }
        }
        return { onBridge: true, y: yOut, slopeBoost: boost };
      }
    }

    return { onBridge: false, y: 0, slopeBoost: 0 };
  }

  function getGroundHeight(x, z, currentY) {
    var baseH = 0;
    if (x < -132) {
      baseH = getDesertHeight(x, z);
    } else if (x >= 114) {
      var bInfo = getBridgeElevation(x, z, currentY);
      if (bInfo.onBridge) baseH = bInfo.y;
    }

    // Also include ramp surface elevation when currentY is near/above the ramp slope
    // (used for accurate car pitch alignment & on-foot walking up ramps!)
    if (currentY !== undefined) {
      for (var i = 0; i < RAMPS_DEF.length; i++) {
        var rm = RAMPS_DEF[i];
        var relX = x - rm.x;
        var relZ = z - rm.z;
        var hl = rm.length * 0.5;
        var hw = rm.width * 0.5;
        if (Math.abs(relX) > hl + hw + 1 || Math.abs(relZ) > hl + hw + 1) continue;

        var along = relX * rm.dirX + relZ * rm.dirZ;
        var across = Math.abs(relX * (-rm.dirZ) + relZ * rm.dirX);
        if (along >= -hl && along <= hl && across <= hw + 0.25) {
          var rmBase = rm.x < -132 ? getDesertHeight(rm.x, rm.z) : 0;
          var frac = (along + hl) / rm.length;
          var rY = rmBase + frac * rm.height;
          if (currentY >= rY - 0.75 && rY > baseH) {
            baseH = rY;
          }
        }
      }
    }

    return baseH;
  }

  function isOnSand(x, z) {
    if (x < -134) return true; // Bone Canyon Desert
    if (x >= 118 && x <= 150) {
      // Exclude paved bridge approach ramps
      if (Math.abs(z - (-120)) <= 8.2 || Math.abs(z - 120) <= 8.2) return false;
      return true;
    }
    return false;
  }

  function isInDeepWater(x, z, y) {
    if (x > 152.2 && (y === undefined || y < 1.5)) {
      var bInfo = getBridgeElevation(x, z, y !== undefined ? y : 0);
      return !bInfo.onBridge;
    }
    return false;
  }

  // ===========================================================================
  // Colliders & Geometry Helpers
  // ===========================================================================
  function addCollider(minX, maxX, minZ, maxZ, blocksVehicles, blocksPedestrian, minY, maxY) {
    colliders.push({
      minX: minX,
      maxX: maxX,
      minZ: minZ,
      maxZ: maxZ,
      minY: minY !== undefined ? minY : -10,
      maxY: maxY !== undefined ? maxY : 200,
      blocksVehicles: blocksVehicles !== undefined ? blocksVehicles : true,
      blocksPedestrian: blocksPedestrian !== undefined ? blocksPedestrian : true
    });
  }

  function addBox(parent, w, h, d, x, y, z, mat, colliderOpts, castShad, recvShad) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShad !== undefined ? castShad : true;
    mesh.receiveShadow = recvShad !== undefined ? recvShad : true;
    parent.add(mesh);
    if (colliderOpts) {
      addCollider(
        x - w / 2, x + w / 2,
        z - d / 2, z + d / 2,
        colliderOpts.blocksVehicles,
        colliderOpts.blocksPedestrian,
        colliderOpts.minY,
        colliderOpts.maxY
      );
    }
    return mesh;
  }

  // Instanced prop queues
  var palmQueue = [];
  var bollardQueue = [];
  var streetLampQueue = [];
  var cactusQueue = [];

  function addPalmTree(parent, x, z, scale, baseY) {
    palmQueue.push({ x: x, y: baseY || 0, z: z, s: scale || 1, rot: ((x * 13 + z * 7) % 628) * 0.01 });
  }

  function addStreetLamp(x, z, rotY, baseY) {
    streetLampQueue.push({ x: x, y: baseY || 0, z: z, rotY: rotY || 0 });
  }

  function addCactus(x, z, scale) {
    cactusQueue.push({ x: x, y: getDesertHeight(x, z), z: z, s: scale || 1, rot: ((x * 19 + z * 31) % 628) * 0.01 });
  }

  function flushInstancedProps(parent) {
    var dummy = new THREE.Object3D();

    // 1. Realistic California Curved Palm Trees (5 trunk rings + 8 arched 2-stage fronds)
    if (palmQueue.length > 0 && THREE.InstancedMesh) {
      var trunkGeo = new THREE.CylinderGeometry(0.21, 0.30, 1.85, 8);
      var trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4c35, roughness: 0.92 });
      var frondInnerGeo = new THREE.BoxGeometry(0.62, 0.10, 2.35);
      var frondOuterGeo = new THREE.BoxGeometry(0.46, 0.08, 2.15);
      var leafMat = new THREE.MeshStandardMaterial({ color: 0x3b6e33, roughness: 0.72 });

      var trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palmQueue.length * 5);
      var innerInst = new THREE.InstancedMesh(frondInnerGeo, leafMat, palmQueue.length * 8);
      var outerInst = new THREE.InstancedMesh(frondOuterGeo, leafMat, palmQueue.length * 8);
      trunkInst.castShadow = true;
      trunkInst.receiveShadow = true;
      innerInst.castShadow = true;
      outerInst.castShadow = true;

      var ti = 0, ii = 0, oi = 0;
      for (var p = 0; p < palmQueue.length; p++) {
        var pm = palmQueue[p];
        var s = pm.s;
        var leanDirX = Math.cos(pm.rot);
        var leanDirZ = Math.sin(pm.rot);

        for (var seg = 0; seg < 5; seg++) {
          var segScale = s * (1 - seg * 0.09);
          var curve = seg * seg * 0.075 * s;
          dummy.position.set(
            pm.x + leanDirX * curve,
            pm.y + (seg * 1.68 + 0.88) * s,
            pm.z + leanDirZ * curve
          );
          dummy.rotation.set(leanDirZ * 0.05 * seg, pm.rot, -leanDirX * 0.05 * seg);
          dummy.scale.set(segScale, s, segScale);
          dummy.updateMatrix();
          trunkInst.setMatrixAt(ti++, dummy.matrix);
        }

        var crownX = pm.x + leanDirX * (16 * 0.075 * s);
        var crownY = pm.y + 8.55 * s;
        var crownZ = pm.z + leanDirZ * (16 * 0.075 * s);

        for (var f = 0; f < 8; f++) {
          var ang = pm.rot + (f / 8) * Math.PI * 2;
          var fx = Math.sin(ang);
          var fz = Math.cos(ang);

          // Inner rising frond segment
          dummy.position.set(crownX + fx * 1.05 * s, crownY + 0.12 * s, crownZ + fz * 1.05 * s);
          dummy.rotation.set(0.18, ang, 0);
          dummy.scale.set(s, s, s);
          dummy.updateMatrix();
          innerInst.setMatrixAt(ii++, dummy.matrix);

          // Outer drooping frond tip
          dummy.position.set(crownX + fx * 2.75 * s, crownY - 0.55 * s, crownZ + fz * 2.75 * s);
          dummy.rotation.set(0.68, ang, 0);
          dummy.scale.set(s, s, s);
          dummy.updateMatrix();
          outerInst.setMatrixAt(oi++, dummy.matrix);
        }
      }
      trunkInst.instanceMatrix.needsUpdate = true;
      innerInst.instanceMatrix.needsUpdate = true;
      outerInst.instanceMatrix.needsUpdate = true;
      parent.add(trunkInst, innerInst, outerInst);
    }

    // 2. Realistic Steel Streetlamps along Avenues & Bridge
    if (streetLampQueue.length > 0 && THREE.InstancedMesh) {
      var poleGeo = new THREE.CylinderGeometry(0.10, 0.15, 6.8, 7);
      var armGeo = new THREE.BoxGeometry(0.12, 0.12, 2.2);
      var bulbGeo = new THREE.BoxGeometry(0.36, 0.14, 0.68);
      var metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.65, roughness: 0.4 });
      streetLampBulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

      var poleInst = new THREE.InstancedMesh(poleGeo, metalMat, streetLampQueue.length);
      var armInst = new THREE.InstancedMesh(armGeo, metalMat, streetLampQueue.length);
      var bulbInst = new THREE.InstancedMesh(bulbGeo, streetLampBulbMat, streetLampQueue.length);
      poleInst.castShadow = true;

      for (var sl = 0; sl < streetLampQueue.length; sl++) {
        var lm = streetLampQueue[sl];
        var lx = Math.sin(lm.rotY);
        var lz = Math.cos(lm.rotY);

        dummy.position.set(lm.x, lm.y + 3.4, lm.z);
        dummy.rotation.set(0, lm.rotY, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        poleInst.setMatrixAt(sl, dummy.matrix);

        dummy.position.set(lm.x + lx * 1.0, lm.y + 6.75, lm.z + lz * 1.0);
        dummy.rotation.set(-0.12, lm.rotY, 0);
        dummy.updateMatrix();
        armInst.setMatrixAt(sl, dummy.matrix);

        dummy.position.set(lm.x + lx * 1.95, lm.y + 6.78, lm.z + lz * 1.95);
        dummy.rotation.set(0, lm.rotY, 0);
        dummy.updateMatrix();
        bulbInst.setMatrixAt(sl, dummy.matrix);
      }
      poleInst.instanceMatrix.needsUpdate = true;
      armInst.instanceMatrix.needsUpdate = true;
      bulbInst.instanceMatrix.needsUpdate = true;
      parent.add(poleInst, armInst, bulbInst);
    }

    // 3. Desert Saguaro Cacti (Bone Canyon)
    if (cactusQueue.length > 0 && THREE.InstancedMesh) {
      var cMainGeo = new THREE.CylinderGeometry(0.28, 0.34, 3.8, 8);
      var cArmGeo = new THREE.CylinderGeometry(0.20, 0.22, 1.5, 7);
      var cMat = new THREE.MeshStandardMaterial({ color: 0x3f6234, roughness: 0.85 });

      var cMainInst = new THREE.InstancedMesh(cMainGeo, cMat, cactusQueue.length);
      var cArmInst = new THREE.InstancedMesh(cArmGeo, cMat, cactusQueue.length * 2);
      cMainInst.castShadow = true;
      cArmInst.castShadow = true;

      var ai = 0;
      for (var ci = 0; ci < cactusQueue.length; ci++) {
        var cc = cactusQueue[ci];
        var cs = cc.s;
        dummy.position.set(cc.x, cc.y + 1.85 * cs, cc.z);
        dummy.rotation.set(0, cc.rot, 0);
        dummy.scale.set(cs, cs, cs);
        dummy.updateMatrix();
        cMainInst.setMatrixAt(ci, dummy.matrix);

        var rx = Math.cos(cc.rot);
        var rz = -Math.sin(cc.rot);
        dummy.position.set(cc.x + rx * 0.55 * cs, cc.y + 2.35 * cs, cc.z + rz * 0.55 * cs);
        dummy.rotation.set(0, cc.rot, -0.45);
        dummy.scale.set(cs, cs, cs);
        dummy.updateMatrix();
        cArmInst.setMatrixAt(ai++, dummy.matrix);

        dummy.position.set(cc.x - rx * 0.52 * cs, cc.y + 1.95 * cs, cc.z - rz * 0.52 * cs);
        dummy.rotation.set(0, cc.rot, 0.45);
        dummy.scale.set(cs, cs, cs);
        dummy.updateMatrix();
        cArmInst.setMatrixAt(ai++, dummy.matrix);
      }
      cMainInst.instanceMatrix.needsUpdate = true;
      cArmInst.instanceMatrix.needsUpdate = true;
      parent.add(cMainInst, cArmInst);
    }

    // 4. Pedestrian Plaza Bollards
    if (bollardQueue.length > 0 && THREE.InstancedMesh) {
      var bolGeo = new THREE.CylinderGeometry(0.24, 0.28, 1.25, 10);
      var bolMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.35 });
      var bolInst = new THREE.InstancedMesh(bolGeo, bolMat, bollardQueue.length);
      bolInst.castShadow = true;
      for (var b = 0; b < bollardQueue.length; b++) {
        dummy.position.set(bollardQueue[b].x, 0.625, bollardQueue[b].z);
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
      new THREE.CylinderGeometry(0.22, 0.34, 2.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.9 })
    );
    trunk.position.y = 1.25;
    trunk.castShadow = true;
    group.add(trunk);

    var leafMat = new THREE.MeshStandardMaterial({ color: 0x3b6e33, roughness: 0.82 });
    var c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.75, 1), leafMat);
    c1.position.set(0, 3.3, 0);
    c1.castShadow = true;
    var c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25, 1), leafMat);
    c2.position.set(0.75, 3.8, 0.45);
    c2.castShadow = true;
    var c3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), leafMat);
    c3.position.set(-0.7, 3.6, -0.4);
    c3.castShadow = true;
    group.add(c1, c2, c3);
    parent.add(group);
  }

  function addBuilding(parent, x, z, w, d, h, variant) {
    var vIdx = variant % 6;
    var tex = window.GTC.Textures.get('building' + vIdx);
    var emTex = window.GTC.Textures.get('buildingEmissive' + vIdx);

    var mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: vIdx === 1 || vIdx === 5 ? 0.32 : 0.78,
      metalness: vIdx === 1 || vIdx === 5 ? 0.45 : 0.08,
      emissive: new THREE.Color(0xffe4a0),
      emissiveMap: emTex,
      emissiveIntensity: 0.45
    });
    buildingMats.push(mat);

    addBox(parent, w, h, d, x, h / 2, z, mat, { blocksVehicles: true, blocksPedestrian: true }, true, true);

    // Realistic stone/concrete parapet cornice
    var corniceMat = new THREE.MeshStandardMaterial({
      color: vIdx === 1 ? 0x475569 : (vIdx === 2 ? 0xd6d3d1 : 0xa89f91),
      roughness: 0.75
    });
    addBox(parent, w + 0.5, 0.65, d + 0.5, x, h + 0.32, z, corniceMat, null, true, true);

    // Rooftop penthouse mechanical room & HVAC units for realism
    var roofMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7, metalness: 0.25 });
    if (h >= 28) {
      addBox(parent, w * 0.45, 2.8, d * 0.45, x, h + 1.8, z, roofMat, null, true, true);
      // Spire antenna on skyscrapers
      if (h >= 38) {
        var spire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.16, 7.5, 6),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 })
        );
        spire.position.set(x, h + 6.8, z);
        parent.add(spire);
      }
    } else {
      addBox(parent, 2.6, 1.2, 2.2, x + w * 0.2, h + 1.1, z - d * 0.18, roofMat, null, false, true);
    }
  }

  // ===========================================================================
  // Roads, Raised 3D Sidewalks, Beach & Ocean
  // ===========================================================================
  function buildRoadsAndGround(parent) {
    var T = window.GTC.Textures;

    // Base urban concrete ground under city (-134..118)
    var baseGround = new THREE.Mesh(
      new THREE.PlaneGeometry(256, 368),
      new THREE.MeshStandardMaterial({ map: T.get('sidewalk'), roughness: 0.88 })
    );
    baseGround.rotation.x = -Math.PI / 2;
    baseGround.position.set(-8, -0.02, 0);
    baseGround.receiveShadow = true;
    parent.add(baseGround);

    // Raised 3D sidewalk slabs inside city blocks (visual curb depth 0.14m, zero collider interference)
    var curbSlabMat = new THREE.MeshStandardMaterial({ map: T.get('sidewalk').clone(), roughness: 0.85 });
    curbSlabMat.map.repeat.set(5, 5);
    curbSlabMat.map.needsUpdate = true;

    var blockRangesX = [[-111, -49], [-31, 31], [49, 99]];
    var blockRangesZ = [[-168, -129], [-111, -49], [-31, 31], [49, 111], [129, 168]];
    for (var bx = 0; bx < blockRangesX.length; bx++) {
      for (var bz = 0; bz < blockRangesZ.length; bz++) {
        // Leave Park (-80, 0) & Oficina Turbo (-32, 0) flush with ground
        if (bx === 0 && bz === 2) continue;
        var minBx = blockRangesX[bx][0];
        var maxBx = blockRangesX[bx][1];
        var minBz = blockRangesZ[bz][0];
        var maxBz = blockRangesZ[bz][1];
        if (bx === 1 && bz === 2) minBx = -17; // Clear of Oficina Turbo driveway

        var bw = maxBx - minBx;
        var bd = maxBz - minBz;
        var slab = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.14, bd), curbSlabMat);
        slab.position.set((minBx + maxBx) * 0.5, 0.06, (minBz + maxBz) * 0.5);
        slab.receiveShadow = true;
        parent.add(slab);
      }
    }

    // Golden California Beach Sand Strip X in [116, 152]
    var sandMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(38, 368),
      new THREE.MeshStandardMaterial({ map: T.get('sand'), roughness: 0.94 })
    );
    sandMesh.rotation.x = -Math.PI / 2;
    sandMesh.position.set(134, 0.01, 0);
    sandMesh.receiveShadow = true;
    parent.add(sandMesh);

    // Low stone beach seawall at X = 150.8 (open at Z = -120 and Z = +120 for Bridge Viaducts!)
    var seawallMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.85 });
    addBox(parent, 1.4, 1.1, 220, 150.8, 0.55, 0, seawallMat, { blocksVehicles: true, blocksPedestrian: true }, true, true);
    addBox(parent, 1.4, 1.1, 44, 150.8, 0.55, -152, seawallMat, { blocksVehicles: true, blocksPedestrian: true }, true, true);
    addBox(parent, 1.4, 1.1, 44, 150.8, 0.55,  152, seawallMat, { blocksVehicles: true, blocksPedestrian: true }, true, true);

    // Deep Pacific Ocean X > 150 (extends wide under the Red Suspension Bridge!)
    waterTex = T.get('water');
    waterMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 480),
      new THREE.MeshStandardMaterial({
        map: waterTex,
        roughness: 0.18,
        metalness: 0.35
      })
    );
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(268, -0.35, 0);
    waterMesh.receiveShadow = true;
    parent.add(waterMesh);

    // N-S Avenues
    var roadTexNS = T.get('road').clone();
    roadTexNS.wrapS = THREE.RepeatWrapping;
    roadTexNS.wrapT = THREE.RepeatWrapping;
    roadTexNS.repeat.set(1, 22);
    roadTexNS.needsUpdate = true;
    var roadMatNS = new THREE.MeshStandardMaterial({ map: roadTexNS, roughness: 0.82 });

    for (var i = 0; i < ROAD_X.length; i++) {
      var rNS = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, 352), roadMatNS);
      rNS.rotation.x = -Math.PI / 2;
      rNS.position.set(ROAD_X[i], 0.03, 0);
      rNS.receiveShadow = true;
      parent.add(rNS);
    }

    // E-W Avenues (extending from -134 Desert edge to 116 Beach Boulevard)
    var roadTexEW = T.get('road').clone();
    roadTexEW.wrapS = THREE.RepeatWrapping;
    roadTexEW.wrapT = THREE.RepeatWrapping;
    roadTexEW.repeat.set(1, 16);
    roadTexEW.needsUpdate = true;
    var roadMatEW = new THREE.MeshStandardMaterial({ map: roadTexEW, roughness: 0.82 });

    for (var j = 0; j < ROAD_Z.length; j++) {
      var rEW = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, 250), roadMatEW);
      rEW.rotation.x = -Math.PI / 2;
      rEW.rotation.z = Math.PI / 2;
      rEW.position.set(-9, 0.035, ROAD_Z[j]);
      rEW.receiveShadow = true;
      parent.add(rEW);
    }

    // Intersections, Crosswalks & Streetlights
    var interMat = new THREE.MeshStandardMaterial({ color: 0x2d3036, roughness: 0.82 });
    var crossMat = new THREE.MeshStandardMaterial({ map: T.get('crosswalk'), roughness: 0.82 });
    for (var ix = 0; ix < ROAD_X.length; ix++) {
      for (var iz = 0; iz < ROAD_Z.length; iz++) {
        var cx = ROAD_X[ix];
        var cz = ROAD_Z[iz];
        var sq = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH + 0.4, ROAD_WIDTH + 0.4), interMat);
        sq.rotation.x = -Math.PI / 2;
        sq.position.set(cx, 0.045, cz);
        sq.receiveShadow = true;
        parent.add(sq);

        var cw1 = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH - 2, 3.4), crossMat);
        cw1.rotation.x = -Math.PI / 2;
        cw1.position.set(cx, 0.05, cz - 9.8);
        cw1.receiveShadow = true;
        parent.add(cw1);

        var cw2 = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH - 2, 3.4), crossMat);
        cw2.rotation.x = -Math.PI / 2;
        cw2.position.set(cx, 0.05, cz + 9.8);
        cw2.receiveShadow = true;
        parent.add(cw2);

        // Corner streetlamps facing into intersection
        addStreetLamp(cx - 9.2, cz - 9.2, Math.PI * 0.25, 0);
        addStreetLamp(cx + 9.2, cz + 9.2, -Math.PI * 0.75, 0);
      }
    }

    // Mid-block avenue streetlamps
    var midZ = [-80, 0, 80];
    for (var mx = 0; mx < ROAD_X.length; mx++) {
      for (var mz = 0; mz < midZ.length; mz++) {
        addStreetLamp(ROAD_X[mx] + 8.8, midZ[mz], -Math.PI / 2, 0);
      }
    }

    // Palm-lined Coastal Boulevard (Los Santos / Santa Monica vibe from Reel Clip #1!)
    for (var pz = -160; pz <= 160; pz += 15) {
      var nearRoad = false;
      for (var rz = 0; rz < ROAD_Z.length; rz++) {
        if (Math.abs(pz - ROAD_Z[rz]) < 13) nearRoad = true;
      }
      if (!nearRoad) {
        addPalmTree(parent, 117.2, pz, 1.08);
        if (Math.abs(pz) % 30 === 0) {
          addPalmTree(parent, 98.8, pz, 0.96);
        }
      }
    }

    // North & South city boundary guardrails
    var railMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.5 });
    addBox(parent, 430, 1.4, 1.2, -22, 0.7, -177, railMat, null, false, true);
    addBox(parent, 430, 1.4, 1.2, -22, 0.7,  177, railMat, null, false, true);
  }

  // ===========================================================================
  // Iconic Red Steel Suspension Bridge ("Ponte Baía Dourada" / Gant Bridge)
  // ===========================================================================
  function buildSuspensionBridge(parent) {
    var T = window.GTC.Textures;
    var redSteelMat = new THREE.MeshStandardMaterial({
      color: 0xb83227, // Iconic International Orange / San Fierro Gant Bridge Red
      roughness: 0.48,
      metalness: 0.48
    });
    var darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.55,
      metalness: 0.55
    });
    var concretePierMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.85
    });

    var hwyTexMain = T.get('highway').clone();
    hwyTexMain.wrapS = THREE.RepeatWrapping;
    hwyTexMain.wrapT = THREE.RepeatWrapping;
    hwyTexMain.repeat.set(1, 16);
    hwyTexMain.needsUpdate = true;
    var deckMat = new THREE.MeshStandardMaterial({ map: hwyTexMain, roughness: 0.78 });

    var hwyTexRamp = T.get('highway').clone();
    hwyTexRamp.wrapS = THREE.RepeatWrapping;
    hwyTexRamp.wrapT = THREE.RepeatWrapping;
    hwyTexRamp.center.set(0.5, 0.5);
    hwyTexRamp.rotation = Math.PI / 2;
    hwyTexRamp.repeat.set(1, 3.5);
    hwyTexRamp.needsUpdate = true;
    var appMat = new THREE.MeshStandardMaterial({ map: hwyTexRamp, roughness: 0.78 });

    // 1. Curved/Smooth Approach Viaducts at Z = -120 and Z = +120 (X: 114 -> 168, Y: 0 -> 9.0)
    var approachZ = [-120, 120];
    var segs = 18;
    for (var a = 0; a < approachZ.length; a++) {
      var az = approachZ[a];
      var rampGeo = new THREE.PlaneGeometry(54, 16, segs, 1);
      rampGeo.rotateX(-Math.PI / 2);
      var pos = rampGeo.attributes.position;
      for (var v = 0; v < pos.count; v++) {
        var wx = 141 + pos.getX(v);
        pos.setY(v, smoothstep(114, 168, wx) * 9.0 + 0.04);
      }
      rampGeo.computeVertexNormals();
      var rampMesh = new THREE.Mesh(rampGeo, appMat);
      rampMesh.position.set(141, 0, az);
      rampMesh.castShadow = true;
      rampMesh.receiveShadow = true;
      parent.add(rampMesh);

      // Concrete support piers under viaduct
      var pierXs = [130, 146, 162];
      for (var px = 0; px < pierXs.length; px++) {
        var ph = smoothstep(114, 168, pierXs[px]) * 9.0;
        addBox(parent, 2.2, ph + 1.2, 12, pierXs[px], ph * 0.5 - 0.5, az, concretePierMat, null, true, true);
      }

      // Approach side guardrails (blocks vehicles from falling off viaduct sides)
      addCollider(118, 168, az - 8.6, az - 7.8, true, true, 0.5, 25);
      addCollider(118, 168, az + 7.8, az + 8.6, true, true, 0.5, 25);
      for (var s = 0; s < 6; s++) {
        var sx = 120 + s * 8.5;
        var sy = smoothstep(114, 168, sx) * 9.0 + 0.55;
        addBox(parent, 8.6, 0.9, 0.45, sx, sy, az - 8.1, redSteelMat, null, false, true);
        addBox(parent, 8.6, 0.9, 0.45, sx, sy, az + 8.1, redSteelMat, null, false, true);
      }
    }

    // 2. Main Elevated Suspension Deck: X = 176 (width 16), Z in [-128, 128], Y = 9.0
    var mainDeck = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.9, 256.4), darkSteelMat);
    mainDeck.position.set(176, 8.55, 0);
    mainDeck.castShadow = true;
    mainDeck.receiveShadow = true;
    parent.add(mainDeck);

    var roadSurface = new THREE.Mesh(new THREE.PlaneGeometry(16, 256), deckMat);
    roadSurface.rotation.x = -Math.PI / 2;
    roadSurface.position.set(176, 9.03, 0);
    roadSurface.receiveShadow = true;
    parent.add(roadSurface);

    // Bridge Outer Guardrails (East rail full length; West rail open at Z = ±120 junctions!)
    addBox(parent, 0.55, 1.2, 256.4, 184.2, 9.6, 0, redSteelMat, { blocksVehicles: true, blocksPedestrian: true, minY: 6, maxY: 32 }, true, true);
    addBox(parent, 0.55, 1.2, 222.0, 167.8, 9.6, 0, redSteelMat, { blocksVehicles: true, blocksPedestrian: true, minY: 6, maxY: 25 }, true, true);
    // End safety barriers at North/South ends of bridge
    addBox(parent, 16.8, 1.2, 0.6, 176, 9.6, -128.2, redSteelMat, { blocksVehicles: true, blocksPedestrian: true, minY: 6, maxY: 25 }, true, true);
    addBox(parent, 16.8, 1.2, 0.6, 176, 9.6,  128.2, redSteelMat, { blocksVehicles: true, blocksPedestrian: true, minY: 6, maxY: 25 }, true, true);

    // 3. Two Monumental 39m Red Steel Suspension Towers at Z = -56 and Z = +56
    var towerZs = [-56, 56];
    for (var tz = 0; tz < towerZs.length; tz++) {
      var zPos = towerZs[tz];
      // Massive concrete caissons in ocean
      addBox(parent, 22, 3.2, 7.5, 176, 1.0, zPos, concretePierMat, null, true, true);

      // Left & Right red steel tower legs straddling the highway deck
      addBox(parent, 2.4, 38, 2.8, 166.6, 20.5, zPos, redSteelMat, { blocksVehicles: true, blocksPedestrian: true }, true, true);
      addBox(parent, 2.4, 38, 2.8, 185.4, 20.5, zPos, redSteelMat, { blocksVehicles: true, blocksPedestrian: true }, true, true);

      // Horizontal Art-Deco crossbeams above roadway (plenty of clearance above Y=9 deck & stunt ramp!)
      addBox(parent, 21.2, 2.0, 2.4, 176, 24.5, zPos, redSteelMat, null, true, true);
      addBox(parent, 21.2, 2.0, 2.4, 176, 32.0, zPos, redSteelMat, null, true, true);
      addBox(parent, 21.6, 2.4, 2.8, 176, 38.6, zPos, redSteelMat, null, true, true);
      // Below-deck crossbeam
      addBox(parent, 20.0, 1.8, 2.2, 176, 5.2, zPos, redSteelMat, null, true, true);
    }

    // 4. Parabolic Main Suspension Cables & Vertical Suspender Wires
    var cableXs = [166.6, 185.4];
    function cableHeightAtZ(z) {
      var az = Math.abs(z);
      if (az <= 56) {
        // Center span parabola between towers (-56..56): 14.5m at center -> 39.2m at towers
        var u = z / 56;
        return 14.5 + u * u * 24.7;
      }
      // Side spans (56..128): 39.2m down to 10.2m at anchorages
      var s = (az - 56) / (128 - 56);
      return 39.2 - (2 * s - s * s * 0.65) * 21.0;
    }

    for (var cxIdx = 0; cxIdx < cableXs.length; cxIdx++) {
      var cx = cableXs[cxIdx];
      var zStep = 8;
      for (var cz = -128; cz < 128; cz += zStep) {
        var y1 = cableHeightAtZ(cz);
        var y2 = cableHeightAtZ(cz + zStep);
        var dy = y2 - y1;
        var segLen = Math.sqrt(zStep * zStep + dy * dy);
        var segMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, segLen + 0.15, 7), redSteelMat);
        segMesh.position.set(cx, (y1 + y2) * 0.5, cz + zStep * 0.5);
        segMesh.rotation.x = Math.PI / 2 - Math.atan2(dy, zStep);
        segMesh.castShadow = true;
        parent.add(segMesh);

        // Vertical steel suspender cables every 16u
        if (cz % 16 === 0 && Math.abs(cz) !== 56 && y1 > 10.5) {
          var vH = y1 - 9.2;
          var susp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, vH, 5), darkSteelMat);
          susp.position.set(cx, 9.2 + vH * 0.5, cz);
          parent.add(susp);
        }
      }
    }

    // 5. Driveable Sloped Red Steel Stunt Girder Ramp on East Lane (Reel Clip #2 homage!)
    // Rises from (X=182, Z=48, Y=9.0) up to (X=182, Z=-8, Y=20.6)
    var stuntLenZ = 56;
    var stuntRiseY = 11.6;
    var stuntHyp = Math.sqrt(stuntLenZ * stuntLenZ + stuntRiseY * stuntRiseY);
    var stuntPitch = Math.atan2(stuntRiseY, stuntLenZ);

    var stuntBeam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.55, stuntHyp), redSteelMat);
    stuntBeam.position.set(182.0, 9.0 + stuntRiseY * 0.5, 20.0);
    stuntBeam.rotation.x = stuntPitch; // +X rotation lifts -Z end higher!
    stuntBeam.castShadow = true;
    stuntBeam.receiveShadow = true;
    parent.add(stuntBeam);

    // Grippy metallic tread surface on stunt girder
    var treadTex = T.get('ramp');
    var stuntTop = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, stuntHyp),
      new THREE.MeshStandardMaterial({ map: treadTex, roughness: 0.55 })
    );
    stuntTop.position.set(182.0, 9.32 + stuntRiseY * 0.5, 20.0);
    stuntTop.rotation.x = -Math.PI / 2 + stuntPitch;
    parent.add(stuntTop);

    // Support struts under the stunt girder
    for (var stZ = 40; stZ >= -4; stZ -= 11) {
      var stFrac = (48 - stZ) / 56;
      var strutH = stFrac * stuntRiseY;
      if (strutH > 0.6) {
        addBox(parent, 3.2, strutH, 0.45, 182.0, 9.0 + strutH * 0.5, stZ, redSteelMat, null, true, true);
      }
    }

    // Bridge deck streetlights
    for (var blz = -104; blz <= 104; blz += 36) {
      addStreetLamp(168.4, blz, Math.PI / 2, 9.0);
    }
  }

  // ===========================================================================
  // Bone Canyon Desert Dunes, Red-Rock Mesas, Cacti & RV Camper Trailers
  // ===========================================================================
  function buildDesertZone(parent) {
    var T = window.GTC.Textures;

    // 3D Sculpted Desert Terrain Mesh: X in [-242, -131], Z in [-180, 180]
    var widthX = 111; // center at -186.5 -> [-242, -131]
    var depthZ = 360;
    var geo = new THREE.PlaneGeometry(widthX, depthZ, 48, 96);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var wx = -186.5 + pos.getX(i);
      var wz = pos.getZ(i);
      pos.setY(i, getDesertHeight(wx, wz));
    }
    geo.computeVertexNormals();

    var desertMesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        map: T.get('desert'),
        roughness: 0.95,
        metalness: 0.0
      })
    );
    desertMesh.position.set(-186.5, -0.02, 0);
    desertMesh.receiveShadow = true;
    parent.add(desertMesh);

    // Stratified Red-Rock Mesas / Buttes (like Bone County in GTA San Andreas!)
    var rockMat = new THREE.MeshStandardMaterial({ map: T.get('rock'), roughness: 0.92 });
    var mesas = [
      { x: -222, z: -115, w: 22, d: 28, h: 19 },
      { x: -218, z:   98, w: 24, d: 26, h: 22 },
      { x: -162, z: -135, w: 18, d: 20, h: 14 },
      { x: -166, z:  132, w: 20, d: 22, h: 16 }
    ];
    for (var m = 0; m < mesas.length; m++) {
      var ms = mesas[m];
      var baseH = getDesertHeight(ms.x, ms.z);
      addBox(parent, ms.w, ms.h, ms.d, ms.x, baseH + ms.h * 0.5 - 2, ms.z, rockMat, { blocksVehicles: true, blocksPedestrian: true }, true, true);
      addBox(parent, ms.w * 0.72, 4.5, ms.d * 0.72, ms.x, baseH + ms.h + 0.1, ms.z, rockMat, null, true, true);
    }

    // Vintage White & Grey RV Camper Trailers / Mobile Homes in Desert Camp (-182, 4) — exact Reel homage!
    function addCamperTrailer(x, z, rotY, bodyHex, stripeHex, isWideHome) {
      var by = getDesertHeight(x, z);
      var grp = new THREE.Group();
      grp.position.set(x, by, z);
      grp.rotation.y = rotY;

      var w = isWideHome ? 4.2 : 2.9;
      var h = isWideHome ? 2.8 : 2.5;
      var l = isWideHome ? 10.5 : 6.8;

      var wallM = new THREE.MeshStandardMaterial({ color: bodyHex, roughness: 0.65 });
      var roofM = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.75 });
      var trimM = new THREE.MeshStandardMaterial({ color: stripeHex, roughness: 0.55 });
      var winM = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.2 });

      var box = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), wallM);
      box.position.y = 0.45 + h * 0.5;
      box.castShadow = true;
      box.receiveShadow = true;
      grp.add(box);

      var roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.22, l + 0.3), roofM);
      roof.position.y = 0.45 + h + 0.1;
      roof.castShadow = true;
      grp.add(roof);

      var stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.32, l + 0.04), trimM);
      stripe.position.y = 1.25;
      grp.add(stripe);

      // Windows & AC unit on roof
      var win1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.75, 1.4), winM);
      win1.position.set(0, 2.05, -l * 0.22);
      grp.add(win1);
      var win2 = win1.clone();
      win2.position.z = l * 0.22;
      grp.add(win2);

      var ac = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 1.1), trimM);
      ac.position.set(0, 0.45 + h + 0.32, 0);
      grp.add(ac);

      parent.add(grp);
      var rad = isWideHome ? 3.5 : 2.8;
      addCollider(x - rad, x + rad, z - rad, z + rad, true, true);
    }

    addCamperTrailer(-192, -6, 0.12, 0xf8fafc, 0x94a3b8, false);
    addCamperTrailer(-174, -10, -0.25, 0xe2e8f0, 0x475569, false);
    addCamperTrailer(-182, 12, Math.PI * 0.5, 0xfafaf9, 0x78716c, true);

    // Wooden utility poles along desert trail (like Reel screenshot!)
    var woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.92 });
    var poleZs = [-65, -35, -5, 25, 55];
    for (var up = 0; up < poleZs.length; up++) {
      var px = -168;
      var pz = poleZs[up];
      var py = getDesertHeight(px, pz);
      var uPole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 7.8, 6), woodMat);
      uPole.position.set(px, py + 3.8, pz);
      uPole.castShadow = true;
      parent.add(uPole);
      var xBar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.14), woodMat);
      xBar.position.set(px, py + 7.3, pz);
      parent.add(xBar);
    }

    // Scatter Saguaro cacti across Bone Canyon dunes (clear of main camp & jump lines)
    var cactiCoords = [
      [-148, -62, 1.0], [-158, -95, 1.15], [-198, -74, 1.2], [-212, -42, 0.95],
      [-208,  15, 1.1], [-196,  48, 1.05], [-162,  68, 0.9], [-148,  26, 0.85],
      [-224, -12, 1.25], [-178, -88, 1.0], [-185,  82, 1.15], [-205, 138, 1.0]
    ];
    for (var cc = 0; cc < cactiCoords.length; cc++) {
      addCactus(cactiCoords[cc][0], cactiCoords[cc][1], cactiCoords[cc][2]);
    }
  }

  // ===========================================================================
  // Landmarks, Plazas, Districts, Ramps & Pedestrians
  // ===========================================================================
  function buildLandmarksAndPlazas(parent) {
    var T = window.GTC.Textures;

    // 1. OFICINA TURBO (Realistic Auto Body & Custom Garage) at (-32, 0)
    var shopGroup = new THREE.Group();
    var shopFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 13),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
    );
    shopFloor.rotation.x = -Math.PI / 2;
    shopFloor.position.set(-26, 0.06, 0);
    shopFloor.receiveShadow = true;
    shopGroup.add(shopFloor);

    var padMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.42 });
    var shopPad = new THREE.Mesh(new THREE.RingGeometry(5.5, 6.4, 32), padMat);
    shopPad.rotation.x = -Math.PI / 2;
    shopPad.position.set(-32, 0.08, 0);
    shopGroup.add(shopPad);

    var brickWallMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed ? 0x7c2d12 : 0x7c2d12, roughness: 0.8 });
    var steelRoofMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.45, roughness: 0.5 });
    addBox(shopGroup, 2.2, 6.6, 13.4, -19.5, 3.3, 0, brickWallMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(shopGroup, 12.2, 0.85, 13.6, -25, 6.6, 0, steelRoofMat, null);

    paintArchMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.55, roughness: 0.3 });
    addBox(shopGroup, 0.85, 6.3, 0.85, -30.5, 3.15, -6.2, paintArchMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(shopGroup, 0.85, 6.3, 0.85, -30.5, 3.15,  6.2, paintArchMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(shopGroup, 0.85, 0.85, 13.3, -30.5, 6.4, 0, paintArchMat, null);

    var shopSignTex = T.makeSignTexture('OFICINA TURBO', '#1e293b', '#f59e0b', '#fef08a');
    var shopSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 2.6, 11),
      new THREE.MeshBasicMaterial({ map: shopSignTex })
    );
    shopSign.position.set(-31, 7.8, 0);
    shopGroup.add(shopSign);
    parent.add(shopGroup);

    // 2. GARAGEM SECRETA at (-108, -72)
    var garMat = new THREE.MeshStandardMaterial({ color: 0x3f4a3c, roughness: 0.72 });
    var garTrim = new THREE.MeshStandardMaterial({ color: 0x16a34a, emissive: 0x15803d, emissiveIntensity: 0.4, roughness: 0.4 });

    addBox(parent, 3, 6.5, 14, -95.5, 3.25, -72, garMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 12, 0.8, 14, -101, 6.5, -72, garMat, null);
    addBox(parent, 0.8, 6.2, 0.8, -106.5, 3.1, -78.5, garTrim, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 0.8, 6.2, 0.8, -106.5, 3.1, -65.5, garTrim, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 0.8, 0.8, 13.8, -106.5, 6.3, -72, garTrim, null);

    var garSignTex = T.makeSignTexture('GARAGEM SECRETA', '#14532d', '#4ade80', '#f0fdf4');
    var garSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 2.4, 11),
      new THREE.MeshBasicMaterial({ map: garSignTex })
    );
    garSign.position.set(-107, 7.6, -72);
    parent.add(garSign);

    var garPad = new THREE.Mesh(
      new THREE.RingGeometry(5.5, 6.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.38 })
    );
    garPad.rotation.x = -Math.PI / 2;
    garPad.position.set(-108, 0.08, -72);
    parent.add(garPad);

    // 3. LABORATÓRIO TECH at (36, -108)
    var labMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.35 });
    var labAccent = new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.45, roughness: 0.3 });

    addBox(parent, 14, 11, 14, 21, 5.5, -103, labMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 14.4, 0.5, 14.4, 21, 11.2, -103, labAccent, null);
    addBox(parent, 10, 0.6, 10, 34, 6.4, -108, labMat, null);
    addBox(parent, 10.4, 0.35, 10.4, 34, 6.8, -108, labAccent, null);

    var labSignTex = T.makeSignTexture('LAB TECH', '#0f172a', '#38bdf8', '#f0f9ff');
    var labSign = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 2.3),
      new THREE.MeshBasicMaterial({ map: labSignTex, side: THREE.DoubleSide })
    );
    labSign.position.set(34, 8.1, -113.2);
    parent.add(labSign);

    var labPad = new THREE.Mesh(
      new THREE.RingGeometry(5.5, 6.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.38 })
    );
    labPad.rotation.x = -Math.PI / 2;
    labPad.position.set(36, 0.08, -108);
    parent.add(labPad);

    // 4. THREE PEDESTRIAN PLAZAS (Level 8)
    var plazaMat = new THREE.MeshStandardMaterial({ map: T.get('plaza'), roughness: 0.8 });
    var hedgeMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.9 });

    function addBollardRow(x1, z1, x2, z2, count) {
      for (var b = 0; b < count; b++) {
        var t = count === 1 ? 0.5 : b / (count - 1);
        bollardQueue.push({
          x: x1 + (x2 - x1) * t,
          z: z1 + (z2 - z1) * t
        });
      }
      addCollider(
        Math.min(x1, x2) - 0.6, Math.max(x1, x2) + 0.6,
        Math.min(z1, z2) - 0.6, Math.max(z1, z2) + 0.6,
        true, false
      );
    }

    // 4a. Praça Norte (0, -80)
    var pnFloor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), plazaMat);
    pnFloor.rotation.x = -Math.PI / 2;
    pnFloor.position.set(0, 0.16, -80);
    pnFloor.receiveShadow = true;
    parent.add(pnFloor);
    addBox(parent, 26, 1.6, 1.5, 0, 0.85, -93, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 1.5, 1.6, 26, -13, 0.85, -80, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 1.5, 1.6, 26, 13, 0.85, -80, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 6.5, 1.6, 1.5, -9.8, 0.85, -67, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 6.5, 1.6, 1.5, 9.8, 0.85, -67, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBollardRow(-5.2, -67, 5.2, -67, 5);

    // 4b. Praça Centro (74, 0)
    var pcFloor = new THREE.Mesh(new THREE.PlaneGeometry(24, 26), plazaMat);
    pcFloor.rotation.x = -Math.PI / 2;
    pcFloor.position.set(74, 0.16, 0);
    pcFloor.receiveShadow = true;
    parent.add(pcFloor);
    addBox(parent, 24, 1.6, 1.5, 74, 0.85, -13, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 24, 1.6, 1.5, 74, 0.85, 13, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 1.5, 1.6, 26, 86, 0.85, 0, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 1.5, 1.6, 6.5, 62, 0.85, -9.8, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 1.5, 1.6, 6.5, 62, 0.85, 9.8, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBollardRow(62, -5.2, 62, 5.2, 5);

    // 4c. Parque Central (-80, 0)
    var grassMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ map: T.get('grass'), roughness: 0.92 })
    );
    grassMesh.rotation.x = -Math.PI / 2;
    grassMesh.position.set(-80, 0.02, 0);
    grassMesh.receiveShadow = true;
    parent.add(grassMesh);

    var path1 = new THREE.Mesh(new THREE.PlaneGeometry(8, 60), plazaMat);
    path1.rotation.x = -Math.PI / 2;
    path1.position.set(-80, 0.04, 0);
    path1.receiveShadow = true;
    parent.add(path1);
    var path2 = new THREE.Mesh(new THREE.PlaneGeometry(60, 8), plazaMat);
    path2.rotation.x = -Math.PI / 2;
    path2.position.set(-80, 0.04, 0);
    path2.receiveShadow = true;
    parent.add(path2);

    var ppFloor = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), plazaMat);
    ppFloor.rotation.x = -Math.PI / 2;
    ppFloor.position.set(-80, 0.05, 0);
    ppFloor.receiveShadow = true;
    parent.add(ppFloor);

    var fBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.6, 1.2, 20),
      new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.65 })
    );
    fBase.position.set(-80, 0.6, 0);
    fBase.castShadow = true;
    fBase.receiveShadow = true;
    parent.add(fBase);
    addCollider(-83, -77, -3, 3, true, true);

    var fWater = new THREE.Mesh(
      new THREE.CylinderGeometry(2.7, 2.7, 0.4, 20),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.3 })
    );
    fWater.position.set(-80, 1.12, 0);
    parent.add(fWater);

    fountainRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.12, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.75 })
    );
    fountainRing.rotation.x = Math.PI / 2;
    fountainRing.position.set(-80, 1.35, 0);
    parent.add(fountainRing);

    addBox(parent, 5.5, 1.4, 1.4, -88.2, 0.7, -11, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 5.5, 1.4, 1.4, -71.8, 0.7, -11, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 5.5, 1.4, 1.4, -88.2, 0.7,  11, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBox(parent, 5.5, 1.4, 1.4, -71.8, 0.7,  11, hedgeMat, { blocksVehicles: true, blocksPedestrian: true });
    addBollardRow(-83.9, -11, -76.1, -11, 4);
    addBollardRow(-83.9,  11, -76.1,  11, 4);
    addBollardRow(-91, -3.9, -91, 3.9, 4);
    addBollardRow(-69, -3.9, -69, 3.9, 4);

    addSmallTree(parent, -102, -22);
    addSmallTree(parent, -102, 22);
    addSmallTree(parent, -58, -22);
    addSmallTree(parent, -102, 0);
    addSmallTree(parent, -58, 0);
  }

  function buildDistricts(parent) {
    var T = window.GTC.Textures;

    var buildings = [
      // Central Financial & Mid-Rise Block (-30..30, -30..30)
      { x: -4,  z: -16, w: 16, d: 16, h: 32, v: 0 },
      { x: 16,  z: -16, w: 16, d: 16, h: 46, v: 1 },
      { x: -4,  z:  16, w: 16, d: 16, h: 26, v: 2 },
      { x: 16,  z:  16, w: 16, d: 16, h: 38, v: 5 },

      // Northeast Downtown & Coastal Hotels (50..98, -110..-50)
      { x: 64,  z: -94, w: 18, d: 18, h: 48, v: 1 },
      { x: 86,  z: -94, w: 16, d: 18, h: 28, v: 3 },
      { x: 64,  z: -66, w: 18, d: 18, h: 36, v: 5 },
      { x: 86,  z: -66, w: 16, d: 18, h: 22, v: 0 },

      // Flanking Praça Norte
      { x: -21, z: -96, w: 12, d: 14, h: 24, v: 2 },
      { x: -21, z: -64, w: 12, d: 14, h: 20, v: 0 },

      // Coastal Mid-Rise Hotels North/South of Praça Centro (Los Santos tan stucco vibe!)
      { x: 74,  z: -23, w: 22, d: 9,  h: 26, v: 0 },
      { x: 74,  z:  23, w: 22, d: 9,  h: 24, v: 3 },

      // Northwest Brick & Concrete District (-110..-50, -110..-50)
      { x: -72, z: -94, w: 18, d: 18, h: 22, v: 2 },
      { x: -72, z: -64, w: 18, d: 16, h: 18, v: 4 },

      // Gateway buildings flanking entry into West Bone Canyon Desert (wide open roads between!)
      { x: -140, z: -84, w: 14, d: 20, h: 18, v: 0 },
      { x: -140, z:  84, w: 14, d: 20, h: 16, v: 2 },

      // North Perimeter Skyline
      { x: -80, z: -150, w: 24, d: 16, h: 24, v: 4 },
      { x:   0, z: -150, w: 26, d: 16, h: 38, v: 1 },
      { x:  74, z: -150, w: 24, d: 16, h: 28, v: 3 },

      // South Perimeter Skyline
      { x: -80, z: 150, w: 24, d: 16, h: 20, v: 2 },
      { x:   0, z: 150, w: 26, d: 16, h: 26, v: 0 },
      { x:  74, z: 150, w: 24, d: 16, h: 22, v: 3 }
    ];

    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      addBuilding(parent, b.x, b.z, b.w, b.d, b.h, b.v);
    }

    // Marina & Industrial Cargo Port
    var contTex = T.get('container');
    var contColors = [0xb91c1c, 0x1d4ed8, 0xd97706, 0x15803d, 0x475569, 0x9a3412];

    var containers = [
      { x: -96, z: 60,  w: 12, d: 4.5, h: 4.2, c: 0 },
      { x: -64, z: 60,  w: 12, d: 4.5, h: 4.2, c: 1 },
      { x: -96, z: 102, w: 12, d: 4.5, h: 4.2, c: 2 },
      { x: -64, z: 102, w: 12, d: 4.5, h: 4.2, c: 3 },
      { x: -14, z: 64,  w: 14, d: 5.0, h: 4.4, c: 4 },
      { x:  14, z: 64,  w: 14, d: 5.0, h: 4.4, c: 5 },
      { x: -14, z: 96,  w: 14, d: 5.0, h: 4.4, c: 1 },
      { x:  14, z: 96,  w: 14, d: 5.0, h: 4.4, c: 0 },
      { x: -14, z: 64,  w: 12, d: 4.6, h: 4.0, c: 2, yOff: 4.4 },
      { x:  64, z: 60,  w: 12, d: 4.5, h: 4.2, c: 3 },
      { x:  86, z: 60,  w: 12, d: 4.5, h: 4.2, c: 4 }
    ];

    for (var k = 0; k < containers.length; k++) {
      var ct = containers[k];
      var cMat = new THREE.MeshStandardMaterial({
        map: contTex,
        color: contColors[ct.c % contColors.length],
        roughness: 0.65,
        metalness: 0.25
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
      roughness: 0.55,
      metalness: 0.25
    });
    var sideMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7, metalness: 0.35 });
    var lipMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xd97706, emissiveIntensity: 0.35, roughness: 0.4 });

    for (var i = 0; i < RAMPS_DEF.length; i++) {
      var r = RAMPS_DEF[i];
      var baseY = r.x < -132 ? getDesertHeight(r.x, r.z) : 0;
      var group = new THREE.Group();
      group.position.set(r.x, baseY, r.z);
      group.rotation.y = Math.atan2(r.dirX, r.dirZ);

      var hw = r.width / 2;
      var hl = r.length / 2;
      var h = r.height;

      var slopeLen = Math.sqrt(r.length * r.length + h * h);
      var slopeAngle = Math.atan2(h, r.length);
      var deck = new THREE.Mesh(new THREE.PlaneGeometry(r.width, slopeLen), topMat);
      deck.position.set(0, h / 2 + 0.04, 0);
      deck.rotation.x = -Math.PI / 2 - slopeAngle;
      deck.rotation.z = Math.PI;
      deck.receiveShadow = true;
      group.add(deck);

      var shape = new THREE.Shape();
      shape.moveTo(-hl, -0.4);
      shape.lineTo(hl, -0.4);
      shape.lineTo(hl, h);
      shape.lineTo(-hl, 0);
      shape.closePath();

      var extrudeGeo = new THREE.ExtrudeGeometry(shape, { depth: r.width, bevelEnabled: false });
      extrudeGeo.translate(0, 0, -hw);
      var wedge = new THREE.Mesh(extrudeGeo, sideMat);
      wedge.rotation.y = -Math.PI / 2;
      wedge.castShadow = true;
      wedge.receiveShadow = true;
      group.add(wedge);

      var lip = new THREE.Mesh(new THREE.BoxGeometry(r.width + 0.16, 0.2, 0.26), lipMat);
      lip.position.set(0, h + 0.06, hl);
      group.add(lip);

      parent.add(group);
    }
  }

  function buildPedestrians(parent) {
    pedestrians = [];
    var shirtHexes = ['#f8fafc', '#2563eb', '#dc2626', '#16a34a', '#d97706', '#334155', '#0d9488', '#f3e8c8'];
    var shirtStyles = ['tee', 'jacket', 'tank', 'tee', 'jacket', 'tee', 'tank', 'tee'];
    var pantsHexes = ['#1e3a8a', '#334155', '#57534e', '#1f2937', '#a89f91'];
    var skinHexes  = ['#f3c69f', '#e0a97b', '#c68642', '#8d5524'];
    var hairHexes  = ['#1c1917', '#451a03', '#78350f', '#27272a', '#92400e'];
    var shoeHexes  = ['#f8fafc', '#1e293b', '#dc2626', '#e2e8f0'];

    for (var i = 0; i < 28; i++) {
      var alongNS = i % 2 === 0;
      var roadIdx = Math.floor(i / 2) % 4;
      var sideSign = (i % 4 < 2) ? 1 : -1;
      var x, z, dirX, dirZ;

      if (alongNS) {
        x = ROAD_X[roadIdx] + sideSign * 9.6;
        z = -110 + ((i * 37) % 220);
        dirX = 0;
        dirZ = (i % 3 === 0) ? 1 : -1;
      } else {
        x = -110 + ((i * 41) % 210);
        z = ROAD_Z[roadIdx] + sideSign * 9.6;
        dirX = (i % 3 === 0) ? 1 : -1;
        dirZ = 0;
      }

      var human = window.GTC.Human ? window.GTC.Human.create({
        skinHex: skinHexes[i % skinHexes.length],
        hairHex: hairHexes[i % hairHexes.length],
        shirtHex: shirtHexes[i % shirtHexes.length],
        shirtStyle: shirtStyles[i % shirtStyles.length],
        pantsHex: pantsHexes[i % pantsHexes.length],
        shoeHex: shoeHexes[i % shoeHexes.length],
        fullHair: (i % 3 === 1),
        wearsShorts: (i % 5 === 2),
        capHex: (i % 6 === 0) ? 0x1e293b : null,
        hasShades: (i % 4 === 0),
        scale: 0.96 + (i % 3) * 0.03,
        castShadow: true
      }) : { root: new THREE.Group() };

      human.root.position.set(x, 0.14, z);
      parent.add(human.root);

      pedestrians.push({
        mesh: human.root,
        human: human,
        x: x,
        z: z,
        dirX: dirX,
        dirZ: dirZ,
        speed: 2.3 + (i % 4) * 0.35,
        phase: i * 1.1,
        jumpTimer: 0,
        dodgeVx: 0,
        dodgeVz: 0
      });
    }
  }

  // ===========================================================================
  // Lighting, 360° Sky Dome, Sun Shadows & Procedural PMREM Reflections
  // ===========================================================================
  function buildLightsAndSky(scene) {
    hemiLight = new THREE.HemisphereLight(0xfed7aa, 0x334155, 0.68);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xffb469, 1.35);
    dirLight.position.copy(dirLightOffset);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 12;
    dirLight.shadow.camera.far = 260;
    var d = 92;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0006;
    scene.add(dirLight);
    scene.add(dirLight.target);

    // 360° Panoramic Sky Dome
    skyDomeMat = new THREE.MeshBasicMaterial({
      map: window.GTC.Textures.get('sky_sunset'),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false
    });
    skyDome = new THREE.Mesh(new THREE.SphereGeometry(395, 32, 20), skyDomeMat);
    skyDome.renderOrder = -10;
    scene.add(skyDome);

    // Realistic warm sun disc & atmospheric corona halo over the eastern bay
    sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(18, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false, depthWrite: false })
    );
    sunDisc.position.set(325, 68, -55);
    sunDisc.lookAt(0, 12, 0);
    scene.add(sunDisc);

    sunHalo = new THREE.Mesh(
      new THREE.PlaneGeometry(115, 115),
      new THREE.MeshBasicMaterial({
        map: window.GTC.Textures.get('puff'),
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.55,
        fog: false,
        depthWrite: false
      })
    );
    sunHalo.position.set(322, 68, -55);
    sunHalo.lookAt(0, 12, 0);
    scene.add(sunHalo);
  }

  function initEnvironment(renderer) {
    rendererRef = renderer;
    if (!renderer || !THREE.PMREMGenerator) return;
    try {
      var pmrem = new THREE.PMREMGenerator(renderer);
      if (pmrem.compileEquirectangularShader) pmrem.compileEquirectangularShader();
      var modes = ['sunset', 'day', 'night'];
      for (var i = 0; i < modes.length; i++) {
        var m = modes[i];
        var skyTex = window.GTC.Textures.get('sky_' + m);
        if (skyTex) {
          envMaps[m] = pmrem.fromEquirectangular(skyTex).texture;
        }
      }
      pmrem.dispose();
      if (sceneRef && envMaps[currentTimeOfDay]) {
        sceneRef.environment = envMaps[currentTimeOfDay];
      }
    } catch (e) {
      // Fallback gracefully if WebGL driver lacks PMREM support
    }
  }

  function updateShadowTarget(px, pz) {
    if (!dirLight) return;
    // Snap shadow target to 2-unit grid to avoid shadow-edge swimming
    var sx = Math.round(px * 0.5) * 2;
    var sz = Math.round(pz * 0.5) * 2;
    dirLight.target.position.set(sx, 0, sz);
    dirLight.position.set(sx + dirLightOffset.x, dirLightOffset.y, sz + dirLightOffset.z);
    if (skyDome) {
      skyDome.position.set(px, 0, pz);
    }
  }

  function setTimeOfDay(mode) {
    if (!sceneRef) return;
    currentTimeOfDay = mode || 'sunset';

    var emissiveVal = 0.45;
    if (currentTimeOfDay === 'day') {
      // Bright sunny Los Santos / Santa Monica daylight
      sceneRef.background = new THREE.Color(0x8ecae6);
      sceneRef.fog = new THREE.FogExp2(0xcbe4f5, 0.0021);
      dirLightOffset.set(75, 138, -45);
      if (dirLight) { dirLight.color.setHex(0xfffbeb); dirLight.intensity = 1.48; }
      if (hemiLight) { hemiLight.color.setHex(0xdbeafe); hemiLight.groundColor.setHex(0x57534e); hemiLight.intensity = 0.78; }
      if (skyDomeMat) { skyDomeMat.map = window.GTC.Textures.get('sky_day'); skyDomeMat.needsUpdate = true; }
      if (sunDisc) { sunDisc.material.color.setHex(0xffffff); sunDisc.position.set(280, 145, -65); sunDisc.lookAt(0, 0, 0); }
      if (sunHalo) { sunHalo.material.color.setHex(0xfef3c7); sunHalo.material.opacity = 0.35; sunHalo.position.set(278, 145, -65); sunHalo.lookAt(0, 0, 0); }
      if (streetLampBulbMat) streetLampBulbMat.color.setHex(0x94a3b8);
      emissiveVal = 0.08;
    } else if (currentTimeOfDay === 'night') {
      // Realistic urban night with warm window & streetlight illumination
      sceneRef.background = new THREE.Color(0x070d1a);
      sceneRef.fog = new THREE.FogExp2(0x0f172a, 0.0032);
      dirLightOffset.set(65, 115, -50);
      if (dirLight) { dirLight.color.setHex(0x93c5fd); dirLight.intensity = 0.52; }
      if (hemiLight) { hemiLight.color.setHex(0x1e293b); hemiLight.groundColor.setHex(0x090d16); hemiLight.intensity = 0.48; }
      if (skyDomeMat) { skyDomeMat.map = window.GTC.Textures.get('sky_night'); skyDomeMat.needsUpdate = true; }
      if (sunDisc) { sunDisc.material.color.setHex(0xe2e8f0); sunDisc.position.set(290, 115, -70); sunDisc.lookAt(0, 0, 0); }
      if (sunHalo) { sunHalo.material.color.setHex(0x60a5fa); sunHalo.material.opacity = 0.22; sunHalo.position.set(288, 115, -70); sunHalo.lookAt(0, 0, 0); }
      if (streetLampBulbMat) streetLampBulbMat.color.setHex(0xfef08a);
      emissiveVal = 1.05;
    } else {
      // Classic GTA San Andreas Golden-Amber California Sunset Smog/Glow!
      sceneRef.background = new THREE.Color(0xd98a4e);
      sceneRef.fog = new THREE.FogExp2(0xd68c54, 0.0026);
      dirLightOffset.set(105, 72, -48);
      if (dirLight) { dirLight.color.setHex(0xffa952); dirLight.intensity = 1.38; }
      if (hemiLight) { hemiLight.color.setHex(0xfed7aa); hemiLight.groundColor.setHex(0x443835); hemiLight.intensity = 0.72; }
      if (skyDomeMat) { skyDomeMat.map = window.GTC.Textures.get('sky_sunset'); skyDomeMat.needsUpdate = true; }
      if (sunDisc) { sunDisc.material.color.setHex(0xfff0b3); sunDisc.position.set(325, 62, -55); sunDisc.lookAt(0, 10, 0); }
      if (sunHalo) { sunHalo.material.color.setHex(0xf97316); sunHalo.material.opacity = 0.62; sunHalo.position.set(322, 62, -55); sunHalo.lookAt(0, 10, 0); }
      if (streetLampBulbMat) streetLampBulbMat.color.setHex(0xfde68a);
      emissiveVal = 0.55;
    }

    if (envMaps[currentTimeOfDay]) {
      sceneRef.environment = envMaps[currentTimeOfDay];
    }

    for (var i = 0; i < buildingMats.length; i++) {
      buildingMats[i].emissiveIntensity = emissiveVal;
    }
  }

  function isBlockedForPed(x, z) {
    if (x < -130 || x > 146 || z < -140 || z > 140) {
      return true;
    }
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      if (!c.blocksPedestrian) continue;
      if (c.minY > 2) continue;
      if (x > c.minX - 0.5 && x < c.maxX + 0.5 && z > c.minZ - 0.5 && z < c.maxZ + 0.5) {
        return true;
      }
    }
    return false;
  }

  function computeAwayFromRoadDir(px, pz) {
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

  function build(scene) {
    sceneRef = scene;
    colliders.length = 0;
    buildingMats.length = 0;
    palmQueue.length = 0;
    bollardQueue.length = 0;
    streetLampQueue.length = 0;
    cactusQueue.length = 0;

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
    buildSuspensionBridge(cityGroup);
    buildDesertZone(cityGroup);
    buildLandmarksAndPlazas(cityGroup);
    buildDistricts(cityGroup);
    buildRamps(cityGroup);
    flushInstancedProps(cityGroup);
    buildPedestrians(cityGroup);

    setTimeOfDay('sunset');
    return cityGroup;
  }

  function update(dt, time, vehicles) {
    if (waterTex) {
      waterTex.offset.y = (time * 0.045) % 1;
      waterTex.offset.x = Math.sin(time * 0.35) * 0.03;
    }

    if (paintArchMat) {
      var glow = 0.45 + Math.sin(time * 3.2) * 0.2;
      paintArchMat.emissiveIntensity = glow;
    }

    if (fountainRing) {
      var pulse = 1 + Math.sin(time * 2.8) * 0.06;
      fountainRing.scale.set(pulse, pulse, 1);
    }

    // Safe friendly pedestrians (100% invincible — jump away & wave!)
    var vList = vehicles || [];
    for (var i = 0; i < pedestrians.length; i++) {
      var p = pedestrians[i];

      if (p.jumpTimer <= 0) {
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
        var jumpY = 0.14 + Math.sin(prog * Math.PI) * 1.05;

        var nx = p.x + p.dodgeVx * dt;
        var nz = p.z + p.dodgeVz * dt;
        if (!isBlockedForPed(nx, nz)) {
          p.x = nx;
          p.z = nz;
        }
        p.mesh.position.set(p.x, jumpY, p.z);
        if (window.GTC.Human && p.human) {
          window.GTC.Human.animateLocomotion(p.human, { isDodging: true, time: time });
        }
      } else {
        var stepX = p.x + p.dirX * p.speed * dt;
        var stepZ = p.z + p.dirZ * p.speed * dt;
        if (stepX < -128 || stepX > 118 || stepZ < -135 || stepZ > 135 || isBlockedForPed(stepX, stepZ)) {
          p.dirX = -p.dirX;
          p.dirZ = -p.dirZ;
        } else {
          p.x = stepX;
          p.z = stepZ;
        }

        p.phase += dt * p.speed * 2.5;
        if (window.GTC.Human && p.human) {
          window.GTC.Human.animateLocomotion(p.human, {
            phase: p.phase,
            speedNorm: 0.48,
            time: time
          });
        }

        p.mesh.position.set(p.x, 0.14, p.z);
        p.mesh.rotation.y = Math.atan2(p.dirX, p.dirZ);
      }
    }
  }

  function findNearestRoadPoint(x, z) {
    var bestDistSq = Infinity;
    var best = { x: -40, z: 0, angle: Math.PI };

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
    initEnvironment: initEnvironment,
    updateShadowTarget: updateShadowTarget,
    setTimeOfDay: setTimeOfDay,
    update: update,
    findNearestRoadPoint: findNearestRoadPoint,
    getGroundHeight: getGroundHeight,
    getBridgeElevation: getBridgeElevation,
    isOnSand: isOnSand,
    isInDeepWater: isInDeepWater
  };
})();
