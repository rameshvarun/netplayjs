import {
  DefaultInput,
  Game,
  JsonValue,
  LockstepWrapper,
  NetplayPlayer,
  TestWrapper,
} from "netplayjs/src/index";
import Prando from "prando";
import * as THREE from "three";

declare var Ammo: any;

const script = document.createElement("script");
script.type = "text/javascript";
const ammoLoaded = new Promise<void>((resolve, reject) => {
  script.addEventListener("load", () => {
    Ammo().then(() => resolve());
  });
});
script.src = "../files/ammo.wasm.js";
document.head.appendChild(script);

const textureLoader = new THREE.TextureLoader();
const gravityConstant = -9.8;
const margin = 0.05;

class PhysicsGame extends Game {
  static timestep = 1000 / 60;
  static canvasSize = { width: 600, height: 300 };
  static deterministic = true;

  camera?: THREE.PerspectiveCamera;
  scene?: THREE.Scene;
  renderer?: THREE.WebGLRenderer;

  rigidBodies: Array<any> = [];

  rope?: THREE.LineSegments;
  hinge;

  collisionConfiguration;
  dispatcher;
  broadphase;
  solver;
  softBodySolver;
  physicsWorld;

  rng: Prando = new Prando(0);

  constructor(canvas: HTMLCanvasElement) {
    super();

    this.initGraphics(canvas);
    this.initPhysics();
    this.createObjects();
  }

  initGraphics(canvas: HTMLCanvasElement) {
    this.camera = new THREE.PerspectiveCamera(
      60,
      PhysicsGame.canvasSize.width / PhysicsGame.canvasSize.height,
      0.2,
      2000
    );
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfd1e5);

    this.camera.position.set(-7, 5, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });
    this.renderer.shadowMap.enabled = true;

    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(-10, 10, 5);
    light.castShadow = true;
    const d = 10;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;

    light.shadow.camera.near = 2;
    light.shadow.camera.far = 50;

    light.shadow.mapSize.x = 1024;
    light.shadow.mapSize.y = 1024;

    this.scene.add(light);
  }

  initPhysics() {
    this.collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
    this.dispatcher = new Ammo.btCollisionDispatcher(
      this.collisionConfiguration
    );
    this.broadphase = new Ammo.btDbvtBroadphase();
    this.solver = new Ammo.btSequentialImpulseConstraintSolver();
    this.softBodySolver = new Ammo.btDefaultSoftBodySolver();
    this.physicsWorld = new Ammo.btSoftRigidDynamicsWorld(
      this.dispatcher,
      this.broadphase,
      this.solver,
      this.collisionConfiguration,
      this.softBodySolver
    );
    this.physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
    this.physicsWorld
      .getWorldInfo()
      .set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));
  }

  createParalellepiped(sx, sy, sz, mass, pos, quat, material) {
    const threeObject = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1),
      material
    );
    const shape = new Ammo.btBoxShape(
      new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
    );
    shape.setMargin(margin);

    this.createRigidBody(threeObject, shape, mass, pos, quat);

    return threeObject;
  }

  createRigidBody(threeObject, physicsShape, mass, pos, quat) {
    threeObject.position.copy(pos);
    threeObject.quaternion.copy(quat);

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    const motionState = new Ammo.btDefaultMotionState(transform);

    const localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      physicsShape,
      localInertia
    );
    const body = new Ammo.btRigidBody(rbInfo);

    threeObject.userData.physicsBody = body;

    this.scene!.add(threeObject);

    if (mass > 0) {
      this.rigidBodies.push(threeObject);

      // Disable deactivation
      body.setActivationState(4);
    }

    this.physicsWorld.addRigidBody(body);
  }

  createRandomColor() {
    return Math.floor(this.rng.next() * (1 << 24));
  }

  createMaterial() {
    return new THREE.MeshPhongMaterial({ color: this.createRandomColor() });
  }

  createObjects() {
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();

    // Ground
    pos.set(0, -0.5, 0);
    quat.set(0, 0, 0, 1);
    const ground = this.createParalellepiped(
      40,
      1,
      40,
      0,
      pos,
      quat,
      new THREE.MeshPhongMaterial({ color: 0xffffff })
    );
    ground.castShadow = true;
    ground.receiveShadow = true;

    // Ball
    const ballMass = 1.2;
    const ballRadius = 0.6;

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(ballRadius, 20, 20),
      new THREE.MeshPhongMaterial({ color: 0x202020 })
    );
    ball.castShadow = true;
    ball.receiveShadow = true;
    const ballShape = new Ammo.btSphereShape(ballRadius);
    ballShape.setMargin(margin);
    pos.set(-3, 2, 0);
    quat.set(0, 0, 0, 1);
    this.createRigidBody(ball, ballShape, ballMass, pos, quat);
    ball.userData.physicsBody.setFriction(0.5);

    // Wall
    const brickMass = 0.5;
    const brickLength = 1.2;
    const brickDepth = 0.6;
    const brickHeight = brickLength * 0.5;
    const numBricksLength = 6;
    const numBricksHeight = 8;
    const z0 = -numBricksLength * brickLength * 0.5;
    pos.set(0, brickHeight * 0.5, z0);
    quat.set(0, 0, 0, 1);

    for (let j = 0; j < numBricksHeight; j++) {
      const oddRow = j % 2 == 1;

      pos.z = z0;

      if (oddRow) {
        pos.z -= 0.25 * brickLength;
      }

      const nRow = oddRow ? numBricksLength + 1 : numBricksLength;

      for (let i = 0; i < nRow; i++) {
        let brickLengthCurrent = brickLength;
        let brickMassCurrent = brickMass;
        if (oddRow && (i == 0 || i == nRow - 1)) {
          brickLengthCurrent *= 0.5;
          brickMassCurrent *= 0.5;
        }

        const brick = this.createParalellepiped(
          brickDepth,
          brickHeight,
          brickLengthCurrent,
          brickMassCurrent,
          pos,
          quat,
          this.createMaterial()
        );
        brick.castShadow = true;
        brick.receiveShadow = true;

        if (oddRow && (i == 0 || i == nRow - 2)) {
          pos.z += 0.75 * brickLength;
        } else {
          pos.z += brickLength;
        }
      }

      pos.y += brickHeight;
    }

    // The rope
    // Rope graphic object
    const ropeNumSegments = 10;
    const ropeLength = 4;
    const ropeMass = 3;
    const ropePos = ball.position.clone();
    ropePos.y += ballRadius;

    const segmentLength = ropeLength / ropeNumSegments;
    const ropeGeometry = new THREE.BufferGeometry();
    const ropeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const ropePositions: Array<number> = [];
    const ropeIndices: Array<number> = [];

    for (let i = 0; i < ropeNumSegments + 1; i++) {
      ropePositions.push(ropePos.x, ropePos.y + i * segmentLength, ropePos.z);
    }

    for (let i = 0; i < ropeNumSegments; i++) {
      ropeIndices.push(i, i + 1);
    }

    ropeGeometry.setIndex(
      new THREE.BufferAttribute(new Uint16Array(ropeIndices), 1)
    );
    ropeGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(ropePositions), 3)
    );
    ropeGeometry.computeBoundingSphere();
    this.rope = new THREE.LineSegments(ropeGeometry, ropeMaterial);
    this.rope.castShadow = true;
    this.rope.receiveShadow = true;
    this.scene!.add(this.rope);

    // Rope physics object
    const softBodyHelpers = new Ammo.btSoftBodyHelpers();
    const ropeStart = new Ammo.btVector3(ropePos.x, ropePos.y, ropePos.z);
    const ropeEnd = new Ammo.btVector3(
      ropePos.x,
      ropePos.y + ropeLength,
      ropePos.z
    );
    const ropeSoftBody = softBodyHelpers.CreateRope(
      this.physicsWorld.getWorldInfo(),
      ropeStart,
      ropeEnd,
      ropeNumSegments - 1,
      0
    );
    const sbConfig = ropeSoftBody.get_m_cfg();
    sbConfig.set_viterations(10);
    sbConfig.set_piterations(10);
    ropeSoftBody.setTotalMass(ropeMass, false);
    Ammo.castObject(ropeSoftBody, Ammo.btCollisionObject)
      .getCollisionShape()
      .setMargin(margin * 3);
    this.physicsWorld.addSoftBody(ropeSoftBody, 1, -1);
    this.rope.userData.physicsBody = ropeSoftBody;
    // Disable deactivation
    ropeSoftBody.setActivationState(4);

    // The base
    const armMass = 2;
    const armLength = 3;
    const pylonHeight = ropePos.y + ropeLength;
    const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x606060 });
    pos.set(ropePos.x, 0.1, ropePos.z - armLength);
    quat.set(0, 0, 0, 1);
    const base = this.createParalellepiped(
      1,
      0.2,
      1,
      0,
      pos,
      quat,
      baseMaterial
    );
    base.castShadow = true;
    base.receiveShadow = true;
    pos.set(ropePos.x, 0.5 * pylonHeight, ropePos.z - armLength);
    const pylon = this.createParalellepiped(
      0.4,
      pylonHeight,
      0.4,
      0,
      pos,
      quat,
      baseMaterial
    );
    pylon.castShadow = true;
    pylon.receiveShadow = true;
    pos.set(ropePos.x, pylonHeight + 0.2, ropePos.z - 0.5 * armLength);
    const arm = this.createParalellepiped(
      0.4,
      0.4,
      armLength + 0.4,
      armMass,
      pos,
      quat,
      baseMaterial
    );
    arm.castShadow = true;
    arm.receiveShadow = true;

    // Glue the rope extremes to the ball and the arm
    const influence = 1;
    ropeSoftBody.appendAnchor(0, ball.userData.physicsBody, true, influence);
    ropeSoftBody.appendAnchor(
      ropeNumSegments,
      arm.userData.physicsBody,
      true,
      influence
    );

    // Hinge constraint to move the arm
    const pivotA = new Ammo.btVector3(0, pylonHeight * 0.5, 0);
    const pivotB = new Ammo.btVector3(0, -0.2, -armLength * 0.5);
    const axis = new Ammo.btVector3(0, 1, 0);
    this.hinge = new Ammo.btHingeConstraint(
      pylon.userData.physicsBody,
      arm.userData.physicsBody,
      pivotA,
      pivotB,
      axis,
      axis,
      true
    );
    this.physicsWorld.addConstraint(this.hinge, true);
  }

  tick(playerInputs: Map<NetplayPlayer, DefaultInput>) {
    // The delta time in seconds.
    let dt = PhysicsGame.timestep / 1000;

    for (let [player, input] of playerInputs.entries()) {
      if (player.getID() === 0) {
        let arm =
          (input.keysHeld.ArrowLeft ? -1 : 0) +
          (input.keysHeld.ArrowRight ? 1 : 0);
        // Hinge control
        this.hinge.enableAngularMotor(true, 1.5 * arm, 50);
      }
    }

    // Step world
    this.physicsWorld.stepSimulation(dt, 10);
  }

  draw() {
    this.updateBodies();

    this.renderer!.render(this.scene!, this.camera!);
  }

  updateBodies() {
    const transformAux1 = new Ammo.btTransform();

    // Update rope
    const softBody = this.rope!.userData.physicsBody;
    const ropePositions = this.rope!.geometry.attributes.position
      .array as Array<number>;
    const numVerts = ropePositions.length / 3;
    const nodes = softBody.get_m_nodes();
    let indexFloat = 0;

    for (let i = 0; i < numVerts; i++) {
      const node = nodes.at(i);
      const nodePos = node.get_m_x();
      ropePositions[indexFloat++] = nodePos.x();
      ropePositions[indexFloat++] = nodePos.y();
      ropePositions[indexFloat++] = nodePos.z();
    }

    this.rope!.geometry.attributes.position.needsUpdate = true;

    // Update rigid bodies
    for (let i = 0, il = this.rigidBodies.length; i < il; i++) {
      const objThree = this.rigidBodies[i];
      const objPhys = objThree.userData.physicsBody;
      const ms = objPhys.getMotionState();
      if (ms) {
        ms.getWorldTransform(transformAux1);
        const p = transformAux1.getOrigin();
        const q = transformAux1.getRotation();
        objThree.position.set(p.x(), p.y(), p.z());
        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    }
  }

  serialize(): JsonValue {
    throw new Error("This game state cannot be serialized.");
  }

  deserialize() {
    throw new Error("This game state cannot be deserialized.");
  }
}

ammoLoaded.then(() => {
  new LockstepWrapper(PhysicsGame).start();
});
