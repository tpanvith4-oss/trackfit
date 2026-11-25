import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  buildMacroCoreScene,
  buildSkylineScene,
  buildTrajectoryScene,
  buildTurntablePedestal,
  createBrushedMetalTexture,
  createContactShadowTexture,
  createDialGridTexture,
  disposeObjectTree,
} from './sceneBuilders.js';

const CAMERA_PRESETS = {
  skyline: {
    iso: { pos: [7.8, 5.4, 8.6], target: [0, 1.55, 0.35] },
    top: { pos: [0.05, 11.4, 2.4], target: [0, 0.8, 0.3] },
    low: { pos: [0.4, 2.0, 9.6], target: [0, 1.85, 0.2] },
  },
  macroCore: {
    iso: { pos: [6.4, 4.9, 7.6], target: [0, 2.65, 0] },
    top: { pos: [0.05, 10.6, 1.6], target: [0, 2.2, 0] },
    low: { pos: [0.3, 1.9, 8.4], target: [0, 2.75, 0] },
  },
  trajectory: {
    iso: { pos: [6.6, 4.7, 8.8], target: [0, 1.95, 0] },
    top: { pos: [0.05, 11.2, 2.8], target: [0, 1.2, 0] },
    low: { pos: [0.2, 2.2, 9.8], target: [0, 1.9, 0] },
  },
};

export function ThreeAnalyticsCanvas({
  sceneMode,
  dataset,
  cameraPreset,
  presetTrigger,
  autoOrbit,
  explodeFactor,
  onSelectItem,
  onHoverItem,
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    scene: null,
    camera: null,
    controls: null,
    renderer: null,
    contentGroup: null,
    interactiveProxies: [],
    animatedParts: [],
    explodableGroups: [],
    selectedId: null,
    hoveredId: null,
    autoOrbit: true,
    explodeTarget: 0,
    explodeCurrent: 0,
    transitionActive: false,
    desiredPos: new THREE.Vector3(7.8, 5.4, 8.6),
    desiredTarget: new THREE.Vector3(0, 1.55, 0.35),
    isSoftwareGl: false,
    textures: null,
    onSelectItem,
    onHoverItem,
  });

  stateRef.current.autoOrbit = autoOrbit;
  stateRef.current.explodeTarget = explodeFactor;
  stateRef.current.onSelectItem = onSelectItem;
  stateRef.current.onHoverItem = onHoverItem;

  // Initialize Three.js renderer, scene, lights, pedestal, and animation loop once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Mesa/i.test(rendererStr);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    scene.fog = new THREE.FogExp2(0x0b1220, 0.024);

    // PBR Environment IBL via PMREMGenerator + RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.72;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
    camera.position.set(7.8, 5.4, 8.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = true;
    controls.minDistance = 4.2;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.target.set(0, 1.55, 0.35);
    controls.autoRotate = stateRef.current.autoOrbit;
    controls.autoRotateSpeed = 0.55;

    // Immediately yield camera control when user grabs OrbitControls
    const onControlStart = () => {
      stateRef.current.transitionActive = false;
    };
    controls.addEventListener('start', onControlStart);

    // Three-point studio lighting (identical intensities on hardware & software GL)
    const hemiLight = new THREE.HemisphereLight(0xbcd6ff, 0x0f172a, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff2e2, 2.1);
    keyLight.position.set(7.5, 11.5, 6.5);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 28;
      keyLight.shadow.camera.left = -7.5;
      keyLight.shadow.camera.right = 7.5;
      keyLight.shadow.camera.top = 7.5;
      keyLight.shadow.camera.bottom = -7.5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-8, 6.5, -7);
    scene.add(rimLight);

    // Shared procedural textures
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const brushedTex = createBrushedMetalTexture('#1e293b', '#475569', maxAnisotropy);
    const dialTex = createDialGridTexture(maxAnisotropy);
    const shadowTex = createContactShadowTexture();

    // Grounded turntable pedestal
    const pedestal = buildTurntablePedestal({ brushedTex, dialTex, shadowTex, isSoftwareGl });
    scene.add(pedestal);

    const contentGroup = new THREE.Group();
    scene.add(contentGroup);

    const st = stateRef.current;
    st.scene = scene;
    st.camera = camera;
    st.controls = controls;
    st.renderer = renderer;
    st.contentGroup = contentGroup;
    st.isSoftwareGl = isSoftwareGl;
    st.textures = { brushedTex, dialTex, shadowTex };

    // Layer-1 raycaster with pre-allocated scratch pointer vector
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2();
    let lastRaycastMs = 0;
    let pointerDownPos = { x: 0, y: 0 };

    const updateSelectionVisuals = () => {
      for (const proxy of st.interactiveProxies) {
        const ring = proxy.userData?.selectRing;
        if (!ring) continue;
        const isSelected = proxy.userData.id === st.selectedId;
        const isHovered = proxy.userData.id === st.hoveredId;
        ring.material.opacity = isSelected ? 0.95 : isHovered ? 0.55 : 0;
        ring.material.color.setHex(isSelected ? 0x34d399 : 0x38bdf8);
      }
    };

    const pickAtClientXY = (clientX, clientY) => {
      if (!st.interactiveProxies.length) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(st.interactiveProxies, false);
      return hits.length > 0 ? hits[0].object : null;
    };

    const onPointerMove = (e) => {
      const now = performance.now();
      if (now - lastRaycastMs < 48) return;
      lastRaycastMs = now;
      const hit = pickAtClientXY(e.clientX, e.clientY);
      const nextId = hit?.userData?.id ?? null;
      if (nextId !== st.hoveredId) {
        st.hoveredId = nextId;
        renderer.domElement.style.cursor = nextId ? 'pointer' : 'grab';
        updateSelectionVisuals();
        st.onHoverItem?.(hit ? hit.userData : null);
      }
    };

    const onPointerDown = (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return;
      const hit = pickAtClientXY(e.clientX, e.clientY);
      if (hit?.userData) {
        st.selectedId = hit.userData.id;
        updateSelectionVisuals();
        st.onSelectItem?.(hit.userData);
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ResizeObserver for crisp container tracking (including Fullscreen)
    const resizeObserver = new ResizeObserver(() => {
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    resizeObserver.observe(container);

    // Software-GL-safe render loop pacing (afterDraw via rAF, never setTimeout after render)
    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    const minFrameMs = isSoftwareGl ? 50 : 0;

    const afterDraw = (fn) => {
      if (isSoftwareGl) {
        rafId = requestAnimationFrame(() => {
          if (!disposed) fn();
        });
      } else {
        rafId = requestAnimationFrame(fn);
      }
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dtMs = now - lastTime;
      if (minFrameMs > 0 && dtMs < minFrameMs) {
        timerId = window.setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(tick);
        }, minFrameMs - dtMs);
        return;
      }
      lastTime = now;
      const dt = Math.min(0.05, Math.max(0.001, dtMs / 1000));
      elapsed += dt;

      // Smooth camera preset damping
      if (st.transitionActive) {
        const lambda = 6.5;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, st.desiredPos.x, lambda, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, st.desiredPos.y, lambda, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, st.desiredPos.z, lambda, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, st.desiredTarget.x, lambda, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, st.desiredTarget.y, lambda, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, st.desiredTarget.z, lambda, dt);
        if (
          camera.position.distanceToSquared(st.desiredPos) < 0.002 &&
          controls.target.distanceToSquared(st.desiredTarget) < 0.002
        ) {
          st.transitionActive = false;
        }
      }

      // Smooth exploded-layer damping
      st.explodeCurrent = THREE.MathUtils.damp(st.explodeCurrent, st.explodeTarget, 8, dt);
      for (let i = 0; i < st.explodableGroups.length; i += 1) {
        const item = st.explodableGroups[i];
        if (item.deltaY !== undefined) {
          const yVal = item.baseY + item.deltaY * st.explodeCurrent;
          if (item.animatedRef) {
            item.animatedRef.baseY = yVal;
          } else {
            item.mesh.position.y = yVal;
          }
        }
        if (item.deltaZ !== undefined) {
          item.mesh.position.z = item.baseZ + item.deltaZ * st.explodeCurrent;
        }
      }

      // Ambient procedural motion
      for (let i = 0; i < st.animatedParts.length; i += 1) {
        const part = st.animatedParts[i];
        if (part.type === 'spin') {
          if (part.speedX) part.mesh.rotation.x += part.speedX * dt;
          if (part.speedY) part.mesh.rotation.y += part.speedY * dt;
          if (part.speedZ) part.mesh.rotation.z += part.speedZ * dt;
        } else if (part.type === 'bob') {
          part.mesh.position.y = part.baseY + Math.sin(elapsed * 2.1 + part.phase) * part.amp;
        }
      }

      controls.autoRotate = st.autoOrbit && !st.transitionActive;
      controls.update();
      renderer.render(scene, camera);

      afterDraw(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      disposeObjectTree(contentGroup);
      disposeObjectTree(pedestal);
      brushedTex.dispose();
      dialTex.dispose();
      shadowTex.dispose();
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Rebuild active chart geometry when sceneMode or dataset changes
  useEffect(() => {
    const st = stateRef.current;
    if (!st.contentGroup || !st.textures) return;

    disposeObjectTree(st.contentGroup);
    st.contentGroup.clear();
    st.interactiveProxies = [];
    st.animatedParts = [];
    st.explodableGroups = [];
    st.selectedId = null;
    st.hoveredId = null;

    let built;
    const args = {
      dataset,
      brushedTex: st.textures.brushedTex,
      isSoftwareGl: st.isSoftwareGl,
    };

    if (sceneMode === 'macroCore') {
      built = buildMacroCoreScene(args);
    } else if (sceneMode === 'trajectory') {
      built = buildTrajectoryScene(args);
    } else {
      built = buildSkylineScene(args);
    }

    st.contentGroup.add(built.root);
    st.interactiveProxies = built.interactiveProxies;
    st.animatedParts = built.animatedParts;
    st.explodableGroups = built.explodableGroups;

    // Skip shader pre-compilation on software WebGL to avoid multi-second main-thread freeze
    if (!st.isSoftwareGl && st.renderer && st.scene && st.camera) {
      st.renderer.compile(st.scene, st.camera);
    }

    // Pre-select the latest datum so the user gets immediate contextual feedback
    const defaultProxy = built.interactiveProxies[built.interactiveProxies.length - 1];
    if (defaultProxy?.userData) {
      st.selectedId = defaultProxy.userData.id;
      if (defaultProxy.userData.selectRing) {
        defaultProxy.userData.selectRing.material.opacity = 0.95;
        defaultProxy.userData.selectRing.material.color.setHex(0x34d399);
      }
      st.onSelectItem?.(defaultProxy.userData);
    } else {
      st.onSelectItem?.(null);
    }
  }, [sceneMode, dataset]);

  // Trigger smooth camera preset transition when sceneMode, cameraPreset, or presetTrigger changes
  useEffect(() => {
    const st = stateRef.current;
    const modePresets = CAMERA_PRESETS[sceneMode] ?? CAMERA_PRESETS.skyline;
    const preset = modePresets[cameraPreset] ?? modePresets.iso;
    st.desiredPos.set(...preset.pos);
    st.desiredTarget.set(...preset.target);
    st.transitionActive = true;
  }, [sceneMode, cameraPreset, presetTrigger]);

  return <div ref={mountRef} className="h-full w-full touch-none select-none" />;
}
