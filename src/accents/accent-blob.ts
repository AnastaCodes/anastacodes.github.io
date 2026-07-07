import * as THREE from 'three';
import type { HeroAccent } from './types';
import type { Theme } from '../palette-engine';

export function createBlobAccent(): HeroAccent {
  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let cam: THREE.PerspectiveCamera;
  let mesh: THREE.Mesh;
  let raf = 0;
  let base: Float32Array;
  const mouse = { x: 0, y: 0 };

  return {
    mount(el) {
      el.style.position = 'relative';
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1';
      el.append(renderer.domElement);

      scene = new THREE.Scene();
      cam = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 100);
      cam.position.z = 5;
      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const dir = new THREE.DirectionalLight(0xffffff, 1.5);
      dir.position.set(2, 3, 4);
      scene.add(dir);

      const geo = new THREE.IcosahedronGeometry(1.4, 24);
      base = (geo.attributes.position.array as Float32Array).slice();
      mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ roughness: 0.25, color: 0xe11d48 }));
      scene.add(mesh);

      window.addEventListener('pointermove', e => {
        mouse.x = (e.clientX / innerWidth - 0.5) * 0.6;
        mouse.y = (e.clientY / innerHeight - 0.5) * 0.4;
      });

      const tick = (t: number): void => {
        const pos = (mesh.geometry as THREE.BufferGeometry).attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const ox = base[i * 3], oy = base[i * 3 + 1], oz = base[i * 3 + 2];
          const n = 0.12 * Math.sin(ox * 2.1 + t / 900) * Math.cos(oy * 1.7 + t / 1100);
          const s = 1 + n;
          pos.setXYZ(i, ox * s, oy * s, oz * s);
        }
        pos.needsUpdate = true;
        mesh.rotation.y += (mouse.x - mesh.rotation.y) * 0.05;
        mesh.rotation.x += (mouse.y - mesh.rotation.x) * 0.05;
        renderer.render(scene, cam);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    },
    onPalette(t: Theme) {
      (mesh.material as THREE.MeshPhysicalMaterial).color.set(t.accent);
    },
    destroy() {
      cancelAnimationFrame(raf);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
