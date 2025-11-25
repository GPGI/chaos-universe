import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useAutoscale } from '@/hooks/useAutoscale';

interface GalaxyVisualizationProps {
  systemProgress?: number;
  octaviaProgress?: number;
  zytheraProgress?: number;
  onSelect?: (body: "star" | "octavia" | "zythera", info: { position: { x: number; y: number; z: number }; radius?: number }) => void;
}

export const GalaxyVisualization = ({ 
  systemProgress = 0, 
  octaviaProgress = 0,
  zytheraProgress = 0 
}: GalaxyVisualizationProps) => {
  // Autoscale hook for responsive design
  const {
    screenSize,
    getFOV,
    getPixelRatio,
    getDistanceMultiplier,
    getParticleMultiplier,
    shouldReduceQuality,
  } = useAutoscale({
    baseFOV: 75,
    mobileFOV: 70,
    tabletFOV: 72,
    desktopFOV: 75,
    mobileDistance: 1.2,
    tabletDistance: 1.0,
    desktopDistance: 1.0,
    maxPixelRatio: 2,
    mobilePixelRatio: 1.5,
    reduceParticlesOnMobile: true,
    particleReductionFactor: 0.5,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const galaxyRef = useRef<THREE.Points | null>(null);
  const saraktStarRef = useRef<THREE.Mesh | null>(null);
  const octaviaRef = useRef<THREE.Mesh | null>(null);
  const zytheraRef = useRef<THREE.Mesh | null>(null);
  const octaviaOrbitRef = useRef<THREE.Object3D | null>(null);
  const zytheraOrbitRef = useRef<THREE.Object3D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const starLabelRef = useRef<HTMLDivElement | null>(null);
  const octaviaLabelRef = useRef<HTMLDivElement | null>(null);
  const zytheraLabelRef = useRef<HTMLDivElement | null>(null);
  const zoomAnimRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const pointerRef = useRef<THREE.Vector2 | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera - Use autoscale FOV
    const initialFOV = getFOV();
    const camera = new THREE.PerspectiveCamera(
      initialFOV,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    // Adjust initial camera position based on screen size
    const distanceMultiplier = getDistanceMultiplier();
    camera.position.set(3 * distanceMultiplier, 3 * distanceMultiplier, 3 * distanceMultiplier);
    cameraRef.current = camera;

    // Renderer - Optimized settings with autoscale
    const renderer = new THREE.WebGLRenderer({ 
      antialias: !shouldReduceQuality(), // Disable antialiasing on mobile for performance
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(getPixelRatio());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = false; // Disable shadows for better performance
    renderer.sortObjects = false; // Disable sorting for better performance
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    raycasterRef.current = new THREE.Raycaster();
    pointerRef.current = new THREE.Vector2();

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    controlsRef.current = controls;

    // User interaction tracking for smart camera controls
    let userInteracting = false;
    let lastInteractionTime = performance.now();
    const AUTO_ORBIT_RESUME_DELAY = 2000; // Resume after 2 seconds

    controls.addEventListener('start', () => {
      userInteracting = true;
      lastInteractionTime = performance.now();
    });

    controls.addEventListener('end', () => {
      lastInteractionTime = performance.now();
    });

    // Galaxy parameters - Optimized with autoscale particle reduction
    const baseCount = 40000;
    const particleMultiplier = getParticleMultiplier();
    const parameters = {
      count: Math.floor(baseCount * particleMultiplier), // Scale particles based on screen size
      size: screenSize.isMobile ? 0.015 : 0.012, // Slightly larger on mobile for visibility
      radius: 2.15,
      branches: 3,
      spin: 3,
      randomness: 5,
      randomnessPower: 4,
      // Switch from blue tones to purple tones
      insideColor: '#c084fc', // violet-400
      outsideColor: '#7c3aed' // violet-600
    };

    // Generate galaxy
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    for (let i = 0; i < parameters.count; i++) {
      const i3 = i * 3;
      const radius = Math.pow(Math.random() * parameters.randomness, Math.random() * parameters.radius);
      const spinAngle = radius * parameters.spin;
      const branchAngle = ((i % parameters.branches) / parameters.branches) * Math.PI * 2;

      const negPos = [1, -1];
      const randomX = Math.pow(Math.random(), parameters.randomnessPower) * negPos[Math.floor(Math.random() * negPos.length)];
      const randomY = Math.pow(Math.random(), parameters.randomnessPower) * negPos[Math.floor(Math.random() * negPos.length)];
      const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * negPos[Math.floor(Math.random() * negPos.length)];

      positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

      const mixedColor = colorInside.clone();
      mixedColor.lerp(colorOutside, Math.random() * radius / parameters.radius);

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: parameters.size,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      transparent: false // Since we use additive blending, we don't need transparency
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    galaxyRef.current = points;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambient);

    // Galaxy center black hole (at 0,0,0) - Reduced complexity
    const bhGeom = new THREE.SphereGeometry(0.12, 16, 16); // Reduced from 32
    const bhMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1.0, metalness: 0.0 });
    const blackHole = new THREE.Mesh(bhGeom, bhMat);
    blackHole.position.set(0, 0, 0);
    scene.add(blackHole);

    // Sarakt Star (emissive core with point light)
    const starPos = new THREE.Vector3(1.6, 0, 1.6); // move further off-center
    const saraktGeometry = new THREE.SphereGeometry(0.10, 16, 16); // Reduced from 32
    const saraktMaterial = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      emissive: 0x6d28d9,
      emissiveIntensity: 1.1,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95
    });
    const saraktStar = new THREE.Mesh(saraktGeometry, saraktMaterial);
    saraktStar.position.copy(starPos);
    scene.add(saraktStar);
    saraktStarRef.current = saraktStar;
    const starLight = new THREE.PointLight(0x9f7aea, 1.2, 10, 2);
    starLight.position.copy(saraktStar.position);
    scene.add(starLight);

    // Sarakt glow - Reduced complexity
    const glowGeometry = new THREE.SphereGeometry(0.18, 16, 16); // Reduced from 32
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x9333ea,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    saraktStar.add(glow);

    // Octavia (within galaxy arms) - Reduced complexity
    const octaviaGeometry = new THREE.SphereGeometry(0.04, 12, 12); // Reduced from 24
    const octaviaMaterial = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6, metalness: 0.05 });
    const octavia = new THREE.Mesh(octaviaGeometry, octaviaMaterial);
    // Create orbital parent to achieve inclined circular orbit
    const octaviaOrbit = new THREE.Object3D();
    octaviaOrbit.position.copy(saraktStar.position);
    // Slight inclination (in radians)
    octaviaOrbit.rotation.x = THREE.MathUtils.degToRad(8);
    // Place planet on x-axis at radius
    const octaviaRadius = 0.8;
    octavia.position.set(octaviaRadius, 0, 0);
    octaviaOrbit.add(octavia);
    scene.add(octaviaOrbit);
    octaviaRef.current = octavia;
    octaviaOrbitRef.current = octaviaOrbit;
    // Orbit ring - Reduced complexity
    const octaviaRing = new THREE.RingGeometry(octaviaRadius - 0.001, octaviaRadius + 0.001, 64); // Reduced from 128
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0x22c55e, 
      opacity: 0.35, 
      transparent: true, 
      side: THREE.DoubleSide,
      depthWrite: false // Optimize for better performance
    });
    const ringMesh = new THREE.Mesh(octaviaRing, ringMat);
    ringMesh.position.copy(starPos);
    ringMesh.rotation.x = octaviaOrbit.rotation.x;
    scene.add(ringMesh);

    // Zythera (within galaxy arms) - Reduced complexity
    const zytheraGeometry = new THREE.SphereGeometry(0.04, 12, 12); // Reduced from 24
    const zytheraMaterial = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6, metalness: 0.05 });
    const zythera = new THREE.Mesh(zytheraGeometry, zytheraMaterial);
    const zytheraOrbit = new THREE.Object3D();
    zytheraOrbit.position.copy(saraktStar.position);
    zytheraOrbit.rotation.x = THREE.MathUtils.degToRad(15);
    const zytheraRadius = 1.1;
    zythera.position.set(zytheraRadius, 0, 0);
    zytheraOrbit.add(zythera);
    scene.add(zytheraOrbit);
    zytheraRef.current = zythera;
    zytheraOrbitRef.current = zytheraOrbit;
    const zytheraRing = new THREE.RingGeometry(zytheraRadius - 0.001, zytheraRadius + 0.001, 64); // Reduced from 128
    const ringMatZ = new THREE.MeshBasicMaterial({ 
      color: 0xef4444, 
      opacity: 0.3, 
      transparent: true, 
      side: THREE.DoubleSide,
      depthWrite: false // Optimize for better performance
    });
    const ringMeshZ = new THREE.Mesh(zytheraRing, ringMatZ);
    ringMeshZ.position.copy(starPos);
    ringMeshZ.rotation.x = zytheraOrbit.rotation.x;
    scene.add(ringMeshZ);

    // HTML Labels - Responsive sizing
    const makeLabel = (text: string, color: string) => {
      const el = document.createElement('div');
      el.textContent = text;
      el.style.position = 'absolute';
      el.style.pointerEvents = 'auto';
      el.style.padding = screenSize.isMobile ? '4px 8px' : '2px 6px';
      el.style.borderRadius = '6px';
      el.style.fontSize = screenSize.isMobile ? '14px' : '12px';
      el.style.fontWeight = '600';
      el.style.background = 'rgba(0,0,0,0.5)';
      el.style.border = `1px solid ${color}66`;
      el.style.color = color;
      el.style.userSelect = 'none';
      el.style.transform = 'translate(-50%, -150%)';
      el.style.zIndex = '10';
      return el;
    };
    const starLabel = makeLabel('Sarakt Star', '#a78bfa');
    const octaviaLabel = makeLabel('Sarakt Prime', '#22c55e');
    const zytheraLabel = makeLabel('Zythera', '#ef4444');
    starLabelRef.current = starLabel;
    octaviaLabelRef.current = octaviaLabel;
    zytheraLabelRef.current = zytheraLabel;
    containerRef.current.appendChild(starLabel);
    containerRef.current.appendChild(octaviaLabel);
    containerRef.current.appendChild(zytheraLabel);

    // Zoom helper - Use autoscale distance multiplier
    const zoomTo = (target: THREE.Vector3, distance = 1.2, durationMs = 900) => {
      if (!cameraRef.current || !controlsRef.current) return;
      const cam = cameraRef.current;
      const controls = controlsRef.current;
      const startPos = cam.position.clone();
      const startTarget = controls.target.clone();
      const dir = new THREE.Vector3().subVectors(startPos, startTarget).normalize();
      const endTarget = target.clone();
      // Apply distance multiplier for responsive zoom
      const adjustedDistance = distance * getDistanceMultiplier();
      const endPos = target.clone().add(dir.multiplyScalar(adjustedDistance));
      const start = performance.now();
      const animate = (t: number) => {
        const elapsed = t - start;
        const k = Math.min(1, elapsed / durationMs);
        const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        cam.position.lerpVectors(startPos, endPos, eased);
        controls.target.lerpVectors(startTarget, endTarget, eased);
        controls.update();
        if (k < 1) {
          zoomAnimRef.current = requestAnimationFrame(animate);
        }
      };
      if (zoomAnimRef.current) cancelAnimationFrame(zoomAnimRef.current);
      zoomAnimRef.current = requestAnimationFrame(animate);
    };

    // Click handlers on labels
    starLabel.onclick = () => {
      zoomTo(starPos, 1.0);
      if (typeof onSelect === "function") {
        onSelect("star", { position: { x: starPos.x, y: starPos.y, z: starPos.z } });
      }
    };
    octaviaLabel.onclick = () => {
      if (octaviaOrbitRef.current) {
        zoomTo(octaviaOrbitRef.current.position, 1.0);
        if (typeof onSelect === "function") {
          const p = octaviaOrbitRef.current.position;
          onSelect("octavia", { position: { x: p.x, y: p.y, z: p.z }, radius: 0.8 });
        }
      }
    };
    zytheraLabel.onclick = () => {
      if (zytheraOrbitRef.current) {
        zoomTo(zytheraOrbitRef.current.position, 1.2);
        if (typeof onSelect === "function") {
          const p = zytheraOrbitRef.current.position;
          onSelect("zythera", { position: { x: p.x, y: p.y, z: p.z }, radius: 1.1 });
        }
      }
    };

    // Mesh click (raycast) to zoom
    const clickable: Array<{ id: "star" | "octavia" | "zythera"; obj: THREE.Object3D; target: () => THREE.Vector3; dist?: number; radius?: number }> = [
      { id: "star", obj: saraktStar, target: () => starPos.clone(), dist: 1.0 },
      { id: "octavia", obj: octavia, target: () => (octaviaOrbitRef.current ? octaviaOrbitRef.current.position.clone() : octavia.position.clone()), dist: 1.0, radius: 0.8 },
      { id: "zythera", obj: zythera, target: () => (zytheraOrbitRef.current ? zytheraOrbitRef.current.position.clone() : zythera.position.clone()), dist: 1.2, radius: 1.1 },
    ];
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current || !raycasterRef.current || !pointerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(clickable.map(c => c.obj), true);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const match = clickable.find(c => c.obj === hit || hit.parent === c.obj);
        if (match) {
          const t = match.target();
          zoomTo(t, match.dist ?? 1.2);
          if (typeof onSelect === "function") {
            onSelect(match.id, { position: { x: t.x, y: t.y, z: t.z }, radius: match.radius });
          }
        }
      }
    };
    containerRef.current.addEventListener('pointerdown', onPointerDown);

    // Animation - Optimized with delta time and throttled updates
    const clock = new THREE.Clock();
    let frameCount = 0;
    
    // Cache world positions to avoid recalculation
    const saraktWorldPos = new THREE.Vector3();
    const octaviaWorldPos = new THREE.Vector3();
    const zytheraWorldPos = new THREE.Vector3();
    
    // Cache label positions for DOM update optimization
    const labelPositions = {
      star: { x: 0, y: 0, visible: false },
      octavia: { x: 0, y: 0, visible: false },
      zythera: { x: 0, y: 0, visible: false }
    };

    const tick = () => {
      const elapsedTime = clock.getElapsedTime();
      const delta = clock.getDelta();
      frameCount++;

      // Update controls
      controls.update();

      // Rotate galaxy slowly
      if (galaxyRef.current) {
        galaxyRef.current.rotation.y = elapsedTime * 0.05;
      }

      // Pulse Sarakt star
      if (saraktStarRef.current) {
        const intensity = 1 + systemProgress * 0.5;
        const pulse = Math.sin(elapsedTime * 2) * 0.1 + 0.9;
        saraktStarRef.current.scale.set(pulse * intensity, pulse * intensity, pulse * intensity);
      }

      // Planetary orbits - Use delta time for frame-rate independent animation
      if (octaviaOrbitRef.current) {
        const baseSpeed = 0.25;
        const speed = baseSpeed * (0.8 + octaviaProgress * 0.4);
        octaviaOrbitRef.current.rotation.y += speed * delta;
      }
      if (zytheraOrbitRef.current) {
        const baseSpeed = 0.2;
        const speed = baseSpeed * (0.8 + zytheraProgress * 0.4);
        zytheraOrbitRef.current.rotation.y += speed * delta;
      }

      // Update HTML labels only every 3 frames (20fps instead of 60fps) - Throttled for performance
      if (frameCount % 3 === 0 && containerRef.current) {
        const updateLabel = (
          obj: THREE.Object3D | null, 
          el: HTMLDivElement | null, 
          worldPos: THREE.Vector3,
          cache: typeof labelPositions.star
        ) => {
          if (!obj || !el) return;
          obj.getWorldPosition(worldPos); // Reuse vector
          worldPos.project(camera);
          const width = containerRef.current!.clientWidth;
          const height = containerRef.current!.clientHeight;
          const x = (worldPos.x * 0.5 + 0.5) * width;
          const y = (-worldPos.y * 0.5 + 0.5) * height;
          const visible = worldPos.z < 1;
          
          // Only update DOM if position actually changed (reduces DOM operations)
          if (Math.abs(cache.x - x) > 1 || Math.abs(cache.y - y) > 1 || cache.visible !== visible) {
            cache.x = x;
            cache.y = y;
            cache.visible = visible;
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.style.display = visible ? 'block' : 'none';
          }
        };
        updateLabel(saraktStarRef.current, starLabelRef.current, saraktWorldPos, labelPositions.star);
        updateLabel(octaviaRef.current, octaviaLabelRef.current, octaviaWorldPos, labelPositions.octavia);
        updateLabel(zytheraRef.current, zytheraLabelRef.current, zytheraWorldPos, labelPositions.zythera);
      }

      // Smart camera controls - Only auto-orbit when user isn't interacting
      const timeSinceInteraction = performance.now() - lastInteractionTime;
      if (!userInteracting || timeSinceInteraction > AUTO_ORBIT_RESUME_DELAY) {
        if (timeSinceInteraction > AUTO_ORBIT_RESUME_DELAY) {
          userInteracting = false; // Resume auto-orbit
        }
        // Smooth interpolation back to auto-orbit - Use autoscale distance
        const lerpFactor = Math.min(1, timeSinceInteraction / AUTO_ORBIT_RESUME_DELAY);
        const orbitRadius = 4 * getDistanceMultiplier();
        const autoX = starPos.x + Math.cos(elapsedTime * 0.05) * orbitRadius;
        const autoZ = starPos.z + Math.sin(elapsedTime * 0.05) * orbitRadius;
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, autoX, lerpFactor * 0.02);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, autoZ, lerpFactor * 0.02);
        if (lerpFactor > 0.5) {
          camera.lookAt(starPos);
        }
      }

      // Render
      renderer.render(scene, camera);

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    tick();

    // Handle resize - Debounced with autoscale updates
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!containerRef.current || !camera || !renderer) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        if (width === 0 || height === 0) return;
        
        // Update camera with autoscale FOV
        camera.aspect = width / height;
        camera.fov = getFOV();
        camera.updateProjectionMatrix();
        
        // Update renderer with autoscale pixel ratio
        renderer.setSize(width, height, false); // false = don't update style
        renderer.setPixelRatio(getPixelRatio());
        
        // Update antialiasing based on screen size
        if (renderer.domElement) {
          const newAntialias = !shouldReduceQuality();
          // Note: Can't change antialiasing after creation, but pixel ratio helps
        }
        
        resizeTimeout = null;
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
        resizeTimeout = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (containerRef.current) {
        containerRef.current.removeEventListener('pointerdown', onPointerDown);
        if (starLabelRef.current) containerRef.current.removeChild(starLabelRef.current);
        if (octaviaLabelRef.current) containerRef.current.removeChild(octaviaLabelRef.current);
        if (zytheraLabelRef.current) containerRef.current.removeChild(zytheraLabelRef.current);
      }
      if (zoomAnimRef.current) cancelAnimationFrame(zoomAnimRef.current);
      geometry.dispose();
      material.dispose();
      saraktGeometry.dispose();
      saraktMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      octaviaGeometry.dispose();
      octaviaMaterial.dispose();
      zytheraGeometry.dispose();
      zytheraMaterial.dispose();
      // Dispose ring geometries and materials
      octaviaRing.dispose();
      ringMat.dispose();
      zytheraRing.dispose();
      ringMatZ.dispose();
      bhGeom.dispose();
      bhMat.dispose();
    };
  }, [systemProgress, octaviaProgress, zytheraProgress, screenSize, getFOV, getPixelRatio, getDistanceMultiplier, getParticleMultiplier, shouldReduceQuality]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ 
        minHeight: screenSize.isMobile ? '400px' : screenSize.isTablet ? '500px' : '600px',
        touchAction: 'none' // Prevent default touch behaviors for better mobile interaction
      }}
    />
  );
};
