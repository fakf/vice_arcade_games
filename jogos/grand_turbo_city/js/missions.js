(function () {
    'use strict';

    window.GTC = window.GTC || {};

    // =========================================================================
    // Utilitários de Geometria & Navegação
    // =========================================================================
    function dist2D(ax, az, bx, bz) {
        var dx = bx - ax;
        var dz = bz - az;
        return Math.sqrt(dx * dx + dz * dz);
    }

    function normalizeAngle(a) {
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return a;
    }

    function angleTo(ax, az, bx, bz) {
        return Math.atan2(bx - ax, bz - az);
    }

    // Cria anel luminoso no chão + coluna vertical translúcida
    function createBeaconMesh(colorHex, radius, height) {
        var group = new THREE.Group();
        var ringGeo = new THREE.TorusGeometry(radius, 0.35, 10, 32);
        var ringMat = new THREE.MeshBasicMaterial({ color: colorHex });
        var ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.35;
        group.add(ring);

        var colGeo = new THREE.CylinderGeometry(radius * 0.85, radius * 0.95, height || 10, 20, 1, true);
        var colMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        var col = new THREE.Mesh(colGeo, colMat);
        col.position.y = (height || 10) * 0.5;
        group.add(col);
        return group;
    }

    // Cria arco néon vertical (Nível 1)
    function createHoopMesh(colorHex, angleY) {
        var group = new THREE.Group();
        var torusGeo = new THREE.TorusGeometry(5.2, 0.45, 10, 28);
        var torusMat = new THREE.MeshBasicMaterial({ color: colorHex });
        var torus = new THREE.Mesh(torusGeo, torusMat);
        torus.position.y = 4.5;
        group.add(torus);

        var baseRing = new THREE.Mesh(
            new THREE.RingGeometry(4.8, 5.6, 24),
            new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
        );
        baseRing.rotation.x = -Math.PI / 2;
        baseRing.position.y = 0.12;
        group.add(baseRing);

        group.rotation.y = angleY || 0;
        return group;
    }

    // Cria estrela dourada no ar (Nível 3)
    function createAirStarMesh() {
        var group = new THREE.Group();
        var core = new THREE.Mesh(
            new THREE.OctahedronGeometry(1.5, 0),
            new THREE.MeshStandardMaterial({
                color: 0xfacc15,
                emissive: 0xf59e0b,
                emissiveIntensity: 0.8,
                metalness: 0.6,
                roughness: 0.2
            })
        );
        group.add(core);
        var halo = new THREE.Mesh(
            new THREE.TorusGeometry(2.1, 0.14, 8, 24),
            new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.8 })
        );
        group.add(halo);
        return group;
    }

    // Cria mini-drone flutuante (Nível 8)
    function createDroneMesh() {
        var group = new THREE.Group();
        var body = new THREE.Mesh(
            new THREE.SphereGeometry(0.65, 14, 12),
            new THREE.MeshStandardMaterial({
                color: 0x22d3ee,
                emissive: 0x06b6d4,
                emissiveIntensity: 0.7,
                roughness: 0.25
            })
        );
        body.scale.set(1.2, 0.65, 1.2);
        group.add(body);

        var eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.24, 10, 10),
            new THREE.MeshBasicMaterial({ color: 0xec4899 })
        );
        eye.position.set(0, 0, 0.62);
        group.add(eye);

        var offsets = [[-0.85, 0.28, -0.85], [0.85, 0.28, -0.85], [-0.85, 0.28, 0.85], [0.85, 0.28, 0.85]];
        var rotorMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
        for (var i = 0; i < offsets.length; i++) {
            var r = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 6, 14), rotorMat);
            r.rotation.x = Math.PI / 2;
            r.position.set(offsets[i][0], offsets[i][1], offsets[i][2]);
            group.add(r);
        }
        return group;
    }

    // Cria cone / barreira de trânsito (Níveis 9 e 10)
    function createConeObject(scene, x, z) {
        var group = new THREE.Group();
        var base = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.16, 1.1),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 })
        );
        base.position.y = 0.08;
        group.add(base);

        var cone = new THREE.Mesh(
            new THREE.ConeGeometry(0.45, 1.25, 10),
            new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x9a3412, emissiveIntensity: 0.35 })
        );
        cone.position.y = 0.72;
        group.add(cone);

        var stripe = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.32, 0.26, 10),
            new THREE.MeshBasicMaterial({ color: 0xf8fafc })
        );
        stripe.position.y = 0.78;
        group.add(stripe);

        group.position.set(x, 0, z);
        scene.add(group);

        return {
            x: x,
            y: 0,
            z: z,
            radius: 0.8,
            knocked: false,
            active: true,
            vx: 0,
            vy: 0,
            vz: 0,
            age: 0,
            mesh: group
        };
    }

    // =========================================================================
    // Estado Interno do Gestor de Missões & IA
    // =========================================================================
    var state = {
        mode: 'free', // 'free' | 'level'
        levelId: 0,
        title: 'Modo Livre',
        objectiveText: 'Explora Vice Neon à vontade!',
        progressText: '',
        timeLimit: 0,
        timeLeft: 0,
        elapsed: 0,
        wantedStars: 0,
        captureTimer: 0,
        captureLimit: 2.2,
        escapeTimer: 0,
        collisionTimestamps: [],
        boss: null,
        bossHp: 0,
        bossMaxHp: 0,
        racePos: 0,
        raceTotal: 0,
        targets: [],       // para minimapa: [{ x, z, color, type }]
        primaryTarget: null, // para seta 3D: { x, y, z }
        requiredVehicle: null,
        exitWarnCooldown: 0,
        paintShopCooldown: 0,
        canOpenGarageAtShop: false,
        inPaintShop: false,
        levelData: null
    };

    var missionMeshes = [];
    var policeVehicles = [];
    var trafficVehicles = [];
    var rivalVehicles = [];
    var fugitiveVehicle = null;

    var POLICE_SPEEDS = [0, 38, 45, 52];
    var PAINT_COLORS = ['#ec4899', '#22d3ee', '#facc15', '#ef4444', '#84cc16', '#a855f7', '#f8fafc'];

    function trackMesh(ctx, mesh) {
        if (!mesh) return mesh;
        if (!mesh.parent) ctx.scene.add(mesh);
        missionMeshes.push(mesh);
        return mesh;
    }

    function removeTrackedMesh(ctx, mesh) {
        if (!mesh) return;
        if (mesh.parent) mesh.parent.remove(mesh);
        var idx = missionMeshes.indexOf(mesh);
        if (idx !== -1) missionMeshes.splice(idx, 1);
    }

    // =========================================================================
    // Helpers de IA (Navegação na Malha Viária + Anti-Stuck + Steering)
    // =========================================================================
    function findClosestRoadNode(city, x, z) {
        var nodes = (city && city.roadNodes) ? city.roadNodes : [];
        var best = null;
        var bestD = Infinity;
        for (var i = 0; i < nodes.length; i++) {
            var d = dist2D(x, z, nodes[i].x, nodes[i].z);
            if (d < bestD) {
                bestD = d;
                best = nodes[i];
            }
        }
        return best;
    }

    function getNodeById(city, id) {
        var nodes = (city && city.roadNodes) ? city.roadNodes : [];
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) return nodes[i];
        }
        return nodes[0] || { id: 0, x: -40, z: -40, neighbors: [] };
    }

    function pickNextNodeTowards(city, currentNode, targetX, targetZ, avoidNodeId) {
        if (!currentNode || !currentNode.neighbors || !currentNode.neighbors.length) return currentNode;
        var best = null;
        var bestScore = Infinity;
        for (var i = 0; i < currentNode.neighbors.length; i++) {
            var nId = currentNode.neighbors[i];
            if (nId === avoidNodeId && currentNode.neighbors.length > 1) continue;
            var n = getNodeById(city, nId);
            var d = dist2D(n.x, n.z, targetX, targetZ);
            if (d < bestScore) {
                bestScore = d;
                best = n;
            }
        }
        return best || getNodeById(city, currentNode.neighbors[0]);
    }

    function pickRandomNeighbor(city, currentNode, prevNodeId) {
        if (!currentNode || !currentNode.neighbors || !currentNode.neighbors.length) return currentNode;
        var choices = [];
        for (var i = 0; i < currentNode.neighbors.length; i++) {
            if (currentNode.neighbors[i] !== prevNodeId || currentNode.neighbors.length === 1) {
                choices.push(currentNode.neighbors[i]);
            }
        }
        var chosenId = choices[Math.floor(Math.random() * choices.length)];
        return getNodeById(city, chosenId);
    }

    // Calcula input de condução IA com desvio frontal e anti-stuck
    function computeAISteering(v, targetX, targetZ, desiredSpeed, dt, city, allVehicles) {
        var desiredAngle = angleTo(v.x, v.z, targetX, targetZ);
        var diff = normalizeAngle(desiredAngle - v.angle);

        // Desvio frontal simples contra obstáculos AABB
        var fx = Math.sin(v.angle);
        var fz = Math.cos(v.angle);
        var lookDist = 6.5;
        var probeX = v.x + fx * lookDist;
        var probeZ = v.z + fz * lookDist;
        var colliders = (city && city.colliders) ? city.colliders : [];
        var blockedAhead = false;
        for (var i = 0; i < colliders.length; i++) {
            var c = colliders[i];
            if (c.blocksVehicles === false) continue;
            if (probeX >= c.minX - 1.2 && probeX <= c.maxX + 1.2 && probeZ >= c.minZ - 1.2 && probeZ <= c.maxZ + 1.2) {
                blockedAhead = true;
                break;
            }
        }

        // Em forward=(sin, cos), girar para a esquerda aumenta angle (diff > 0 => steer = -1)
        var steer = 0;
        if (Math.abs(diff) > 0.06) {
            steer = diff > 0 ? -Math.min(1, diff * 1.8) : Math.min(1, -diff * 1.8);
        }
        if (blockedAhead) {
            steer = diff >= 0 ? -1 : 1;
        }

        // Reduz velocidade em curvas apertadas ou trânsito à frente
        var speedRatio = Math.abs(diff) > 0.85 ? 0.55 : 1.0;
        if (v.aiRole === 'traffic' && allVehicles) {
            for (var j = 0; j < allVehicles.length; j++) {
                var other = allVehicles[j];
                if (other === v) continue;
                var odx = other.x - v.x;
                var odz = other.z - v.z;
                var od = Math.sqrt(odx * odx + odz * odz);
                if (od < 10 && od > 0.1) {
                    var dot = (odx * fx + odz * fz) / od;
                    if (dot > 0.72) {
                        speedRatio = od < 5.5 ? 0 : 0.35;
                        break;
                    }
                }
            }
        }

        var targetSpd = desiredSpeed * speedRatio;
        var throttle = 0;
        if (v.speed < targetSpd - 1.5) throttle = 1;
        else if (v.speed > targetSpd + 3) throttle = -0.6;

        // Anti-stuck: se mover < 1.5 u durante 2.5s a tentar avançar
        if (!v.lastPos) {
            v.lastPos = { x: v.x, z: v.z };
            v.stuckTimer = 0;
        }
        if (throttle > 0.2) {
            var moved = dist2D(v.x, v.z, v.lastPos.x, v.lastPos.z);
            if (moved < 1.5) {
                v.stuckTimer = (v.stuckTimer || 0) + dt;
                if (v.stuckTimer >= 2.5) {
                    var safe = city.findNearestRoadPoint ? city.findNearestRoadPoint(v.x, v.z) : { x: v.x, z: v.z, angle: desiredAngle };
                    v.x = safe.x;
                    v.z = safe.z;
                    v.angle = angleTo(v.x, v.z, targetX, targetZ);
                    v.speed = 8;
                    v.stuckTimer = 0;
                    v.lastPos.x = v.x;
                    v.lastPos.z = v.z;
                }
            } else {
                v.stuckTimer = 0;
                v.lastPos.x = v.x;
                v.lastPos.z = v.z;
            }
        } else {
            v.stuckTimer = 0;
            v.lastPos.x = v.x;
            v.lastPos.z = v.z;
        }

        return { throttle: throttle, steer: steer, drift: false, nitro: false };
    }

    function stepAIVehicle(ctx, v, targetX, targetZ, maxSpeed, dt) {
        var origMax = v.spec ? v.spec.maxSpeed : 40;
        if (v.spec && maxSpeed) v.spec.maxSpeed = maxSpeed;
        var input = computeAISteering(v, targetX, targetZ, maxSpeed || origMax, dt, ctx.city, ctx.vehicles);
        ctx.vehiclesApi.stepPhysics(v, input, dt, ctx.city, ctx.vehicles, ctx.cones);
        if (v.spec) v.spec.maxSpeed = origMax;
    }

    // =========================================================================
    // Trânsito Ambiente
    // =========================================================================
    function spawnTraffic(ctx, count) {
        var nodes = (ctx.city && ctx.city.roadNodes) ? ctx.city.roadNodes : [];
        if (!nodes.length || count <= 0) return;

        var types = ['coupe', 'van', 'buggy', 'moto'];
        var colors = ['#cbd5e1', '#334155', '#f3e8c8', '#1e3a8a', '#b91c1c', '#f8fafc', '#166534'];
        var px = ctx.player.x;
        var pz = ctx.player.z;

        for (var i = 0; i < count; i++) {
            var chosen = nodes[(i * 3 + 2) % nodes.length];
            if (dist2D(chosen.x, chosen.z, px, pz) < 30) {
                chosen = nodes[(i * 3 + 7) % nodes.length];
            }
            var next = pickRandomNeighbor(ctx.city, chosen, -1);
            var typeId = types[i % types.length];
            var v = ctx.spawnVehicle(typeId, {
                x: chosen.x + ((i % 2 === 0) ? 2.5 : -2.5),
                z: chosen.z,
                angle: angleTo(chosen.x, chosen.z, next.x, next.z),
                color: colors[i % colors.length],
                underglow: null,
                isAI: true,
                aiRole: 'traffic'
            });
            v._aiNode = next;
            v._aiPrevId = chosen.id;
            v._aiSpeed = 18 + (i % 4) * 2.2;
            trafficVehicles.push(v);
        }
    }

    function updateTraffic(ctx, dt) {
        for (var i = 0; i < trafficVehicles.length; i++) {
            var v = trafficVehicles[i];
            if (!v || !v.isAI || v === ctx.player.vehicle) continue;
            if (!v._aiNode) {
                v._aiNode = findClosestRoadNode(ctx.city, v.x, v.z);
            }
            if (v._aiNode && dist2D(v.x, v.z, v._aiNode.x, v._aiNode.z) < 7) {
                var prevId = v._aiPrevId;
                v._aiPrevId = v._aiNode.id;
                v._aiNode = pickRandomNeighbor(ctx.city, v._aiNode, prevId);
            }
            if (v._aiNode) {
                stepAIVehicle(ctx, v, v._aiNode.x, v._aiNode.z, v._aiSpeed || 20, dt);
            }
        }
    }

    // =========================================================================
    // Polícia Humana Cartoon (0-3 ⭐)
    // =========================================================================
    function syncPoliceCount(ctx) {
        var desired = state.wantedStars;
        while (policeVehicles.length > desired) {
            var rem = policeVehicles.pop();
            ctx.removeVehicle(rem);
        }
        var nodes = (ctx.city && ctx.city.roadNodes) ? ctx.city.roadNodes : [];
        while (policeVehicles.length < desired && nodes.length > 0) {
            var px = ctx.player.x;
            var pz = ctx.player.z;
            var bestNode = nodes[0];
            var candidates = [];
            for (var i = 0; i < nodes.length; i++) {
                var d = dist2D(nodes[i].x, nodes[i].z, px, pz);
                if (d >= 55 && d <= 85) candidates.push(nodes[i]);
            }
            if (candidates.length > 0) {
                bestNode = candidates[Math.floor(Math.random() * candidates.length)];
            } else {
                var bestDiff = Infinity;
                for (var j = 0; j < nodes.length; j++) {
                    var dd = Math.abs(dist2D(nodes[j].x, nodes[j].z, px, pz) - 70);
                    if (dd < bestDiff) {
                        bestDiff = dd;
                        bestNode = nodes[j];
                    }
                }
            }
            var pv = ctx.spawnVehicle('police', {
                x: bestNode.x,
                z: bestNode.z,
                angle: angleTo(bestNode.x, bestNode.z, px, pz),
                color: '#f8fafc',
                underglow: '#22d3ee',
                isAI: true,
                aiRole: 'police',
                sirenOn: true
            });
            pv.sirenOn = true;
            pv._aiNode = bestNode;
            pv._aiPrevId = -1;
            policeVehicles.push(pv);
        }
        updateSirenAudio(ctx);
    }

    function setWantedStars(ctx, stars) {
        var clamped = Math.max(0, Math.min(3, stars));
        var prev = state.wantedStars;
        if (clamped !== state.wantedStars) {
            state.wantedStars = clamped;
            if (clamped === 0) {
                state.captureTimer = 0;
                state.escapeTimer = 0;
            } else if (clamped > prev && ctx && ctx.audio && ctx.audio.playSfx) {
                ctx.audio.playSfx('policeChirp');
            }
            syncPoliceCount(ctx);
        }
    }

    function updateSirenAudio(ctx) {
        var pVeh = (ctx.player && ctx.player.inVehicle) ? ctx.player.vehicle : null;
        var playerSiren = pVeh && pVeh.typeId === 'police' && pVeh.sirenOn;
        var playerMode = playerSiren ? (pVeh.sirenMode || 'wail') : null;

        if (ctx.audio && ctx.audio.updatePoliceContext) {
            var minDist = Infinity;
            var closingSpeed = 0;
            var px = ctx.player.x;
            var pz = ctx.player.z;
            var pVx = pVeh ? Math.sin(pVeh.angle) * pVeh.speed : 0;
            var pVz = pVeh ? Math.cos(pVeh.angle) * pVeh.speed : 0;

            for (var i = 0; i < policeVehicles.length; i++) {
                var pv = policeVehicles[i];
                if (!pv) continue;
                var d = dist2D(pv.x, pv.z, px, pz);
                if (d < minDist) {
                    minDist = d;
                    if (d > 0.5) {
                        var dirX = (px - pv.x) / d;
                        var dirZ = (pz - pv.z) / d;
                        var cVx = Math.sin(pv.angle) * pv.speed;
                        var cVz = Math.cos(pv.angle) * pv.speed;
                        closingSpeed = (cVx - pVx) * dirX + (cVz - pVz) * dirZ;
                    }
                }
            }

            ctx.audio.updatePoliceContext({
                playerSirenMode: playerMode,
                policeCount: state.wantedStars > 0 ? policeVehicles.length : 0,
                minDist: minDist,
                closingSpeed: closingSpeed
            });
        } else if (ctx.audio && ctx.audio.setSirenActive) {
            ctx.audio.setSirenActive(state.wantedStars > 0 || !!playerSiren);
        }
    }

    function updatePolice(ctx, dt) {
        if (state.wantedStars <= 0) {
            state.captureTimer = 0;
            return;
        }
        var px = ctx.player.x;
        var pz = ctx.player.z;
        var maxSpd = POLICE_SPEEDS[state.wantedStars] || 42;
        var anyCapturing = false;
        var minDistToPlayer = Infinity;

        for (var i = 0; i < policeVehicles.length; i++) {
            var pv = policeVehicles[i];
            if (!pv) continue;
            pv.sirenOn = true;
            var dPlayer = dist2D(pv.x, pv.z, px, pz);
            if (dPlayer < minDistToPlayer) minDistToPlayer = dPlayer;

            var tx = px;
            var tz = pz;
            // Se estiver longe, navega pelos cruzamentos para evitar ficar preso em quarteirões
            if (dPlayer > 44) {
                if (!pv._aiNode || dist2D(pv.x, pv.z, pv._aiNode.x, pv._aiNode.z) < 8) {
                    var cur = pv._aiNode || findClosestRoadNode(ctx.city, pv.x, pv.z);
                    pv._aiNode = pickNextNodeTowards(ctx.city, cur, px, pz, pv._aiPrevId);
                    pv._aiPrevId = cur ? cur.id : -1;
                }
                if (pv._aiNode) {
                    tx = pv._aiNode.x;
                    tz = pv._aiNode.z;
                }
            } else {
                pv._aiNode = null;
            }

            stepAIVehicle(ctx, pv, tx, tz, maxSpd, dt);

            // Regras de captura (SPEC §5.1)
            if (ctx.player.inVehicle && ctx.player.vehicle) {
                if (dPlayer < 4.8 && Math.abs(ctx.player.vehicle.speed) < 6) {
                    anyCapturing = true;
                    state.captureLimit = 2.2;
                }
            } else {
                if (dPlayer < 5.0) {
                    anyCapturing = true;
                    state.captureLimit = 2.0;
                }
            }
        }

        if (anyCapturing) {
            state.captureTimer += dt;
            if (state.captureTimer >= state.captureLimit) {
                state.captureTimer = 0;
                if (ctx.audio) ctx.audio.playSfx('ticket');
                if (state.mode === 'free') {
                    setWantedStars(ctx, 0);
                    state.collisionTimestamps = [];
                    ctx.showToast('🚨 MULTA DE VELOCIDADE! De volta à Oficina!', 3.2);
                    if (ctx.player.inVehicle && ctx.player.vehicle) {
                        ctx.player.vehicle.x = -40;
                        ctx.player.vehicle.y = 0;
                        ctx.player.vehicle.z = 0;
                        ctx.player.vehicle.speed = 0;
                        ctx.player.vehicle.angle = Math.PI;
                        ctx.player.vehicle.shield = ctx.player.vehicle.maxShield;
                    } else {
                        ctx.setPlayerOnFoot(-40, 6, Math.PI);
                    }
                } else {
                    ctx.failMission(
                        'ticket',
                        '🚨 Multa de Velocidade!',
                        'A polícia passou-te uma multa divertida! Usa o Nitro para te afastares!'
                    );
                }
                return;
            }
        } else {
            state.captureTimer = Math.max(0, state.captureTimer - dt * 1.5);
        }

        // Modo Livre: despistar mantendo > 85 u durante 15s
        if (state.mode === 'free') {
            if (minDistToPlayer > 85) {
                state.escapeTimer += dt;
                if (state.escapeTimer >= 15) {
                    setWantedStars(ctx, 0);
                    state.collisionTimestamps = [];
                    ctx.showToast('🌟 Polícia despistada com sucesso!', 2.6);
                }
            } else {
                state.escapeTimer = 0;
            }
        }
    }

    // Chamado por game.js quando o jogador colide fortemente com trânsito/polícia em Modo Livre
    function onFreeRoamCollision(ctx) {
        if (state.mode !== 'free') return;
        var now = ctx.time || 0;
        state.collisionTimestamps.push(now);
        // Janela deslizante de 15s
        state.collisionTimestamps = state.collisionTimestamps.filter(function (t) {
            return now - t <= 15;
        });
        var needed = (state.wantedStars + 1) * 3;
        if (state.wantedStars < 3 && state.collisionTimestamps.length >= needed) {
            setWantedStars(ctx, state.wantedStars + 1);
            ctx.showToast('🚨 Alerta Policial: ' + state.wantedStars + ' ⭐!', 2.4);
        }
    }

    // =========================================================================
    // Oficina Turbo (Paint & Spray) — Regra Única SPEC §5.2
    // =========================================================================
    function updatePaintShop(ctx, dt) {
        if (state.paintShopCooldown > 0) state.paintShopCooldown -= dt;
        var shop = (ctx.city && ctx.city.landmarks && ctx.city.landmarks.paintShop)
            ? ctx.city.landmarks.paintShop
            : { x: -32, z: 0, radius: 8 };

        var d = dist2D(ctx.player.x, ctx.player.z, shop.x, shop.z);
        var inside = d <= shop.radius;
        var justEntered = inside && !state.inPaintShop;
        state.inPaintShop = inside;
        state.canOpenGarageAtShop = false;

        if (!inside) return;

        var v = ctx.player.inVehicle ? ctx.player.vehicle : null;

        if (state.mode === 'free') {
            if (state.wantedStars > 0 && v) {
                v.shield = v.maxShield;
                var newColor = PAINT_COLORS[Math.floor(Math.random() * PAINT_COLORS.length)];
                ctx.vehiclesApi.applyCustomization(v, newColor, v.underglow);
                setWantedStars(ctx, 0);
                state.collisionTimestamps = [];
                if (ctx.audio) ctx.audio.playSfx('paint');
                ctx.spawnParticles('confetti', v.x, 2, v.z, 22, newColor);
                ctx.showToast('🎨 Nova Pintura! Escudo 100% e Polícia despistada!', 2.8);
                state.paintShopCooldown = 2.0;
            } else {
                if (v && v.shield < v.maxShield && state.paintShopCooldown <= 0) {
                    v.shield = v.maxShield;
                    if (ctx.audio) ctx.audio.playSfx('paint');
                    ctx.showToast('🔧 Veículo reparado a 100% na Oficina!', 2.0);
                    state.paintShopCooldown = 2.5;
                }
                state.canOpenGarageAtShop = true;
            }
        } else if (state.levelId === 6 && v) {
            var ld6 = state.levelData;
            if (ld6 && ld6.stage < 3) {
                if (justEntered || (v.shield < v.maxShield && state.paintShopCooldown <= 0)) {
                    v.shield = v.maxShield;
                    if (ctx.audio) ctx.audio.playSfx('paint');
                    ctx.showToast('🔧 Escudo reparado! Passa primeiro pelos 3 checkpoints!', 2.8);
                    state.paintShopCooldown = 2.5;
                }
            }
        } else if (state.levelId === 9 && v) {
            if (justEntered || (v.shield < v.maxShield && state.paintShopCooldown <= 0)) {
                v.shield = v.maxShield;
                if (ctx.audio) ctx.audio.playSfx('paint');
                ctx.showToast('🔧 Escudo reparado! Entrega o Núcleo na Marina para despistar!', 2.8);
                state.paintShopCooldown = 2.5;
            }
        }
    }

    // =========================================================================
    // Atualização de Cones Derrubados
    // =========================================================================
    function updateCones(ctx, dt) {
        for (var i = ctx.cones.length - 1; i >= 0; i--) {
            var c = ctx.cones[i];
            if (c.knocked) {
                c.age += dt;
                c.x += (c.vx || 0) * dt;
                c.z += (c.vz || 0) * dt;
                c.y = Math.max(0, (c.y || 0) + (c.vy || 0) * dt);
                c.vy = (c.vy || 0) - 24 * dt;
                if (c.mesh) {
                    c.mesh.position.set(c.x, c.y, c.z);
                    c.mesh.rotation.x += dt * 7;
                    c.mesh.rotation.z += dt * 5;
                }
                if (c.age > 2.2) {
                    if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh);
                    ctx.cones.splice(i, 1);
                }
            }
        }
    }

    // =========================================================================
    // Cálculo de Estrelas (SPEC §6)
    // =========================================================================
    function computeTimeStars() {
        if (!state.timeLimit || state.timeLimit <= 0) return 3;
        var ratio = state.timeLeft / state.timeLimit;
        if (ratio >= 0.40) return 3;
        if (ratio >= 0.15) return 2;
        return 1;
    }

    function formatTime(sec) {
        var s = Math.max(0, Math.ceil(sec));
        var m = Math.floor(s / 60);
        var r = s % 60;
        return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
    }

    function checkRequiredVehicle(ctx) {
        if (!state.requiredVehicle) return true;
        if (ctx.player.inVehicle && ctx.player.vehicle === state.requiredVehicle) return true;
        state.primaryTarget = {
            x: state.requiredVehicle.x,
            y: 2.5,
            z: state.requiredVehicle.z
        };
        if (state.exitWarnCooldown <= 0) {
            ctx.showToast('🚗 Volta para o teu veículo da missão!', 2.4);
            state.exitWarnCooldown = 3.5;
        }
        return false;
    }

    // =========================================================================
    // OS 10 NÍVEIS DA CAMPANHA (SPEC §6)
    // =========================================================================
    var LEVELS = [
        // ---------------------------------------------------------------------
        // NÍVEL 1: Carta de Condução Turbo
        // ---------------------------------------------------------------------
        {
            id: 1,
            title: 'Carta de Condução Turbo',
            briefing: 'Entra no teu Turbo Coupé, passa pelos 6 arcos néon das avenidas e estaciona na Oficina Turbo!',
            tip: 'Prime E (ou botão Entrar) ao lado do carro. Usa Shift para dar Nitro nas retas!',
            startMode: 'foot',
            startVehicle: 'coupe',
            timeLimit: 120,
            trafficCount: 6,
            init: function (ctx) {
                var car = ctx.spawnVehicle('coupe', {
                    x: -40, z: 20, angle: Math.PI,
                    color: ctx.save.customization.color,
                    underglow: ctx.save.customization.underglow
                });
                ctx.setPlayerOnFoot(-40, 26, Math.PI);
                state.requiredVehicle = car;

                var hoops = [
                    { x: -40, z: -20, angle: 0 },
                    { x: -40, z: -80, angle: 0 },
                    { x: 40, z: -120, angle: Math.PI / 2 },
                    { x: 108, z: -80, angle: 0 },
                    { x: 108, z: 0, angle: 0 },
                    { x: 108, z: 60, angle: 0 }
                ];
                var hoopMesh = trackMesh(ctx, createHoopMesh(0x22d3ee, hoops[0].angle));
                hoopMesh.position.set(hoops[0].x, 0, hoops[0].z);
                hoopMesh.visible = false;

                var shopBeacon = trackMesh(ctx, createBeaconMesh(0x84cc16, 7.5, 11));
                shopBeacon.position.set(-32, 0, 0);
                shopBeacon.visible = false;

                state.levelData = {
                    step: 'enter', // 'enter' -> 'hoops' -> 'park'
                    hoops: hoops,
                    hoopIdx: 0,
                    hoopMesh: hoopMesh,
                    shopBeacon: shopBeacon,
                    parkTimer: 0
                };
                state.objectiveText = 'Entra no Turbo Coupé (E)';
                state.progressText = 'Passo 1/3';
            },
            update: function (ctx, dt) {
                var d = state.levelData;
                var car = state.requiredVehicle;

                if (d.step === 'enter') {
                    state.primaryTarget = { x: car.x, y: 2.5, z: car.z };
                    state.targets = [{ x: car.x, z: car.z, color: '#22d3ee', type: 'objective' }];
                    if (ctx.player.inVehicle && ctx.player.vehicle === car) {
                        d.step = 'hoops';
                        d.hoopMesh.visible = true;
                        if (ctx.audio) ctx.audio.playSfx('pickup');
                        ctx.showToast('🚗 Excelente! Passa pelos 6 arcos néon!', 2.2);
                    }
                    return;
                }

                if (!checkRequiredVehicle(ctx)) {
                    state.targets = [{ x: car.x, z: car.z, color: '#facc15', type: 'objective' }];
                    return;
                }

                if (d.step === 'hoops') {
                    var h = d.hoops[d.hoopIdx];
                    d.hoopMesh.position.set(h.x, 0, h.z);
                    d.hoopMesh.rotation.y = h.angle;
                    state.objectiveText = 'Passa pelos arcos néon!';
                    state.progressText = 'Arcos: ' + d.hoopIdx + ' / ' + d.hoops.length;
                    state.primaryTarget = { x: h.x, y: 4.5, z: h.z };
                    state.targets = [{ x: h.x, z: h.z, color: '#22d3ee', type: 'objective' }];

                    if (dist2D(car.x, car.z, h.x, h.z) <= 7.0) {
                        if (ctx.audio) ctx.audio.playSfx('pickup');
                        ctx.spawnParticles('confetti', h.x, 3, h.z, 14, '#22d3ee');
                        d.hoopIdx++;
                        if (d.hoopIdx >= d.hoops.length) {
                            d.step = 'park';
                            d.hoopMesh.visible = false;
                            d.shopBeacon.visible = true;
                            ctx.showToast('🏁 Todos os arcos! Estaciona na Oficina Turbo!', 2.6);
                        }
                    }
                } else if (d.step === 'park') {
                    state.objectiveText = 'Estaciona devagar na Oficina Turbo!';
                    state.progressText = 'Arcos: 6/6 • Estacionar';
                    state.primaryTarget = { x: -32, y: 3, z: 0 };
                    state.targets = [{ x: -32, z: 0, color: '#84cc16', type: 'objective' }];

                    if (dist2D(car.x, car.z, -32, 0) <= 8.0 && Math.abs(car.speed) <= 8) {
                        d.parkTimer += dt;
                        if (d.parkTimer >= 0.4) {
                            ctx.completeMission(computeTimeStars(), 'Carta tirada em ' + formatTime(state.elapsed) + '!');
                        }
                    } else {
                        d.parkTimer = 0;
                    }
                }
            }
        },

        // ---------------------------------------------------------------------
        // NÍVEL 2: Entrega Expresso de Pizzas Néon
        // ---------------------------------------------------------------------
        {
            id: 2,
            title: 'Entrega Expresso de Pizzas Néon',
            briefing: 'Conduz o Furgão Expresso e entrega 4 caixas de pizzas bem quentinhas pela cidade!',
            tip: 'Abranda ao entrar em cada anel luminoso para entregar a pizza!',
            startMode: 'vehicle',
            startVehicle: 'van',
            timeLimit: 130,
            trafficCount: 6,
            init: function (ctx) {
                var van = ctx.spawnVehicle('van', {
                    x: -40, z: 16, angle: Math.PI,
                    color: '#facc15',
                    underglow: ctx.save.customization.underglow
                });
                ctx.setPlayerInVehicle(van);
                state.requiredVehicle = van;

                var stops = [
                    { name: 'Praia', x: 124, z: -40 },
                    { name: 'Parque', x: -80, z: -40 },
                    { name: 'Centro', x: 40, z: -80 },
                    { name: 'Marina', x: 40, z: 80 }
                ];
                var beacon = trackMesh(ctx, createBeaconMesh(0xfacc15, 7.5, 11));
                beacon.position.set(stops[0].x, 0, stops[0].z);

                state.levelData = { stops: stops, idx: 0, beacon: beacon };
                state.objectiveText = 'Entrega a pizza na Praia!';
                state.progressText = 'Pizzas: 0 / 4';
            },
            update: function (ctx, dt) {
                var d = state.levelData;
                var van = state.requiredVehicle;
                if (!checkRequiredVehicle(ctx)) {
                    state.targets = [{ x: van.x, z: van.z, color: '#facc15', type: 'objective' }];
                    return;
                }
                var stop = d.stops[d.idx];
                d.beacon.position.set(stop.x, 0, stop.z);
                state.objectiveText = 'Entrega em: ' + stop.name + ' (abranda no anel)';
                state.progressText = 'Pizzas: ' + d.idx + ' / 4';
                state.primaryTarget = { x: stop.x, y: 3, z: stop.z };
                state.targets = [{ x: stop.x, z: stop.z, color: '#facc15', type: 'objective' }];

                if (dist2D(van.x, van.z, stop.x, stop.z) <= 7.5 && Math.abs(van.speed) <= 14) {
                    if (ctx.audio) ctx.audio.playSfx('pickup');
                    ctx.spawnParticles('confetti', stop.x, 2.5, stop.z, 18, '#facc15');
                    d.idx++;
                    if (d.idx >= d.stops.length) {
                        ctx.completeMission(computeTimeStars(), '4 pizzas entregues em ' + formatTime(state.elapsed) + '!');
                    } else {
                        ctx.showToast('🍕 Pizza entregue! Próxima paragem: ' + d.stops[d.idx].name, 2.2);
                    }
                }
            }
        },

        // ---------------------------------------------------------------------
        // NÍVEL 3: Saltos de Cinema
        // ---------------------------------------------------------------------
        {
            id: 3,
            title: 'Saltos de Cinema',
            briefing: 'Acelera na Moto Néon pelas 5 rampas marcadas e apanha as 5 estrelas brilhantes no ar!',
            tip: 'Usa o Nitro (Shift) antes de subir cada rampa para voar mais alto! Podes saltar pela ordem que quiseres.',
            startMode: 'vehicle',
            startVehicle: 'moto',
            timeLimit: 140,
            trafficCount: 0,
            init: function (ctx) {
                var moto = ctx.spawnVehicle('moto', {
                    x: 108, z: -100, angle: 0,
                    color: '#ec4899',
                    underglow: '#22d3ee'
                });
                ctx.setPlayerInVehicle(moto);
                state.requiredVehicle = moto;

                // Rampas 1, 2, 3, 5 e 7 (índices 0, 1, 2, 4, 6)
                var ramps = (ctx.city && ctx.city.ramps) ? ctx.city.ramps : [];
                var indices = [0, 1, 2, 4, 6];
                var stars = [];
                for (var i = 0; i < indices.length; i++) {
                    var r = ramps[indices[i]];
                    if (!r) continue;
                    var sx = r.x + r.dirX * (r.length * 0.5 + 1.5);
                    var sz = r.z + r.dirZ * (r.length * 0.5 + 1.5);
                    var mesh = trackMesh(ctx, createAirStarMesh());
                    mesh.position.set(sx, 5.5, sz);
                    stars.push({ x: sx, y: 5.5, z: sz, collected: false, mesh: mesh });
                }

                state.levelData = { stars: stars, count: 0 };
                state.objectiveText = 'Salta as rampas e apanha as 5 estrelas no ar!';
                state.progressText = 'Estrelas: 0 / ' + stars.length;
            },
            update: function (ctx, dt) {
                var d = state.levelData;
                var moto = state.requiredVehicle;
                if (!checkRequiredVehicle(ctx)) {
                    state.targets = [{ x: moto.x, z: moto.z, color: '#facc15', type: 'objective' }];
                    return;
                }

                var targets = [];
                var nearest = null;
                var nearestDist = Infinity;

                for (var i = 0; i < d.stars.length; i++) {
                    var st = d.stars[i];
                    if (st.collected) continue;
                    st.mesh.rotation.y += dt * 2.6;
                    st.mesh.position.y = st.y + Math.sin(ctx.time * 3 + i) * 0.35;

                    var dx = moto.x - st.x;
                    var dy = (moto.y + 1.2) - st.y;
                    var dz = moto.z - st.z;
                    var dist3 = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist3 <= 4.0) {
                        st.collected = true;
                        st.mesh.visible = false;
                        d.count++;
                        if (ctx.audio) ctx.audio.playSfx('pickup');
                        ctx.spawnParticles('confetti', st.x, st.y, st.z, 20, '#facc15');
                        ctx.showToast('⭐ Estrela no ar! (' + d.count + '/' + d.stars.length + ')', 2.0);
                        continue;
                    }

                    targets.push({ x: st.x, z: st.z, color: '#facc15', type: 'objective' });
                    var d2 = dist2D(moto.x, moto.z, st.x, st.z);
                    if (d2 < nearestDist) {
                        nearestDist = d2;
                        nearest = st;
                    }
                }

                state.progressText = 'Estrelas: ' + d.count + ' / ' + d.stars.length;
                state.targets = targets;
                state.primaryTarget = nearest ? { x: nearest.x, y: nearest.y, z: nearest.z } : null;

                if (d.count >= d.stars.length) {
                    ctx.completeMission(computeTimeStars(), 'Saltos espetaculares em ' + formatTime(state.elapsed) + '!');
                }
            }
        },

        // ---------------------------------------------------------------------
        // NÍVEL 4: Colecionador da Garagem
        // ---------------------------------------------------------------------
        {
            id: 4,
            title: 'Colecionador da Garagem',
            briefing: 'Encontra os 3 veículos especiais espalhados por Vice Neon (Buggy, Moto e Camião) e traz cada um até à Garagem Secreta!',
            tip: 'Usa o Turbo Coupé de apoio estacionado à porta para chegar lá depressa, depois troca de veículo com E!',
            startMode: 'foot',
            startVehicle: 'coupe',
            timeLimit: 180,
            trafficCount: 6,
            init: function (ctx) {
                ctx.setPlayerOnFoot(-108, -68, Math.PI / 2);
                // Coupé de apoio
                ctx.spawnVehicle('coupe', {
                    x: -108, z: -60, angle: 0,
                    color: ctx.save.customization.color,
                    underglow: ctx.save.customization.underglow
                });

                var specs = [
                    { typeId: 'buggy', name: 'Buggy da Praia', x: 124, z: 10, color: '#84cc16' },
                    { typeId: 'moto', name: 'Moto Néon', x: 40, z: -100, color: '#ec4899' },
                    { typeId: 'truck', name: 'Camião Blindado', x: 74, z: 100, color: '#22d3ee' }
                ];
                var items = [];
                for (var i = 0; i < specs.length; i++) {
                    var s = specs[i];
                    var veh = ctx.spawnVehicle(s.typeId, {
                        x: s.x, z: s.z, angle: Math.PI,
                        color: s.color, underglow: '#facc15'
                    });
                    var marker = trackMesh(ctx, createBeaconMesh(0x22d3ee, 3.6, 8));
                    marker.position.set(s.x, 0, s.z);
                    items.push({ vehicle: veh, name: s.name, delivered: false, marker: marker });
                }

                var garageBeacon = trackMesh(ctx, createBeaconMesh(0x84cc16, 8.0, 12));
                garageBeacon.position.set(-108, 0, -72);

                state.levelData = { items: items, deliveredCount: 0, garageBeacon: garageBeacon };
                state.objectiveText = 'Traz o Buggy, a Moto e o Camião para a Garagem!';
                state.progressText = 'Entregues: 0 / 3';
            },
            update: function (ctx, dt) {
                var d = state.levelData;
                var garage = { x: -108, z: -72, radius: 8 };
                var drivingTarget = null;

                for (var i = 0; i < d.items.length; i++) {
                    var item = d.items[i];
                    if (item.delivered) continue;
                    item.marker.position.set(item.vehicle.x, 0, item.vehicle.z);
                    item.marker.visible = !(ctx.player.inVehicle && ctx.player.vehicle === item.vehicle);
                    if (ctx.player.inVehicle && ctx.player.vehicle === item.vehicle) {
                        drivingTarget = item;
                    }
                }

                if (drivingTarget) {
                    state.objectiveText = 'Leva o ' + drivingTarget.name + ' até à Garagem Secreta!';
                    state.primaryTarget = { x: garage.x, y: 3, z: garage.z };
                    state.targets = [{ x: garage.x, z: garage.z, color: '#84cc16', type: 'objective' }];

                    if (dist2D(drivingTarget.vehicle.x, drivingTarget.vehicle.z, garage.x, garage.z) <= garage.radius) {
                        drivingTarget.delivered = true;
                        drivingTarget.marker.visible = false;
                        d.deliveredCount++;
                        if (ctx.audio) ctx.audio.playSfx('pickup');
                        ctx.spawnParticles('confetti', garage.x, 2.5, garage.z, 22, '#84cc16');

                        // Sai do veículo entregue e remove-o para a garagem
                        ctx.setPlayerOnFoot(-108, -64, 0);
                        ctx.removeVehicle(drivingTarget.vehicle);

                        if (d.deliveredCount >= d.items.length) {
                            ctx.completeMission(computeTimeStars(), 'Coleção completa em ' + formatTime(state.elapsed) + '!');
                        } else {
                            ctx.showToast('✔ ' + drivingTarget.name + ' guardado! Faltam ' + (3 - d.deliveredCount) + '!', 2.4);
                        }
                    }
                } else {
                    state.objectiveText = 'Encontra e entra num dos veículos especiais!';
                    var targets = [];
                    var nearest = null;
                    var nearestD = Infinity;
                    for (var j = 0; j < d.items.length; j++) {
                        if (d.items[j].delivered) continue;
                        var v = d.items[j].vehicle;
                        targets.push({ x: v.x, z: v.z, color: '#22d3ee', type: 'objective' });
                        var distV = dist2D(ctx.player.x, ctx.player.z, v.x, v.z);
                        if (distV < nearestD) {
                            nearestD = distV;
                            nearest = v;
                        }
                    }
                    state.targets = targets;
                    state.primaryTarget = nearest ? { x: nearest.x, y: 2.5, z: nearest.z } : null;
                }

                state.progressText = 'Entregues: ' + d.deliveredCount + ' / 3';
            }
        },

        // ---------------------------------------------------------------------
        // NÍVEL 5: Perseguição ao Furgão Fugitivo
        // ---------------------------------------------------------------------
        {
            id: 5,
            title: 'Perseguição ao Furgão Fugitivo',
            briefing: 'Um furgão autónomo fugiu com o Troféu da Cidade! Dá-lhe 3 toques com Nitro ativo para o travar!',
            tip: 'Carrega em Shift (Turbo) ao tocar no furgão para disparar o impulso EMP!',
            startMode: 'vehicle',
            startVehicle: 'coupe',
            timeLimit: 135,
            trafficCount: 6,
            init: function (ctx) {
                var car = ctx.spawnVehicle('coupe', {
                    x: -40, z: -40, angle: Math.PI / 2,
                    color: ctx.save.customization.color,
                    underglow: ctx.save.customization.underglow
                });
                ctx.setPlayerInVehicle(car);

                var startNode = getNodeById(ctx.city, 6) || findClosestRoadNode(ctx.city, 40, -40);
                var nextNode = pickRandomNeighbor(ctx.city, startNode, -1);
                var van = ctx.spawnVehicle('van', {
                    x: startNode.x, z: startNode.z,
                    angle: angleTo(startNode.x, startNode.z, nextNode.x, nextNode.z),
                    color: '#a855f7', underglow: '#ec4899',
                    isAI: true, aiRole: 'fugitive'
                });
                van._aiNode = nextNode;
                van._aiPrevId = startNode.id;
                van.empCooldown = 0;
                fugitiveVehicle = van;

                var marker = trackMesh(ctx, createBeaconMesh(0xec4899, 3.8, 9));
                state.levelData = { hits: 0, maxHits: 3, marker: marker, flashTimer: 0 };
                state.objectiveText = 'Dá 3 toques com Nitro ao Furgão Fugitivo!';
                state.progressText = 'Toques Nitro: 0 / 3';
            },
            update: function (ctx, dt) {
                var d = state.levelData;
                var van = fugitiveVehicle;
                if (!van) return;

                if (van.empCooldown > 0) van.empCooldown -= dt;
                if (d.flashTimer > 0) {
                    d.flashTimer -= dt;
                    if (d.flashTimer <= 0) ctx.vehiclesApi.applyCustomization(van, '#a855f7', '#ec4899');
                }

                if (!van._aiNode || dist2D(van.x, van.z, van._aiNode.x, van._aiNode.z) < 8) {
                    var cur = van._aiNode || findClosestRoadNode(ctx.city, van.x, van.z);
                    van._aiNode = pickRandomNeighbor(ctx.city, cur, van._aiPrevId);
                    van._aiPrevId = cur ? cur.id : -1;
                }
                if (van._aiNode) {
                    stepAIVehicle(ctx, van, van._aiNode.x, van._aiNode.z, 34, dt);
                }

                d.marker.position.set(van.x, 0, van.z);
                state.primaryTarget = { x: van.x, y: 3.5, z: van.z };
                state.targets = [{ x: van.x, z: van.z, color: '#ec4899', type: 'objective' }];
                state.progressText = 'Toques Nitro: ' + d.hits + ' / ' + d.maxHits;

                // Deteção direta de toque com Nitro ativo (backup + evento)
                if (ctx.player.inVehicle && ctx.player.vehicle && ctx.lastPhysicsEvents && ctx.lastPhysicsEvents.nitroActive) {
                    var pv = ctx.player.vehicle;
                    var touchDist = (pv.spec ? pv.spec.radius : 2.1) + (van.spec ? van.spec.radius : 2.3) + 0.8;
                    if (van.empCooldown <= 0 && dist2D(pv.x, pv.z, van.x, van.z) <= touchDist) {
                        van.empCooldown = 1.2;
                        d.hits++;
                        d.flashTimer = 0.35;
                        ctx.vehiclesApi.applyCustomization(van, '#22d3ee', '#22d3ee');
                        if (ctx.audio) ctx.audio.playSfx('emp');
                        ctx.spawnParticles('sparks', van.x, 1.5, van.z, 24, '#22d3ee');
                        ctx.showToast('⚡ IMPACTO NITRO! (' + d.hits + '/' + d.maxHits + ')', 1.8);
                        if (d.hits >= d.maxHits) {
                            ctx.completeMission(computeTimeStars(), 'Troféu recuperado em ' + formatTime(state.elapsed) + '!');
                        }
                    }
                }
            }
        },

        // ---------------------------------------------------------------------
        // NÍVEL 6: Operação Camuflagem
        // ---------------------------------------------------------------------
        {
            id: 6,
            title: 'Operação Camuflagem',
            briefing: 'A polícia está atrás de ti (2 ⭐)! Passa pelos 3 checkpoints de fuga e entra na Oficina Turbo para mudar de cor!',
            tip: 'Se precisares, a Oficina repara o escudo antes dos 3 checkpoints, mas só limpa a polícia no fim!',
            startMode: 'vehicle',
            startVehicle: 'coupe',
            timeLimit: 120,
            trafficCount: 6,
            init: function (ctx) {
                var car = ctx.spawnVehicle('coupe', {
                    x: 40, z: 80, angle: Math.PI / 2,
                    color: ctx.save.customization.color,
                    underglow: ctx.save.customization.underglow
                });
                ctx.setPlayerInVehicle(car);
                setWantedStars(ctx, 2);

                var cps = [
                    { x: 108, z: 40 },
                    { x: 108, z: -80 },
                    { x: -120, z: -40 }
                ];
                var beacon = trackMesh(ctx, createBeaconMesh(0x22d3ee, 8.0, 12));
                beacon.position.set(cps[0].x, 0, cps[0].z);

                state.levelData = { cps: cps, stage: 0, beacon: beacon };
                state.objectiveText = 'Passa pelos 3 checkpoints de fuga!';
                state.progressText = 'Checkpoints: 0 / 3';
            },
            update: function (ctx, dt) {
                var d = state.levelData;
                if (d.stage < d.cps.length) {
                    var cp = d.cps[d.stage];
                    d.beacon.position.set(cp.x, 0, cp.z);
                    state.objectiveText = 'Passa pelo checkpoint ' + (d.stage + 1) + ' de 3!';
                    state.progressText = 'Checkpoints: ' + d.stage + ' / 3';
                    state.primaryTarget = { x: cp.x, y: 3, z: cp.z };
                    state.targets = [{ x: cp.x, z: cp.z, color: '#22d3ee', type: 'objective' }];

                    if (dist2D(ctx.player.x, ctx.player.z, cp.x, cp.z) <= 8.0) {
                        if (ctx.audio) ctx.audio.playSfx('pickup');
                        ctx.spawnParticles('confetti', cp.x, 2, cp.z, 15, '#22d3ee');
                        d.stage++;
                        if (d.stage >= d.cps.length) {
                            d.beacon.position.set(-32, 0, 0);
                            ctx.showToast('🎨 Agora vai à Oficina Turbo para camuflar o carro!', 2.6);
                        }
                    }
                } else {
                    state.objectiveText = 'Entra na Oficina Turbo para limpar as estrelas!';
                    state.progressText = 'Checkpoints: 3/3 • Oficina Turbo';
                    state.primaryTarget = { x: -32, y: 3, z: 0 };
                    state.targets = [{ x: -32, z: 0, color: '#84cc16', type: 'objective' }];

                    if (ctx.player.inVehicle && ctx.player.vehicle && dist2D(ctx.player.x, ctx.player.z, -32, 0) <= 8.0) {
                        var v = ctx.player.vehicle;
                        v.shield = v.maxShield;
                        var newCol = PAINT_COLORS[Math.floor(Math.random() * PAINT_COLORS.length)];
                        ctx.vehiclesApi.applyCustomization(v, newCol, v.underglow);
                        setWantedStars(ctx, 0);
                        if (ctx.audio) ctx.audio.playSfx('paint');
                        ctx.completeMission(computeTimeStars(), 'Camuflagem perfeita em ' + formatTime(state.elapsed) + '!');
                    }
                }
            }
        },

        // ---------------------------------------------------------------------
        // NÍVEL 7: Grande Corrida da Marginal
        // ---------------------------------------------------------------------
        {
            id: 7,
            title: 'Grande Corrida da Marginal',
            briefing: 'Corre contra 3 rivais num circuito de 12 checkpoints pela Marginal e Centro! Fica no Top 2 para vencer!',
            tip: 'Sem limite de tempo! 1.º lugar dá 3 ⭐ e 2.º lugar dá 2 ⭐. Usa Drift nas curvas para carregar Nitro!',
            startMode: 'vehicle',
            startVehicle: 'equipped',
            timeLimit: 0,
            trafficCount: 0,
            init: function (ctx) {
                var vehId = ctx.save.customization.vehicleId || 'coupe';
                var playerCar = ctx.spawnVehicle(vehId, {
                    x: 108, z: 100, angle: Math.PI,
                    color: ctx.save.customization.color,
                    underglow: ctx.save.customization.underglow
                });
                ctx.setPlayerInVehicle(playerCar);

                var cps = [
                    { x: 108, z: 40 },
                    { x: 108, z: -40 },
                    { x: 108, z: -120 },
                    { x: 40, z: -120 },
                    { x: -40, z: -120 },
                    { x: -40, z: -40 },
                    { x: 40, z: -40 },
                    { x: 40, z: 40 },
                    { x: -40, z: 40 },
                    { x: -40, z: 120 },
                    { x: 40, z: 120 },
                    { x: 108, z: 100 }
                ];

                var rivalDefs = [
                    { name: 'Rival Verde', color: '#84cc16', mult: 0.86, x: 104, z: 104 },
                    { name: 'Rival Amarelo', color: '#facc15', mult: 0.92, x: 112, z: 104 },
                    { name: 'Rival Vermelho', color: '#ef4444', mult: 0.97, x: 104, z: 96 }
                ];
                var rivals = [];
                for (var i = 0; i < rivalDefs.length; i++) {
                    var rd = rivalDefs[i];
                    var rv = ctx.spawnVehicle('coupe', {
                        x: rd.x, z: rd.z, angle: Math.PI,
                        color: rd.color, underglow: rd.color,
                        isAI: true, aiRole: 'rival'
                    });
                    rv._cpIdx = 0;
                    rv._finished = false;
                    rv._finishOrder = 99;
                    rv._baseMult = rd.mult;
                    rivals.push(rv);
                    rivalVehicles.push(rv);
                }

                var beacon = trackMesh(ctx, createBeaconMesh(0xfacc15, 8.0, 12));
                beacon.position.set(cps[0].x, 0, cps[0].z);

                state.raceTotal = 4;
                state.racePos = 1;
                state.levelData = {
                    cps: cps,
                    playerCp: 0,
                    rivals: rivals,
                    finishedCount: 0,
                    beacon: beacon,
                    playerMaxSpeed: playerCar.spec ? playerCar.spec.maxSpeed : 48
                };
                state.objectiveText = 'Passa pelos 12 checkpoints e fica no Top 2!';
                state.progressText = 'Checkpoint: 0 / 12';
            },
            update: function (ctx, dt) {
                var d = state.levelData;
                var cps = d.cps;
                var cp = cps[d.playerCp];
                d.beacon.position.set(cp.x, 0, cp.z);

                // Checkpoint do jogador
                if (dist2D(ctx.player.x, ctx.player.z, cp.x, cp.z) <= 10.5) {
                    if (ctx.audio) ctx.audio.playSfx('pickup');
                    d.playerCp++;
                    if (d.playerCp >= cps.length) {
                        var finalPlace = d.finishedCount + 1;
                        if (finalPlace === 1) {
                            ctx.completeMission(3, '🥇 1.º Lugar na Grande Corrida! (3 ⭐)');
                        } else if (finalPlace === 2) {
                            ctx.completeMission(2, '🥈 2.º Lugar na Grande Corrida! (2 ⭐)');
                        } else {
                            ctx.failMission(
                                'race_place',
                                '🏁 Quase! Fica no Top 2!',
                                'Terminaste em ' + finalPlace + '.º lugar. Usa o Nitro nas retas para vencer!'
                            );
                        }
                        return;
                    }
                }

                // Atualiza rivais com rubber-banding ±10%
                var playerScore = d.playerCp * 1000 - dist2D(ctx.player.x, ctx.player.z, cps[d.playerCp].x, cps[d.playerCp].z);
                var aheadOfPlayer = 0;

                for (var i = 0; i < d.rivals.length; i++) {
                    var rv = d.rivals[i];
                    if (rv._finished) {
                        aheadOfPlayer++;
                        continue;
                    }
                    var rcp = cps[rv._cpIdx];
                    if (dist2D(rv.x, rv.z, rcp.x, rcp.z) <= 10.5) {
                        rv._cpIdx++;
                        if (rv._cpIdx >= cps.length) {
                            rv._finished = true;
                            d.finishedCount++;
                            rv._finishOrder = d.finishedCount;
                            aheadOfPlayer++;
                            continue;
                        }
                        rcp = cps[rv._cpIdx];
                    }

                    var rScore = rv._cpIdx * 1000 - dist2D(rv.x, rv.z, rcp.x, rcp.z);
                    if (rScore > playerScore) aheadOfPlayer++;

                    var rubber = 1.0;
                    if (rv._cpIdx > d.playerCp + 1) rubber = 0.90;
                    else if (rv._cpIdx < d.playerCp) rubber = 1.10;

                    var spd = d.playerMaxSpeed * rv._baseMult * rubber;
                    stepAIVehicle(ctx, rv, rcp.x, rcp.z, spd, dt);
                }

                state.racePos = aheadOfPlayer + 1;
                state.progressText = 'Checkpoint: ' + d.playerCp + ' / ' + cps.length;
                var nextCp = cps[d.playerCp];
                state.primaryTarget = { x: nextCp.x, y: 3, z: nextCp.z };
                state.targets = [{ x: nextCp.x, z: nextCp.z, color: '#facc15', type: 'objective' }];
            }
        },

        // ---------------------------------------------------------------------
        // NÍVEL 8: Resgate dos Drones
        // ---------------------------------------------------------------------
        {
            id: 8,
            title: 'Resgate dos Drones',
            briefing: 'Conduz até às 3 praças pedonais, sai do Buggy (E) para entrar entre os pilares, apanha os 6 mini-drones e regressa ao Laboratório Tech!',
            tip: 'Os pilares bloqueiam carros mas deixam-te passar a pé! Corre com Shift!',
            startMode: 'vehicle',
            startVehicle: 'buggy',
            timeLimit: 165,
            trafficCount: 6,
            init: function (ctx) {
                var buggy = ctx.spawnVehicle('buggy', {
                    x: 36, z: -96, angle: Math.PI,
                    color: '#22d3ee',
                    underglow: '#ec4899'
                });
                ctx.setPlayerInVehicle(buggy);

                var droneCoords = [
                    { x: -4, z: -82 }, { x: 4, z: -78 },    // Praça Norte (0, -80)
                    { x: 74, z: -4 }, { x: 74, z: 4 },      // Praça Centro (74, 0)
                    { x: -85, z: 0 }, { x: -75, z: 0 }      // Praça Parque (-80, 0)
                ];
                var drones = [];
                for (var i = 0; i < droneCoords.length; i++) {
                    var mesh = trackMesh(ctx, createDroneMesh());
                    mesh.position.set(droneCoords[i].x, 1.5, droneCoords[i].z);
                    drones.push({ x: droneCoords[i].x, z: droneCoords[i].z, collected: false, mesh: mesh });
                }

                var labBeacon = trackMesh(ctx, createBeaconMesh(0x22d3ee, 8.0, 12));
                labBeacon.position.set(36, 0, -108);
                labBeacon.visible = false;

                state.levelData = { drones: drones, count: 0, labBeacon: labBeacon };
                state.objectiveText = 'Apanha os 6 mini-drones a pé nas 3 praças!';
                state.progressText = 'Drones: 0 / 6';
            },
            update: function (ctx, dt) {
                var d = state.levelData;
                if (d.count < d.drones.length) {
                    var targets = [];
                    var nearest = null;
                    var nearestD = Infinity;

                    for (var i = 0; i < d.drones.length; i++) {
                        var dr = d.drones[i];
                        if (dr.collected) continue;
                        dr.mesh.rotation.y += dt * 3.0;
                        dr.mesh.position.y = 1.5 + Math.sin(ctx.time * 4 + i) * 0.25;

                        if (!ctx.player.inVehicle && dist2D(ctx.player.x, ctx.player.z, dr.x, dr.z) <= 2.5) {
                            dr.collected = true;
                            dr.mesh.visible = false;
                            d.count++;
                            if (ctx.audio) ctx.audio.playSfx('pickup');
                            ctx.spawnParticles('confetti', dr.x, 1.6, dr.z, 14, '#22d3ee');
                            if (d.count >= d.drones.length) {
                                d.labBeacon.visible = true;
                                ctx.showToast('🤖 Todos os drones resgatados! Regressa ao Laboratório Tech!', 2.8);
                            } else {
                                ctx.showToast('🤖 Drone resgatado! (' + d.count + '/6)', 1.6);
                            }
                            continue;
                        }

                        targets.push({ x: dr.x, z: dr.z, color: '#22d3ee', type: 'objective' });
                        var dd = dist2D(ctx.player.x, ctx.player.z, dr.x, dr.z);
                        if (dd < nearestD) {
                            nearestD = dd;
                            nearest = dr;
                        }
                    }

                    state.objectiveText = 'Entra a pé nas praças e apanha os drones!';
                    state.progressText = 'Drones: ' + d.count + ' / 6';
                    state.targets = targets;
                    state.primaryTarget = nearest ? { x: nearest.x, y: 2.2, z: nearest.z } : null;
                } else {
                    state.objectiveText = 'Regressa ao Laboratório Tech!';
                    state.progressText = 'Drones: 6/6 • Laboratório';
                    state.primaryTarget = { x: 36, y: 3, z: -108 };
                    state.targets = [{ x: 36, z: -108, color: '#84cc16', type: 'objective' }];

                    if (dist2D(ctx.player.x, ctx.player.z, 36, -108) <= 8.0) {
                        ctx.completeMission(computeTimeStars(), 'Todos os drones salvos em ' + formatTime(state.elapsed) + '!');
                    }
                }
            }
        },

        // ---------------------------------------------------------------------
        // NÍVEL 9: Comboio Blindado
        // ---------------------------------------------------------------------
        {
            id: 9,
            title: 'Comboio Blindado',
            briefing: 'Transporta o Núcleo de Energia no Camião Blindado do Laboratório até à Marina, ultrapassando cones e 2 patrulhas!',
            tip: 'O Camião Blindado empurra os cones sem perder velocidade nem escudo!',
            startMode: 'vehicle',
            startVehicle: 'truck',
            timeLimit: 130,
            trafficCount: 0,
            init: function (ctx) {
                var truck = ctx.spawnVehicle('truck', {
                    x: 36, z: -96, angle: Math.PI,
                    color: '#22d3ee',
                    underglow: '#facc15'
                });
                ctx.setPlayerInVehicle(truck);
                state.requiredVehicle = truck;
                setWantedStars(ctx, 2);

                var cps = [
                    { x: 40, z: -120 },
                    { x: 40, z: -40 },
                    { x: -40, z: -40 },
                    { x: -40, z: 40 },
                    { x: 40, z: 100 }
                ];
                var coneCoords = [
                    [38, -80], [42, -80],
                    [38, -60], [42, -60],
                    [10, -40], [-10, -40],
                    [-42, -10], [-38, 10],
                    [-10, 40], [20, 70]
                ];
                for (var i = 0; i < coneCoords.length; i++) {
                    ctx.cones.push(createConeObject(ctx.scene, coneCoords[i][0], coneCoords[i][1]));
                }

                var beacon = trackMesh(ctx, createBeaconMesh(0x84cc16, 8.0, 12));
                beacon.position.set(cps[0].x, 0, cps[0].z);

                state.levelData = { cps: cps, idx: 0, beacon: beacon };
                state.objectiveText = 'Leva o Núcleo de Energia até à Marina!';
                state.progressText = 'Checkpoints: 0 / 5';
            },
            update: function (ctx, dt) {
                var d = state.levelData;
                var truck = state.requiredVehicle;
                if (!checkRequiredVehicle(ctx)) {
                    state.targets = [{ x: truck.x, z: truck.z, color: '#facc15', type: 'objective' }];
                    return;
                }

                var cp = d.cps[d.idx];
                d.beacon.position.set(cp.x, 0, cp.z);
                state.progressText = 'Checkpoints: ' + d.idx + ' / ' + d.cps.length;
                state.primaryTarget = { x: cp.x, y: 3, z: cp.z };
                state.targets = [{ x: cp.x, z: cp.z, color: '#84cc16', type: 'objective' }];

                if (dist2D(truck.x, truck.z, cp.x, cp.z) <= 8.5) {
                    if (ctx.audio) ctx.audio.playSfx('pickup');
                    ctx.spawnParticles('confetti', cp.x, 2, cp.z, 16, '#84cc16');
                    d.idx++;
                    if (d.idx >= d.cps.length) {
                        setWantedStars(ctx, 0);
                        ctx.completeMission(computeTimeStars(), 'Núcleo entregue na Marina em ' + formatTime(state.elapsed) + '!');
                    } else {
                        ctx.showToast('⚡ Checkpoint ' + d.idx + '/5! Continua até à Marina!', 1.8);
                    }
                }
            }
        },

        // ---------------------------------------------------------------------
        // NÍVEL 10: Grande Final: Mega-Camião Rebelde
        // ---------------------------------------------------------------------
        {
            id: 10,
            title: 'Grande Final: Mega-Camião Rebelde',
            briefing: 'O Mega-Camião Rebelde está fora de controlo no anel central! Dá-lhe 5 toques com Nitro ativo para o travar e ganhar o Supercarro Dourado!',
            tip: 'Dica: Turbo Coupé ou Moto Néon são ótimos aqui! Evita os cones e ativa o Nitro (Shift) ao bater no Boss!',
            startMode: 'vehicle',
            startVehicle: 'equipped',
            timeLimit: 160,
            trafficCount: 0,
            init: function (ctx) {
                var vehId = ctx.save.customization.vehicleId || 'coupe';
                var car = ctx.spawnVehicle(vehId, {
                    x: -40, z: 80, angle: Math.PI,
                    color: ctx.save.customization.color,
                    underglow: ctx.save.customization.underglow
                });
                ctx.setPlayerInVehicle(car);

                var boss = ctx.vehiclesApi.createBossTruck({ scene: ctx.scene, x: 40, z: -40, angle: 0 });
                if (boss.mesh && !boss.mesh.parent) ctx.scene.add(boss.mesh);
                boss.isAI = true;
                boss.aiRole = 'boss';
                boss.isBoss = true;
                boss.hp = boss.hp || 5;
                boss.maxHp = boss.maxHp || 5;
                boss.empCooldown = 0;
                ctx.vehicles.push(boss);

                state.boss = boss;
                state.bossHp = boss.hp;
                state.bossMaxHp = boss.maxHp;

                var ringWaypoints = [
                    { x: 40, z: 40 },
                    { x: -40, z: 40 },
                    { x: -40, z: -40 },
                    { x: 40, z: -40 }
                ];

                state.levelData = {
                    waypoints: ringWaypoints,
                    wpIdx: 0,
                    coneTimer: 2.0,
                    flashTimer: 0
                };
                state.objectiveText = 'Dá 5 toques com Nitro no Mega-Camião Boss!';
                state.progressText = 'HP Boss: 5 / 5';
            },
            update: function (ctx, dt) {
                var d = state.levelData;
                var boss = state.boss;
                if (!boss) return;

                if (d.flashTimer > 0) {
                    d.flashTimer -= dt;
                    if (d.flashTimer <= 0 && boss.mesh) {
                        boss.mesh.traverse(function (obj) {
                            if (obj.isMesh && obj.material && obj.material.emissive && obj.userData._origEmissive !== undefined) {
                                obj.material.emissive.setHex(obj.userData._origEmissive);
                            }
                        });
                    }
                }

                // Move Mega-Camião pelo anel central (32 u/s)
                var wp = d.waypoints[d.wpIdx];
                if (dist2D(boss.x, boss.z, wp.x, wp.z) < 8) {
                    d.wpIdx = (d.wpIdx + 1) % d.waypoints.length;
                    wp = d.waypoints[d.wpIdx];
                }
                stepAIVehicle(ctx, boss, wp.x, wp.z, 32, dt);

                // Larga 1 cone a cada 2.5s (máx. 12 ativos)
                d.coneTimer -= dt;
                if (d.coneTimer <= 0) {
                    d.coneTimer = 2.5;
                    var backX = boss.x - Math.sin(boss.angle) * 6.5;
                    var backZ = boss.z - Math.cos(boss.angle) * 6.5;
                    ctx.cones.push(createConeObject(ctx.scene, backX, backZ));
                    var activeCones = ctx.cones.filter(function (c) { return !c.knocked; });
                    if (activeCones.length > 12) {
                        var oldest = activeCones[0];
                        if (oldest.mesh && oldest.mesh.parent) oldest.mesh.parent.remove(oldest.mesh);
                        var idx = ctx.cones.indexOf(oldest);
                        if (idx !== -1) ctx.cones.splice(idx, 1);
                    }
                }

                // Verifica impacto EMP do jogador com Nitro (vehicles.js já aplica empCooldown=1.2 ao definir hitBossEmp)
                var ev = ctx.lastPhysicsEvents || {};
                var hitEmp = !!ev.hitBossEmp;
                if (!hitEmp && ctx.player.inVehicle && ctx.player.vehicle && ev.nitroActive && (boss.empCooldown || 0) <= 0) {
                    var pv = ctx.player.vehicle;
                    var rSum = (pv.spec ? pv.spec.radius : 2.1) + (boss.radius || 3.6) + 0.8;
                    if (dist2D(pv.x, pv.z, boss.x, boss.z) <= rSum) {
                        boss.empCooldown = 1.2;
                        hitEmp = true;
                    }
                }

                if (hitEmp) {
                    boss.hp = Math.max(0, boss.hp - 1);
                    state.bossHp = boss.hp;
                    d.flashTimer = 0.35;
                    if (boss.mesh) {
                        boss.mesh.traverse(function (obj) {
                            if (obj.isMesh && obj.material && obj.material.emissive) {
                                if (obj.userData._origEmissive === undefined) {
                                    obj.userData._origEmissive = obj.material.emissive.getHex();
                                }
                                obj.material.emissive.setHex(0x22d3ee);
                            }
                        });
                    }
                    if (ctx.audio) ctx.audio.playSfx('emp');
                    ctx.spawnParticles('sparks', boss.x, 2.2, boss.z, 30, '#22d3ee');
                    ctx.showToast('⚡ IMPACTO EMP NO BOSS! HP: ' + boss.hp + '/' + boss.maxHp, 2.0);
                }

                state.bossHp = boss.hp;
                state.progressText = 'HP Boss: ' + boss.hp + ' / ' + boss.maxHp;
                state.primaryTarget = { x: boss.x, y: 5.0, z: boss.z };
                state.targets = [{ x: boss.x, z: boss.z, color: '#f43f5e', type: 'boss' }];

                if (boss.hp <= 0) {
                    ctx.spawnParticles('confetti', boss.x, 3, boss.z, 45, '#facc15');
                    ctx.completeMission(computeTimeStars(), 'Mega-Camião travado em ' + formatTime(state.elapsed) + '!');
                }
            }
        }
    ];

    // =========================================================================
    // API Pública window.GTC.Missions
    // =========================================================================
    function cleanup(ctx) {
        for (var i = 0; i < missionMeshes.length; i++) {
            if (missionMeshes[i] && missionMeshes[i].parent) {
                missionMeshes[i].parent.remove(missionMeshes[i]);
            }
        }
        missionMeshes = [];

        if (ctx && ctx.cones) {
            for (var j = 0; j < ctx.cones.length; j++) {
                if (ctx.cones[j].mesh && ctx.cones[j].mesh.parent) {
                    ctx.cones[j].mesh.parent.remove(ctx.cones[j].mesh);
                }
            }
            ctx.cones.length = 0;
        }

        policeVehicles = [];
        trafficVehicles = [];
        rivalVehicles = [];
        fugitiveVehicle = null;

        state.wantedStars = 0;
        state.captureTimer = 0;
        state.escapeTimer = 0;
        state.collisionTimestamps = [];
        state.boss = null;
        state.bossHp = 0;
        state.bossMaxHp = 0;
        state.racePos = 0;
        state.raceTotal = 0;
        state.targets = [];
        state.primaryTarget = null;
        state.requiredVehicle = null;
        state.exitWarnCooldown = 0;
        state.paintShopCooldown = 0;
        state.canOpenGarageAtShop = false;
        state.inPaintShop = false;
        state.levelData = null;

        if (ctx && ctx.audio && ctx.audio.setSirenActive) {
            ctx.audio.setSirenActive(false);
        }
    }

    function startFreeRoam(ctx) {
        cleanup(ctx);
        state.mode = 'free';
        state.levelId = 0;
        state.title = 'Modo Livre';
        state.objectiveText = 'Explora Vice Neon! Salta rampas ou visita a Oficina Turbo.';
        state.progressText = '';
        state.timeLimit = 0;
        state.timeLeft = 0;
        state.elapsed = 0;

        // Spawn veículo equipado em (-40, 16) virado a Norte (angle = Math.PI)
        var cust = ctx.save.customization;
        var playerCar = ctx.spawnVehicle(cust.vehicleId || 'coupe', {
            x: -40, z: 16, angle: Math.PI,
            color: cust.color || '#ec4899',
            underglow: cust.underglow
        });
        ctx.setPlayerInVehicle(playerCar);

        // 8 veículos estacionados (SPEC §3.4)
        var parked = (ctx.city && ctx.city.parkedSpawns) ? ctx.city.parkedSpawns : [
            { typeId: 'coupe', x: -40, z: -16, angle: 0 },
            { typeId: 'moto', x: 108, z: -20, angle: Math.PI },
            { typeId: 'buggy', x: 124, z: 10, angle: Math.PI },
            { typeId: 'van', x: -120, z: 15, angle: 0 },
            { typeId: 'police', x: 40, z: -15, angle: Math.PI },
            { typeId: 'truck', x: -120, z: 85, angle: 0 },
            { typeId: 'coupe', x: 40, z: 120, angle: Math.PI / 2 },
            { typeId: 'moto', x: -40, z: 120, angle: -Math.PI / 2 }
        ];
        var parkedColors = ['#f3e8c8', '#16a34a', '#eab308', '#e2e8f0', '#f8fafc', '#334155', '#dc2626', '#2563eb'];
        for (var i = 0; i < parked.length; i++) {
            var p = parked[i];
            var py = (ctx.city && ctx.city.getGroundHeight) ? ctx.city.getGroundHeight(p.x, p.z, 0) : 0;
            ctx.spawnVehicle(p.typeId, {
                x: p.x, y: py, z: p.z, angle: p.angle || 0,
                color: p.typeId === 'police' ? '#f8fafc' : (p.color || parkedColors[i % parkedColors.length]),
                underglow: null,
                isAI: false
            });
        }

        // 8 carros de trânsito ambiente
        spawnTraffic(ctx, 8);
    }

    function startLevel(levelId, ctx) {
        cleanup(ctx);
        var def = null;
        for (var i = 0; i < LEVELS.length; i++) {
            if (LEVELS[i].id === levelId) {
                def = LEVELS[i];
                break;
            }
        }
        if (!def) {
            startFreeRoam(ctx);
            return;
        }

        state.mode = 'level';
        state.levelId = def.id;
        state.title = 'Nível ' + def.id + ' — ' + def.title;
        state.objectiveText = def.briefing;
        state.progressText = '';
        state.timeLimit = def.timeLimit || 0;
        state.timeLeft = def.timeLimit || 0;
        state.elapsed = 0;

        def.init(ctx);
        if (def.trafficCount > 0) {
            spawnTraffic(ctx, def.trafficCount);
        }
    }

    function update(ctx, dt) {
        state.elapsed += dt;
        if (state.exitWarnCooldown > 0) state.exitWarnCooldown -= dt;

        // Timer de missão
        if (state.mode === 'level' && state.timeLimit > 0) {
            state.timeLeft -= dt;
            if (state.timeLeft <= 0) {
                state.timeLeft = 0;
                ctx.failMission('time', '⏱ Tempo Esgotado!', 'Quase lá! Tenta outra vez e usa o Nitro nas retas!');
                return;
            }
        }

        updateTraffic(ctx, dt);
        updatePolice(ctx, dt);
        updatePaintShop(ctx, dt);
        updateCones(ctx, dt);
        updateSirenAudio(ctx);

        if (state.mode === 'level') {
            var def = LEVELS[state.levelId - 1];
            if (def && def.update) {
                def.update(ctx, dt);
            }
        }
    }

    window.GTC.Missions = {
        LEVELS: LEVELS,
        startFreeRoam: startFreeRoam,
        startLevel: startLevel,
        update: update,
        cleanup: cleanup,
        onFreeRoamCollision: onFreeRoamCollision,
        setWantedStars: setWantedStars,
        getState: function () { return state; },
        getPoliceVehicles: function () { return policeVehicles; }
    };
})();
