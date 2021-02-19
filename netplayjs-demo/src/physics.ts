import { NetplayPlayer, DefaultInput, Game } from "netplayjs";
import * as THREE from "three";
import * as CANNON from 'cannon-es'

export class PhysicsGame extends Game {
  static timestep = 1000 / 60;
  static canvasSize = { width: 600, height: 300 };

  renderer?: THREE.Renderer;
  scene: THREE.Scene = new THREE.Scene();
  world: CANNON.World = new CANNON.World();
  camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
    75,
    PhysicsGame.canvasSize.width / PhysicsGame.canvasSize.height,
    0.1,
    1000
  );

  constructor() {
    super();

    // let ground = new THREE.Plane();
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const cube = new THREE.Mesh( geometry, material );
    this.scene.add( cube );

    this.camera.position.z = 5;
  }

  serialize() {
      return {};
  }

  deserialize() {
      return {};
  }


  tick(playerInputs: Map<NetplayPlayer, DefaultInput>): void {

  }

  draw(canvas: HTMLCanvasElement) {
      if (!this.renderer) {
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas
        });
      }
      this.renderer.render(this.scene, this.camera);
  }
}
