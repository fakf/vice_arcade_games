# SPEC.md — Grand Turbo City: Vice Neon

Especificação funcional e técnica autossuficiente para o desenvolvimento do jogo **Grand Turbo City: Vice Neon**, integrado no catálogo **Estúdio de Jogos do Vicente — Arcade 3D**.

---

## 1. Visão Geral e Contexto do Projeto

- **Repositório:** `vice_games` (site estático HTML/JS alojado em GitHub Pages, zero build step).
- **Idioma obrigatório:** **Português de Portugal (PT-PT)** em toda a UI, textos, briefings, botões e mensagens (ex.: *telemóvel*, *ecrã*, *rato*, *mota*, *camião*, *polícia*, *oficina*).
- **Público-alvo:** Crianças de **8 anos**. O jogo oferece a estética e emoção de um mundo aberto estilo *GTA Vice City* (carros rápidos, mota, perseguições com sirenes, saltos em rampas, personalização na garagem, exploração a pé e de carro), mantendo-se **100% seguro e adequado à idade**.
- **Regras invioláveis de adequação à idade:**
  1. **Zero armas, zero tiros, zero sangue, zero violência.**
  2. **Zero atropelamentos:** peões cartoon nunca sofrem dano; quando um veículo se aproxima, saltam para longe da estrada a acenar.
  3. **Polícia humana clássica estilo desenho animado:** agentes cartoon sem armas; perseguem com sirenes e passam uma *"Multa!"* divertida por contacto — sem violência.
  4. **Personagem a pé invencível:** a personagem a pé nunca perde vida nem sofre dano.
  5. **Zero frustração punitiva:** sem "Game Over" definitivo. Se o escudo do veículo chegar a `0` ou houver multa, há recuperação/repetição imediata em 1 clique.

---

## 2. Arquitetura Técnica e Estrutura de Ficheiros

### 2.1 Restrições Técnicas
- **Sem build step** (sem Webpack, Vite, npm ou TypeScript).
- **Compatibilidade dupla:** deve funcionar tanto em HTTPS (GitHub Pages) como aberto localmente via `file://`.
  - **Obrigatório:** usar scripts clássicos (`<script src="js/..."></script>`) partilhando o namespace global `window.GTC = window.GTC || {}`. **NÃO usar** `<script type="module">` (bloqueado por CORS em `file://`).
- **Dependências CDN:**
  - `Three.js r128`: `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`
  - `Tailwind CSS`: `https://cdn.tailwindcss.com`
  - `Google Fonts`: `Chakra Petch` (títulos arcade/HUD) e `Outfit` (texto legível).
- **Física:** **NÃO usar Cannon.js**. Implementar física arcade própria em `vehicles.js` e `game.js`.
- **Zero assets externos obrigatórios:** todas as texturas são geradas via `THREE.CanvasTexture` (`textures.js`) e todo o áudio/música via **Web Audio API** (`audio.js`).

### 2.2 Estrutura de Ficheiros e Ordem de Carregamento

```text
/ (raiz do repositório)
├── index.html                           # Catálogo principal (ATUALIZAR)
├── SPEC.md                              # Esta especificação
└── jogos/
    └── grand_turbo_city/
        ├── index.html                   # Estrutura DOM: Canvas, HUD, Minimapa, Menus, Garagem, Controlos Táteis
        └── js/
            ├── textures.js              # window.GTC.Textures
            ├── audio.js                 # window.GTC.Audio
            ├── city.js                  # window.GTC.City
            ├── vehicles.js              # window.GTC.Vehicles
            ├── missions.js              # window.GTC.Missions
            └── game.js                  # window.GTC.Game (bootstrap + loop principal)
```

**Ordem de `<script>` em `jogos/grand_turbo_city/index.html`:**
1. `three.min.js`
2. `js/textures.js`
3. `js/audio.js`
4. `js/city.js`
5. `js/vehicles.js`
6. `js/missions.js`
7. `js/game.js`

### 2.3 Contrato Interno entre Módulos (`window.GTC`)

Cada ficheiro regista o seu módulo em `window.GTC`:

1. **`GTC.Textures`**:
   - `init()`: gera e guarda em cache todas as `THREE.CanvasTexture`.
   - `get(name)`: devolve textura (`'road'`, `'crosswalk'`, `'building0'..'building3'`, `'sand'`, `'water'`, `'grass'`, `'plaza'`, `'ramp'`, `'container'`).
2. **`GTC.Audio`**:
   - `unlock()`: cria/retoma `AudioContext` com segurança (`try/catch`).
   - `setMuted(bool)`, `setRadioStation(idx)` (`0` Synthwave, `1` Pop Arcade, `2` Silêncio), `updateEngine(speedNorm, isMoto, active)`.
   - `playSfx(type)`: `'horn'`, `'sirenToggle'`, `'nitro'`, `'jump'`, `'pickup'`, `'paint'`, `'hit'`, `'emp'`, `'ticket'`, `'victory'`, `'wave'`.
   - `setSirenActive(bool)`: liga/desliga som contínuo de sirene policial.
3. **`GTC.City`**:
   - `build(scene)`: constrói toda a cidade 3D e popula os dados estruturais.
   - `setTimeOfDay(mode)` (`'sunset' | 'day' | 'night'`): atualiza céu, nevoeiro, luzes, emissivo das janelas e mar.
   - `update(dt, time, vehicles)`: anima água do mar, luzes da Oficina, peões cartoon e desvio de peões.
   - Dados expostos:
     - `BOUNDS`: `{ minX: -172, maxX: 150, minZ: -172, maxZ: 172 }`
     - `ROAD_X`: `[-120, -40, 40, 108]`, `ROAD_Z`: `[-120, -40, 40, 120]`, `ROAD_WIDTH`: `16`
     - `colliders`: array de `{ minX, maxX, minZ, maxZ, blocksVehicles: true, blocksPedestrian: true }` (edifícios, contentores, pilares das praças com `blocksPedestrian: false`)
     - `ramps`: array de `{ id, x, z, dirX, dirZ, length: 12, width: 7, height: 3.2 }`
     - `landmarks`: `{ paintShop: {x:-32, z:0, radius:8}, garage: {x:-108, z:-72, radius:8}, techLab: {x:36, z:-108, radius:8}, plazas: [...] }`
     - `roadNodes`: array de `{ id, x, z, neighbors: [id...] }` (os 16 cruzamentos da grelha `ROAD_X × ROAD_Z`)
     - `findNearestRoadPoint(x, z)`: devolve `{ x, z, angle }` no eixo da estrada mais próxima (usado pelo "Repor na Estrada" e anti-stuck da IA).
     - `isOnSand(x, z)`: devolve `true` se `x >= 118 && x <= 150`.
4. **`GTC.Vehicles`**:
   - `CATALOG`: mapa das 7 definições de veículos (`coupe`, `moto`, `buggy`, `van`, `police`, `truck`, `gold_supercar`).
   - `COLORS`: array de 8 cores de carroçaria com `{ id, name, hex, requiresGold?: boolean }`.
   - `UNDERGLOWS`: array de 6 modos com `{ id, name, hex }`.
   - `createVehicle(typeId, opts)`: cria `{ id, typeId, spec, mesh, x, y, z, vy, angle, speed, steerAngle, shield, maxShield, nitro, airtime, isGrounded, color, underglow, sirenOn, isAI, aiRole, empCooldown, stuckTimer, lastPos }` e adiciona à cena.
   - `createBossTruck()`: cria o Mega-Camião Boss do Nível 10 (`hp: 5, maxHp: 5, radius: 3.6`).
   - `applyCustomization(vehicle, colorHex, underglowHex)`: atualiza materiais da carroçaria e malha *underglow*.
   - `stepPhysics(vehicle, input, dt, city, allVehicles, cones)`: atualiza aceleração, curva, drift, nitro, rampas, gravidade, colisões AABB e colisões veículo↔veículo.
5. **`GTC.Missions`**:
   - `LEVELS`: array dos 10 objetos de definição de nível (`id: 1..10`, `title`, `briefing`, `startMode`, `startVehicle`, `timeLimit`, `trafficCount`, `init(ctx)`, `update(ctx, dt)`).
   - `startFreeRoam(ctx)`, `startLevel(levelId, ctx)`, `update(ctx, dt)`, `cleanup(ctx)`.
   - Controla também a IA de **Polícia**, **Trânsito Ambiente**, **Rivais (Nível 7)**, **Furgão Fugitivo (Nível 5)** e **Mega-Camião Boss (Nível 10)**.
6. **`GTC.Game`**:
   - Gere estado global (`state`), persistência `localStorage`, Three.js (`scene`, `camera`, `renderer`), loop `requestAnimationFrame`, personagem a pé, entrada/saída de veículos, 3 câmaras, partículas (chamas nitro, faíscas, confettis), seta 3D de objetivo, minimapa 2D, menus/HUD e input (teclado + tátil).

### 2.4 Integração no Catálogo (`index.html` da raiz)
- Adicionar ao array `JOGOS` em `index.html` (antes do cartão `emBreve: true`):
  - `titulo`: `"Grand Turbo City: Vice Neon"`
  - `categoria`: `"aventura"`
  - `categoriaLabel`: `"Mundo Aberto 3D"`
  - `arquivo`: `"jogos/grand_turbo_city/index.html"`
  - `emoji`: `"🌴"`
  - `gradiente`: `"from-fuchsia-500 via-pink-600 to-cyan-600"`
  - `corBotao`: `"bg-fuchsia-400 hover:bg-fuchsia-300 text-slate-950 shadow-fuchsia-500/25"`
  - `corBordaHover`: `"hover:border-fuchsia-400/60"`
  - `descricao`: `"Explora Vice Neon de carro, mota ou a pé! Completa 10 missões emocionantes, salta rampas, personaliza a tua garagem e despista a polícia!"`
  - `controlosPC`: `"WASD / Setas conduzir e andar • E entrar/sair • Shift Nitro • R Rádio • C Câmara"`
  - `controlosMobile`: `"Joystick tátil à esquerda • Botões de Turbo, Entrar/Sair, Drift e Buzina"`
  - `emBreve`: `false`
- Dentro do jogo (`jogos/grand_turbo_city/index.html`), incluir botão **"🏠 Catálogo"** no Menu Principal e no Menu de Pausa apontando para `../../index.html`.

---

## 3. Mundo 3D — Mapa de Vice Neon (`city.js` & `textures.js`)

### 3.1 Dimensões, Limites e Malha Viária Exata
- **Mundo visual total:** `X ∈ [-180, 180]`, `Z ∈ [-180, 180]` (com oceano decorativo para `X > 150` e bordas com palmeiras/muros exteriores).
- **Área navegável (limites de colisão):** `X ∈ [-172, 150]`, `Z ∈ [-172, 172]`.
  - Ao atingir qualquer fronteira desta área, a posição é fixada (*clamp*) dentro do limite, a componente de velocidade perpendicular é anulada com recuo suave de `0.5` u e surge aviso discreto no HUD (`"Limite de Vice Neon"`).
- **Malha viária ortogonal (estradas de `16` u de largura, passeios de `2` u de cada lado):**
  - **4 Avenidas Norte–Sul (centradas em X):** `X = -120`, `X = -40`, `X = 40`, `X = 108` (Avenida das Palmeiras junto à praia).
  - **4 Avenidas Este–Oeste (centradas em Z):** `Z = -120`, `Z = -40`, `Z = 40`, `Z = 120`.
  - Os **16 cruzamentos** (`ROAD_X × ROAD_Z`) formam os nós de navegação (`roadNodes`) da IA.

### 3.2 Zonas e Marcos com Coordenadas Exatas
1. **Avenida das Palmeiras & Praia (`X ∈ [108, 180]`):**
   - Marginal em `X = 108`, palmeiras ao longo de `X = 117`, faixa de areia jogável em `X ∈ [118, 150]`, mar azul-turquesa animado para `X > 150`.
2. **Centro Financeiro / Downtown (`X ∈ [-30, 98], Z ∈ [-110, 30]`):**
   - Arranha-céus coloridos (`altura 18–46` u) com fachadas iluminadas e faixas néon magenta/ciano.
3. **Parque Central (`X ∈ [-110, -50], Z ∈ [-30, 30]`):**
   - Relvado, caminhos em cruz, fonte central em `(-80, 0)` com anel luminoso, árvores baixas.
4. **Marina & Porto (`X ∈ [-110, 98], Z ∈ [50, 110]`):**
   - Contentores coloridos e armazéns baixos com largos corredores de condução.
5. **Marcos Interativos (coordenadas exatas):**
   - **Oficina Turbo (Paint & Spray):** `X = -32, Z = 0` (encostada à avenida `X = -40`, entrada aberta virada a Oeste para `X = -40`; zona de trigger `raio = 8` u; pórtico néon arco-íris + placa *"OFICINA TURBO"*).
   - **Garagem Secreta:** `X = -108, Z = -72` (acesso direto pela avenida `X = -120`; arco verde néon; trigger `raio = 8` u).
   - **Laboratório Tech:** `X = 36, Z = -108` (acesso direto pela avenida `Z = -120`; edifício branco/ciano; trigger `raio = 8` u).
   - **3 Praças Pedonais (usadas no Nível 8):**
     - Praça Norte: `X = 0, Z = -80` (abertura a Sul)
     - Praça Centro: `X = 74, Z = 0` (abertura a Oeste)
     - Praça Parque: `X = -80, Z = 0` (em volta da fonte)
     - Cada praça tem pilares baixos à entrada com `blocksVehicles: true, blocksPedestrian: false` (abertura visual de `2.6` u) — bloqueiam veículos mas deixam a personagem a pé passar livremente.
6. **Spawn Default (Modo Livre):** `X = -40, Z = 16`, virado a Norte (`angle = Math.PI`), no `vehicleId` guardado na Garagem.

### 3.3 Rampas de Acrobacia (8 Rampas com Coordenadas Exatas)
Cada rampa tem `length = 12`, `width = 7`, `height = 3.2`, textura quadriculada + setas néon:
1. Praia Norte: `(128, -80)`, direção Sul `(0, 1)`
2. Praia Sul: `(128, 60)`, direção Norte `(0, -1)`
3. Parque Oeste: `(-80, -22)`, direção Este `(1, 0)`
4. Parque Este: `(-64, 22)`, direção Oeste `(-1, 0)`
5. Avenida Central Norte: `(-40, -80)`, direção Sul `(0, 1)`
6. Avenida Central Sul: `(40, 80)`, direção Norte `(0, -1)`
7. Marina Oeste: `(-80, 82)`, direção Este `(1, 0)`
8. Marina Este: `(74, 82)`, direção Oeste `(-1, 0)`

### 3.4 Veículos Estacionados & Pickups de Nitro
- **8 Veículos Estacionados (Modo Livre e missões com troca livre):**
  - `coupe` em `(-40, -16)`, `moto` em `(108, -20)`, `buggy` em `(124, 10)`, `van` em `(-120, 15)`, `police` em `(40, -15)`, `truck` em `(-120, 85)`, `coupe` extra em `(40, 120)`, `moto` extra em `(-40, 120)`.
- **8 Pickups de Nitro (raios néon giratórios no chão, raio `3.0` u, `+45` Nitro, respawn `12s`):**
  - `(-40, -40)`, `(40, -40)`, `(108, -40)`, `(-120, 40)`, `(-40, 40)`, `(40, 40)`, `(108, 40)`, `(0, 120)`.

### 3.5 Temas de Iluminação (Alternáveis em Tempo Real)
1. **Pôr-do-Sol (`'sunset'`, default):** céu `#2d1654`, nevoeiro `#5b2a6e` (`near: 90, far: 300`), luz direcional `#ff9e5e` (`1.15`), hemisphere `#f472b6 / #1e1b4b` (`0.75`).
2. **Dia (`'day'`):** céu `#38bdf8`, nevoeiro `#bae6fd` (`near: 110, far: 330`), luz direcional `#fffbeb` (`1.35`), hemisphere `#e0f2fe / #334155` (`0.85`).
3. **Noite Néon (`'night'`):** céu `#060a18`, nevoeiro `#0f172a` (`near: 75, far: 260`), luz direcional `#60a5fa` (`0.55`), hemisphere `#312e81 / #020617` (`0.5`), emissivo de janelas/néon reforçado.

### 3.6 Peões Cartoon
- **28 peões** low-poly (cabeça, tronco colorido, braços e pernas animados) a caminhar ao longo dos passeios dos quarteirões (`offset = ±9.5` u do eixo das avenidas).
- **Regra de desvio seguro:** quando qualquer veículo entra a `< 6.5` u de um peão, este executa um salto lateral (`y` parabólico de `1.2` u durante `0.45s`, braços erguidos) **em direção ao interior do quarteirão mais próximo** (nunca para o centro da estrada) e respeitando os `colliders` dos edifícios.

---

## 4. Frota de Veículos, Personalização e Física Arcade (`vehicles.js`)

### 4.1 Frota Jogável (7 Veículos)

| ID | Nome PT-PT | Vel. Máx. (u/s) | Acel. | Nitro (u/s) | Curva (rad/s) | Escudo | Raio Hitbox | `jumpMult` | `sandFactor` | Especial | Desbloqueio |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| `coupe` | **Turbo Coupé** | 48 | 28 | 70 | 2.6 | 100 | 2.1 | 1.00 | 0.72 | Equilibrado | **Inicial (Garagem)** |
| `moto` | **Moto Néon** | 54 | 36 | 78 | 3.3 | 75 | 1.4 | **1.28** | 0.72 | Inclina nas curvas (`±24°`), condutor visível | **Inicial (Garagem)** |
| `buggy` | **Buggy da Praia** | 44 | 32 | 66 | 3.0 | 95 | 1.9 | **1.15** | **1.00** | Sem penalização na areia, condutor visível | **Inicial (Garagem)** |
| `van` | **Furgão Expresso** | 38 | 22 | 56 | 2.2 | 130 | 2.3 | 0.90 | 0.72 | Resistente, ideal para entregas | **Inicial (Garagem)** |
| `police` | **Patrulha da Cidade** | 52 | 31 | 74 | 2.7 | 125 | 2.2 | 1.00 | 0.72 | `H` faz **toggle** da sirene (luzes + som) | **Inicial (Garagem)** |
| `truck` | **Camião Blindado 4x4** | 36 | 19 | 54 | 1.9 | 200 | 2.6 | 0.85 | 0.85 | `pushesProps: true` (empurra cones sem perder vel./dano) | **Inicial (Garagem)** |
| `gold_supercar` | **Supercarro Dourado** | 60 | 40 | 88 | 3.0 | 150 | 2.1 | 1.10 | 0.72 | Dourado metálico, mais rápido do jogo | **Completar Nível 10** ou `unlockAll` |

- **Regra explícita de desbloqueio:** os 6 veículos base estão **todos disponíveis na Garagem desde o início**. Apenas o `gold_supercar` (e a cor `Dourado Metálico`) estão bloqueados até concluir o Nível 10 (`unlockedLevel >= 11`) ou enquanto `unlockAll === true`.

### 4.2 Cores da Garagem e Luzes Underglow (Hex Exatos)
- **8 Cores de Carroçaria:**
  1. Rosa Néon (`#ec4899`) — default
  2. Ciano Elétrico (`#22d3ee`)
  3. Amarelo Turbo (`#facc15`)
  4. Vermelho Fogo (`#ef4444`)
  5. Verde Lima (`#84cc16`)
  6. Roxo Vice (`#a855f7`)
  7. Branco Pérola (`#f8fafc`)
  8. Dourado Metálico (`#fbbf24`, `metalness: 0.75, roughness: 0.25`) — bloqueado até Nível 10 concluído ou `unlockAll`.
- **6 Modos de Underglow:**
  1. Desligado (`null`)
  2. Ciano (`#22d3ee`) — default
  3. Magenta (`#ec4899`)
  4. Verde Lima (`#84cc16`)
  5. Amarelo (`#facc15`)
  6. Arco-Íris (`'rainbow'` — cicla `THREE.Color.setHSL((t * 0.25) % 1, 1, 0.55)` a cada frame).

### 4.3 Física Arcade Detalhada
- **Conversão Velocímetro HUD:** `kmh = Math.round(Math.abs(vehicle.speed) * 3.0)` (ex.: `48 u/s → 144 km/h`; `88 u/s → 264 km/h`).
- **Aceleração / Travagem / Atrito:**
  - Velocidade máxima efetiva: `(nitroActive ? spec.nitro : spec.maxSpeed) * (onSand ? spec.sandFactor : 1.0)`.
  - Marcha-atrás máxima: `-0.42 * spec.maxSpeed`.
  - Travão ativo (input oposto ao movimento): desaceleração `45 u/s²`.
  - Atrito natural (sem acelerar): desaceleração `18 u/s²`.
- **Direção e Drift:**
  - Viragem proporcional a `Math.min(1, Math.abs(speed) / 8)` (inverte o sinal em marcha-atrás).
  - Drift (`Espaço` enquanto `speed > 10`): multiplica taxa de curva por `1.35`, aplica leve arrasto (`speed *= 1 - 0.35 * dt`), gera faíscas subtis e carrega `+10 / s` de Nitro.
- **Nitro (`Shift` / botão Turbo):**
  - Barra `0..100`. Consumo ativo: `28 / s`. Regeneração passiva (sem uso): `12 / s`.
  - Ativo enquanto premido e `nitro > 2` (desliga ao atingir `0`; volta a ativar assim que `nitro >= 8`).
  - Partículas de chama no escape + aumento suave do `camera.fov` de `60°` para `68°`.
- **Gravidade e Rampas:**
  - Gravidade: `g = -34 u/s²`.
  - Ao entrar na caixa OBB de uma rampa (`length: 12, width: 7`) pela frente (`dot(moveDir, rampDir) > 0.5`), a altura `y` acompanha a inclinação linear (`0 → 3.2`). Ao sair pela extremidade alta com `speed > 12`, lança com `vy = Math.min(24, speed * 0.38) * spec.jumpMult`.
  - Bater na rampa de lado ou por trás (`dot <= 0.5` e `y < 1.2`) funciona como colisão AABB normal.
  - Se `airtime >= 0.65s` ao tocar no chão: adiciona `+25` Nitro, toca SFX `'jump'` e mostra banner `"🌟 SALTO INCRÍVEL!"`.
- **Colisões e Tabela de Dano ao Escudo:**
  - **Hitbox dos veículos:** círculo no plano XZ (`spec.radius`).
  - **Edifícios / Limites (AABB):** resolução separada no eixo `X` e depois no eixo `Z` para deslizar suavemente sem prender. Se impacto frontal com `|speed| > 22`: dano `Math.round(Math.min(15, (|speed| - 20) * 0.45))` (mín. `5`, máx. `15`, cooldown `0.6s`), faíscas e recuo elástico (`speed *= -0.25`).
  - **Veículo ↔ Veículo (trânsito / polícia):** separação circular + impulso elástico; se `relSpeed > 14`, dano `6` (cooldown `0.8s`).
  - **Cones / Barreiras:** no `truck` (`pushesProps: true`) empurra o cone sem perda de velocidade e `0` dano; nos restantes veículos `speed *= 0.65`, dano `5` (cooldown `0.6s`) e o cone é derrubado.
  - **Mega-Camião Boss (Nível 10):** se o jogador colidir **com Nitro ativo** (`empCooldown <= 0`), o jogador sofre `0` dano, o Boss perde `1` HP (`empCooldown = 1.2s`), pisca a ciano e toca SFX `'emp'`. Se colidir **sem Nitro**, o jogador sofre `12` de dano (cooldown `1.0s`).
- **Quando `shield <= 0`:**
  - **Modo Livre:** pausa breve de `1.2s` com faíscas e banner `"🔧 Reparação Expresso na Oficina!"`, reposiciona veículo em `(-40, 0)` (frente à Oficina) com `shield = maxShield` e `wantedStars = 0`.
  - **Em Missão:** transita para estado `FAILED` com título `"🔧 Escudo Esgotado!"` e botões **"🔄 Tentar de Novo"** e **"📋 Escolher Nível"**.

### 4.4 Personagem a Pé e Controlos Direcionais
- Velocidade: `11 u/s` a andar, `17 u/s` a correr (`Shift`), salto vertical `vy = 13` (`Espaço`), gravidade `-34 u/s²`, raio hitbox `0.65` u.
- **Esquema único de movimento a pé (consistente em PC e Mobile):**
  - **Em 3.ª Pessoa (Perto / Longe):** `W/S/A/D` (ou joystick X/Y) movem a personagem **relativamente à orientação horizontal da câmara**; a personagem roda automaticamente para encarar a direção do vetor de movimento (sem tank controls).
  - **Em Vista Aérea Clássica (fixa a Norte):** `W/↑` = Norte (`-Z`), `S/↓` = Sul (`+Z`), `A/←` = Oeste (`-X`), `D/→` = Este (`+X`).
- **Entrar / Sair de Veículos (`E` ou botão tátil):**
  - A pé: entra no veículo acessível mais próximo dentro de `5.5` u.
  - A conduzir: trava o veículo e testa 4 posições de saída a `radius + 1.4` u (esquerda, direita, trás, frente) contra `city.colliders`; escolhe a primeira livre (fallback: `findNearestRoadPoint`).

---

## 5. Sistemas Principais

### 5.1 Polícia Humana Cartoon e Nível de Alerta (0–3 ⭐)
- **Visual:** Carros `police` brancos/azuis com barra de sirene rotativa vermelha/azul e agente cartoon visível com boné azul (zero armas).
- **Spawn e Velocidades:**
  - Patrulhas fazem spawn num nó de estrada (`roadNodes`) entre `55` e `85` u do jogador.
  - `1 ⭐`: 1 patrulha (`maxSpeed = 38 u/s`).
  - `2 ⭐`: 2 patrulhas (`maxSpeed = 45 u/s`).
  - `3 ⭐`: 3 patrulhas (`maxSpeed = 52 u/s`).
- **Gatilho em Modo Livre:** `3` colisões fortes com veículos/patrulhas num intervalo de `15s` → `1 ⭐`; mais `3` colisões → `2 ⭐`; mais `3` → `3 ⭐`.
- **Captura ("🚨 MULTA DE VELOCIDADE!"):**
  - Jogador em veículo: se qualquer patrulha ficar a `< 4.8` u enquanto `|player.speed| < 6 u/s` durante `2.2s` contínuos.
  - Jogador a pé: patrulha persegue até `< 5.0` u (respeitando pilares das praças pedonais); se ficar a `< 5.0` u do jogador a pé durante `2.0s` contínuos.
  - Consequência: SFX `'ticket'`; em Modo Livre limpa estrelas e reposiciona na Oficina; em Missão abre ecrã `FAILED` com `"🚨 Multa de Velocidade!"` e botão **"🔄 Tentar de Novo"**.
- **Limpar Estrelas:**
  1. Entrar na **Oficina Turbo** (exceto restrições explícitas dos Níveis 6 e 9).
  2. Em Modo Livre: manter-se a `> 85` u de todas as patrulhas durante `15s`.

### 5.2 Regra Única da Oficina Turbo (Paint & Spray) e Garagem
- **Ao entrar na zona da Oficina Turbo (`X = -32, Z = 0, raio = 8`):**
  1. Se `wantedStars > 0` (em Modo Livre ou após 3/3 checkpoints no Nível 6): **repara 100% do escudo, pinta automaticamente o veículo com nova cor néon, limpa as estrelas** e dispara efeito visual + SFX `'paint'` (sem abrir modal).
  2. Se `wantedStars === 0` em Modo Livre: repara 100% do escudo e exibe um botão contextual não-intrusivo **"🎨 Abrir Garagem (`G`)"** enquanto o jogador permanecer na zona (nunca força a abertura do modal ao passar).
  3. Nos Níveis 6 (antes de `3/3`) e 9: repara o escudo a 100%, mas **não** limpa as estrelas e mostra aviso breve explicativo.
- **Preview 3D da Garagem:** ao abrir a Garagem (do Menu Principal, Pausa ou Oficina), o jogo entra no estado `GARAGE`: coloca o veículo selecionado em exposição numa avenida livre (`X = -40, Z = 22`), orbita a câmara suavemente à volta (`dist = 8.4, y = 2.9`, `lookAt y = -0.35`) deixando o veículo e o *underglow* totalmente visíveis acima do painel compacto, e aplica em tempo real qualquer troca de veículo, cor ou *underglow*.
- **Otimização & Game Feel:** palmeiras e pilares das praças agrupados em `THREE.InstancedMesh` (redução de ~500 *draw calls* para 3), minimapa 2D atualizado a 20 Hz, *screen-shake* suave em impactos/saltos/EMP, rasto néon em *drift*, ocultação automática do condutor da `Moto Néon`/`Buggy` quando estacionados, e registo de recorde de salto (`bestAirtime`) em `localStorage`.

### 5.3 Rádio no Carro e Síntese de Áudio (`audio.js`)
- **Mistura de Volumes (GainNodes):** `masterGain = 0.7`, `musicGain = 0.22`, `engineGain = 0.12`, `sfxGain = 0.45`.
- **Sequenciador Musical (16 passos, Web Audio API):**
  - **Estação 0 — `📻 Vice Synthwave` (112 BPM, passo = `134ms`):**
    - Baixo (`sawtooth` → lowpass `420Hz`, gain `0.35`): padrão 16 passos em Lá menor (`A2, A2, A2, A2, F2, F2, F2, F2, C3, C3, C3, C3, G2, G2, G2, G2`).
    - Arpejo (`triangle`, gain `0.22`): `[A3, C4, E4, A4, F3, A3, C4, F4, C4, E4, G4, C5, G3, B3, D4, G4]`.
    - Bateria: kick (`sine` 130→40Hz nos passos `0, 4, 8, 12`) + snare (ruído filtrado nos passos `4, 12`).
  - **Estação 1 — `📻 Pop Arcade` (126 BPM, passo = `119ms`):**
    - Melodia (`square` → lowpass `1800Hz`, gain `0.18`): padrão alegre em Dó maior (`C4, E4, G4, C5, A4, G4, E4, G4, F4, A4, G4, E4, D4, F4, E4, D4`).
    - Baixo (`triangle`, gain `0.32`): `C3, C3, G2, G2, A2, A2, E2, E2, F2, F2, C3, C3, G2, G2, G2, B2`.
    - Hi-hat curto (ruído highpass `7000Hz`) nos passos ímpares.
  - **Estação 2 — `🔇 Silêncio`:** desliga música, mantém motor e SFX.
- **Motor:** oscilador contínuo (`sawtooth` + lowpass `320Hz`), frequência base `55Hz` (carros) ou `95Hz` (mota) subindo até `185Hz` / `290Hz` com a velocidade.

### 5.4 Câmaras (`C` ou botão HUD)
1. **3.ª Pessoa Perto (`cameraMode = 0`, default):** atrás `11` u, altura `4.8` u (a pé: atrás `7.5` u, altura `3.6` u); `lerp` suave `1 - Math.exp(-7 * dt)`.
2. **3.ª Pessoa Longe (`cameraMode = 1`):** atrás `17` u, altura `8.0` u (a pé: `11` u, altura `5.5` u).
3. **Vista Aérea Clássica (`cameraMode = 2`):** câmara fixa orientada a Norte (`Z` deslocado `+10` u para ligeira perspetiva 3D), altura dinâmica `34 + Math.abs(speed) * 0.35` u.

---

## 6. Os 10 Níveis da Campanha + Modo Livre (`missions.js`)

### Regra Geral de Estrelas (Níveis 1–6 e 8–10)
- **3 ⭐:** concluir com `≥ 40%` do tempo restante.
- **2 ⭐:** concluir com `≥ 15%` do tempo restante.
- **1 ⭐:** concluir antes do tempo esgotar.
- **Exceção explícita (Nível 7 — Corrida sem temporizador):** **1.º lugar = 3 ⭐**, **2.º lugar = 2 ⭐**; 3.º ou 4.º lugar não conclui (ecrã amigável *"Quase! Fica no Top 2 para avançar!"*).

### Tabela Detalhada dos 10 Níveis

| # | Título | Início | Trânsito | Objetivo & Condições Exatas | Tempo |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **1** | **Carta de Condução Turbo** | A pé em `(-40, 26)` ao lado de `coupe` em `(-40, 20)` | 6 | 1) Entrar no `coupe` (`E`); 2) Passar sequencialmente por **6 arcos néon** (`raio = 7` u) ao longo de `X = -40` e `X = 108`; 3) Entrar na **Oficina Turbo** (`raio = 8` u) com `|speed| <= 8 u/s` durante `0.4s`. | 120s |
| **2** | **Entrega Expresso de Pizzas Néon** | `van` em `(-40, 16)` | 6 | Entregar **4 caixas** sequencialmente (Praia `(124, -40)`, Parque `(-80, -40)`, Centro `(40, -80)`, Marina `(40, 80)`) entrando em cada anel (`raio = 7.5` u) com `|speed| <= 14 u/s`. | 130s |
| **3** | **Saltos de Cinema** | `moto` em `(108, -100)` | 0 | **Ordem livre:** saltar **5 rampas** marcadas (rampas 1, 2, 3, 5 e 7) e apanhar as **5 estrelas no ar** (`y = 5.5` u acima da ponta de cada rampa, `raio de recolha = 4.0` u). Se falhar uma estrela, pode repetir a rampa sem penalização. | 140s |
| **4** | **Colecionador da Garagem** | A pé na Garagem `(-108, -68)` com `coupe` de apoio em `(-108, -60)` | 6 | **Ordem livre:** localizar 3 veículos especiais (`buggy` em `(124, 10)`, `moto` em `(40, -100)`, `truck` em `(74, 100)`), entrar em cada um e conduzi-lo até à zona da **Garagem Secreta** (`raio = 8` u). | 180s |
| **5** | **Perseguição ao Furgão Fugitivo** | `coupe` em `(-40, -40)` | 6 | Um `van` autónomo percorre as avenidas (`34 u/s`). Dar-lhe **3 toques com Nitro ativo** (`empCooldown = 1.2s`) para recuperar o Troféu da Cidade. | 135s |
| **6** | **Operação Camuflagem** | `coupe` em `(40, 80)` | 6 | Começa com `2 ⭐` (2 patrulhas). Passar sequencialmente por **3 checkpoints** de fuga (`(108, 40)`, `(108, -80)`, `(-120, -40)`) e depois entrar na **Oficina Turbo** para pintar e limpar as estrelas. Entrar na Oficina antes de `3/3` repara o escudo mas avisa `"Passa primeiro pelos 3 checkpoints!"`. | 120s |
| **7** | **Grande Corrida da Marginal** | Veículo equipado na Garagem em `(108, 100)` | 0 | Corrida contra **3 rivais** (`coupe` Verde, Amarelo, Vermelho) num circuito de **12 checkpoints** pela Marginal e Centro. Rivais usam velocidade adaptada (`0.86x / 0.92x / 0.97x` da `maxSpeed` do jogador + rubber-banding `±10%`). Terminar no **Top 2** vence (`1.º = 3 ⭐`, `2.º = 2 ⭐`). | Sem limite |
| **8** | **Resgate dos Drones** | `buggy` em `(36, -96)` | 6 | Conduzir até às **3 praças pedonais**, **sair do veículo (`E`)** para entrar entre os pilares (`blocksVehicles: true, blocksPedestrian: false`), apanhar **6 mini-drones** (2 por praça, `raio = 2.5` u) e regressar ao **Laboratório Tech** (`raio = 8` u). | 165s |
| **9** | **Comboio Blindado** | `truck` em `(36, -96)` | 0 | Levar o Núcleo de Energia do Laboratório até à Marina passando por **5 checkpoints** com `2 ⭐` (2 patrulhas ativas) e `10` cones/barreiras na estrada (o `truck` empurra-os sem dano!). A Oficina Turbo repara o escudo mas não limpa as estrelas até entregar na Marina. | 130s |
| **10** | **Grande Final: Mega-Camião Rebelde** | Veículo equipado na Garagem em `(-40, 80)` (briefing sugere `coupe` ou `moto`) | 0 | O **Mega-Camião Boss** (`5.5×4.2×11` u, `radius = 3.6`, `32 u/s`) circula pelo anel central (`X ∈ {-40, 40}, Z ∈ {-40, 40}`), larga 1 cone a cada `2.5s` (máx. `12` ativos) e tem barra de HP no HUD (`5/5`). Dar **5 toques com Nitro ativo** (`empCooldown = 1.2s`) para vencer, abrir ecrã **"🏆 LENDA DE VICE NEON!"** e desbloquear o **Supercarro Dourado**! | 160s |

### Modo Livre (Free Roam)
- Sempre acessível no Menu Principal; `8` carros de trânsito ambiente, `28` peões, `8` veículos estacionados, rampas ativas, Oficina Turbo e polícia opcional por colisões repetidas.

---

## 7. Fluxo de Ecrãs, HUD e Controlos (PC & Mobile)

### 7.1 Máquina de Estados / Ecrãs
1. **`MENU` (Menu Principal):** fundo 3D vivo com câmara a orbitar a cidade ao pôr-do-sol; botões: **▶ Jogar Campanha**, **🌴 Modo Livre**, **🎨 Garagem**, **📋 Escolher Nível**, **🏠 Catálogo**.
2. **`LEVEL_SELECT` (Seleção de Níveis):** grelha 2×5 dos 10 níveis com estrelas ganhas (`0–3 ⭐`), estado bloqueado/desbloqueado e botão toggle **"🔓 Desbloquear Tudo"** / **"🔒 Voltar ao Progresso"**.
3. **`GARAGE` (Garagem 3D):** preview 3D em órbita + seletores de Veículo (7), Cor (8) e Underglow (6) + botão **✔ Guardar e Voltar**.
4. **`BRIEFING`:** modal compacto com n.º e título do nível, descrição curta (1–2 frases), dicas e botão **🚀 Começar Missão**.
5. **`PLAYING`:** jogo ativo com HUD + Minimapa + Seta 3D.
6. **`PAUSED`:** pausa física/timer; botões **▶ Continuar**, **🔄 Repor na Estrada (`F`)**, **🔁 Reiniciar Nível**, **🎨 Garagem**, **📋 Níveis**, toggle **📱 Controlos Táteis**, **🏠 Catálogo**.
7. **`VICTORY` / `CAMPAIGN_COMPLETE`:** confettis 3D/CSS, estrelas obtidas (`1–3 ⭐`), tempo final, botões **➡ Próximo Nível**, **🔁 Repetir**, **📋 Níveis**. (No Nível 10: banner especial **"🏆 LENDA DE VICE NEON! Supercarro Dourado Desbloqueado!"**).
8. **`FAILED`:** título amigável (*"⏱ Tempo Esgotado!"*, *"🔧 Escudo Esgotado!"*, *"🚨 Multa de Velocidade!"* ou *"🏁 Quase! Fica no Top 2!"*), botões **🔄 Tentar de Novo** e **📋 Escolher Nível**.

### 7.2 Controlos PC (Teclado)
| Tecla | A Conduzir | A Pé |
| :--- | :--- | :--- |
| `W` / `↑` | Acelerar | Mover frente (relativo à câmara / Norte na Vista Aérea) |
| `S` / `↓` | Travar / Marcha-atrás | Mover trás |
| `A` / `←` e `D` / `→` | Virar esquerda / direita | Mover esquerda / direita |
| `Espaço` | Drift (travão de mão) | Saltar |
| `Shift` | Nitro Turbo | Correr |
| `E` | Sair do veículo | Entrar no veículo próximo (`≤ 5.5` u) |
| `R` | Mudar estação de Rádio | Mudar estação de Rádio |
| `H` | Buzina (`police`: **toggle** Sirene) | Acenar + apito simpático |
| `C` | Alternar Câmara (3 modos) | Alternar Câmara (3 modos) |
| `F` | Repor na estrada mais próxima | Repor na estrada mais próxima |
| `G` | Abrir Garagem (quando na Oficina em Modo Livre) | Abrir Garagem (quando na Oficina em Modo Livre) |
| `P` / `Esc` | Pausa | Pausa |

### 7.3 Layout HUD Responsivo e Controlos Táteis (Mobile / Tablet)
- **Ativação:** automática quando `'ontouchstart' in window || navigator.maxTouchPoints > 0`, com toggle manual no menu de Pausa.
- **Mapeamento do Joystick Esquerdo (`112×112px`, `touch-action: none`):**
  - **A conduzir:** `joyY < -0.15` acelera (proporcional), `joyY > 0.15` trava/marcha-atrás, `joyX` vira esquerda/direita (consistente nas 3 câmaras).
  - **A pé:** vetor `(joyX, joyY)` move a personagem relativamente à câmara (ou N/S/E/O na Vista Aérea).
- **4 Botões Táteis à Direita (`58×58px`):**
  - **🔥 TURBO** (a pé: **🏃 CORRER**)
  - **🚗 SAIR** (a pé: **🚪 ENTRAR**, destaca-se a verde quando `≤ 5.5` u de um veículo)
  - **💨 DRIFT** (a pé: **⬆️ SALTAR**)
  - **📣 BUZINA** (`police`: **🚨 SIRENE**; a pé: **👋 ACENAR**)
- **Layout sem sobreposições em Desktop (`1280×720`), Mobile Portrait (`390×844`) e Landscape (`844×390`):**
  - **Barra Superior (sempre apenas 2 blocos — Esquerda e Direita):**
    - *Esquerda:* Cartão de Missão (Título, Progresso, Timer, Estrelas de Alerta, HP do Boss no Nível 10).
    - *Direita:* **5 botões rápidos** sempre presentes (`Câmara`, `Rádio`, `Clima`, `Som`, `Pausa` — ícones compactos `36×36px` em `< 768px`).
  - **Bloco de Telemetria (Velocímetro + Escudo + Nitro):**
    - *Desktop (`≥ 768px`):* canto inferior direito.
    - *Mobile (`< 768px`):* barra fina horizontal posicionada **por baixo** do cartão de Missão à esquerda (nunca compete com os 2 blocos do topo, nem com os botões táteis em baixo).
  - **Minimapa (`<canvas>` 2D, mapa fixo a Norte com seta rotativa):**
    - *Desktop (`≥ 768px`):* `136×136px` no canto inferior esquerdo.
    - *Mobile (`< 768px`):* `88×88px` no canto inferior central (entre o joystick e os botões táteis), sem tocar em nenhum controlo.

---

## 8. Persistência (`localStorage`)

- **Chave:** `gtc_vice_neon_save_v1`
- **Schema JSON:**
```json
{
  "unlockedLevel": 1,
  "unlockAll": false,
  "starsByLevel": {},
  "customization": {
    "vehicleId": "coupe",
    "color": "#ec4899",
    "underglow": "#22d3ee"
  },
  "timeOfDay": "sunset",
  "radioStation": 0,
  "muted": false,
  "cameraMode": 0
}
```
- **Regras:**
  - Ao completar o Nível `N`, `unlockedLevel = Math.max(unlockedLevel, N + 1)` (`unlockedLevel === 11` indica campanha concluída → `gold_supercar` e cor `Dourado Metálico` desbloqueados permanentemente).
  - **Toggle "🔓 Desbloquear Tudo":** alterna `unlockAll` entre `true` e `false` sem apagar `unlockedLevel` nem `starsByLevel`. Se passar para `false` e `unlockedLevel < 11`, caso `customization.vehicleId === 'gold_supercar'` reverte para `'coupe'` e caso `customization.color === '#fbbf24'` reverte para `'#ec4899'`.

---

## 9. Critérios de Aceitação

1. [ ] Cartão de **Grand Turbo City: Vice Neon** visível em `index.html` (emoji `🌴`, filtro `aventura`) abrindo `jogos/grand_turbo_city/index.html`, e botão **"🏠 Catálogo"** regressando a `../../index.html`.
2. [ ] Zero erros na consola JavaScript ou WebGL durante carregamento, condução, transições de nível, Garagem e Pausa; compatível com `file://` e HTTPS.
3. [ ] Personagem a pé (invencível, movimento relativo à câmara, saltar, correr) + entrada/saída (`E` / tátil) em todos os 7 veículos, incluindo `Moto Néon` com inclinação nas curvas e `Supercarro Dourado` bloqueado até Nível 10 / `unlockAll`.
4. [ ] Física arcade completa: aceleração, marcha-atrás, drift, Nitro com consumo/regen/pickups/chamas, saltos em rampas com `airtime`, areia com vantagem para `buggy`, cones empurrados pelo `truck`, deslizamento suave em AABBs e tecla `F` para repor na estrada.
5. [ ] Polícia humana cartoon sem armas, 1–3 ⭐, captura "Multa!", e limpeza na Oficina Turbo (respeitando as regras dos Níveis 6 e 9 e a regra não-intrusiva em Modo Livre).
6. [ ] Rádio sintetizado com 3 estações (`Vice Synthwave`, `Pop Arcade`, `Silêncio`), Garagem 3D com 8 cores + 6 modos *underglow* persistidos, 3 câmaras e 3 temas de iluminação.
7. [ ] Todos os 10 níveis jogáveis do início ao fim com seta 3D, minimapa 2D, regras exatas de vitória/estrelas e toggle "Desbloquear Tudo", além do Modo Livre.
8. [ ] Layout limpo sem sobreposições em `1280×720`, `390×844` e `844×390`, com os 5 botões de topo, joystick e 4 botões táteis contextuais.

---

## 10. Edge Cases e Mitigações Obrigatórias

| Edge Case | Mitigação Obrigatória |
| :--- | :--- |
| **Veículo preso em esquina/edifício** | Resolução AABB separada (`X` depois `Z`) + tecla `F` e botão **"🔄 Repor na Estrada"** no menu de Pausa usando `City.findNearestRoadPoint()`. |
| **Sair do veículo encostado a parede** | Testar 4 offsets (`esquerda, direita, trás, frente`) contra `city.colliders`; fallback `findNearestRoadPoint()`. |
| **IA (Polícia / Rivais / Trânsito / Boss) presa** | Steering avoidance frontal + `stuckTimer`: se mover `< 1.5` u durante `2.5s` a tentar avançar, reposiciona no nó/segmento de estrada mais próximo na direção do alvo. |
| **Sair do veículo obrigatório em missão** | Níveis 1, 2, 3, 9: não falha; exibe aviso `"Volta para o teu veículo da missão!"` e aponta a seta 3D para esse veículo até reentrar. |
| **Múltiplos toques no mesmo embate (Níveis 5 e 10)** | `empCooldown = 1.2s` por toque válido, com flash visual + som `'emp'`. |
| **Autoplay de Áudio bloqueado** | Inicialização/retoma do `AudioContext` em listener `pointerdown` / `keydown` dentro de `try/catch`. |
| **`localStorage` indisponível ou corrompido** | Leitura/escrita em `try/catch` com merge defensivo sobre o estado default. |
| **Resize / Rotação de telemóvel** | Listener `resize` atualiza `camera.aspect`, `updateProjectionMatrix()` e `renderer.setSize(w, h)` com `pixelRatio = Math.min(devicePixelRatio, 2)`. |
| **Perda de foco do separador** | `dt = Math.min(rawDt, 0.05)` no loop principal; pausa automática via `visibilitychange` quando `document.hidden` e estado `=== 'PLAYING'`. |
