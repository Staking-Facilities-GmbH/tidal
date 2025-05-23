import * as THREE from 'three';
// @ts-expect-error: No types for GLTFLoader
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-expect-error: No types for gif.js
import GIF from 'gif.js';

/**
 * Generates a 360-degree GIF preview of a 3D model file (.glb/.gltf).
 * @param file The 3D model file
 * @returns Promise<Blob> - The generated GIF as a Blob
 */
export async function generate360Gif(file: File): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    // Create renderer
    const width = 256;
    const height = 256;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    
    // Create gradient background
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 0, 2);
      gradient.addColorStop(0, '#b7f1ff');   // Top color
      gradient.addColorStop(1, '#0F97FB');   // Bottom color
      context.fillStyle = gradient;
      context.fillRect(0, 0, 2, 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = texture;
    
    // Add light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 2.5);
    // Load model
    const loader = new GLTFLoader();
    const arrayBuffer = await file.arrayBuffer();
    loader.parse(
      arrayBuffer,
      '',
      (gltf: any) => {
        const model = gltf.scene;
        scene.add(model);
        // Center model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        // Compute bounding sphere radius
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const radius = sphere.radius;
        // Set camera distance so the whole model fits
        const fov = camera.fov * (Math.PI / 180);
        const cameraDistance = (radius / Math.sin(fov / 2)) * 1.2; // 1.2 = padding
        camera.position.set(0, 0, cameraDistance);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        // GIF encoder
        const gif = new GIF({ workers: 2, quality: 10, width, height, workerScript: '/gif.worker.js' });
        const frames = 36;
        for (let i = 0; i < frames; i++) {
          const angle = (i / frames) * Math.PI * 2;
          camera.position.x = Math.sin(angle) * cameraDistance;
          camera.position.z = Math.cos(angle) * cameraDistance;
          camera.lookAt(new THREE.Vector3(0, 0, 0));
          renderer.render(scene, camera);
          gif.addFrame(renderer.domElement, { delay: 100, copy: true });
        }
        gif.on('finished', (blob: Blob) => {
          renderer.dispose();
          resolve(blob);
        });
        gif.on('error', (err: any) => {
          renderer.dispose();
          reject(err);
        });
        gif.render();
      },
      (err: any) => {
        renderer.dispose();
        reject(err);
      }
    );
  });
} 