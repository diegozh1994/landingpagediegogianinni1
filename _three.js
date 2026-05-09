/* ══════════════════════════════════════════════════════════════
   THREE.JS PREMIUM 3D EXPERIENCE — Diego Giannini / Coldwell Banker
   Hero scene: particles + glassy geometries + parallax + scroll
   Globe: CB worldwide network
   ══════════════════════════════════════════════════════════════ */

(async function premium3D() {
  if (typeof window === 'undefined') return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = matchMedia('(max-width: 768px)').matches;
  const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

  // Skip on reduced motion or very weak devices
  if (reduce) {
    console.info('[3D] Skipped: reduced-motion');
    return;
  }

  // Lazy-load Three.js from CDN
  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  try {
    await loadScript('https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js');
  } catch (e) {
    console.warn('[3D] Failed to load Three.js, falling back to 2D');
    return;
  }

  const THREE = window.THREE;
  if (!THREE) return;

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
  }

  // ═══════════════════════════════════════════════════════
  //  HERO SCENE — Particles + Floating Glassy Geometries
  // ═══════════════════════════════════════════════════════
  function buildHeroScene() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    // Insert canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'hero-3d-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '1',
      opacity: '0',
      transition: 'opacity 1.5s ease',
    });
    // Insert as first child of hero so existing content sits on top
    hero.style.position = hero.style.position || 'relative';
    hero.insertBefore(canvas, hero.firstChild);

    // Hide existing 2D orbs to avoid visual clutter (keep them as fallback)
    hero.querySelectorAll('.glow-orb').forEach(orb => {
      orb.style.transition = 'opacity 0.8s ease';
      orb.style.opacity = '0.3';
    });

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: true,
      powerPreference: isMobile ? 'low-power' : 'high-performance'
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(hero.clientWidth, hero.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      55,
      hero.clientWidth / hero.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 2, 11);

    // ── Cinematic lighting setup ──
    // Hemisphere: soft sky→ground fill
    const hemi = new THREE.HemisphereLight(0x6AA0FF, 0x0A0E1F, 1.6);
    scene.add(hemi);

    // Key light (sun) — top-right, casts soft shadow
    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 2.2);
    keyLight.position.set(6, 9, 7);
    if (!isMobile) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.1;
      keyLight.shadow.camera.far = 30;
      keyLight.shadow.camera.left = -8;
      keyLight.shadow.camera.right = 8;
      keyLight.shadow.camera.top = 8;
      keyLight.shadow.camera.bottom = -8;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.radius = 4;
    }
    scene.add(keyLight);

    // Fill light from opposite — cool blue, no shadow
    const fillLight = new THREE.DirectionalLight(0x6AA0FF, 0.9);
    fillLight.position.set(-6, 4, -4);
    scene.add(fillLight);

    // Warm interior glow — suggests "house lights on"
    const interiorGlow = new THREE.PointLight(0xFFD58A, 8, 6);
    interiorGlow.position.set(0, 0, 0);
    scene.add(interiorGlow);

    // Front rim — picks out edges
    const rimLight = new THREE.PointLight(0x6AA0FF, 12, 14);
    rimLight.position.set(0, 2, 7);
    scene.add(rimLight);

    // ─────────────────────────────────────────────
    //  PROCEDURAL TEXTURES (CanvasTexture)
    // ─────────────────────────────────────────────
    const makeCanvas = (w, h, draw) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      draw(g, w, h);
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    // Brick texture (warm beige with mortar lines + irregularities)
    const brickTex = makeCanvas(512, 512, (g, w, h) => {
      g.fillStyle = '#3a4258'; g.fillRect(0, 0, w, h);
      const brickW = 64, brickH = 28, mortar = 3;
      for (let y = 0; y < h; y += brickH) {
        const offset = (Math.floor(y / brickH) % 2) * (brickW / 2);
        for (let x = -brickW; x < w + brickW; x += brickW) {
          const px = x + offset;
          // Brick base with subtle color variation
          const r = 235 + Math.floor(Math.random() * 18 - 9);
          const gn = 230 + Math.floor(Math.random() * 14 - 7);
          const b = 220 + Math.floor(Math.random() * 14 - 7);
          g.fillStyle = `rgb(${r},${gn},${b})`;
          g.fillRect(px + mortar/2, y + mortar/2, brickW - mortar, brickH - mortar);
          // Subtle highlights
          g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
          g.fillRect(px + mortar/2, y + mortar/2, brickW - mortar, 3);
        }
      }
    });
    brickTex.repeat.set(2, 1);

    // Roof shingle texture (overlapping curved tiles)
    const shingleTex = makeCanvas(512, 512, (g, w, h) => {
      g.fillStyle = '#1a2540'; g.fillRect(0, 0, w, h);
      const tileW = 48, tileH = 18;
      for (let y = 0; y < h; y += tileH * 0.7) {
        const offset = (Math.floor(y / (tileH * 0.7)) % 2) * (tileW / 2);
        for (let x = -tileW; x < w + tileW; x += tileW) {
          const tx = x + offset;
          const grad = g.createLinearGradient(tx, y, tx, y + tileH);
          const v = 32 + Math.floor(Math.random() * 18);
          grad.addColorStop(0, `rgb(${v + 20},${v + 26},${v + 44})`);
          grad.addColorStop(1, `rgb(${v - 4},${v},${v + 16})`);
          g.fillStyle = grad;
          g.beginPath();
          g.moveTo(tx, y + tileH);
          g.lineTo(tx, y + 4);
          g.quadraticCurveTo(tx + tileW / 2, y - 4, tx + tileW, y + 4);
          g.lineTo(tx + tileW, y + tileH);
          g.closePath();
          g.fill();
        }
      }
    });
    shingleTex.repeat.set(3, 1.8);

    // Wood door texture (dark wood with vertical grain)
    const woodTex = makeCanvas(256, 512, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#3d2817');
      grad.addColorStop(0.3, '#5c3a1f');
      grad.addColorStop(0.6, '#3d2817');
      grad.addColorStop(1, '#2a1c10');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      // Vertical grain lines
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * w;
        g.strokeStyle = `rgba(0,0,0,${Math.random() * 0.18})`;
        g.lineWidth = Math.random() * 1.4 + 0.3;
        g.beginPath();
        g.moveTo(x, 0);
        g.bezierCurveTo(x + 6 - Math.random() * 12, h * 0.3, x - 4 + Math.random() * 8, h * 0.7, x, h);
        g.stroke();
      }
    });

    // Lawn texture (dark green with subtle blades)
    const lawnTex = makeCanvas(256, 256, (g, w, h) => {
      const grad = g.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/1.4);
      grad.addColorStop(0, '#1a3530');
      grad.addColorStop(1, '#0f2520');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 600; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        const len = Math.random() * 4 + 1.5;
        g.strokeStyle = `rgba(${30 + Math.random() * 40},${80 + Math.random() * 50},${40 + Math.random() * 30},${0.4 + Math.random() * 0.3})`;
        g.lineWidth = 0.5 + Math.random();
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (Math.random() - 0.5) * 1.5, y - len);
        g.stroke();
      }
    });
    lawnTex.repeat.set(3, 3);

    // Driveway texture (concrete with subtle cracks)
    const concreteTex = makeCanvas(256, 256, (g, w, h) => {
      g.fillStyle = '#5a5e6c'; g.fillRect(0, 0, w, h);
      // Speckle
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        const v = Math.floor(Math.random() * 30) + 90;
        g.fillStyle = `rgba(${v},${v},${v + 10},${0.4 + Math.random() * 0.2})`;
        g.fillRect(x, y, 1, 1);
      }
      // Subtle cracks
      g.strokeStyle = 'rgba(0,0,0,0.18)';
      for (let i = 0; i < 6; i++) {
        g.lineWidth = 0.6;
        g.beginPath();
        g.moveTo(Math.random() * w, Math.random() * h);
        for (let j = 0; j < 5; j++) {
          g.lineTo(Math.random() * w, Math.random() * h);
        }
        g.stroke();
      }
    });
    concreteTex.repeat.set(2, 1);

    // ─────────────────────────────────────────────
    //  MATERIALS
    // ─────────────────────────────────────────────
    const wallMat = new THREE.MeshStandardMaterial({
      map: brickTex,
      color: 0xFFFFFF,
      metalness: 0.05,
      roughness: 0.85,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      map: shingleTex,
      color: 0xFFFFFF,
      metalness: 0.1,
      roughness: 0.7,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xF4F6FB,
      metalness: 0.05,
      roughness: 0.5,
    });
    const woodTrimMat = new THREE.MeshStandardMaterial({
      color: 0xC9A84C,
      metalness: 0.1,
      roughness: 0.5,
    });
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xFFE4B5,
      emissive: 0xFFC872,
      emissiveIntensity: 1.6,
      metalness: 0,
      roughness: 0.2,
    });
    const doorMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0xFFFFFF,
      metalness: 0.2,
      roughness: 0.55,
    });
    const lawnMat = new THREE.MeshStandardMaterial({
      map: lawnTex,
      color: 0xFFFFFF,
      roughness: 0.9,
    });
    const concreteMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      color: 0xFFFFFF,
      metalness: 0.1,
      roughness: 0.85,
    });
    const hedgeMat = new THREE.MeshStandardMaterial({
      color: 0x1f3a2e,
      roughness: 0.95,
      flatShading: true,
    });
    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0xF4F6FB,
      metalness: 0.05,
      roughness: 0.5,
    });
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0A0E1F,
      metalness: 0.2,
      roughness: 0.95,
      transparent: true,
      opacity: 0.65,
    });

    // ─────────────────────────────────────────────
    //  PMREM ENVIRONMENT (for subtle reflections)
    // ─────────────────────────────────────────────
    try {
      const pmremGen = new THREE.PMREMGenerator(renderer);
      pmremGen.compileEquirectangularShader();
      // Procedural sky: vertical gradient
      const skyCanvas = document.createElement('canvas');
      skyCanvas.width = 1024; skyCanvas.height = 512;
      const skyCtx = skyCanvas.getContext('2d');
      const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
      skyGrad.addColorStop(0, '#0A0E1F');
      skyGrad.addColorStop(0.5, '#122455');
      skyGrad.addColorStop(0.85, '#1F69FF');
      skyGrad.addColorStop(1, '#6AA0FF');
      skyCtx.fillStyle = skyGrad;
      skyCtx.fillRect(0, 0, 1024, 512);
      const skyTex = new THREE.CanvasTexture(skyCanvas);
      skyTex.mapping = THREE.EquirectangularReflectionMapping;
      const envTex = pmremGen.fromEquirectangular(skyTex).texture;
      scene.environment = envTex;
      pmremGen.dispose();
      skyTex.dispose();
    } catch (e) { console.warn('[3D] env map failed:', e); }

    // ─────────────────────────────────────────────
    //  PROPERTY SCENE — house + landscaping
    // ─────────────────────────────────────────────
    const property = new THREE.Group();

    // ── Lawn (large green plane in front) ──
    const lawnGeo = new THREE.PlaneGeometry(11, 9, 1, 1);
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(0, -1.3, 1.5);
    lawn.receiveShadow = !isMobile;
    property.add(lawn);

    // ── Driveway (concrete, leading to garage) ──
    const driveGeo = new THREE.PlaneGeometry(1.6, 4.5);
    const driveway = new THREE.Mesh(driveGeo, concreteMat);
    driveway.rotation.x = -Math.PI / 2;
    driveway.position.set(2.5, -1.29, 3);
    driveway.receiveShadow = !isMobile;
    property.add(driveway);

    // ── Stone walkway from driveway to door ──
    const walkwayGeo = new THREE.PlaneGeometry(0.9, 2.2);
    const walkway = new THREE.Mesh(walkwayGeo, concreteMat);
    walkway.rotation.x = -Math.PI / 2;
    walkway.position.set(0, -1.29, 2.6);
    walkway.receiveShadow = !isMobile;
    property.add(walkway);

    // ── HOUSE BODY ──
    const house = new THREE.Group();

    // Foundation (slightly raised)
    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.25, 3.4),
      concreteMat.clone()
    );
    foundation.position.y = -1.18;
    foundation.castShadow = !isMobile;
    foundation.receiveShadow = !isMobile;
    house.add(foundation);

    // Main walls (brick)
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2.3, 3.2),
      wallMat
    );
    walls.position.y = -0.05;
    walls.castShadow = !isMobile;
    walls.receiveShadow = !isMobile;
    house.add(walls);

    // White trim band around the top of walls
    const topTrim = new THREE.Mesh(
      new THREE.BoxGeometry(4.06, 0.16, 3.26),
      accentMat
    );
    topTrim.position.y = 1.13;
    house.add(topTrim);

    // Trim band at base
    const baseTrim = new THREE.Mesh(
      new THREE.BoxGeometry(4.06, 0.16, 3.26),
      accentMat
    );
    baseTrim.position.y = -1.05;
    house.add(baseTrim);

    // Pitched roof — 4-sided pyramid with shingles
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.85, 1.7, 4),
      roofMat
    );
    roof.position.y = 1.97;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = !isMobile;
    house.add(roof);

    // Roof eave overhang (white)
    const eave = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.08, 3.6),
      accentMat
    );
    eave.position.y = 1.21;
    house.add(eave);

    // ── WINDOW HELPER (with frame, sill, and glass) ──
    const makeWindow = (w, h, x, y, z, rotY = 0) => {
      const offsetForward = rotY === 0 ? 0 : (rotY > 0 ? 1 : -1) * 0.012;

      // Outer white frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.08),
        accentMat
      );
      frame.position.set(x, y, z);
      frame.rotation.y = rotY;
      house.add(frame);

      // Sill (shelf below window)
      const sill = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.32, 0.06, 0.16),
        accentMat
      );
      sill.position.set(x, y - h / 2 - 0.1, z + (rotY === 0 ? 0.05 : 0));
      sill.rotation.y = rotY;
      if (rotY !== 0) sill.position.x = x + (rotY > 0 ? 0.05 : -0.05);
      house.add(sill);

      // Glass pane (warm emissive — lights on)
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.04),
        windowMat
      );
      const paneZ = z + (rotY === 0 ? 0.02 : 0);
      pane.position.set(x, y, paneZ);
      pane.rotation.y = rotY;
      if (rotY !== 0) pane.position.x = x + offsetForward * 1.6;
      house.add(pane);

      // Cross bars (mullions)
      const barH = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.95, 0.05, 0.05),
        accentMat
      );
      barH.position.copy(pane.position);
      barH.rotation.y = rotY;
      house.add(barH);

      const barV = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, h * 0.95, 0.05),
        accentMat
      );
      barV.position.copy(pane.position);
      barV.rotation.y = rotY;
      house.add(barV);

      // Side shutters (decorative)
      const shutterGeo = new THREE.BoxGeometry(0.16, h, 0.04);
      const shutterMat = new THREE.MeshStandardMaterial({ color: 0x122455, metalness: 0.1, roughness: 0.7 });
      const shutterL = new THREE.Mesh(shutterGeo, shutterMat);
      const shutterR = new THREE.Mesh(shutterGeo, shutterMat);
      const sx = w / 2 + 0.18;
      shutterL.position.set(x - sx, y, z);
      shutterR.position.set(x + sx, y, z);
      shutterL.rotation.y = rotY;
      shutterR.rotation.y = rotY;
      if (rotY !== 0) {
        const flip = rotY > 0 ? 1 : -1;
        shutterL.position.set(x, y, -sx * flip);
        shutterR.position.set(x, y, sx * flip);
      }
      house.add(shutterL);
      house.add(shutterR);
    };

    // Front facade: 2 windows on each side of door
    makeWindow(0.65, 0.85, -1.2, 0.0, 1.62);
    makeWindow(0.65, 0.85, 1.2, 0.0, 1.62);

    // ── DOOR with porch ──
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.65, 0.08),
      accentMat
    );
    doorFrame.position.set(0, -0.35, 1.62);
    house.add(doorFrame);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 1.55, 0.06),
      doorMat
    );
    door.position.set(0, -0.35, 1.65);
    house.add(door);

    // Door window (small at top)
    const doorWindow = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.3, 0.04),
      windowMat
    );
    doorWindow.position.set(0, 0.18, 1.68);
    house.add(doorWindow);

    // Brass door handle
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xC9A84C, metalness: 0.85, roughness: 0.25 })
    );
    handle.position.set(0.3, -0.5, 1.69);
    house.add(handle);

    // ── PORCH (covered entrance) ──
    const porchPostGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 12);
    const porchPostL = new THREE.Mesh(porchPostGeo, accentMat);
    const porchPostR = new THREE.Mesh(porchPostGeo, accentMat);
    porchPostL.position.set(-0.7, -0.4, 2.1);
    porchPostR.position.set(0.7, -0.4, 2.1);
    porchPostL.castShadow = porchPostR.castShadow = !isMobile;
    house.add(porchPostL);
    house.add(porchPostR);

    const porchRoof = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.12, 0.7),
      accentMat
    );
    porchRoof.position.set(0, 0.42, 1.96);
    porchRoof.castShadow = !isMobile;
    house.add(porchRoof);

    // Steps to porch
    for (let i = 0; i < 2; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(1.4 - i * 0.2, 0.1, 0.3),
        concreteMat
      );
      step.position.set(0, -1.06 - i * 0.1, 2.2 + i * 0.18);
      step.castShadow = !isMobile;
      step.receiveShadow = !isMobile;
      house.add(step);
    }

    // ── GARAGE (attached, right side) ──
    const garageGroup = new THREE.Group();
    const garageWalls = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.8, 2.6),
      wallMat
    );
    garageWalls.position.y = -0.35;
    garageWalls.castShadow = !isMobile;
    garageGroup.add(garageWalls);

    const garageRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 0.9, 4),
      roofMat
    );
    garageRoof.position.y = 1.0;
    garageRoof.rotation.y = Math.PI / 4;
    garageRoof.castShadow = !isMobile;
    garageGroup.add(garageRoof);

    const garageEave = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.06, 2.8),
      accentMat
    );
    garageEave.position.y = 0.56;
    garageGroup.add(garageEave);

    // Garage door
    const garageDoorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.4, 0.06),
      accentMat
    );
    garageDoorFrame.position.set(0, -0.5, 1.32);
    garageGroup.add(garageDoorFrame);

    const garageDoor = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.3, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xE8EDF7, metalness: 0.1, roughness: 0.5 })
    );
    garageDoor.position.set(0, -0.5, 1.35);
    garageGroup.add(garageDoor);
    // Garage door horizontal lines
    for (let i = -1; i <= 1; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.03, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xB8C4DC, roughness: 0.7 })
      );
      line.position.set(0, -0.5 + i * 0.35, 1.37);
      garageGroup.add(line);
    }

    garageGroup.position.set(3.2, 0, -0.3);
    house.add(garageGroup);

    // Back & side windows
    makeWindow(0.65, 0.85, -1.2, 0.0, -1.62);
    makeWindow(0.65, 0.85, 1.2, 0.0, -1.62);
    makeWindow(0.5, 0.7, -2.02, 0.1, -0.8, Math.PI / 2);
    makeWindow(0.5, 0.7, -2.02, 0.1, 0.8, Math.PI / 2);

    // Chimney
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 1.5, 0.4),
      wallMat
    );
    chimney.position.set(-1.0, 2.2, -0.5);
    chimney.castShadow = !isMobile;
    house.add(chimney);
    const chimneyTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.1, 0.5),
      accentMat
    );
    chimneyTop.position.set(-1.0, 2.95, -0.5);
    house.add(chimneyTop);

    house.position.y = 0.2;
    property.add(house);

    // ── LANDSCAPE ELEMENTS ──

    // Hedges around the front
    const hedgeSpecs = [
      { x: -3.2, y: -0.95, z: 1.2, w: 1.4, h: 0.5, d: 0.5 },
      { x: -3.2, y: -0.95, z: -0.2, w: 1.4, h: 0.5, d: 0.5 },
      { x: 1.5, y: -0.95, z: 2.6, w: 0.7, h: 0.5, d: 0.5 },
      { x: -1.5, y: -0.95, z: 2.6, w: 0.7, h: 0.5, d: 0.5 },
    ];
    hedgeSpecs.forEach(s => {
      const hedge = new THREE.Mesh(
        new THREE.BoxGeometry(s.w, s.h, s.d, 4, 2, 4),
        hedgeMat
      );
      // Add slight randomness to vertices for organic feel
      const pos = hedge.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.06);
        pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * 0.06);
        pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.06);
      }
      pos.needsUpdate = true;
      hedge.geometry.computeVertexNormals();
      hedge.position.set(s.x, s.y, s.z);
      hedge.castShadow = !isMobile;
      property.add(hedge);
    });

    // Trees (3 stylized trees with foliage layers)
    const treeSpecs = [
      { x: -4.2, z: 2.0, scale: 1 },
      { x: 4.5, z: 2.5, scale: 0.9 },
      { x: 4.8, z: -1.5, scale: 1.1 },
    ];
    treeSpecs.forEach(t => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.9 * t.scale, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a2f1a, roughness: 0.85 })
      );
      trunk.position.set(t.x, -1.3 + 0.45 * t.scale, t.z);
      trunk.castShadow = !isMobile;
      property.add(trunk);

      // 3 layers of foliage for depth
      for (let i = 0; i < 3; i++) {
        const r = (0.5 - i * 0.08) * t.scale;
        const y = -1.3 + (0.85 + i * 0.3) * t.scale;
        const foliage = new THREE.Mesh(
          new THREE.IcosahedronGeometry(r, 1),
          new THREE.MeshStandardMaterial({
            color: i === 0 ? 0x2d4a3a : (i === 1 ? 0x1f3a2e : 0x183228),
            roughness: 0.92,
            flatShading: true,
          })
        );
        foliage.position.set(t.x + (i - 1) * 0.05, y, t.z);
        foliage.castShadow = !isMobile;
        property.add(foliage);
      }
    });

    // Mailbox (small, charming detail)
    const mailbox = new THREE.Group();
    const mbPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a2817, roughness: 0.7 })
    );
    mbPost.position.y = -0.9;
    mailbox.add(mbPost);
    const mbBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1F69FF, metalness: 0.4, roughness: 0.5 })
    );
    mbBox.position.y = -0.4;
    mailbox.add(mbBox);
    const mbFlag = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xC9A84C, metalness: 0.5 })
    );
    mbFlag.position.set(0.1, -0.3, 0.1);
    mailbox.add(mbFlag);
    mailbox.position.set(3, 0, 4.3);
    property.add(mailbox);

    // Lamp post
    const lamp = new THREE.Group();
    const lampPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 1.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x122455, metalness: 0.6, roughness: 0.4 })
    );
    lampPost.position.y = -0.5;
    lamp.add(lampPost);
    const lampHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xFFE4B5,
        emissive: 0xFFC872,
        emissiveIntensity: 2.5,
      })
    );
    lampHead.position.y = 0.4;
    lamp.add(lampHead);
    // Small point light from the lamp
    const lampLight = new THREE.PointLight(0xFFD58A, 4, 4);
    lampLight.position.y = 0.4;
    lamp.add(lampLight);
    lamp.position.set(-3.4, 0, 3.5);
    property.add(lamp);

    // Picket fence (simple decorative line at front)
    const fenceGroup = new THREE.Group();
    for (let i = -5; i <= 5; i += 0.5) {
      // Skip middle for walkway gap
      if (i > -0.6 && i < 0.6) continue;
      const picket = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.55, 0.04),
        fenceMat
      );
      picket.position.set(i, -1, 4.3);
      picket.castShadow = !isMobile;
      fenceGroup.add(picket);
    }
    // Horizontal rails
    for (const side of [-3, 3]) {
      const railL = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.04, 0.04),
        fenceMat
      );
      railL.position.set(side, -0.85, 4.3);
      fenceGroup.add(railL);
      const railL2 = railL.clone();
      railL2.position.y = -1.15;
      fenceGroup.add(railL2);
    }
    property.add(fenceGroup);

    // ── Position the entire property ──
    property.position.set(0, 0, 0);
    property.userData = { rot: { x: 0, y: 0.0022, z: 0 }, float: { amp: 0, speed: 0, phase: 0 } };
    scene.add(property);

    const objects = [property];

    // ── Soft ground halo behind property (catches mood) ──
    const groundGeo = new THREE.CircleGeometry(11, 64);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.31;
    ground.receiveShadow = !isMobile;
    scene.add(ground);

    // ── Particle field ──
    const particleCount = isMobile ? 800 : 2000;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const blueColor = new THREE.Color(0x6AA0FF);
    const lightBlueColor = new THREE.Color(0xB8C4DC);
    const whiteColor = new THREE.Color(0xFFFFFF);

    for (let i = 0; i < particleCount; i++) {
      // Distribute in a wide field
      positions[i * 3]     = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;

      // Mix colors
      const mix = Math.random();
      const c = mix < 0.6 ? blueColor : (mix < 0.9 ? lightBlueColor : whiteColor);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = Math.random() * 1.5 + 0.4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.05,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ── Glowing distant points (extra atmosphere) ──
    const glowGeo = new THREE.BufferGeometry();
    const glowCount = 60;
    const glowPos = new Float32Array(glowCount * 3);
    for (let i = 0; i < glowCount; i++) {
      const r = 18 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      glowPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      glowPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      glowPos[i * 3 + 2] = r * Math.cos(phi) - 5;
    }
    glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
    const glowMat = new THREE.PointsMaterial({
      size: 0.4,
      color: 0x6AA0FF,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowPoints = new THREE.Points(glowGeo, glowMat);
    scene.add(glowPoints);

    // ── Mouse parallax ──
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    addEventListener('pointermove', (e) => {
      mouse.tx = (e.clientX / innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / innerHeight) * 2 - 1);
    }, { passive: true });

    // ── Scroll-driven camera depth ──
    let scrollProgress = 0;
    const updateScroll = () => {
      const heroRect = hero.getBoundingClientRect();
      const visibility = Math.max(0, 1 - Math.max(0, -heroRect.top) / Math.max(1, hero.clientHeight));
      scrollProgress = 1 - visibility; // 0 at top, 1 when scrolled past hero
    };
    addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    // ── Resize ──
    const onResize = () => {
      const w = hero.clientWidth, h = hero.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    addEventListener('resize', onResize);

    // ── Visibility pause ──
    let isVisible = true;
    const visObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { isVisible = e.isIntersecting; });
    }, { threshold: 0 });
    visObs.observe(hero);

    // ── Animate ──
    const clock = new THREE.Clock();
    let frame = 0;

    function tick() {
      if (!isVisible) {
        requestAnimationFrame(tick);
        return;
      }
      const t = clock.getElapsedTime();

      // Smooth mouse lerp
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;

      // Camera parallax — wider view of property
      camera.position.x = mouse.x * 1.2 + Math.sin(t * 0.1) * 0.25;
      camera.position.y = 2 + mouse.y * 0.6 + Math.cos(t * 0.13) * 0.18;
      // Scroll zoom: pull camera back & up as you scroll past hero
      camera.position.z = 11 + scrollProgress * 5;
      camera.lookAt(0, 0.3 + scrollProgress * -1.5, 0);

      // Animate objects (rotate house slowly + subtle bob)
      objects.forEach((obj) => {
        const u = obj.userData;
        obj.rotation.x += u.rot.x;
        obj.rotation.y += u.rot.y;
        obj.rotation.z += u.rot.z;
        if (u.float.amp) {
          obj.position.y = 0.2 + Math.sin(t * u.float.speed * 1000 + u.float.phase) * u.float.amp;
        }
      });

      // Slowly rotate particle field
      particles.rotation.y = t * 0.015;
      glowPoints.rotation.y = t * 0.008;
      glowPoints.rotation.x = t * 0.005;

      // Subtle interior glow pulse (suggests warmth from inside)
      interiorGlow.intensity = 8 + Math.sin(t * 0.7) * 1.5;
      rimLight.intensity = 12 + Math.cos(t * 0.5) * 2;

      renderer.render(scene, camera);
      frame++;
      requestAnimationFrame(tick);
    }

    // Fade in canvas after first render
    requestAnimationFrame(() => {
      tick();
      requestAnimationFrame(() => {
        canvas.style.opacity = '1';
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  //  GLOBE SCENE — CB worldwide network
  // ═══════════════════════════════════════════════════════
  function buildGlobeScene() {
    const target = document.querySelector('[data-globe-mount]');
    if (!target) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'globe-3d-canvas';
    Object.assign(canvas.style, {
      width: '100%',
      height: '100%',
      display: 'block',
      pointerEvents: 'none',
    });
    target.appendChild(canvas);

    const w = target.clientWidth || 480;
    const h = target.clientHeight || 480;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0.5, 6.5);

    const ambient = new THREE.AmbientLight(0x4D8AFF, 0.7);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xFFFFFF, 1);
    dir.position.set(5, 3, 5);
    scene.add(dir);

    // Globe wireframe sphere
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const sphereGeo = new THREE.IcosahedronGeometry(2, 6);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x122455,
      transparent: true,
      opacity: 0.35,
      wireframe: true
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(sphere);

    // Solid inner sphere (slightly smaller, for depth)
    const innerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.95, 32, 32),
      new THREE.MeshPhongMaterial({
        color: 0x0A0E1F,
        transparent: true,
        opacity: 0.7,
        emissive: 0x122455,
        emissiveIntensity: 0.2
      })
    );
    globeGroup.add(innerSphere);

    // Cities (lat, lng, label)
    const cities = [
      { lat: -34.6037, lng: -58.3816, label: 'Buenos Aires', main: true },
      { lat: 40.7128, lng: -74.0060, label: 'New York' },
      { lat: 34.0522, lng: -118.2437, label: 'Los Angeles' },
      { lat: 25.7617, lng: -80.1918, label: 'Miami' },
      { lat: 40.4168, lng: -3.7038, label: 'Madrid' },
      { lat: 51.5074, lng: -0.1278, label: 'London' },
      { lat: 48.8566, lng: 2.3522, label: 'Paris' },
      { lat: 35.6762, lng: 139.6503, label: 'Tokyo' },
      { lat: 1.3521, lng: 103.8198, label: 'Singapore' },
      { lat: -33.8688, lng: 151.2093, label: 'Sydney' },
      { lat: 41.9028, lng: 12.4964, label: 'Roma' },
      { lat: 19.4326, lng: -99.1332, label: 'CDMX' },
      { lat: -23.5505, lng: -46.6333, label: 'São Paulo' },
      { lat: 37.7749, lng: -122.4194, label: 'San Francisco' }
    ];

    function latLngToVec3(lat, lng, radius = 2) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    }

    // City markers
    const buenosAires = cities.find(c => c.main);
    const baPos = latLngToVec3(buenosAires.lat, buenosAires.lng, 2.02);

    cities.forEach((city) => {
      const pos = latLngToVec3(city.lat, city.lng, 2.02);
      const isMain = !!city.main;
      const dotGeo = new THREE.SphereGeometry(isMain ? 0.07 : 0.04, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({
        color: isMain ? 0x6AA0FF : 0x1F69FF,
        transparent: true,
        opacity: 1
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      dot.userData = { isMain, basePos: pos.clone(), pulsePhase: Math.random() * Math.PI * 2 };
      globeGroup.add(dot);

      // Glow ring around main city
      if (isMain) {
        const ringGeo = new THREE.RingGeometry(0.12, 0.16, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x6AA0FF,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos.clone().multiplyScalar(1.02));
        ring.lookAt(0, 0, 0);
        ring.userData = { isPulse: true };
        globeGroup.add(ring);
      }
    });

    // Arc connections from BA to other cities
    function createArc(start, end) {
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const distance = start.distanceTo(end);
      mid.normalize().multiplyScalar(2 + distance * 0.35);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(40);
      const geo = new THREE.BufferGeometry().setFromPoints(points);

      const positions = geo.attributes.position.array;
      const colors = new Float32Array(positions.length);
      const baseColor = new THREE.Color(0x6AA0FF);
      const tipColor = new THREE.Color(0x1F69FF);
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const c = baseColor.clone().lerp(tipColor, t);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        linewidth: 2
      });
      return new THREE.Line(geo, mat);
    }

    cities.forEach((city) => {
      if (city.main) return;
      const arc = createArc(baPos.clone().multiplyScalar(1.005), latLngToVec3(city.lat, city.lng, 2.01));
      arc.userData = { isArc: true };
      globeGroup.add(arc);
    });

    globeGroup.rotation.y = Math.PI * 0.4; // start rotated to show Americas

    let isVisible = false;
    const visObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { isVisible = e.isIntersecting; });
    }, { threshold: 0 });
    visObs.observe(target);

    const onResize = () => {
      const ww = target.clientWidth, hh = target.clientHeight;
      renderer.setSize(ww, hh, false);
      camera.aspect = ww / hh;
      camera.updateProjectionMatrix();
    };
    addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    function tick() {
      if (!isVisible) {
        requestAnimationFrame(tick);
        return;
      }
      const t = clock.getElapsedTime();
      globeGroup.rotation.y += 0.0025;

      // Pulse the BA ring
      globeGroup.children.forEach((child) => {
        if (child.userData?.isPulse) {
          const s = 1 + Math.sin(t * 1.6) * 0.25;
          child.scale.set(s, s, 1);
          child.material.opacity = 0.7 - Math.sin(t * 1.6) * 0.25;
        }
      });

      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  }

  // ═══════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════
  // Hero scene replaced by photo background (handled by _premium.js).
  // Only the globe scene is still rendered in 3D.
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      buildGlobeScene();
    }, { timeout: 1500 });
  } else {
    setTimeout(() => {
      buildGlobeScene();
    }, 100);
  }

  // Suppress unused-warning for hero scene fn (kept for future re-enable)
  void buildHeroScene;
})();
