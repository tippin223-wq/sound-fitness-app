"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";

/** One small render surface owns icons, labels, depth and motion together. */
export default function ChallengeRewardOrbit({ scale }: { scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let dispose = () => {};
    void import("three").then(THREE => {
      if (cancelled) return;
      let renderer: Three.WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" }); }
      catch { canvas.hidden = true; return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-160, 160, 35, -35, 0.1, 1000);
      camera.position.z = 500;
      scene.add(new THREE.AmbientLight(0xffffff, 2));
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(-80, 100, 200); scene.add(light);
      const textures: Three.Texture[] = [];
      const coins = new THREE.TextureLoader().load("/sound-coins/sound-coin-gold.png", () => { if (!cancelled) paint(); });
      coins.colorSpace = THREE.SRGBColorSpace; textures.push(coins);
      const groups: Three.Group[] = [];
      const icons: Three.Group[] = [];
      const materials: Three.Material[][] = [];
      const colors = ["#fde68a", "#7dd3fc", "#60a5fa"];
      function label(text: string, color: string, size: number) {
        const surface = document.createElement("canvas");
        surface.width = 384; surface.height = 96;
        const ctx = surface.getContext("2d")!;
        ctx.font = "800 56px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = color; ctx.fillText(text, 192, 48);
        const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
        sprite.scale.set(size * 4, size, 1); return sprite;
      }
      ["Coins", "Bolts", "Sapphires"].forEach((name, index) => {
        const group = new THREE.Group(); const icon = new THREE.Group();
        group.add(icon); scene.add(group); groups.push(group); icons.push(icon);
        if (index === 0) {
          const rim = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 2.4, 32), new THREE.MeshStandardMaterial({ color: "#ca8a04", metalness: .65, roughness: .3 }));
          rim.rotation.x = Math.PI / 2; icon.add(rim);
          for (const side of [-1, 1]) {
            const face = new THREE.Mesh(new THREE.CircleGeometry(12.8, 32), new THREE.MeshBasicMaterial({ map: coins, transparent: true, side: THREE.DoubleSide }));
            face.position.z = side * 1.3; if (side < 0) face.rotation.y = Math.PI; icon.add(face);
          }
        } else if (index === 1) {
          const shape = new THREE.Shape();
          [[.08,1.14],[-.66,.08],[-.2,.08],[-.47,-1],[.68,-.1],[.21,-.1]].forEach(([x,y], point) => point ? shape.lineTo(x,y) : shape.moveTo(x,y));
          shape.closePath();
          const geometry = new THREE.ExtrudeGeometry(shape, { depth:.22, bevelEnabled:true, bevelSegments:2, bevelSize:.038, bevelThickness:.046 }); geometry.center();
          const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color:"#38bdf8", emissive:"#0284c7", emissiveIntensity:.3, metalness:.5, roughness:.22 }));
          mesh.scale.setScalar(12); icon.add(mesh);
          const aura = new THREE.Mesh(geometry.clone(), new THREE.MeshBasicMaterial({ color: "#38bdf8", transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false }));
          aura.scale.setScalar(13.2); aura.position.z = -2; aura.userData.orbitLayer = -1; icon.add(aura);
        } else {
          // A cut sapphire: flat table, eight crown facets and pointed pavilion.
          const vertices: number[] = [];
          const point = (radius: number, y: number, angle: number) => [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
          for (let face = 0; face < 8; face++) {
            const a = face / 8 * Math.PI * 2, b = (face + 1) / 8 * Math.PI * 2;
            const topA = point(5.5, 10, a), topB = point(5.5, 10, b);
            const rimA = point(11, 3, a), rimB = point(11, 3, b);
            vertices.push(0,10,0, ...topB, ...topA, ...topA, ...topB, ...rimA, ...topB, ...rimB, ...rimA, ...rimA, ...rimB, 0,-13,0);
          }
          const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
          const gem = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ color:"#168de2", emissive:"#113daa", emissiveIntensity:.2, metalness:.3, roughness:.12, clearcoat:1, clearcoatRoughness:.1, flatShading:true, side:THREE.DoubleSide }));
          gem.rotation.x = .22; icon.add(gem);
        }
        const amount = label(String([100,25,2][index] * scale), colors[index], 17);
        amount.position.set(27, 0, 0); group.add(amount);
        const nameLabel = label(name, colors[index], 12); nameLabel.position.set(0, -23, 0); group.add(nameLabel);
        const own: Three.Material[] = [];
        group.traverse(object => { if ("material" in object) { const value = (object as Three.Mesh).material; own.push(...(Array.isArray(value) ? value : [value])); } });
        own.forEach(material => { material.userData.orbitOpacity = material.opacity; });
        materials.push(own);
      });
      let width = 320, frame = 0, elapsed = 0, previous = 0, visible = false, lastPaint = 0;
      const spin = [0, 0, 0];
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      function paint() {
        const delta = Math.max(0, elapsed - lastPaint); lastPaint = elapsed;
        const positions = groups.map((_, index) => {
          const angle = elapsed / 60 * Math.PI * 2 + index * Math.PI * 2 / 3;
          return { x: Math.sin(angle), depth: Math.cos(angle) };
        });
        const front = positions.reduce((best, p, index) => p.depth > positions[best].depth ? index : best, 0);
        groups.forEach((group, index) => {
          const {x, depth} = positions[index];
          const factor = media.matches ? 1 : .65 + (depth + 1) * .175;
          group.position.set(media.matches ? (index - 1) * width / 3 - 10 : x * width * .23 - 10, 6, 0);
          group.scale.setScalar(factor);
          const clearance = index === front || media.matches ? 1 : Math.min(1, Math.abs(x - positions[front].x) * 3);
          materials[index].forEach(material => { material.transparent = true; material.opacity = material.userData.orbitOpacity * clearance * (index === front || media.matches ? 1 : .55); material.depthTest = false; });
          group.traverse(object => { object.renderOrder = Math.round((depth + 1) * 100) * 2 + (object.userData.orbitLayer ?? 0); });
          // Only the foremost reward animates. Half-speed coin spin retained.
          if (index !== 1 && index === front && !media.matches) spin[index] = (spin[index] + delta * (index === 0 ? 1.1 : .7)) % (Math.PI * 2);
          else {
            const rest = Math.atan2(Math.sin(spin[index]), Math.cos(spin[index]));
            spin[index] = rest * Math.exp(-delta * 7);
          }
          icons[index].rotation.y = spin[index];
          icons[index].rotation.z = 0;
        });
        renderer.render(scene, camera);
      }
      function tick(time: number) {
        frame = 0;
        if (!visible || document.hidden || media.matches) { previous = 0; return; }
        if (previous) elapsed += (time - previous) / 1000;
        previous = time; paint(); frame = requestAnimationFrame(tick);
      }
      function sync() {
        if (frame) cancelAnimationFrame(frame); frame = 0; previous = 0;
        paint(); if (visible && !document.hidden && !media.matches) frame = requestAnimationFrame(tick);
      }
      const resize = new ResizeObserver(() => {
        width = Math.max(1, canvas.clientWidth); const height = Math.max(1, canvas.clientHeight);
        renderer.setSize(width, height, false); camera.left = -width/2; camera.right = width/2; camera.top = height/2; camera.bottom = -height/2; camera.updateProjectionMatrix(); paint();
      }); resize.observe(canvas);
      const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); sync(); }); observer.observe(canvas);
      document.addEventListener("visibilitychange", sync); media.addEventListener("change", sync);
      dispose = () => {
        cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect();
        document.removeEventListener("visibilitychange", sync); media.removeEventListener("change", sync);
        scene.traverse(object => { if ("geometry" in object) (object as Three.Mesh).geometry.dispose(); });
        materials.flat().forEach(material => material.dispose()); textures.forEach(texture => texture.dispose()); renderer.dispose();
      };
    });
    return () => { cancelled = true; dispose(); };
  }, [scale]);
  return <div style={{ gridColumn: "1 / -1", minWidth: 0, width: "100%" }} role="img" aria-label={`Set rewards: ${100 * scale} Coins, ${25 * scale} Bolts, ${2 * scale} Sapphires`}>
    <canvas ref={canvasRef} aria-hidden="true" style={{ display:"block", width:"100%", height:58 }} />
  </div>;
}
