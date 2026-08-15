import React, { useEffect, useRef } from 'react';

// Lightweight 3D hero accent: loads three.js (UMD via CDN, browser-only) and renders a
// rotating wireframed torus knot in the brand colour. Falls back gracefully.
export default function ThreeHero({ color }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !window) return;
    mount.innerHTML = '';
    const c = mount;
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';

    const load = (cb) => {
      if (window.THREE) return cb();
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/three@0.164.0/build/three.min.js';
      s.onload = cb;
      s.onerror = cb;
      document.head.appendChild(s);
    };

    load(() => {
      const THREE = window.THREE;
      if (!THREE) { mount.style.display = 'none'; return; }
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, c.clientWidth / c.clientHeight, 0.1, 100);
      camera.position.z = 3.2;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(c.clientWidth, c.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio > 1 ? 1 : 1);
      c.appendChild(renderer.domElement);

      const amb = new THREE.AmbientLight(0xffffff, 0.75);
      scene.add(amb);
      const dir = new THREE.DirectionalLight(0xffffff, 0.55);
      dir.position.set(3, 5, 5);
      scene.add(dir);

      const geo = new THREE.TorusKnotGeometry(0.75, 0.26, 180, 24);
      const mat = new THREE.LineBasicMaterial({ color: color || '#ffffff', wireframe: true, opacity: 0.85, transparent: true });
      const mesh = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
      scene.add(mesh);

      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.04, 6, 120),
        new THREE.MeshBasicMaterial({ color: color || '#ffffff', wireframe: true, opacity: 0.35, transparent: true })
      );
      scene.add(ring2);

      const onResize = () => {
        renderer.setSize(c.clientWidth, c.clientHeight);
        camera.aspect = c.clientWidth / c.clientHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      let raf;
      const spin = () => {
        mesh.rotation.y += 0.006;
        mesh.rotation.x += 0.003;
        ring2.rotation.z += 0.004;
        raf = requestAnimationFrame(spin);
      };
      spin();

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        c.innerHTML = '';
        mount.style.display = 'none';
      };
    });

    return () => {
      if (mount) mount.innerHTML = '';
    };
  }, [color]);

  return <div ref={mountRef} />;
}
