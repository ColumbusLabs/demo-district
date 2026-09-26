import { BoxGeometry, Color, DirectionalLight, HemisphereLight, Mesh, MeshStandardMaterial, PlaneGeometry, Scene } from 'three';
import type { ContentContext, WorldContent } from './World.ts';

/** Temporary diagnostic content, not the plaza or its eventual lighting/art direction. */
export function createTestScene({ resources }: ContentContext): WorldContent {
  const scene = new Scene();
  scene.background = new Color(0xcbd5d6);
  const floor = new Mesh(
    resources.track(new PlaneGeometry(80, 80)),
    resources.track(new MeshStandardMaterial({ color: 0xc8c5ba, roughness: 1 })),
  );
  floor.name = 'engine-test-floor';
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const object = new Mesh(
    resources.track(new BoxGeometry(1.4, 1.4, 1.4)),
    resources.track(new MeshStandardMaterial({ color: 0x365b62, roughness: 0.65, metalness: 0.05 })),
  );
  object.name = 'engine-test-object';
  object.position.y = 0.7;
  object.rotation.y = Math.PI / 5;
  scene.add(object);

  scene.add(new HemisphereLight(0xe8f0ff, 0x777064, 2));
  const sun = new DirectionalLight(0xffebcc, 2.5);
  sun.position.set(5, 8, 6);
  scene.add(sun);
  return { scene, update: (delta) => { object.rotation.y += delta * 0.22; } };
}
