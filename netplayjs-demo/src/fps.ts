import { NetplayPlayer, DefaultInput, Game, RollbackWrapper, VirtualJoystick, LockstepWrapper } from "netplayjs";
import * as THREE from "three";

import { GLTFLoader } from "THREE/examples/jsm/loaders/GLTFLoader.js";
import { Octree } from "THREE/examples/jsm/math/Octree.js";
import { Capsule } from "THREE/examples/jsm/math/Capsule.js";
import { MathUtils, RectAreaLight, StaticReadUsage } from "three";
import { JSONObject, JSONValue } from "netplayjs";

export const GRAVITY = 30;

const NUM_SPHERES = 20;
const SPHERE_RADIUS = 0.2;

type PlayerState = {
  angleHorizontal: number;
  angleVertical: number;

  position: THREE.Vector3;
  velocity: THREE.Vector3;

  lastMousePosition: {x: number; y: number} | null;

  onFloor: boolean;
};

const PLAYER_HEIGHT = 1.35;
const PLAYER_RADIUS = 0.35;

const PLAYER_JUMP = 10;
const PLAYER_MOVE_SPEED = 10;

const UP_VECTOR = new THREE.Vector3(0, 1, 0);

const PLAYER_COLLIDER = new Capsule();

// Adapted from https://github.com/mrdoob/three.js/blob/master/examples/games_fps.html
export class PhysicsGame extends Game {
  static timestep = 1000 / 60;
  static canvasSize = { width: 600, height: 300 };

  static octree = new Octree();
  static level: THREE.Object3D = new THREE.Object3D();

  // Behavior is quite deterministic, so synchronize the
  // state every five seconds.
  static stateSyncPeriod = 60 * 5;

  static pointerLock = true;

  static touchControls = {
    leftStick: new VirtualJoystick()
  };

  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;

  players: Array<NetplayPlayer>;

  playerStates: Map<NetplayPlayer, PlayerState> = new Map();
  playerObjects: Map<NetplayPlayer, THREE.Object3D> = new Map();

  createPlayerState(): PlayerState {
    return {
      angleHorizontal: 0,
      angleVertical: 0,

      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),

      lastMousePosition: null,

      onFloor: false,
    };
  }

  createPlayerObject(): THREE.Object3D {
    const geometry = new THREE.CylinderGeometry(
      PLAYER_RADIUS,
      PLAYER_RADIUS,
      PLAYER_HEIGHT,
      6
    );
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;

    return mesh;
  }

  constructor(canvas: HTMLCanvasElement, players: Array<NetplayPlayer>) {
    super();

    this.players = players;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x88ccff);
    this.scene.add(PhysicsGame.level);

    this.camera = new THREE.PerspectiveCamera(
      75,
      PhysicsGame.canvasSize.width / PhysicsGame.canvasSize.height,
      0.1,
      1000
    );
    this.camera.rotation.order = "YXZ";

    for (let player of players) {
      this.playerStates.set(player, this.createPlayerState());
    }

    const ambientlight = new THREE.AmbientLight(0x6688cc);
    this.scene.add(ambientlight);

    const fillLight1 = new THREE.DirectionalLight(0xff9999, 0.5);
    fillLight1.position.set(-1, 1, 2);
    this.scene.add(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0x8888ff, 0.2);
    fillLight2.position.set(0, -1, 0);
    this.scene.add(fillLight2);

    const directionalLight = new THREE.DirectionalLight(0xffffaa, 1.2);
    directionalLight.position.set(-5, 25, -1);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.01;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.radius = 4;
    directionalLight.shadow.bias = -0.00006;
    this.scene.add(directionalLight);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
  }

  serialize(): Array<JSONObject> {
    return this.players.map(p => {
      // @ts-ignore
      return this.playerStates.get(p)! as JSONObject;
    });
  }

  deserialize(value: Array<JSONObject>) {
    this.players.forEach((player, i) => {
      let serialized = value[i];
      let state = this.playerStates.get(player)!;

      state.angleHorizontal = serialized.angleHorizontal as number;
      state.angleVertical = serialized.angleVertical as number;

      state.onFloor = serialized.onFloor as boolean;

      state.lastMousePosition = serialized.lastMousePosition as {x: number, y: number} | null;

      state.position.copy(serialized.position as any);
      state.velocity.copy(serialized.velocity as any);
    })
  }

  getForwardVector(state: PlayerState) {
    return new THREE.Vector3(1, 0, 0).applyAxisAngle(
      UP_VECTOR,
      state.angleHorizontal
    );
  }

  getSideVector(state: PlayerState) {
    return new THREE.Vector3(0, 0, 1).applyAxisAngle(
      UP_VECTOR,
      state.angleHorizontal
    );
  }

  getMousePosition(input: DefaultInput): {x: number; y: number} | null {
    if (input.touches && input.touches.length > 0) {
      return input.touches[0];
    }
    if (input.mousePosition)
      return input.mousePosition;
    return null;
  }

  tick(playerInputs: Map<NetplayPlayer, DefaultInput>): void {
    const dt = PhysicsGame.timestep / 1000;

    for (let [player, input] of playerInputs) {
      let state = this.playerStates.get(player)!;

      let movement = {
        x: (input.pressed["d"] ? 1 : 0) + (input.pressed["a"] ? -1 : 0),
        y: (input.pressed["w"] ? 1 : 0) + (input.pressed["s"] ? -1 : 0)
      }

      if (movement.x === 0 && movement.y === 0 && input.touchControls) {
        movement = input.touchControls.leftStick;
      }

      state.velocity.add(
        this.getForwardVector(state).multiplyScalar(PLAYER_MOVE_SPEED * dt * movement.y)
      );
      state.velocity.add(
        this.getSideVector(state).multiplyScalar(PLAYER_MOVE_SPEED * dt * movement.x)
      );


      let mouse = this.getMousePosition(input);
      if (mouse) {
        if (state.lastMousePosition) {
          state.angleHorizontal -= (mouse.x - state.lastMousePosition.x) / 100;
          state.angleVertical -= (mouse.y - state.lastMousePosition.y) / 100;
        }

        state.lastMousePosition = mouse;
      } else {
        state.lastMousePosition = null;
      }

      state.angleVertical = MathUtils.clamp(state.angleVertical, -1, 1);

      this.camera.position.copy(state.position);
    }

    for (let [player, state] of this.playerStates) {
      const damping = Math.exp(-3 * dt) - 1;
      state.velocity.addScaledVector(state.velocity, damping);
      state.position.addScaledVector(state.velocity, dt);

      let offset = new THREE.Vector3(0, PLAYER_HEIGHT / 2 - PLAYER_RADIUS, 0);
      PLAYER_COLLIDER.set(
        state.position.clone().sub(offset),
        state.position.clone().add(offset),
        PLAYER_RADIUS
      );

      const result = PhysicsGame.octree.capsuleIntersect(PLAYER_COLLIDER);
      state.onFloor = false;
      if (result) {
        state.onFloor = result.normal.y > 0.1;
        const resolution = result.normal.clone().multiplyScalar(result.depth);
        state.position.add(resolution);
      }

      if (state.onFloor) {
        state.velocity.y = 0;
      } else {
        state.velocity.y -= GRAVITY * dt;
      }
    }

    // Players collide with each other.
    for (let i = 0; i < this.players.length; ++i) {
      for (let j = i + 1; j < this.players.length; ++j) {
        let a = this.playerStates.get(this.players[i])!;
        let b = this.playerStates.get(this.players[j])!;

        let aPos2D = new THREE.Vector2(a.position.x, a.position.z);
        let bPos2D = new THREE.Vector2(b.position.x, b.position.z);

        let dist = aPos2D.distanceTo(bPos2D);

        if (Math.abs(a.position.y - b.position.y) < PLAYER_HEIGHT && dist < PLAYER_RADIUS * 2) {
          let penetrationDepth = PLAYER_RADIUS * 2 - dist;
          const resolution2D = bPos2D.clone().sub(aPos2D).normalize().multiplyScalar(penetrationDepth).multiplyScalar(0.5);
          const resolution = new THREE.Vector3(resolution2D.x, 0, resolution2D.y);

          b.position.add(resolution);
          a.position.sub(resolution);
        }
      }
    }
  }

  draw(canvas: HTMLCanvasElement) {
    for (let [player, state] of this.playerStates) {
      let forward = this.getForwardVector(state);
      if (player.isLocalPlayer()) {
        this.camera.position
          .copy(state.position)
          .add(new THREE.Vector3(0, PLAYER_HEIGHT / 2 - PLAYER_RADIUS, 0));
        this.camera.lookAt(this.camera.position.clone().add(forward));
        this.camera.rotation.x = state.angleVertical;
      } else {
        let object = this.playerObjects.get(player);
        if (!object) {
          object = this.createPlayerObject();
          this.scene.add(object);
          this.playerObjects.set(player, object);
        }

        object.position.copy(state.position);
        object.lookAt(state.position.clone().add(forward));
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}

const loader = new GLTFLoader();
loader.load(
  "../files/collision-world.glb",
  (gltf) => {
    gltf.scene.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });

    PhysicsGame.level = gltf.scene;
    PhysicsGame.octree.fromGraphNode(gltf.scene);

    new RollbackWrapper(PhysicsGame).start();
  }
);
