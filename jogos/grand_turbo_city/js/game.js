(function () {
    'use strict';

    window.GTC = window.GTC || {};

    var SAVE_KEY = 'gtc_vice_neon_save_v1';
    var DEFAULT_SAVE = {
        unlockedLevel: 1,
        unlockAll: false,
        starsByLevel: {},
        customization: {
            vehicleId: 'coupe',
            color: '#ec4899',
            underglow: '#22d3ee'
        },
        timeOfDay: 'sunset',
        radioStation: 0,
        muted: false,
        cameraMode: 0
    };

    var RADIO_NAMES = ['📻 Vice Synthwave', '📻 Pop Arcade', '🔇 Silêncio'];
    var TIME_MODES = ['sunset', 'day', 'night'];
    var TIME_ICONS = { sunset: '🌅', day: '☀️', night: '🌙' };
    var CAM_NAMES = ['3.ª Pessoa Perto', '3.ª Pessoa Longe', 'Vista Aérea Clássica'];

    // =========================================================================
    // Estado Global do Jogo
    // =========================================================================
    var save = loadSave();
    var gameState = 'MENU'; // MENU | LEVEL_SELECT | GARAGE | BRIEFING | PLAYING | PAUSED | VICTORY | CAMPAIGN_COMPLETE | FAILED
    var previousStateBeforeGarage = 'MENU';
    var selectedBriefingLevel = 1;
    var currentPlayMode = 'free'; // 'free' | 'level'
    var currentLevelId = 1;

    var scene, camera, renderer;
    var clockLast = 0;
    var elapsedTime = 0;
    var vehicles = [];
    var cones = [];
    var nitroPickups = [];
    var particles = [];
    var dirArrow = null;
    var garagePreviewVehicle = null;
    var freeRoamRepairTimer = 0;
    var toastTimer = 0;
    var boundaryToastCooldown = 0;
    var audioUnlocked = false;
    var lastPhysicsEvents = {};
    var wasNitroActive = false;

    // Personagem a pé
    var player = {
        inVehicle: false,
        vehicle: null,
        x: -40,
        y: 0,
        z: 16,
        vy: 0,
        angle: Math.PI,
        speed: 0,
        isGrounded: true,
        waveTimer: 0,
        walkCycle: 0,
        mesh: null,
        parts: null
    };

    // Input (Teclado + Tátil)
    var keys = {};
    var touchMode = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    var touchManualOverride = null; // null = auto, true = on, false = off
    var joy = { active: false, pointerId: null, x: 0, y: 0 };
    var touchBtns = { nitro: false, drift: false };

    // Referências DOM (cache)
    var dom = {};

    // =========================================================================
    // Persistência localStorage (SPEC §8)
    // =========================================================================
    function loadSave() {
        var merged = JSON.parse(JSON.stringify(DEFAULT_SAVE));
        try {
            var raw = window.localStorage.getItem(SAVE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    if (typeof parsed.unlockedLevel === 'number') merged.unlockedLevel = Math.max(1, Math.min(11, parsed.unlockedLevel));
                    if (typeof parsed.unlockAll === 'boolean') merged.unlockAll = parsed.unlockAll;
                    if (parsed.starsByLevel && typeof parsed.starsByLevel === 'object') merged.starsByLevel = parsed.starsByLevel;
                    if (parsed.customization && typeof parsed.customization === 'object') {
                        if (parsed.customization.vehicleId) merged.customization.vehicleId = parsed.customization.vehicleId;
                        if (parsed.customization.color) merged.customization.color = parsed.customization.color;
                        if (parsed.customization.underglow !== undefined) merged.customization.underglow = parsed.customization.underglow;
                    }
                    if (TIME_MODES.indexOf(parsed.timeOfDay) !== -1) merged.timeOfDay = parsed.timeOfDay;
                    if (typeof parsed.radioStation === 'number') merged.radioStation = parsed.radioStation % 3;
                    if (typeof parsed.muted === 'boolean') merged.muted = parsed.muted;
                    if (typeof parsed.cameraMode === 'number') merged.cameraMode = parsed.cameraMode % 3;
                }
            }
        } catch (e) {
            // localStorage indisponível ou corrompido -> usa default
        }
        enforceUnlockConstraints(merged);
        return merged;
    }

    function persistSave() {
        try {
            window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
        } catch (e) {
            // ignora erros de quota/modo privado
        }
    }

    function isGoldUnlocked() {
        return save.unlockedLevel >= 11 || save.unlockAll === true;
    }

    function enforceUnlockConstraints(s) {
        if (s.unlockedLevel < 11 && !s.unlockAll) {
            if (s.customization.vehicleId === 'gold_supercar') {
                s.customization.vehicleId = 'coupe';
            }
            if (s.customization.color && s.customization.color.toLowerCase() === '#fbbf24') {
                s.customization.color = '#ec4899';
            }
        }
    }

    // =========================================================================
    // Personagem a Pé 3D Cartoon (Invencível)
    // =========================================================================
    function createPlayerMesh() {
        var group = new THREE.Group();

        var legGeo = new THREE.BoxGeometry(0.24, 0.72, 0.24);
        var legMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 });
        var legL = new THREE.Mesh(legGeo, legMat);
        legL.position.set(-0.18, 0.36, 0);
        var legR = new THREE.Mesh(legGeo, legMat);
        legR.position.set(0.18, 0.36, 0);
        group.add(legL, legR);

        var torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.64, 0.75, 0.36),
            new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.45 })
        );
        torso.position.y = 1.08;
        group.add(torso);

        var armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
        var armMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.5 });
        var armL = new THREE.Mesh(armGeo, armMat);
        armL.position.set(-0.44, 1.08, 0);
        var armR = new THREE.Mesh(armGeo, armMat);
        armR.position.set(0.44, 1.08, 0);
        group.add(armL, armR);

        var head = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 14, 12),
            new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6 })
        );
        head.position.y = 1.72;
        group.add(head);

        // Óculos de sol Vice Neon (+Z é a frente do avatar)
        var glasses = new THREE.Mesh(
            new THREE.BoxGeometry(0.46, 0.14, 0.12),
            new THREE.MeshBasicMaterial({ color: 0x0f172a })
        );
        glasses.position.set(0, 1.74, 0.27);
        group.add(glasses);

        var cap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.33, 0.34, 0.16, 12),
            new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.4 })
        );
        cap.position.y = 1.98;
        group.add(cap);

        group.visible = false;
        scene.add(group);
        player.mesh = group;
        player.parts = { legL: legL, legR: legR, armL: armL, armR: armR };
    }

    // =========================================================================
    // Seta 3D Direcional de Objetivo
    // =========================================================================
    function createDirectionArrow() {
        var group = new THREE.Group();
        var mat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
        var cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.7, 6), mat);
        cone.rotation.x = Math.PI / 2;
        cone.position.z = 0.85;
        group.add(cone);

        var shaft = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 1.2), new THREE.MeshBasicMaterial({ color: 0xec4899 }));
        shaft.position.z = -0.35;
        group.add(shaft);

        group.visible = false;
        scene.add(group);
        dirArrow = group;
    }

    // =========================================================================
    // Pickups de Nitro (8 raios néon giratórios, respawn 12s, +45 Nitro)
    // =========================================================================
    function createNitroPickups() {
        var spawns = (GTC.City && GTC.City.nitroSpawns) ? GTC.City.nitroSpawns : [
            { x: -40, z: -40 }, { x: 40, z: -40 }, { x: 108, z: -40 }, { x: -120, z: 40 },
            { x: -40, z: 40 }, { x: 40, z: 40 }, { x: 108, z: 40 }, { x: 0, z: 120 }
        ];
        var boltMat = new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            emissive: 0xec4899,
            emissiveIntensity: 0.7,
            roughness: 0.2
        });
        var ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide, transparent: true, opacity: 0.55 });

        for (var i = 0; i < spawns.length; i++) {
            var s = spawns[i];
            var g = new THREE.Group();
            var octa = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), boltMat);
            octa.scale.set(0.65, 1.35, 0.65);
            octa.position.y = 1.4;
            g.add(octa);

            var ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 20), ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.12;
            g.add(ring);

            g.position.set(s.x, 0, s.z);
            scene.add(g);
            nitroPickups.push({ x: s.x, z: s.z, active: true, respawnTimer: 0, mesh: g });
        }
    }

    function updateNitroPickups(dt) {
        for (var i = 0; i < nitroPickups.length; i++) {
            var p = nitroPickups[i];
            if (!p.active) {
                p.respawnTimer -= dt;
                if (p.respawnTimer <= 0) {
                    p.active = true;
                    p.mesh.visible = true;
                }
                continue;
            }
            p.mesh.rotation.y += dt * 2.4;
            p.mesh.children[0].position.y = 1.35 + Math.sin(elapsedTime * 3.5 + i) * 0.25;

            if (player.inVehicle && player.vehicle) {
                var dx = player.vehicle.x - p.x;
                var dz = player.vehicle.z - p.z;
                if (dx * dx + dz * dz <= 3.0 * 3.0) {
                    player.vehicle.nitro = Math.min(100, (player.vehicle.nitro || 0) + 45);
                    p.active = false;
                    p.respawnTimer = 12.0;
                    p.mesh.visible = false;
                    if (GTC.Audio) GTC.Audio.playSfx('pickup');
                    spawnParticles('sparks', p.x, 1.3, p.z, 12, '#22d3ee');
                }
            }
        }
    }

    // =========================================================================
    // Sistema de Partículas 3D (Chamas Nitro, Faíscas, Confettis)
    // =========================================================================
    var particleGeo = null;

    function spawnParticles(type, x, y, z, count, colorHex) {
        if (!particleGeo) particleGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
        var n = Math.min(count || 8, 40);
        for (var i = 0; i < n; i++) {
            if (particles.length > 140) break;
            var col = colorHex || (type === 'nitro' ? 0x22d3ee : (type === 'sparks' ? 0xfacc15 : 0xec4899));
            if (type === 'confetti') {
                var palette = [0xec4899, 0x22d3ee, 0xfacc15, 0x84cc16, 0xa855f7];
                col = palette[i % palette.length];
            }
            var mesh = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({ color: col }));
            mesh.position.set(x, y, z);
            scene.add(mesh);

            var spread = type === 'nitro' ? 2.5 : (type === 'confetti' ? 9 : 7);
            particles.push({
                mesh: mesh,
                vx: (Math.random() - 0.5) * spread,
                vy: (type === 'nitro' ? 1.2 : 4.5) + Math.random() * 4.5,
                vz: (Math.random() - 0.5) * spread,
                life: type === 'nitro' ? 0.28 : (type === 'confetti' ? 1.15 : 0.45),
                maxLife: type === 'nitro' ? 0.28 : (type === 'confetti' ? 1.15 : 0.45),
                gravity: type === 'nitro' ? 0 : 16
            });
        }
    }

    function updateParticles(dt) {
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
                p.mesh.material.dispose();
                particles.splice(i, 1);
                continue;
            }
            p.vy -= p.gravity * dt;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y = Math.max(0.1, p.mesh.position.y + p.vy * dt);
            p.mesh.position.z += p.vz * dt;
            p.mesh.rotation.x += dt * 6;
            p.mesh.rotation.y += dt * 5;
            var s = Math.max(0.05, p.life / p.maxLife);
            p.mesh.scale.set(s, s, s);
        }
    }

    function spawnCssConfetti() {
        var colors = ['#ec4899', '#22d3ee', '#facc15', '#84cc16', '#a855f7', '#fb923c'];
        for (var i = 0; i < 36; i++) {
            var el = document.createElement('div');
            el.className = 'confetti-piece';
            el.style.left = (Math.random() * 100) + 'vw';
            el.style.background = colors[i % colors.length];
            el.style.animationDelay = (Math.random() * 0.7) + 's';
            document.body.appendChild(el);
            setTimeout((function (node) {
                return function () { if (node.parentNode) node.parentNode.removeChild(node); };
            })(el), 3600);
        }
    }

    // =========================================================================
    // Gestão de Veículos no Mundo
    // =========================================================================
    function clearAllVehicles() {
        for (var i = 0; i < vehicles.length; i++) {
            if (vehicles[i] && vehicles[i].mesh && vehicles[i].mesh.parent) {
                vehicles[i].mesh.parent.remove(vehicles[i].mesh);
            }
        }
        vehicles.length = 0;
        player.inVehicle = false;
        player.vehicle = null;
    }

    function spawnVehicle(typeId, opts) {
        var o = Object.assign({ scene: scene }, opts || {});
        var v = GTC.Vehicles.createVehicle(typeId, o);
        if (v && v.mesh && !v.mesh.parent) {
            scene.add(v.mesh);
        }
        vehicles.push(v);
        return v;
    }

    function removeVehicle(v) {
        if (!v) return;
        if (v.mesh && v.mesh.parent) v.mesh.parent.remove(v.mesh);
        var idx = vehicles.indexOf(v);
        if (idx !== -1) vehicles.splice(idx, 1);
        if (player.vehicle === v) {
            player.vehicle = null;
            player.inVehicle = false;
        }
    }

    function setPlayerInVehicle(v) {
        if (player.vehicle && player.vehicle !== v && player.vehicle.driverMesh) {
            player.vehicle.driverMesh.visible = false;
        }
        player.inVehicle = true;
        player.vehicle = v;
        v.isAI = false;
        if (v.driverMesh) v.driverMesh.visible = true;
        player.x = v.x;
        player.y = v.y;
        player.z = v.z;
        player.angle = v.angle;
        if (player.mesh) player.mesh.visible = false;
        updateTouchButtonLabels();
    }

    function setPlayerOnFoot(x, z, angle) {
        if (player.vehicle && player.vehicle.driverMesh) {
            player.vehicle.driverMesh.visible = false;
        }
        player.inVehicle = false;
        player.vehicle = null;
        player.x = x;
        player.y = 0;
        player.z = z;
        player.vy = 0;
        player.isGrounded = true;
        player.angle = angle !== undefined ? angle : Math.PI;
        if (player.mesh) {
            player.mesh.visible = true;
            player.mesh.position.set(x, 0, z);
            player.mesh.rotation.y = player.angle;
        }
        updateTouchButtonLabels();
    }

    function isPointBlockedForPedestrian(x, z, radius) {
        var r = radius || 0.65;
        var b = GTC.City.BOUNDS;
        if (x < b.minX + r || x > b.maxX - r || z < b.minZ + r || z > b.maxZ - r) return true;
        var cols = GTC.City.colliders || [];
        for (var i = 0; i < cols.length; i++) {
            var c = cols[i];
            if (c.blocksPedestrian === false) continue;
            if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
                return true;
            }
        }
        return false;
    }

    function findNearestEnterableVehicle(maxDist) {
        var best = null;
        var bestD = maxDist || 5.5;
        for (var i = 0; i < vehicles.length; i++) {
            var v = vehicles[i];
            if (!v) continue;
            if (v.isBoss || v.aiRole === 'police' || v.aiRole === 'rival' || v.aiRole === 'fugitive' || v.aiRole === 'boss') continue;
            var dx = v.x - player.x;
            var dz = v.z - player.z;
            var d = Math.sqrt(dx * dx + dz * dz);
            if (d <= bestD) {
                bestD = d;
                best = v;
            }
        }
        return best;
    }

    function toggleEnterExitVehicle() {
        if (gameState !== 'PLAYING') return;
        if (player.inVehicle && player.vehicle) {
            var v = player.vehicle;
            v.speed = 0;
            var dist = (v.spec ? v.spec.radius : 2.1) + 1.4;
            var fx = Math.sin(v.angle);
            var fz = Math.cos(v.angle);
            var rx = fz;
            var rz = -fx;
            // Testa 4 posições: esquerda, direita, trás, frente (SPEC §4.4)
            var candidates = [
                { x: v.x - rx * dist, z: v.z - rz * dist },
                { x: v.x + rx * dist, z: v.z + rz * dist },
                { x: v.x - fx * dist, z: v.z - fz * dist },
                { x: v.x + fx * dist, z: v.z + fz * dist }
            ];
            var chosen = null;
            for (var i = 0; i < candidates.length; i++) {
                if (!isPointBlockedForPedestrian(candidates[i].x, candidates[i].z, 0.7)) {
                    chosen = candidates[i];
                    break;
                }
            }
            if (!chosen) {
                chosen = GTC.City.findNearestRoadPoint(v.x, v.z);
            }
            setPlayerOnFoot(chosen.x, chosen.z, v.angle);
        } else {
            var target = findNearestEnterableVehicle(5.5);
            if (target) {
                setPlayerInVehicle(target);
                if (GTC.Audio) GTC.Audio.playSfx('pickup');
            }
        }
    }

    function recoverToNearestRoad() {
        if (gameState !== 'PLAYING' && gameState !== 'PAUSED') return;
        var pt = GTC.City.findNearestRoadPoint(player.x, player.z);
        if (player.inVehicle && player.vehicle) {
            player.vehicle.x = pt.x;
            player.vehicle.y = 0.2;
            player.vehicle.z = pt.z;
            player.vehicle.vy = 0;
            player.vehicle.speed = 0;
            player.vehicle.angle = pt.angle !== undefined ? pt.angle : Math.PI;
        } else {
            player.x = pt.x;
            player.y = 0;
            player.z = pt.z;
            player.vy = 0;
        }
        showToast('🔄 Reposto na estrada mais próxima!', 1.8);
    }

    // =========================================================================
    // Física da Personagem a Pé (SPEC §4.4)
    // =========================================================================
    function updateOnFoot(dt) {
        var inX = 0;
        var inY = 0;
        if (keys['KeyW'] || keys['ArrowUp']) inY -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) inY += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) inX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) inX += 1;

        if (joy.active && (Math.abs(joy.x) > 0.1 || Math.abs(joy.y) > 0.1)) {
            inX = joy.x;
            inY = joy.y;
        }

        var len = Math.sqrt(inX * inX + inY * inY);
        var moveX = 0;
        var moveZ = 0;

        if (len > 0.08) {
            var nx = inX / Math.max(1, len);
            var ny = inY / Math.max(1, len);

            if (save.cameraMode === 2) {
                // Vista Aérea Clássica: fixo a Norte
                moveX = nx;
                moveZ = ny;
            } else {
                // 3.ª Pessoa: relativo à orientação horizontal da câmara
                var camFwd = new THREE.Vector3();
                camera.getWorldDirection(camFwd);
                camFwd.y = 0;
                if (camFwd.lengthSq() < 0.0001) camFwd.set(0, 0, -1);
                camFwd.normalize();
                var camRight = new THREE.Vector3(-camFwd.z, 0, camFwd.x);
                // ny < 0 = frente, ny > 0 = trás
                moveX = camRight.x * nx - camFwd.x * ny;
                moveZ = camRight.z * nx - camFwd.z * ny;
            }

            var isRunning = !!(keys['ShiftLeft'] || keys['ShiftRight'] || touchBtns.nitro);
            var spd = isRunning ? 17 : 11;
            player.speed = spd * Math.min(1, len);

            var dx = moveX * player.speed * dt;
            var dz = moveZ * player.speed * dt;

            // Resolução separada X depois Z
            if (!isPointBlockedForPedestrian(player.x + dx, player.z, 0.65)) {
                player.x += dx;
            }
            if (!isPointBlockedForPedestrian(player.x, player.z + dz, 0.65)) {
                player.z += dz;
            }

            // Clamp limites de Vice Neon
            var b = GTC.City.BOUNDS;
            var hitBound = false;
            if (player.x < b.minX + 0.7) { player.x = b.minX + 0.7; hitBound = true; }
            if (player.x > b.maxX - 0.7) { player.x = b.maxX - 0.7; hitBound = true; }
            if (player.z < b.minZ + 0.7) { player.z = b.minZ + 0.7; hitBound = true; }
            if (player.z > b.maxZ - 0.7) { player.z = b.maxZ - 0.7; hitBound = true; }
            if (hitBound && boundaryToastCooldown <= 0) {
                showToast('🌴 Limite de Vice Neon', 1.6);
                boundaryToastCooldown = 2.0;
            }

            // Roda suavemente para encarar a direção de movimento
            var targetAng = Math.atan2(moveX, moveZ);
            var diff = targetAng - player.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            player.angle += diff * Math.min(1, dt * 12);
            player.walkCycle += dt * (isRunning ? 14 : 9);
        } else {
            player.speed = 0;
        }

        // Salto (Espaço ou botão Drift/Saltar)
        if ((keys['Space'] || touchBtns.drift) && player.isGrounded) {
            player.vy = 13;
            player.isGrounded = false;
            if (GTC.Audio) GTC.Audio.playSfx('jump');
        }
        player.vy -= 34 * dt;
        player.y += player.vy * dt;
        if (player.y <= 0) {
            player.y = 0;
            player.vy = 0;
            player.isGrounded = true;
        }

        // Animação da malha
        if (player.mesh) {
            player.mesh.visible = true;
            player.mesh.position.set(player.x, player.y, player.z);
            player.mesh.rotation.y = player.angle;

            var swing = player.speed > 0.5 ? Math.sin(player.walkCycle) * 0.65 : 0;
            player.parts.legL.rotation.x = swing;
            player.parts.legR.rotation.x = -swing;
            player.parts.armL.rotation.x = -swing;

            if (player.waveTimer > 0) {
                player.waveTimer -= dt;
                player.parts.armR.rotation.x = -2.6;
                player.parts.armR.rotation.z = Math.sin(elapsedTime * 18) * 0.45 - 0.35;
            } else {
                player.parts.armR.rotation.x = swing;
                player.parts.armR.rotation.z = 0;
            }
        }
    }

    // =========================================================================
    // Atualização de Câmara (3 Modos + Menu + Garagem)
    // =========================================================================
    var camPos = new THREE.Vector3(-40, 12, 36);
    var camLook = new THREE.Vector3(-40, 2, 16);
    var camShakeTime = 0;
    var camShakeIntensity = 0;
    var minimapAccum = 0;

    function triggerCameraShake(intensity, duration) {
        if (intensity >= camShakeIntensity || camShakeTime <= 0) {
            camShakeIntensity = intensity;
            camShakeTime = duration || 0.22;
        }
    }

    function updateCamera(dt) {
        if (gameState === 'MENU' || gameState === 'LEVEL_SELECT' || gameState === 'BRIEFING') {
            var orbitAng = elapsedTime * 0.14;
            var r = 85;
            camera.position.set(Math.cos(orbitAng) * r, 38, Math.sin(orbitAng) * r);
            camera.lookAt(0, 8, 0);
            camera.fov += (60 - camera.fov) * Math.min(1, dt * 6);
            camera.updateProjectionMatrix();
            return;
        }

        if (gameState === 'GARAGE') {
            var gx = -40;
            var gz = 22;
            var ga = elapsedTime * 0.52;
            camera.position.set(gx + Math.cos(ga) * 8.4, 2.9, gz + Math.sin(ga) * 8.4);
            camera.lookAt(gx, -0.35, gz);
            camera.fov += (52 - camera.fov) * Math.min(1, dt * 6);
            camera.updateProjectionMatrix();
            return;
        }

        var targetX = player.x;
        var targetY = player.y;
        var targetZ = player.z;
        var heading = player.angle;
        var spd = player.inVehicle && player.vehicle ? player.vehicle.speed : player.speed;

        var desiredPos = new THREE.Vector3();
        var desiredLook = new THREE.Vector3(targetX, targetY + 1.6, targetZ);

        if (save.cameraMode === 2) {
            // Vista Aérea Clássica fixa a Norte
            var h = 34 + Math.abs(spd) * 0.35;
            desiredPos.set(targetX, targetY + h, targetZ + 10);
            desiredLook.set(targetX, targetY, targetZ);
        } else {
            var distBack = player.inVehicle
                ? (save.cameraMode === 0 ? 11 : 17)
                : (save.cameraMode === 0 ? 7.5 : 11);
            var heightUp = player.inVehicle
                ? (save.cameraMode === 0 ? 4.8 : 8.0)
                : (save.cameraMode === 0 ? 3.6 : 5.5);

            var fx = Math.sin(heading);
            var fz = Math.cos(heading);
            desiredPos.set(targetX - fx * distBack, targetY + heightUp, targetZ - fz * distBack);
            desiredLook.set(targetX + fx * 3.5, targetY + 1.5, targetZ + fz * 3.5);
        }

        var alpha = 1 - Math.exp(-7 * dt);
        camPos.lerp(desiredPos, alpha);
        camLook.lerp(desiredLook, alpha);
        camera.position.copy(camPos);
        if (camShakeTime > 0) {
            camShakeTime -= dt;
            var mag = camShakeIntensity * Math.max(0, camShakeTime / 0.25);
            camera.position.x += (Math.random() - 0.5) * mag;
            camera.position.y += (Math.random() - 0.5) * mag * 0.7;
            camera.position.z += (Math.random() - 0.5) * mag;
        }
        camera.lookAt(camLook);

        var targetFov = (lastPhysicsEvents && lastPhysicsEvents.nitroActive) ? 68 : 60;
        if (Math.abs(camera.fov - targetFov) > 0.05) {
            camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
            camera.updateProjectionMatrix();
        }
    }

    // =========================================================================
    // Minimapa 2D (Fixo a Norte com Seta Rotativa)
    // =========================================================================
    var minimapCtx = null;

    function drawMinimap() {
        if (!minimapCtx) return;
        var canvas = dom.minimapCanvas;
        var w = canvas.width;
        var h = canvas.height;
        var ctx2 = minimapCtx;

        ctx2.clearRect(0, 0, w, h);
        ctx2.fillStyle = '#0f172a';
        ctx2.fillRect(0, 0, w, h);

        function mapX(wx) { return ((wx + 180) / 360) * w; }
        function mapZ(wz) { return ((wz + 180) / 360) * h; }

        // Praia e Mar (Este)
        ctx2.fillStyle = '#d97706';
        ctx2.fillRect(mapX(118), 0, mapX(150) - mapX(118), h);
        ctx2.fillStyle = '#0ea5e9';
        ctx2.fillRect(mapX(150), 0, w - mapX(150), h);

        // Parque Central
        ctx2.fillStyle = '#15803d';
        ctx2.fillRect(mapX(-110), mapZ(-30), mapX(-50) - mapX(-110), mapZ(30) - mapZ(-30));

        // Estradas
        ctx2.fillStyle = '#475569';
        var rx = (GTC.City && GTC.City.ROAD_X) ? GTC.City.ROAD_X : [-120, -40, 40, 108];
        var rz = (GTC.City && GTC.City.ROAD_Z) ? GTC.City.ROAD_Z : [-120, -40, 40, 120];
        var rw = (16 / 360) * w;
        for (var i = 0; i < rx.length; i++) {
            ctx2.fillRect(mapX(rx[i]) - rw / 2, 0, rw, h);
        }
        for (var j = 0; j < rz.length; j++) {
            ctx2.fillRect(0, mapZ(rz[j]) - rw / 2, mapX(116), rw);
        }

        // Marcos fixos (Oficina, Garagem, Lab)
        ctx2.fillStyle = '#ec4899';
        ctx2.beginPath();
        ctx2.arc(mapX(-32), mapZ(0), 3.2, 0, Math.PI * 2);
        ctx2.fill();

        ctx2.fillStyle = '#84cc16';
        ctx2.beginPath();
        ctx2.arc(mapX(-108), mapZ(-72), 3, 0, Math.PI * 2);
        ctx2.fill();

        ctx2.fillStyle = '#38bdf8';
        ctx2.beginPath();
        ctx2.arc(mapX(36), mapZ(-108), 3, 0, Math.PI * 2);
        ctx2.fill();

        // Polícia a piscar vermelho/azul
        var police = GTC.Missions.getPoliceVehicles();
        var flashRed = Math.floor(elapsedTime * 6) % 2 === 0;
        for (var p = 0; p < police.length; p++) {
            ctx2.fillStyle = flashRed ? '#ef4444' : '#3b82f6';
            ctx2.beginPath();
            ctx2.arc(mapX(police[p].x), mapZ(police[p].z), 3.2, 0, Math.PI * 2);
            ctx2.fill();
        }

        // Alvos da missão
        var mState = GTC.Missions.getState();
        var pulse = 3.5 + Math.sin(elapsedTime * 7) * 1.4;
        for (var t = 0; t < mState.targets.length; t++) {
            var tg = mState.targets[t];
            ctx2.strokeStyle = tg.color || '#facc15';
            ctx2.lineWidth = 2;
            ctx2.beginPath();
            ctx2.arc(mapX(tg.x), mapZ(tg.z), pulse, 0, Math.PI * 2);
            ctx2.stroke();
        }

        // Seta rotativa do jogador
        var px = mapX(player.x);
        var pz = mapZ(player.z);
        ctx2.save();
        ctx2.translate(px, pz);
        // Em canvas 2D: cima é -Y (Norte = -Z). angle=PI => Norte (rotação 0 no canvas)
        // forward = (sin(angle), cos(angle)) => ângulo em canvas = atan2(sin(angle), -cos(angle))
        var canvasRot = Math.atan2(Math.sin(player.angle), -Math.cos(player.angle));
        ctx2.rotate(canvasRot);
        ctx2.fillStyle = '#ffffff';
        ctx2.beginPath();
        ctx2.moveTo(0, -5.5);
        ctx2.lineTo(4, 4.5);
        ctx2.lineTo(0, 2);
        ctx2.lineTo(-4, 4.5);
        ctx2.closePath();
        ctx2.fill();
        ctx2.restore();
    }

    // =========================================================================
    // Toast / Mensagens & Atualização do HUD
    // =========================================================================
    function showToast(msg, duration) {
        if (!dom.hudToast) return;
        dom.hudToast.textContent = msg;
        dom.hudToast.classList.remove('hidden');
        toastTimer = duration || 2.2;
    }

    function formatClock(sec) {
        var s = Math.max(0, Math.ceil(sec));
        var m = Math.floor(s / 60);
        var r = s % 60;
        return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
    }

    function updateHUD() {
        var m = GTC.Missions.getState();
        dom.hudMissionTitle.textContent = m.title;
        dom.hudObjective.textContent = m.objectiveText;

        if (m.progressText) {
            dom.hudProgress.textContent = m.progressText;
            dom.hudProgress.classList.remove('hidden');
        } else {
            dom.hudProgress.classList.add('hidden');
        }

        if (m.mode === 'level' && m.timeLimit > 0) {
            dom.hudTimer.textContent = formatClock(m.timeLeft);
            dom.hudTimer.classList.remove('hidden');
            dom.hudTimer.className = 'arcade-font text-xs sm:text-sm font-bold px-2 py-0.5 rounded-lg shrink-0 ' +
                (m.timeLeft <= 20
                    ? 'bg-rose-600/80 text-white border border-rose-300 animate-pulse'
                    : 'bg-slate-950/70 text-amber-300 border border-amber-400/30');
        } else {
            dom.hudTimer.classList.add('hidden');
        }

        if (m.raceTotal > 0) {
            dom.hudRacePos.textContent = m.racePos + '.º / ' + m.raceTotal;
            dom.hudRacePos.classList.remove('hidden');
        } else {
            dom.hudRacePos.classList.add('hidden');
        }

        if (m.wantedStars > 0) {
            var starsStr = '';
            for (var i = 0; i < 3; i++) starsStr += (i < m.wantedStars ? '⭐' : '☆');
            dom.hudWanted.textContent = '🚨 ' + starsStr;
            dom.hudWanted.classList.remove('hidden');
            dom.hudWanted.classList.add('flex');
        } else {
            dom.hudWanted.classList.add('hidden');
            dom.hudWanted.classList.remove('flex');
        }

        if (m.bossMaxHp > 0) {
            dom.hudBossBar.classList.remove('hidden');
            dom.hudBossHpText.textContent = m.bossHp + ' / ' + m.bossMaxHp;
            dom.hudBossHpFill.style.width = Math.round((m.bossHp / m.bossMaxHp) * 100) + '%';
        } else {
            dom.hudBossBar.classList.add('hidden');
        }

        // Captura policial
        if (m.captureTimer > 0.05) {
            dom.hudCaptureWrap.classList.remove('hidden');
            var pct = Math.min(100, Math.round((m.captureTimer / m.captureLimit) * 100));
            dom.hudCaptureFill.style.width = pct + '%';
        } else {
            dom.hudCaptureWrap.classList.add('hidden');
        }

        // Telemetria
        var kmh = 0;
        var shieldPct = 100;
        var nitroPct = 100;
        var vehLabel = '🚶 A Pé';

        if (player.inVehicle && player.vehicle) {
            var v = player.vehicle;
            kmh = Math.round(Math.abs(v.speed) * 3.0);
            shieldPct = Math.max(0, Math.min(100, Math.round((v.shield / (v.maxShield || 100)) * 100)));
            nitroPct = Math.max(0, Math.min(100, Math.round(v.nitro || 0)));
            vehLabel = (v.spec && v.spec.name) ? v.spec.name : v.typeId;
        } else {
            kmh = Math.round(player.speed * 1.5);
        }

        dom.hudSpeedDesk.textContent = kmh;
        dom.hudSpeedMob.textContent = kmh;
        dom.hudVehicleName.textContent = vehLabel;
        dom.hudRadioLabel.textContent = RADIO_NAMES[save.radioStation] || RADIO_NAMES[0];

        dom.hudShieldDesk.style.width = shieldPct + '%';
        dom.hudShieldMob.style.width = shieldPct + '%';
        dom.hudShieldPctDesk.textContent = shieldPct + '%';
        dom.hudShieldPctMob.textContent = shieldPct + '%';

        dom.hudNitroDesk.style.width = nitroPct + '%';
        dom.hudNitroMob.style.width = nitroPct + '%';
        dom.hudNitroPctDesk.textContent = nitroPct + '%';
        dom.hudNitroPctMob.textContent = nitroPct + '%';

        // Botão contextual não-intrusivo (Oficina em Modo Livre ou Entrar em Veículo no PC)
        var nearVeh = !player.inVehicle ? findNearestEnterableVehicle(5.5) : null;
        if (m.canOpenGarageAtShop) {
            dom.hudContextWrap.classList.remove('hidden');
            dom.btnHudContext.textContent = '🎨 Abrir Garagem (G)';
            dom.btnHudContext.dataset.action = 'garage';
        } else if (nearVeh && !isTouchVisible()) {
            dom.hudContextWrap.classList.remove('hidden');
            dom.btnHudContext.textContent = '🚪 Entrar: ' + ((nearVeh.spec && nearVeh.spec.name) || 'Veículo') + ' (E)';
            dom.btnHudContext.dataset.action = 'enter';
        } else {
            dom.hudContextWrap.classList.add('hidden');
        }

        // Destaque verde no botão tátil Entrar quando perto de veículo a pé
        if (dom.touchBtnEnter) {
            if (!player.inVehicle && nearVeh) {
                dom.touchBtnEnter.classList.add('highlight-enter');
            } else {
                dom.touchBtnEnter.classList.remove('highlight-enter');
            }
        }
    }

    function updateTouchButtonLabels() {
        if (!dom.touchLblNitro) return;
        if (player.inVehicle && player.vehicle) {
            dom.touchIconNitro.textContent = '🔥';
            dom.touchLblNitro.textContent = 'TURBO';
            dom.touchIconEnter.textContent = '🚗';
            dom.touchLblEnter.textContent = 'SAIR';
            dom.touchIconDrift.textContent = '💨';
            dom.touchLblDrift.textContent = 'DRIFT';
            if (player.vehicle.typeId === 'police') {
                dom.touchIconHorn.textContent = '🚨';
                dom.touchLblHorn.textContent = 'SIRENE';
            } else {
                dom.touchIconHorn.textContent = '📣';
                dom.touchLblHorn.textContent = 'BUZINA';
            }
        } else {
            dom.touchIconNitro.textContent = '🏃';
            dom.touchLblNitro.textContent = 'CORRER';
            dom.touchIconEnter.textContent = '🚪';
            dom.touchLblEnter.textContent = 'ENTRAR';
            dom.touchIconDrift.textContent = '⬆️';
            dom.touchLblDrift.textContent = 'SALTAR';
            dom.touchIconHorn.textContent = '👋';
            dom.touchLblHorn.textContent = 'ACENAR';
        }
    }

    function isTouchVisible() {
        return touchManualOverride !== null ? touchManualOverride : touchMode;
    }

    function applyTouchVisibility() {
        var visible = isTouchVisible();
        if (dom.touchControls) {
            dom.touchControls.classList.toggle('hidden', !visible);
        }
        document.body.classList.toggle('touch-active', visible);
        if (dom.btnPauseTouch) {
            var lbl = touchManualOverride === null ? 'Auto (' + (touchMode ? 'Sim' : 'Não') + ')' : (touchManualOverride ? 'Ligados' : 'Desligados');
            dom.btnPauseTouch.textContent = '📱 Controlos Táteis: ' + lbl;
        }
    }

    // =========================================================================
    // Máquina de Estados & Ecrãs (SPEC §7.1)
    // =========================================================================
    function setGameState(next) {
        gameState = next;
        dom.hudLayer.classList.toggle('hidden', next !== 'PLAYING');
        dom.screenMenu.classList.toggle('hidden', next !== 'MENU');
        dom.screenLevels.classList.toggle('hidden', next !== 'LEVEL_SELECT');
        dom.screenGarage.classList.toggle('hidden', next !== 'GARAGE');
        dom.screenBriefing.classList.toggle('hidden', next !== 'BRIEFING');
        dom.screenPaused.classList.toggle('hidden', next !== 'PAUSED');
        dom.screenVictory.classList.toggle('hidden', next !== 'VICTORY' && next !== 'CAMPAIGN_COMPLETE');
        dom.screenFailed.classList.toggle('hidden', next !== 'FAILED');

        if (next !== 'PLAYING' && GTC.Audio) {
            GTC.Audio.updateEngine(0, false, false);
            if (next !== 'PAUSED') GTC.Audio.setSirenActive(false);
        }
        if (next === 'MENU') {
            updateMenuSummary();
            GTC.City.setTimeOfDay('sunset');
        } else if (next === 'PLAYING') {
            GTC.City.setTimeOfDay(save.timeOfDay);
            applyTouchVisibility();
            updateTouchButtonLabels();
        }
    }

    function updateMenuSummary() {
        var totalStars = 0;
        for (var k in save.starsByLevel) {
            if (Object.prototype.hasOwnProperty.call(save.starsByLevel, k)) {
                totalStars += save.starsByLevel[k] || 0;
            }
        }
        var curLv = Math.min(10, save.unlockedLevel);
        dom.menuProgressSummary.textContent = 'Progresso: Nível ' + curLv + (save.unlockedLevel >= 11 ? ' (Campanha Completa 🏆)' : '') + ' • ' + totalStars + ' / 30 ⭐';
    }

    // =========================================================================
    // Ecrã Seleção de Níveis + Toggle "Desbloquear Tudo"
    // =========================================================================
    function openLevelSelect() {
        renderLevelsGrid();
        setGameState('LEVEL_SELECT');
    }

    function renderLevelsGrid() {
        dom.levelsGrid.replaceChildren();
        dom.btnToggleUnlockAll.textContent = save.unlockAll ? '🔒 Voltar ao Progresso' : '🔓 Desbloquear Tudo';

        var levels = GTC.Missions.LEVELS;
        for (var i = 0; i < levels.length; i++) {
            var lv = levels[i];
            var unlocked = save.unlockAll || lv.id <= save.unlockedLevel;
            var earned = save.starsByLevel[lv.id] || 0;

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'rounded-2xl p-3 text-left border transition flex flex-col justify-between min-h-[104px] ' +
                (unlocked
                    ? 'bg-slate-900/90 hover:bg-slate-800 border-cyan-400/35 hover:border-fuchsia-400/70 cursor-pointer active:scale-95'
                    : 'bg-slate-950/70 border-white/10 opacity-55 cursor-not-allowed');

            var top = document.createElement('div');
            top.className = 'flex items-center justify-between text-xs font-bold mb-1';
            var num = document.createElement('span');
            num.className = 'arcade-font text-cyan-300';
            num.textContent = 'NÍVEL ' + lv.id;
            var lock = document.createElement('span');
            lock.textContent = unlocked ? (earned > 0 ? '✅' : '▶') : '🔒';
            top.append(num, lock);

            var title = document.createElement('div');
            title.className = 'text-xs font-bold text-white leading-tight mb-2';
            title.textContent = lv.title;

            var stars = document.createElement('div');
            stars.className = 'text-sm tracking-wide';
            var sTxt = '';
            for (var s = 0; s < 3; s++) sTxt += (s < earned ? '⭐' : '☆');
            stars.textContent = sTxt;

            btn.append(top, title, stars);
            if (unlocked) {
                btn.addEventListener('click', (function (id) {
                    return function () { openBriefing(id); };
                })(lv.id));
            }
            dom.levelsGrid.appendChild(btn);
        }
    }

    function toggleUnlockAll() {
        save.unlockAll = !save.unlockAll;
        enforceUnlockConstraints(save);
        persistSave();
        renderLevelsGrid();
        showToast(save.unlockAll ? '🔓 Todos os níveis e Supercarro Dourado desbloqueados!' : '🔒 Progresso normal restaurado!', 2.4);
    }

    // =========================================================================
    // Ecrã Garagem 3D em Órbita (SPEC §5.2)
    // =========================================================================
    function openGarage(fromState) {
        previousStateBeforeGarage = fromState || gameState;
        if (garagePreviewVehicle && garagePreviewVehicle.mesh && garagePreviewVehicle.mesh.parent) {
            garagePreviewVehicle.mesh.parent.remove(garagePreviewVehicle.mesh);
        }
        spawnGaragePreviewVehicle();
        renderGarageUI();
        setGameState('GARAGE');
    }

    function spawnGaragePreviewVehicle() {
        if (garagePreviewVehicle && garagePreviewVehicle.mesh && garagePreviewVehicle.mesh.parent) {
            garagePreviewVehicle.mesh.parent.remove(garagePreviewVehicle.mesh);
        }
        var cust = save.customization;
        garagePreviewVehicle = GTC.Vehicles.createVehicle(cust.vehicleId || 'coupe', {
            scene: scene,
            x: -40,
            z: 22,
            angle: Math.PI * 0.75,
            color: cust.color || '#ec4899',
            underglow: cust.underglow,
            occupied: false
        });
        if (garagePreviewVehicle.mesh && !garagePreviewVehicle.mesh.parent) {
            scene.add(garagePreviewVehicle.mesh);
        }
        updateGarageStatsLabel();
    }

    function updateGarageStatsLabel() {
        var spec = GTC.Vehicles.CATALOG[save.customization.vehicleId] || GTC.Vehicles.CATALOG.coupe;
        if (!spec) return;
        dom.garageVehicleStats.textContent = spec.name + ' • Vel. ' + Math.round(spec.maxSpeed * 3) + ' km/h • Nitro ' + Math.round(spec.nitro * 3) + ' km/h • Escudo ' + spec.maxShield;
    }

    function renderGarageUI() {
        var goldOk = isGoldUnlocked();
        var cust = save.customization;

        // 7 Veículos
        dom.garageVehiclesList.replaceChildren();
        var vehIds = ['coupe', 'moto', 'buggy', 'van', 'police', 'truck', 'gold_supercar'];
        for (var i = 0; i < vehIds.length; i++) {
            var id = vehIds[i];
            var spec = GTC.Vehicles.CATALOG[id];
            if (!spec) continue;
            var locked = (id === 'gold_supercar' && !goldOk);
            var active = cust.vehicleId === id;

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'px-2.5 py-2 rounded-xl text-[11px] font-bold text-left border transition truncate ' +
                (active
                    ? 'bg-fuchsia-500/35 border-fuchsia-300 text-white'
                    : (locked ? 'bg-slate-950/70 border-white/10 text-slate-500 cursor-not-allowed' : 'bg-slate-900/80 border-white/15 text-slate-200 hover:border-cyan-400/60'));
            btn.textContent = (locked ? '🔒 ' : '') + spec.name;
            if (!locked) {
                btn.addEventListener('click', (function (vid) {
                    return function () {
                        save.customization.vehicleId = vid;
                        if (vid === 'gold_supercar') save.customization.color = '#fbbf24';
                        persistSave();
                        spawnGaragePreviewVehicle();
                        renderGarageUI();
                        if (GTC.Audio) GTC.Audio.playSfx('pickup');
                    };
                })(id));
            }
            dom.garageVehiclesList.appendChild(btn);
        }

        // 8 Cores
        dom.garageColorsList.replaceChildren();
        var colors = GTC.Vehicles.COLORS || [];
        for (var c = 0; c < colors.length; c++) {
            var col = colors[c];
            var colLocked = !!(col.requiresGold && !goldOk);
            var colActive = cust.color && cust.color.toLowerCase() === col.hex.toLowerCase();

            var cbtn = document.createElement('button');
            cbtn.type = 'button';
            cbtn.title = col.name + (colLocked ? ' (Completa Nível 10)' : '');
            cbtn.className = 'h-9 rounded-xl border-2 flex items-center justify-center text-xs font-bold transition ' +
                (colActive ? 'border-white scale-105 shadow-lg' : 'border-white/20 hover:border-white/60') +
                (colLocked ? ' opacity-45 cursor-not-allowed' : '');
            cbtn.style.backgroundColor = col.hex;
            cbtn.textContent = colLocked ? '🔒' : (colActive ? '✔' : '');
            if (col.hex.toLowerCase() === '#f8fafc' || col.hex.toLowerCase() === '#facc15') {
                cbtn.style.color = '#0f172a';
            }
            if (!colLocked) {
                cbtn.addEventListener('click', (function (hex) {
                    return function () {
                        save.customization.color = hex;
                        persistSave();
                        if (garagePreviewVehicle) {
                            GTC.Vehicles.applyCustomization(garagePreviewVehicle, hex, save.customization.underglow);
                        }
                        renderGarageUI();
                        if (GTC.Audio) GTC.Audio.playSfx('paint');
                    };
                })(col.hex));
            }
            dom.garageColorsList.appendChild(cbtn);
        }

        // 6 Underglows
        dom.garageUnderglowsList.replaceChildren();
        var glows = GTC.Vehicles.UNDERGLOWS || [];
        for (var u = 0; u < glows.length; u++) {
            var ug = glows[u];
            var uActive = cust.underglow === ug.hex;
            var ubtn = document.createElement('button');
            ubtn.type = 'button';
            ubtn.className = 'px-2 py-2 rounded-xl text-[10px] font-bold border transition truncate ' +
                (uActive ? 'bg-cyan-500/35 border-cyan-300 text-white' : 'bg-slate-900/80 border-white/15 text-slate-300 hover:border-cyan-400/50');
            ubtn.textContent = ug.name;
            ubtn.addEventListener('click', (function (hexVal) {
                return function () {
                    save.customization.underglow = hexVal;
                    persistSave();
                    if (garagePreviewVehicle) {
                        GTC.Vehicles.applyCustomization(garagePreviewVehicle, save.customization.color, hexVal);
                    }
                    renderGarageUI();
                    if (GTC.Audio) GTC.Audio.playSfx('pickup');
                };
            })(ug.hex));
            dom.garageUnderglowsList.appendChild(ubtn);
        }
    }

    function closeGarageAndReturn() {
        if (garagePreviewVehicle && garagePreviewVehicle.mesh && garagePreviewVehicle.mesh.parent) {
            garagePreviewVehicle.mesh.parent.remove(garagePreviewVehicle.mesh);
        }
        garagePreviewVehicle = null;
        persistSave();

        if (previousStateBeforeGarage === 'PLAYING' || previousStateBeforeGarage === 'PAUSED') {
            // Se estamos em Modo Livre, aplica a nova personalização / veículo imediatamente
            if (currentPlayMode === 'free' && player.inVehicle && player.vehicle) {
                var oldV = player.vehicle;
                var ox = oldV.x;
                var oz = oldV.z;
                var oa = oldV.angle;
                if (oldV.typeId !== save.customization.vehicleId) {
                    removeVehicle(oldV);
                    var newV = spawnVehicle(save.customization.vehicleId, {
                        x: ox, z: oz, angle: oa,
                        color: save.customization.color,
                        underglow: save.customization.underglow
                    });
                    setPlayerInVehicle(newV);
                } else {
                    GTC.Vehicles.applyCustomization(oldV, save.customization.color, save.customization.underglow);
                }
            }
            setGameState('PLAYING');
        } else {
            setGameState('MENU');
        }
    }

    // =========================================================================
    // Briefing, Início de Missão / Modo Livre, Vitória e Falha
    // =========================================================================
    function openBriefing(levelId) {
        var lv = GTC.Missions.LEVELS[levelId - 1];
        if (!lv) return;
        selectedBriefingLevel = levelId;
        dom.briefingBadge.textContent = 'Nível ' + lv.id + ' de 10';
        dom.briefingTitle.textContent = lv.title;
        dom.briefingDesc.textContent = lv.briefing;
        dom.briefingTip.textContent = '💡 ' + lv.tip;
        setGameState('BRIEFING');
    }

    function buildMissionContext() {
        return {
            scene: scene,
            city: GTC.City,
            vehiclesApi: GTC.Vehicles,
            audio: GTC.Audio,
            save: save,
            vehicles: vehicles,
            cones: cones,
            player: player,
            time: elapsedTime,
            lastPhysicsEvents: lastPhysicsEvents,
            spawnVehicle: spawnVehicle,
            removeVehicle: removeVehicle,
            setPlayerInVehicle: setPlayerInVehicle,
            setPlayerOnFoot: setPlayerOnFoot,
            showToast: showToast,
            spawnParticles: spawnParticles,
            completeMission: handleMissionVictory,
            failMission: handleMissionFailed
        };
    }

    function launchFreeRoam() {
        currentPlayMode = 'free';
        currentLevelId = 0;
        clearAllVehicles();
        GTC.Missions.startFreeRoam(buildMissionContext());
        setGameState('PLAYING');
        showToast('🌴 Bem-vindo ao Modo Livre de Vice Neon!', 2.4);
    }

    function launchLevel(levelId) {
        currentPlayMode = 'level';
        currentLevelId = levelId;
        clearAllVehicles();
        GTC.Missions.startLevel(levelId, buildMissionContext());
        setGameState('PLAYING');
        var lv = GTC.Missions.LEVELS[levelId - 1];
        if (lv) showToast('🚀 Nível ' + lv.id + ': ' + lv.title, 2.2);
    }

    function handleMissionVictory(stars, summaryText) {
        if (gameState !== 'PLAYING') return;
        if (GTC.Audio) GTC.Audio.playSfx('victory');
        spawnCssConfetti();

        var prevStars = save.starsByLevel[currentLevelId] || 0;
        save.starsByLevel[currentLevelId] = Math.max(prevStars, stars);
        save.unlockedLevel = Math.max(save.unlockedLevel, currentLevelId + 1);
        persistSave();

        var isCampaignComplete = (currentLevelId === 10);
        dom.victoryCampaignBanner.classList.toggle('hidden', !isCampaignComplete);
        dom.victoryTitle.textContent = isCampaignComplete ? '🏆 Lenda de Vice Neon!' : 'Missão Concluída!';
        var sStr = '';
        for (var i = 0; i < 3; i++) sStr += (i < stars ? '⭐' : '☆');
        dom.victoryStars.textContent = sStr;
        dom.victoryStats.textContent = summaryText || 'Excelente condução!';

        if (isCampaignComplete) {
            dom.btnVictoryNext.textContent = '🌴 Explorar Modo Livre';
            setGameState('CAMPAIGN_COMPLETE');
        } else {
            dom.btnVictoryNext.textContent = '➡ Próximo Nível (' + (currentLevelId + 1) + ')';
            setGameState('VICTORY');
        }
    }

    function handleMissionFailed(reasonKey, customTitle, customDesc) {
        if (gameState !== 'PLAYING') return;
        dom.failedTitle.textContent = customTitle || '⏱ Tempo Esgotado!';
        dom.failedDesc.textContent = customDesc || 'Quase lá! Tenta de novo, consegues de certeza!';
        setGameState('FAILED');
    }

    // =========================================================================
    // Loop Principal (requestAnimationFrame)
    // =========================================================================
    function tick(nowMs) {
        requestAnimationFrame(tick);
        if (!clockLast) clockLast = nowMs;
        var rawDt = (nowMs - clockLast) / 1000;
        clockLast = nowMs;
        var dt = Math.min(Math.max(rawDt, 0.001), 0.05);
        elapsedTime += dt;

        // Atualiza mundo (água, oficina, peões) mesmo no Menu/Garagem
        if (GTC.City && GTC.City.update) {
            GTC.City.update(dt, elapsedTime, vehicles);
        }

        // Atualiza underglows de todos os veículos ativos + preview da Garagem
        if (GTC.Vehicles && GTC.Vehicles.updateUnderglow) {
            for (var u = 0; u < vehicles.length; u++) {
                GTC.Vehicles.updateUnderglow(vehicles[u], elapsedTime);
            }
            if (garagePreviewVehicle) {
                GTC.Vehicles.updateUnderglow(garagePreviewVehicle, elapsedTime);
            }
        }

        if (gameState === 'PLAYING') {
            stepGameplay(dt);
        } else {
            if (dirArrow) dirArrow.visible = false;
        }

        updateParticles(dt);
        updateCamera(dt);
        renderer.render(scene, camera);

        if (gameState === 'PLAYING') {
            updateHUD();
            minimapAccum += dt;
            if (minimapAccum >= 0.05) {
                minimapAccum = 0;
                drawMinimap();
            }
        }
    }

    function stepGameplay(dt) {
        if (boundaryToastCooldown > 0) boundaryToastCooldown -= dt;
        if (toastTimer > 0) {
            toastTimer -= dt;
            if (toastTimer <= 0 && dom.hudToast) dom.hudToast.classList.add('hidden');
        }

        // Pausa breve de reparação expresso em Modo Livre quando escudo <= 0
        if (freeRoamRepairTimer > 0) {
            freeRoamRepairTimer -= dt;
            if (freeRoamRepairTimer <= 0 && player.inVehicle && player.vehicle) {
                var rv = player.vehicle;
                rv.x = -40;
                rv.y = 0;
                rv.z = 0;
                rv.speed = 0;
                rv.angle = Math.PI;
                rv.shield = rv.maxShield;
                GTC.Missions.setWantedStars(buildMissionContext(), 0);
            }
            return;
        }

        lastPhysicsEvents = {};

        // Input e física do jogador
        if (player.inVehicle && player.vehicle) {
            var v = player.vehicle;
            var throttle = 0;
            var steer = 0;
            if (keys['KeyW'] || keys['ArrowUp']) throttle += 1;
            if (keys['KeyS'] || keys['ArrowDown']) throttle -= 1;
            if (keys['KeyA'] || keys['ArrowLeft']) steer -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) steer += 1;

            if (joy.active) {
                if (joy.y < -0.15) throttle = Math.min(1, (-joy.y - 0.15) / 0.85);
                else if (joy.y > 0.15) throttle = -Math.min(1, (joy.y - 0.15) / 0.85);
                if (Math.abs(joy.x) > 0.12) steer = joy.x;
            }

            var input = {
                throttle: throttle,
                steer: steer,
                drift: !!(keys['Space'] || touchBtns.drift),
                nitro: !!(keys['ShiftLeft'] || keys['ShiftRight'] || touchBtns.nitro)
            };

            var ev = GTC.Vehicles.stepPhysics(v, input, dt, GTC.City, vehicles, cones) || {};
            lastPhysicsEvents = ev;

            player.x = v.x;
            player.y = v.y;
            player.z = v.z;
            player.angle = v.angle;
            player.speed = v.speed;

            // Som do motor
            if (GTC.Audio) {
                var spdNorm = Math.min(1, Math.abs(v.speed) / (v.spec ? v.spec.nitro : 70));
                GTC.Audio.updateEngine(spdNorm, v.typeId === 'moto', true);
            }

            // Efeitos dos eventos de física
            if (ev.nitroActive) {
                if (!wasNitroActive && GTC.Audio) GTC.Audio.playSfx('nitro');
                var bx = v.x - Math.sin(v.angle) * 2.2;
                var bz = v.z - Math.cos(v.angle) * 2.2;
                if (Math.random() < 0.7) spawnParticles('nitro', bx, v.y + 0.55, bz, 2, '#22d3ee');
            }
            wasNitroActive = !!ev.nitroActive;
            if (input.drift && Math.abs(v.speed) > 10 && Math.random() < 0.55) {
                var driftCol = (v.underglow && v.underglow !== 'rainbow') ? v.underglow : '#ec4899';
                var drx = v.x - Math.sin(v.angle) * 1.6;
                var drz = v.z - Math.cos(v.angle) * 1.6;
                spawnParticles('sparks', drx, v.y + 0.2, drz, 1, driftCol);
            }
            if (ev.hitWallSpeed > 22) {
                if (GTC.Audio) GTC.Audio.playSfx('hit');
                spawnParticles('sparks', v.x, v.y + 1.0, v.z, 10, '#facc15');
                triggerCameraShake(0.45, 0.2);
            }
            if (ev.hitVehicleSpeed > 14) {
                if (GTC.Audio) GTC.Audio.playSfx('hit');
                spawnParticles('sparks', v.x, v.y + 1.0, v.z, 10, '#facc15');
                triggerCameraShake(0.35, 0.18);
                if (currentPlayMode === 'free') {
                    GTC.Missions.onFreeRoamCollision(buildMissionContext());
                }
            }
            if (ev.hitBossEmp) {
                triggerCameraShake(0.75, 0.28);
            }
            if (ev.hitBossNoNitro) {
                if (GTC.Audio) GTC.Audio.playSfx('hit');
                spawnParticles('sparks', v.x, v.y + 1.2, v.z, 12, '#ef4444');
                triggerCameraShake(0.55, 0.24);
                showToast('⚡ Ativa o NITRO (Shift) para dar dano ao Boss!', 1.8);
            }
            if (ev.landedBigJump) {
                if (GTC.Audio) GTC.Audio.playSfx('jump');
                spawnParticles('confetti', v.x, v.y + 1.2, v.z, 16, '#facc15');
                triggerCameraShake(0.32, 0.18);
                var airSec = Math.round((ev.airtime || 0.7) * 10) / 10;
                var prevBest = Number(save.bestAirtime) || 0;
                if (airSec > prevBest) {
                    save.bestAirtime = airSec;
                    persistSave();
                    showToast('🏆 NOVO RECORDE DE SALTO: ' + airSec.toFixed(1) + 's! +25 Nitro!', 2.5);
                } else {
                    showToast('🌟 SALTO INCRÍVEL (' + airSec.toFixed(1) + 's)! +25 Nitro!', 2.0);
                }
            }
            if (ev.hitBoundary && boundaryToastCooldown <= 0) {
                showToast('🌴 Limite de Vice Neon', 1.6);
                boundaryToastCooldown = 2.0;
            }

            // Escudo chegou a 0
            if (v.shield <= 0) {
                v.shield = 0;
                if (GTC.Audio) GTC.Audio.playSfx('hit');
                spawnParticles('sparks', v.x, v.y + 1.0, v.z, 25, '#facc15');
                if (currentPlayMode === 'free') {
                    freeRoamRepairTimer = 1.2;
                    showToast('🔧 Reparação Expresso na Oficina!', 2.2);
                } else {
                    handleMissionFailed(
                        'shield',
                        '🔧 Escudo Esgotado!',
                        'O escudo do teu veículo acabou. Passa pela Oficina Turbo para reparar sempre que precisares!'
                    );
                }
                return;
            }
        } else {
            updateOnFoot(dt);
            if (GTC.Audio) GTC.Audio.updateEngine(0, false, false);
        }

        // Atualiza pickups de Nitro e Missões/IA
        updateNitroPickups(dt);
        GTC.Missions.update(buildMissionContext(), dt);

        // Seta 3D direcional acima do jogador
        var mState = GTC.Missions.getState();
        if (dirArrow) {
            if (mState.primaryTarget) {
                dirArrow.visible = true;
                dirArrow.position.set(player.x, player.y + (player.inVehicle ? 4.3 : 3.2), player.z);
                var ang = Math.atan2(mState.primaryTarget.x - player.x, mState.primaryTarget.z - player.z);
                dirArrow.rotation.y = ang;
            } else {
                dirArrow.visible = false;
            }
        }
    }

    // =========================================================================
    // Ações Rápidas (Rádio, Câmara, Hora do Dia, Som, Buzina/Sirene/Acenar)
    // =========================================================================
    function cycleCamera() {
        save.cameraMode = (save.cameraMode + 1) % 3;
        persistSave();
        showToast('📷 Câmara: ' + CAM_NAMES[save.cameraMode], 1.6);
    }

    function cycleRadio() {
        save.radioStation = (save.radioStation + 1) % 3;
        persistSave();
        if (GTC.Audio) GTC.Audio.setRadioStation(save.radioStation);
        showToast(RADIO_NAMES[save.radioStation], 1.6);
    }

    function cycleTimeOfDay() {
        var idx = (TIME_MODES.indexOf(save.timeOfDay) + 1) % TIME_MODES.length;
        save.timeOfDay = TIME_MODES[idx];
        persistSave();
        if (GTC.City) GTC.City.setTimeOfDay(save.timeOfDay);
        dom.btnHudTime.textContent = TIME_ICONS[save.timeOfDay] || '🌅';
        var names = { sunset: 'Pôr-do-Sol', day: 'Dia', night: 'Noite Néon' };
        showToast((TIME_ICONS[save.timeOfDay] || '') + ' ' + names[save.timeOfDay], 1.6);
    }

    function toggleMute() {
        save.muted = !save.muted;
        persistSave();
        if (GTC.Audio) GTC.Audio.setMuted(save.muted);
        dom.btnHudSound.textContent = save.muted ? '🔇' : '🔊';
        showToast(save.muted ? '🔇 Som desligado' : '🔊 Som ligado', 1.4);
    }

    function triggerHornOrWave() {
        if (gameState !== 'PLAYING') return;
        if (player.inVehicle && player.vehicle) {
            if (player.vehicle.typeId === 'police') {
                player.vehicle.sirenOn = !player.vehicle.sirenOn;
                if (GTC.Audio) GTC.Audio.playSfx('sirenToggle');
                showToast(player.vehicle.sirenOn ? '🚨 Sirene ligada!' : '🚨 Sirene desligada!', 1.4);
            } else {
                if (GTC.Audio) GTC.Audio.playSfx('horn');
            }
        } else {
            player.waveTimer = 0.85;
            if (GTC.Audio) GTC.Audio.playSfx('wave');
        }
    }

    function unlockAudioSafe() {
        if (audioUnlocked) return;
        audioUnlocked = true;
        try {
            if (GTC.Audio && GTC.Audio.unlock) {
                GTC.Audio.unlock();
                GTC.Audio.setMuted(save.muted);
                GTC.Audio.setRadioStation(save.radioStation);
            }
        } catch (e) {
            // ignora bloqueios do browser
        }
    }

    // =========================================================================
    // Eventos de Teclado, Tátil e UI
    // =========================================================================
    function setupInputsAndUI() {
        window.addEventListener('pointerdown', unlockAudioSafe, { passive: true });
        window.addEventListener('keydown', function (e) {
            unlockAudioSafe();
            keys[e.code] = true;

            if (e.code === 'Space' && gameState === 'PLAYING') {
                e.preventDefault();
            }
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (gameState === 'PLAYING') setGameState('PAUSED');
                else if (gameState === 'PAUSED') setGameState('PLAYING');
            }
            if (gameState !== 'PLAYING') return;

            if (e.code === 'KeyE') toggleEnterExitVehicle();
            else if (e.code === 'KeyC') cycleCamera();
            else if (e.code === 'KeyR') cycleRadio();
            else if (e.code === 'KeyH') triggerHornOrWave();
            else if (e.code === 'KeyF') recoverToNearestRoad();
            else if (e.code === 'KeyG') {
                var ms = GTC.Missions.getState();
                if (ms.canOpenGarageAtShop) openGarage('PLAYING');
            }
        });

        window.addEventListener('keyup', function (e) {
            keys[e.code] = false;
        });

        // Auto-pausa ao perder foco do separador (SPEC §10)
        document.addEventListener('visibilitychange', function () {
            if (document.hidden && gameState === 'PLAYING') {
                setGameState('PAUSED');
            }
        });

        // Resize / Rotação de telemóvel
        window.addEventListener('resize', function () {
            if (!renderer || !camera) return;
            var w = window.innerWidth;
            var h = window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(w, h);
        });

        // Botões Menu Principal
        dom.btnMenuCampaign.addEventListener('click', function () {
            var nextLv = Math.min(10, save.unlockedLevel);
            openBriefing(nextLv);
        });
        dom.btnMenuFreeroam.addEventListener('click', launchFreeRoam);
        dom.btnMenuGarage.addEventListener('click', function () { openGarage('MENU'); });
        dom.btnMenuLevels.addEventListener('click', openLevelSelect);

        // Seleção de Níveis
        dom.btnToggleUnlockAll.addEventListener('click', toggleUnlockAll);
        dom.btnLevelsBack.addEventListener('click', function () { setGameState('MENU'); });

        // Garagem
        dom.btnGarageSave.addEventListener('click', closeGarageAndReturn);

        // Briefing
        dom.btnBriefingStart.addEventListener('click', function () { launchLevel(selectedBriefingLevel); });
        dom.btnBriefingBack.addEventListener('click', openLevelSelect);

        // HUD 5 botões rápidos
        dom.btnHudCamera.addEventListener('click', cycleCamera);
        dom.btnHudRadio.addEventListener('click', cycleRadio);
        dom.btnHudTime.addEventListener('click', cycleTimeOfDay);
        dom.btnHudSound.addEventListener('click', toggleMute);
        dom.btnHudPause.addEventListener('click', function () { setGameState('PAUSED'); });

        // Botão contextual HUD
        dom.btnHudContext.addEventListener('click', function () {
            var act = dom.btnHudContext.dataset.action;
            if (act === 'garage') openGarage('PLAYING');
            else if (act === 'enter') toggleEnterExitVehicle();
        });

        // Pausa
        dom.btnPauseResume.addEventListener('click', function () { setGameState('PLAYING'); });
        dom.btnPauseRecover.addEventListener('click', function () {
            recoverToNearestRoad();
            setGameState('PLAYING');
        });
        dom.btnPauseRestart.addEventListener('click', function () {
            if (currentPlayMode === 'free') launchFreeRoam();
            else launchLevel(currentLevelId);
        });
        dom.btnPauseGarage.addEventListener('click', function () { openGarage('PAUSED'); });
        dom.btnPauseLevels.addEventListener('click', openLevelSelect);
        dom.btnPauseTouch.addEventListener('click', function () {
            if (touchManualOverride === null) touchManualOverride = !touchMode;
            else touchManualOverride = !touchManualOverride;
            applyTouchVisibility();
        });
        dom.btnPauseMenu.addEventListener('click', function () {
            GTC.Missions.cleanup(buildMissionContext());
            clearAllVehicles();
            setGameState('MENU');
        });

        // Vitória
        dom.btnVictoryNext.addEventListener('click', function () {
            if (currentLevelId >= 10) launchFreeRoam();
            else openBriefing(currentLevelId + 1);
        });
        dom.btnVictoryReplay.addEventListener('click', function () { launchLevel(currentLevelId); });
        dom.btnVictoryLevels.addEventListener('click', openLevelSelect);

        // Falha
        dom.btnFailedRetry.addEventListener('click', function () { launchLevel(currentLevelId); });
        dom.btnFailedLevels.addEventListener('click', openLevelSelect);

        // Controlos Táteis: Joystick Esquerdo
        setupJoystick();
        setupTouchButtons();
    }

    function setupJoystick() {
        var zone = dom.joystickZone;
        var knob = dom.joystickKnob;
        var maxR = 38;

        function updateJoy(clientX, clientY) {
            var rect = zone.getBoundingClientRect();
            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;
            var dx = clientX - cx;
            var dy = clientY - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > maxR) {
                dx = (dx / dist) * maxR;
                dy = (dy / dist) * maxR;
            }
            joy.x = dx / maxR;
            joy.y = dy / maxR;
            knob.style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)';
        }

        function resetJoy() {
            joy.active = false;
            joy.pointerId = null;
            joy.x = 0;
            joy.y = 0;
            knob.style.transform = 'translate(0px, 0px)';
        }

        zone.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            unlockAudioSafe();
            joy.active = true;
            joy.pointerId = e.pointerId;
            try { zone.setPointerCapture(e.pointerId); } catch (err) {}
            updateJoy(e.clientX, e.clientY);
        });
        zone.addEventListener('pointermove', function (e) {
            if (!joy.active || e.pointerId !== joy.pointerId) return;
            e.preventDefault();
            updateJoy(e.clientX, e.clientY);
        });
        zone.addEventListener('pointerup', function (e) {
            if (e.pointerId === joy.pointerId) resetJoy();
        });
        zone.addEventListener('pointercancel', resetJoy);
    }

    function bindHoldButton(el, propName) {
        el.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            unlockAudioSafe();
            touchBtns[propName] = true;
            el.classList.add('pressed');
        });
        var release = function () {
            touchBtns[propName] = false;
            el.classList.remove('pressed');
        };
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('pointerleave', release);
    }

    function setupTouchButtons() {
        bindHoldButton(dom.touchBtnNitro, 'nitro');
        bindHoldButton(dom.touchBtnDrift, 'drift');
        dom.touchBtnEnter.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            unlockAudioSafe();
            toggleEnterExitVehicle();
        });
        dom.touchBtnHorn.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            unlockAudioSafe();
            triggerHornOrWave();
        });
    }

    // =========================================================================
    // Cache de Elementos DOM & Bootstrap
    // =========================================================================
    function cacheDom() {
        var ids = [
            'game-canvas', 'hud-layer', 'hud-mission-title', 'hud-timer', 'hud-objective',
            'hud-progress', 'hud-race-pos', 'hud-wanted', 'hud-boss-bar', 'hud-boss-hp-text', 'hud-boss-hp-fill',
            'hud-speed-mob', 'hud-shield-mob', 'hud-shield-pct-mob', 'hud-nitro-mob', 'hud-nitro-pct-mob',
            'hud-speed-desk', 'hud-shield-desk', 'hud-shield-pct-desk', 'hud-nitro-desk', 'hud-nitro-pct-desk',
            'hud-vehicle-name', 'hud-radio-label', 'hud-toast', 'hud-capture-wrap', 'hud-capture-fill',
            'hud-context-wrap', 'btn-hud-context', 'minimap-canvas',
            'btn-hud-camera', 'btn-hud-radio', 'btn-hud-time', 'btn-hud-sound', 'btn-hud-pause',
            'touch-controls', 'joystick-zone', 'joystick-knob',
            'touch-btn-nitro', 'touch-btn-enter', 'touch-btn-drift', 'touch-btn-horn',
            'touch-icon-nitro', 'touch-lbl-nitro', 'touch-icon-enter', 'touch-lbl-enter',
            'touch-icon-drift', 'touch-lbl-drift', 'touch-icon-horn', 'touch-lbl-horn',
            'screen-menu', 'btn-menu-campaign', 'btn-menu-freeroam', 'btn-menu-garage', 'btn-menu-levels', 'menu-progress-summary',
            'screen-levels', 'levels-grid', 'btn-toggle-unlock-all', 'btn-levels-back',
            'screen-garage', 'garage-vehicle-stats', 'btn-garage-save', 'garage-vehicles-list', 'garage-colors-list', 'garage-underglows-list',
            'screen-briefing', 'briefing-badge', 'briefing-title', 'briefing-desc', 'briefing-tip', 'btn-briefing-start', 'btn-briefing-back',
            'screen-paused', 'btn-pause-resume', 'btn-pause-recover', 'btn-pause-restart', 'btn-pause-garage', 'btn-pause-levels', 'btn-pause-touch', 'btn-pause-menu',
            'screen-victory', 'victory-campaign-banner', 'victory-title', 'victory-stars', 'victory-stats', 'btn-victory-next', 'btn-victory-replay', 'btn-victory-levels',
            'screen-failed', 'failed-title', 'failed-desc', 'btn-failed-retry', 'btn-failed-levels'
        ];
        for (var i = 0; i < ids.length; i++) {
            var camel = ids[i].replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
            dom[camel] = document.getElementById(ids[i]);
        }
        if (dom.minimapCanvas) {
            minimapCtx = dom.minimapCanvas.getContext('2d');
        }
    }

    function init() {
        cacheDom();

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.3, 420);
        renderer = new THREE.WebGLRenderer({ canvas: dom.gameCanvas, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);

        if (GTC.Textures && GTC.Textures.init) GTC.Textures.init();
        if (GTC.City && GTC.City.build) GTC.City.build(scene);
        if (GTC.City && GTC.City.setTimeOfDay) GTC.City.setTimeOfDay(save.timeOfDay);

        createPlayerMesh();
        createDirectionArrow();
        createNitroPickups();

        dom.btnHudTime.textContent = TIME_ICONS[save.timeOfDay] || '🌅';
        dom.btnHudSound.textContent = save.muted ? '🔇' : '🔊';

        setupInputsAndUI();
        applyTouchVisibility();
        setGameState('MENU');

        requestAnimationFrame(tick);
    }

    window.GTC.Game = {
        init: init,
        getState: function () { return gameState; },
        getSave: function () { return save; },
        openLevelSelect: openLevelSelect,
        openGarage: openGarage,
        launchFreeRoam: launchFreeRoam,
        launchLevel: launchLevel
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
