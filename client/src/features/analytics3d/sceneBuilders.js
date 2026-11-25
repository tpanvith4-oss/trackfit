import * as THREE from 'three';

const PALETTE = {
  protein: 0x10b981, // emerald-500
  carbs: 0x38bdf8, // sky-400
  fat: 0xf59e0b, // amber-500
  burn: 0xf43f5e, // rose-500
  target: 0xe2e8f0, // slate-200
  gold: 0xfbbf24, // amber-400
  cyan: 0x22d3ee, // cyan-400
  slateMetal: 0x334155,
  darkBase: 0x111827,
  warmAccent: 0xf97316,
  habitOn: 0x34d399,
  habitOff: 0x475569,
};

/**
 * Procedural brushed anodized metal canvas texture (zero external network fetches).
 */
export function createBrushedMetalTexture(baseHex = '#1e293b', streakHex = '#334155', maxAnisotropy = 4) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 650; i += 1) {
    const y = (i * 0.79) % 512;
    const alpha = 0.04 + ((i * 37) % 100) / 700;
    ctx.strokeStyle = streakHex;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1 + (i % 2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y + (((i % 5) - 2) * 0.4));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

/**
 * Procedural calibrated instrument dial grid texture for the pedestal top deck.
 */
export function createDialGridTexture(maxAnisotropy = 4) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(cx, cy, 40, cx, cy, size * 0.5);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(0.65, '#0f172a');
  grad.addColorStop(1, '#090e1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle concentric calibration rings
  const radii = [110, 210, 315, 420, 476];
  radii.forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = idx === radii.length - 1 ? 'rgba(148, 163, 184, 0.32)' : 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = idx === radii.length - 1 ? 2.5 : 1.5;
    ctx.stroke();
  });

  // Radial degree ticks
  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const inner = isMajor ? 444 : 460;
    const outer = 476;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
    ctx.lineTo(cx + Math.cos(rad) * outer, cy + Math.sin(rad) * outer);
    ctx.strokeStyle = isMajor ? 'rgba(56, 189, 248, 0.45)' : 'rgba(148, 163, 184, 0.18)';
    ctx.lineWidth = isMajor ? 2.2 : 1;
    ctx.stroke();
  }

  // Orthogonal crosshairs
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 430, cy);
  ctx.lineTo(cx + 430, cy);
  ctx.moveTo(cx, cy - 430);
  ctx.lineTo(cx, cy + 430);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

/**
 * Soft radial contact shadow decal placed at y = 0.005 beneath the plinth.
 */
export function createContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 28, 128, 128, 126);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
  grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.35)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Shared precision turntable pedestal (composite LatheGeometry + deck + InstancedMesh ticks).
 */
export function buildTurntablePedestal({ brushedTex, dialTex, shadowTex, isSoftwareGl }) {
  const group = new THREE.Group();
  group.name = 'TurntablePedestal';

  // Ground contact shadow plane
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(16.5, 16.5), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.004;
  group.add(shadowPlane);

  // Outer chamfered anodized ring via LatheGeometry
  const lathePoints = [
    new THREE.Vector2(0.01, 0.0),
    new THREE.Vector2(6.55, 0.0),
    new THREE.Vector2(6.62, 0.12),
    new THREE.Vector2(6.36, 0.42),
    new THREE.Vector2(5.98, 0.45),
    new THREE.Vector2(5.88, 0.36),
    new THREE.Vector2(0.01, 0.36),
  ];
  const baseGeo = new THREE.LatheGeometry(lathePoints, isSoftwareGl ? 40 : 64);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    map: brushedTex,
    metalness: 0.78,
    roughness: 0.34,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.receiveShadow = true;
  baseMesh.castShadow = !isSoftwareGl;
  group.add(baseMesh);

  // Satin metallic trim collar
  const trimGeo = new THREE.TorusGeometry(6.18, 0.045, 12, isSoftwareGl ? 48 : 80);
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.88,
    roughness: 0.22,
  });
  const trimMesh = new THREE.Mesh(trimGeo, trimMat);
  trimMesh.rotation.x = Math.PI / 2;
  trimMesh.position.y = 0.44;
  group.add(trimMesh);

  // Calibrated slate instrument deck with polygonOffset to avoid z-fighting
  const deckGeo = new THREE.CylinderGeometry(5.92, 5.92, 0.04, isSoftwareGl ? 40 : 64);
  const deckMat = new THREE.MeshStandardMaterial({
    map: dialTex,
    metalness: 0.28,
    roughness: 0.62,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const deckMesh = new THREE.Mesh(deckGeo, deckMat);
  deckMesh.position.y = 0.38;
  deckMesh.receiveShadow = true;
  group.add(deckMesh);

  // 36 instanced perimeter calibration studs
  const studCount = 36;
  const studGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.12, 8);
  const studMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.85,
    roughness: 0.24,
  });
  const studs = new THREE.InstancedMesh(studGeo, studMat, studCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < studCount; i += 1) {
    const angle = (i / studCount) * Math.PI * 2;
    const isCardinal = i % 9 === 0;
    dummy.position.set(Math.cos(angle) * 6.08, 0.45 + (isCardinal ? 0.03 : 0), Math.sin(angle) * 6.08);
    dummy.scale.set(isCardinal ? 1.45 : 1, isCardinal ? 1.4 : 1, isCardinal ? 1.45 : 1);
    dummy.rotation.set(0, -angle, 0);
    dummy.updateMatrix();
    studs.setMatrixAt(i, dummy.matrix);
  }
  studs.instanceMatrix.needsUpdate = true;
  studs.computeBoundingSphere();
  group.add(studs);

  return group;
}

/**
 * SCENE 1: 14-Day Macro & Energy Skyline
 * Composite 6-part towers arranged in a curved amphitheater arc with sweeping target rail.
 */
export function buildSkylineScene({ dataset, brushedTex, isSoftwareGl }) {
  const root = new THREE.Group();
  root.name = 'SkylineScene';

  const interactiveProxies = [];
  const animatedParts = [];
  const explodableGroups = [];

  const days = dataset.daily ?? [];
  const deckY = 0.4;
  const maxCal = Math.max(
    dataset.targets?.calories || 1650,
    ...days.map((d) => d.calories || 0),
    1800,
  );
  const heightScale = 3.85 / maxCal;

  // Shared materials with varied PBR properties
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    map: brushedTex,
    metalness: 0.72,
    roughness: 0.36,
  });
  const proteinMat = new THREE.MeshStandardMaterial({
    color: PALETTE.protein,
    metalness: 0.22,
    roughness: 0.32,
  });
  const carbsMat = new THREE.MeshStandardMaterial({
    color: PALETTE.carbs,
    metalness: 0.18,
    roughness: 0.44,
  });
  const fatMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fat,
    metalness: 0.38,
    roughness: 0.28,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.82,
    roughness: 0.22,
  });
  const burnHaloMat = new THREE.MeshStandardMaterial({
    color: PALETTE.burn,
    emissive: PALETTE.burn,
    emissiveIntensity: 0.55,
    metalness: 0.35,
    roughness: 0.28,
  });

  const targetCurvePts = [];
  const count = Math.max(1, days.length);
  const arcRadius = 4.35;
  const arcSpan = Math.PI * 1.18;

  days.forEach((day, idx) => {
    const t = count === 1 ? 0.5 : idx / (count - 1);
    const angle = -arcSpan / 2 + t * arcSpan - Math.PI / 2;
    const x = Math.cos(angle) * arcRadius;
    const z = Math.sin(angle) * arcRadius + 0.55;

    const tower = new THREE.Group();
    tower.position.set(x, deckY, z);
    tower.rotation.y = -angle + Math.PI / 2;

    // Part 1: Chamfered base plinth
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.16, 6), plinthMat);
    plinth.position.y = 0.08;
    plinth.castShadow = !isSoftwareGl;
    plinth.receiveShadow = true;
    tower.add(plinth);

    const pKcal = (day.proteinG || 0) * 4;
    const cKcal = (day.carbsG || 0) * 4;
    const fKcal = (day.fatG || 0) * 9;
    const macroSum = pKcal + cKcal + fKcal;
    const totalCal = day.calories > 0 ? day.calories : 120;
    const ratio = macroSum > 0 ? totalCal / macroSum : 1;

    const hP = Math.max(0.14, (macroSum > 0 ? pKcal * ratio : totalCal * 0.34) * heightScale);
    const hC = Math.max(0.14, (macroSum > 0 ? cKcal * ratio : totalCal * 0.42) * heightScale);
    const hF = Math.max(0.12, (macroSum > 0 ? fKcal * ratio : totalCal * 0.24) * heightScale);

    // Part 2: Protein prismatic block
    const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, hP, 0.46), proteinMat);
    pMesh.position.y = 0.16 + hP / 2;
    pMesh.castShadow = !isSoftwareGl;
    pMesh.receiveShadow = true;
    tower.add(pMesh);

    // Part 3: Carbs prismatic block
    const cMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, hC, 0.42), carbsMat);
    cMesh.position.y = 0.16 + hP + 0.03 + hC / 2;
    cMesh.castShadow = !isSoftwareGl;
    cMesh.receiveShadow = true;
    tower.add(cMesh);

    // Part 4: Fat prismatic block
    const fMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, hF, 0.38), fatMat);
    fMesh.position.y = 0.16 + hP + hC + 0.06 + hF / 2;
    fMesh.castShadow = !isSoftwareGl;
    fMesh.receiveShadow = true;
    tower.add(fMesh);

    const topY = 0.16 + hP + hC + hF + 0.08;

    // Part 5: Brushed crown cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.08, 6), capMat);
    cap.position.y = topY + 0.04;
    tower.add(cap);

    // Part 6: Floating Active Burn halo scaled to activeCalories
    const burnRatio = Math.min(1.5, Math.max(0.25, (day.activeCalories || 180) / 520));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.22 + burnRatio * 0.1, 0.026, 10, 28), burnHaloMat);
    halo.rotation.x = Math.PI / 2;
    const haloBaseY = topY + 0.34;
    halo.position.y = haloBaseY;
    tower.add(halo);

    animatedParts.push({
      mesh: halo,
      type: 'bob',
      baseY: haloBaseY,
      phase: idx * 0.55,
      amp: 0.06,
    });

    explodableGroups.push(
      { mesh: pMesh, baseY: pMesh.position.y, deltaY: 0.08 },
      { mesh: cMesh, baseY: cMesh.position.y, deltaY: 0.48 },
      { mesh: fMesh, baseY: fMesh.position.y, deltaY: 0.92 },
      { mesh: cap, baseY: cap.position.y, deltaY: 1.18 },
      { mesh: halo, baseY: haloBaseY, deltaY: 1.48, animatedRef: animatedParts[animatedParts.length - 1] },
    );

    // Target height coordinate for sweeping budget spline
    const targetY = deckY + 0.16 + (day.calorieTarget || 1650) * heightScale;
    targetCurvePts.push(new THREE.Vector3(x, targetY, z));

    // Selection highlight ring (hidden until hovered/selected)
    const selectRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.022, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0 }),
    );
    selectRing.rotation.x = Math.PI / 2;
    selectRing.position.y = 0.04;
    tower.add(selectRing);

    // Invisible layer-1 raycast proxy for crisp hover/click selection
    const proxyH = Math.max(1.2, topY + 0.65);
    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, proxyH, 0.68),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    proxy.position.y = proxyH / 2;
    proxy.layers.set(1);
    proxy.userData = {
      id: `day-${day.date}`,
      selectRing,
      title: `${day.weekday} · ${day.label}`,
      subtitle: `${day.calories} kcal / ${day.calorieTarget} target`,
      metrics: [
        { label: 'Protein', value: `${day.proteinG}g`, tone: 'emerald' },
        { label: 'Carbs', value: `${day.carbsG}g`, tone: 'sky' },
        { label: 'Fat', value: `${day.fatG}g`, tone: 'amber' },
        { label: 'Active Burn', value: `${day.activeCalories} kcal`, tone: 'rose' },
        { label: 'Net Balance', value: `${day.netCalories} kcal`, tone: 'slate' },
        { label: 'Habits', value: `${day.habitScore}%`, tone: 'emerald' },
      ],
    };
    tower.add(proxy);
    interactiveProxies.push(proxy);

    root.add(tower);
  });

  // Sweeping calorie target rail (TubeGeometry)
  if (targetCurvePts.length >= 2) {
    const curve = new THREE.CatmullRomCurve3(targetCurvePts);
    const tubeGeo = new THREE.TubeGeometry(curve, isSoftwareGl ? 40 : 72, 0.035, 10, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: PALETTE.target,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.28,
      metalness: 0.85,
      roughness: 0.2,
    });
    const rail = new THREE.Mesh(tubeGeo, tubeMat);
    root.add(rail);
  }

  // Central focal summary beacon representing 7-day rolling energy status
  const centerBeacon = new THREE.Group();
  centerBeacon.position.set(0, deckY, 0.45);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.92, 0.24, 24), plinthMat);
  pedestal.position.y = 0.12;
  centerBeacon.add(pedestal);

  const adhereRatio = Math.min(1.2, Math.max(0.25, (dataset.kpis?.proteinAdherencePct || 85) / 100));
  const coreMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42 + adhereRatio * 0.14, 0),
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x059669,
      emissiveIntensity: 0.35,
      metalness: 0.45,
      roughness: 0.2,
    }),
  );
  coreMesh.position.y = 1.05;
  coreMesh.castShadow = !isSoftwareGl;
  centerBeacon.add(coreMesh);

  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.028, 12, 48),
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
    }),
  );
  orbitRing.position.y = 1.05;
  orbitRing.rotation.x = Math.PI * 0.35;
  centerBeacon.add(orbitRing);

  animatedParts.push(
    { mesh: coreMesh, type: 'spin', speedY: 0.55, speedX: 0.18 },
    { mesh: orbitRing, type: 'spin', speedY: -0.35, speedZ: 0.22 },
  );
  root.add(centerBeacon);

  return { root, interactiveProxies, animatedParts, explodableGroups };
}

/**
 * SCENE 2: 3D Metabolic Gyroscope & Habit Core
 * 12-part horological instrument displaying live macro fill arcs + 4 orbiting habit satellites.
 */
export function buildMacroCoreScene({ dataset, brushedTex, isSoftwareGl }) {
  const root = new THREE.Group();
  root.name = 'MacroCoreScene';

  const interactiveProxies = [];
  const animatedParts = [];
  const explodableGroups = [];

  const today = dataset.today ?? {};
  const targets = dataset.targets ?? { calories: 1650, proteinG: 145, carbsG: 160, fatG: 48 };
  const deckY = 0.4;

  // Pedestal mount via LatheGeometry
  const mountPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(1.45, 0),
    new THREE.Vector2(1.32, 0.26),
    new THREE.Vector2(0.95, 0.42),
    new THREE.Vector2(0.82, 0.65),
    new THREE.Vector2(0.01, 0.65),
  ];
  const mountMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    map: brushedTex,
    metalness: 0.82,
    roughness: 0.3,
  });
  const mount = new THREE.Mesh(new THREE.LatheGeometry(mountPts, isSoftwareGl ? 32 : 48), mountMat);
  mount.position.y = deckY;
  mount.castShadow = !isSoftwareGl;
  mount.receiveShadow = true;
  root.add(mount);

  const centerY = deckY + 2.55;
  const gyroCenter = new THREE.Group();
  gyroCenter.position.set(0, centerY, 0);
  root.add(gyroCenter);

  // Central calorie crystal core
  const calPct = targets.calories ? Math.min(1.4, (today.calories || 0) / targets.calories) : 0;
  const crystalMat = isSoftwareGl
    ? new THREE.MeshStandardMaterial({
        color: calPct > 1.08 ? 0xf97316 : 0x38bdf8,
        emissive: calPct > 1.08 ? 0x9a3412 : 0x0369a1,
        emissiveIntensity: 0.42,
        metalness: 0.45,
        roughness: 0.18,
      })
    : new THREE.MeshPhysicalMaterial({
        color: calPct > 1.08 ? 0xf97316 : 0x38bdf8,
        emissive: calPct > 1.08 ? 0x9a3412 : 0x0284c7,
        emissiveIntensity: 0.28,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.55,
        ior: 1.45,
        thickness: 0.9,
      });

  const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 1), crystalMat);
  crystal.castShadow = !isSoftwareGl;
  gyroCenter.add(crystal);
  animatedParts.push({ mesh: crystal, type: 'spin', speedY: 0.42, speedX: 0.16 });

  // Inner brass core frame
  const coreCage = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.032, 10, 40),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 }),
  );
  gyroCenter.add(coreCage);
  animatedParts.push({ mesh: coreCage, type: 'spin', speedX: 0.35, speedZ: 0.25 });

  // Clickable proxy for Calorie Core
  const coreProxy = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 12, 12),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  coreProxy.layers.set(1);
  coreProxy.userData = {
    id: 'core-calories',
    title: 'Daily Energy Core',
    subtitle: `${today.calories || 0} / ${targets.calories} kcal (${Math.round(calPct * 100)}%)`,
    metrics: [
      { label: 'Intake', value: `${today.calories || 0} kcal`, tone: 'sky' },
      { label: 'Active Burn', value: `${today.activeCalories || 0} kcal`, tone: 'rose' },
      { label: 'Net Balance', value: `${today.netCalories || 0} kcal`, tone: 'emerald' },
      { label: '7d Avg', value: `${dataset.kpis?.avgCalories7d || 0} kcal`, tone: 'slate' },
    ],
  };
  gyroCenter.add(coreProxy);
  interactiveProxies.push(coreProxy);

  // 3 nested precision gimbal rings for Protein, Carbs, Fat
  const macroRings = [
    {
      id: 'ring-protein',
      name: 'Protein Gimbal',
      radius: 1.45,
      tube: 0.085,
      color: PALETTE.protein,
      grams: today.proteinG || 0,
      target: targets.proteinG || 145,
      kcal: Math.round((today.proteinG || 0) * 4),
      tiltX: 0.28,
      tiltZ: 0.16,
      spinY: 0.22,
      explodeY: 0.85,
    },
    {
      id: 'ring-carbs',
      name: 'Carbs Gimbal',
      radius: 2.02,
      tube: 0.075,
      color: PALETTE.carbs,
      grams: today.carbsG || 0,
      target: targets.carbsG || 160,
      kcal: Math.round((today.carbsG || 0) * 4),
      tiltX: -0.42,
      tiltZ: 0.28,
      spinY: -0.17,
      explodeY: 0.0,
    },
    {
      id: 'ring-fat',
      name: 'Fat Gimbal',
      radius: 2.58,
      tube: 0.068,
      color: PALETTE.fat,
      grams: today.fatG || 0,
      target: targets.fatG || 48,
      kcal: Math.round((today.fatG || 0) * 9),
      tiltX: 0.18,
      tiltZ: -0.36,
      spinY: 0.12,
      explodeY: -0.82,
    },
  ];

  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.84,
    roughness: 0.28,
  });
  const rivetMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.18,
  });

  macroRings.forEach((cfg) => {
    const gimbal = new THREE.Group();
    gimbal.rotation.set(cfg.tiltX, 0, cfg.tiltZ);

    // Titanium outer track ring
    const track = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.radius, cfg.tube * 0.56, 12, isSoftwareGl ? 48 : 72),
      trackMat,
    );
    gimbal.add(track);

    // Illuminated fill arc matching macro progress
    const pct = cfg.target ? Math.min(1, Math.max(0.06, cfg.grams / cfg.target)) : 0.1;
    const arcMesh = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.radius, cfg.tube, 14, isSoftwareGl ? 44 : 68, Math.PI * 2 * pct),
      new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.35,
        metalness: 0.32,
        roughness: 0.26,
      }),
    );
    arcMesh.castShadow = !isSoftwareGl;
    gimbal.add(arcMesh);

    // 4 machined fasteners per gimbal ring
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2;
      const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.16, 10), rivetMat);
      rivet.position.set(Math.cos(a) * cfg.radius, Math.sin(a) * cfg.radius, 0);
      rivet.rotation.x = Math.PI / 2;
      gimbal.add(rivet);
    }

    // Raycast torus proxy on layer 1
    const proxy = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.radius, cfg.tube * 2.1, 8, 24),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    proxy.layers.set(1);
    proxy.userData = {
      id: cfg.id,
      title: cfg.name,
      subtitle: `${cfg.grams}g / ${cfg.target}g target (${Math.round((cfg.grams / Math.max(1, cfg.target)) * 100)}%)`,
      metrics: [
        { label: 'Logged', value: `${cfg.grams} g`, tone: 'emerald' },
        { label: 'Target', value: `${cfg.target} g`, tone: 'slate' },
        { label: 'Energy', value: `${cfg.kcal} kcal`, tone: 'sky' },
        { label: 'Remaining', value: `${Math.max(0, Math.round(cfg.target - cfg.grams))} g`, tone: 'amber' },
      ],
    };
    gimbal.add(proxy);
    interactiveProxies.push(proxy);

    animatedParts.push({ mesh: gimbal, type: 'spin', speedY: cfg.spinY });
    explodableGroups.push({ mesh: gimbal, baseY: 0, deltaY: cfg.explodeY });
    gyroCenter.add(gimbal);
  });

  // 4 Orbiting Protocol Habit Satellites (Water, Creatine, Vacuums, Soya Rinse)
  const habits = [
    {
      id: 'habit-water',
      name: 'Hydration Protocol',
      done: (today.waterMl || 0) >= 3000,
      value: `${((today.waterMl || 0) / 1000).toFixed(1)} L / 3.5 L`,
    },
    {
      id: 'habit-creatine',
      name: 'Creatine 5g',
      done: Boolean(today.creatineTaken),
      value: today.creatineTaken ? 'Completed' : 'Pending',
    },
    {
      id: 'habit-vacuums',
      name: 'Stomach Vacuums',
      done: (today.vacuumSets || 0) >= 5,
      value: `${today.vacuumSets || 0} / 5 sets`,
    },
    {
      id: 'habit-soya',
      name: 'Soya Triple-Rinse',
      done: Boolean(today.soyaRinsed),
      value: today.soyaRinsed ? 'Verified' : 'Pending',
    },
  ];

  const habitOrbit = new THREE.Group();
  habitOrbit.position.y = deckY + 1.05;
  root.add(habitOrbit);
  animatedParts.push({ mesh: habitOrbit, type: 'spin', speedY: 0.14 });

  habits.forEach((h, idx) => {
    const angle = (idx / habits.length) * Math.PI * 2 + Math.PI / 4;
    const rad = 4.25;
    const pod = new THREE.Group();
    pod.position.set(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);

    const chassis = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.28, 8), mountMat);
    pod.add(chassis);

    const statusCol = h.done ? PALETTE.habitOn : PALETTE.habitOff;
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshStandardMaterial({
        color: statusCol,
        emissive: statusCol,
        emissiveIntensity: h.done ? 0.55 : 0.1,
        metalness: 0.35,
        roughness: 0.25,
      }),
    );
    core.position.y = 0.36;
    pod.add(core);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.024, 8, 24),
      new THREE.MeshStandardMaterial({
        color: statusCol,
        metalness: 0.75,
        roughness: 0.25,
      }),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.16;
    pod.add(halo);

    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.05, 0.95),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    proxy.position.y = 0.25;
    proxy.layers.set(1);
    proxy.userData = {
      id: h.id,
      title: h.name,
      subtitle: h.done ? 'Protocol check-in complete' : 'Pending today',
      metrics: [
        { label: 'Status', value: h.value, tone: h.done ? 'emerald' : 'amber' },
        { label: 'Day Score', value: `${today.habitScore || 0}%`, tone: 'sky' },
      ],
    };
    pod.add(proxy);
    interactiveProxies.push(proxy);
    habitOrbit.add(pod);
  });

  return { root, interactiveProxies, animatedParts, explodableGroups };
}

/**
 * SCENE 3: 10-Week Cut Trajectory Arena
 * Dual 3D splines (Protocol Target vs Actual Weight/Waist) with 4-part clickable week beacons.
 */
export function buildTrajectoryScene({ dataset, brushedTex, isSoftwareGl }) {
  const root = new THREE.Group();
  root.name = 'TrajectoryScene';

  const interactiveProxies = [];
  const animatedParts = [];
  const explodableGroups = [];

  const points = dataset.trajectoryPoints ?? [];
  const deckY = 0.4;

  const weights = points.flatMap((p) => [p.targetWeightKg, p.actualWeightKg].filter((v) => v != null));
  const minW = Math.min(...weights, 55.5) - 0.6;
  const maxW = Math.max(...weights, 64.5) + 0.6;
  const wSpan = Math.max(2, maxW - minW);

  const mapX = (weekIdx) => -4.2 + (weekIdx / Math.max(1, points.length - 1)) * 8.4;
  const mapY = (weightKg) => deckY + 0.55 + ((weightKg - minW) / wSpan) * 3.1;

  const targetVectors = [];
  const actualVectors = [];

  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    map: brushedTex,
    metalness: 0.78,
    roughness: 0.32,
  });
  const targetBeaconMat = new THREE.MeshStandardMaterial({
    color: PALETTE.gold,
    emissive: PALETTE.gold,
    emissiveIntensity: 0.35,
    metalness: 0.5,
    roughness: 0.24,
  });
  const actualBeaconMat = new THREE.MeshStandardMaterial({
    color: PALETTE.cyan,
    emissive: PALETTE.cyan,
    emissiveIntensity: 0.55,
    metalness: 0.4,
    roughness: 0.2,
  });
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.85,
    roughness: 0.25,
  });

  // Back reference plane rails (3 horizontal altitude guides)
  for (let i = 0; i < 3; i += 1) {
    const guideY = deckY + 0.8 + i * 1.15;
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(8.8, 0.025, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.35 }),
    );
    rail.position.set(0, guideY, -1.65);
    root.add(rail);
  }

  points.forEach((pt, idx) => {
    const x = mapX(idx);
    const ty = mapY(pt.targetWeightKg);
    const targetZ = -0.85;
    targetVectors.push(new THREE.Vector3(x, ty, targetZ));

    // Target 4-part beacon
    const tGroup = new THREE.Group();
    tGroup.position.set(x, deckY, targetZ);

    const tFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.1, 8), baseMat);
    tFoot.position.y = 0.05;
    tGroup.add(tFoot);

    const tStemH = Math.max(0.2, ty - deckY - 0.14);
    const tStem = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, tStemH, 8), stemMat);
    tStem.position.y = 0.1 + tStemH / 2;
    tGroup.add(tStem);

    const tHead = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), targetBeaconMat);
    tHead.position.y = ty - deckY;
    tHead.castShadow = !isSoftwareGl;
    tGroup.add(tHead);

    const tRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 8, 24), targetBeaconMat);
    tRing.rotation.x = Math.PI / 2;
    tRing.position.y = ty - deckY;
    tGroup.add(tRing);

    explodableGroups.push({ mesh: tGroup, baseZ: targetZ, deltaZ: -0.75 });
    root.add(tGroup);

    // Actual logged weight/waist beacon if present
    let actualGroup = null;
    if (pt.actualWeightKg != null) {
      const ay = mapY(pt.actualWeightKg);
      const actualZ = 0.85;
      actualVectors.push(new THREE.Vector3(x, ay, actualZ));

      actualGroup = new THREE.Group();
      actualGroup.position.set(x, deckY, actualZ);

      const aFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.12, 8), baseMat);
      aFoot.position.y = 0.06;
      actualGroup.add(aFoot);

      const aStemH = Math.max(0.2, ay - deckY - 0.16);
      const aStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, aStemH, 8), stemMat);
      aStem.position.y = 0.12 + aStemH / 2;
      actualGroup.add(aStem);

      const aHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 16), actualBeaconMat);
      aHead.position.y = ay - deckY;
      aHead.castShadow = !isSoftwareGl;
      actualGroup.add(aHead);

      const aHalo = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.022, 8, 24), actualBeaconMat);
      aHalo.rotation.x = Math.PI / 2;
      aHalo.position.y = ay - deckY;
      actualGroup.add(aHalo);

      animatedParts.push({
        mesh: aHalo,
        type: 'bob',
        baseY: ay - deckY,
        phase: idx * 0.65,
        amp: 0.05,
      });
      explodableGroups.push({ mesh: actualGroup, baseZ: actualZ, deltaZ: 0.85 });
      root.add(actualGroup);
    }

    // Raycast proxy spanning the week column
    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 3.8, 2.3),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    proxy.position.set(x, deckY + 1.9, 0);
    proxy.layers.set(1);
    const weightDelta =
      pt.actualWeightKg != null ? Number((pt.actualWeightKg - pt.targetWeightKg).toFixed(2)) : null;
    const waistDelta =
      pt.actualWaistCm != null ? Number((pt.actualWaistCm - pt.targetWaistCm).toFixed(1)) : null;
    proxy.userData = {
      id: `week-${pt.week}`,
      title: `Week ${pt.week} Milestone`,
      subtitle: pt.date,
      metrics: [
        { label: 'Target Wt', value: `${pt.targetWeightKg} kg`, tone: 'amber' },
        {
          label: 'Actual Wt',
          value: pt.actualWeightKg != null ? `${pt.actualWeightKg} kg` : 'Upcoming',
          tone: 'sky',
        },
        { label: 'Target Waist', value: `${pt.targetWaistCm} cm`, tone: 'amber' },
        {
          label: 'Actual Waist',
          value: pt.actualWaistCm != null ? `${pt.actualWaistCm} cm` : 'Upcoming',
          tone: 'emerald',
        },
        {
          label: 'Delta Wt',
          value: weightDelta != null ? `${weightDelta > 0 ? '+' : ''}${weightDelta} kg` : '—',
          tone: weightDelta != null && weightDelta <= 0.4 ? 'emerald' : 'rose',
        },
        {
          label: 'Delta Waist',
          value: waistDelta != null ? `${waistDelta > 0 ? '+' : ''}${waistDelta} cm` : '—',
          tone: waistDelta != null && waistDelta <= 0.5 ? 'emerald' : 'rose',
        },
      ],
    };
    root.add(proxy);
    interactiveProxies.push(proxy);
  });

  // Target Protocol Curve (Gold TubeGeometry)
  if (targetVectors.length >= 2) {
    const tCurve = new THREE.CatmullRomCurve3(targetVectors);
    const tTube = new THREE.Mesh(
      new THREE.TubeGeometry(tCurve, isSoftwareGl ? 36 : 64, 0.048, 10, false),
      targetBeaconMat,
    );
    explodableGroups.push({ mesh: tTube, baseZ: 0, deltaZ: -0.75 });
    root.add(tTube);
  }

  // Actual Trajectory Curve (Cyan TubeGeometry)
  if (actualVectors.length >= 2) {
    const aCurve = new THREE.CatmullRomCurve3(actualVectors);
    const aTube = new THREE.Mesh(
      new THREE.TubeGeometry(aCurve, isSoftwareGl ? 32 : 56, 0.056, 10, false),
      actualBeaconMat,
    );
    explodableGroups.push({ mesh: aTube, baseZ: 0, deltaZ: 0.85 });
    root.add(aTube);
  }

  return { root, interactiveProxies, animatedParts, explodableGroups };
}

/**
 * Recursively disposes geometries and materials inside a Three.js Object3D subtree.
 */
export function disposeObjectTree(object) {
  if (!object) return;
  object.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => {
        if (m.dispose) m.dispose();
      });
    }
  });
}
