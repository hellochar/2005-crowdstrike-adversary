import {
  AmbientLight,
  Color,
  Euler,
  MathUtils,
  Mesh,

  OrthographicCamera,
  PlaneGeometry,
  Scene,
  Spherical,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { AdversaryMaterial } from "./AdversaryMaterial";
import { GUIState, STATE } from "./App";
import { OrbitControls } from "./OrbitControls";
import { smoothstep } from "./smoothstep";

export class AdversaryDriver {
  public renderer: WebGLRenderer;
  public scene: Scene;
  public camera: OrthographicCamera;
  controls: OrbitControls;
  adversary?: AdversaryMesh;
  composer: EffectComposer;
  filmPass: FilmPass;
  // normalized in [-1, 1]
  mouse = new Vector2();
  spherical0: Spherical;

  constructor(public canvas: HTMLCanvasElement, private state: GUIState) {
    this.renderer = new WebGLRenderer({ canvas });
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.scene = new Scene();

    // frustrum will be set by handleWindowResize
    this.camera = new OrthographicCamera(-1, 1, 1, -1, -9999, 9999);
    this.camera.position.set(0, 0, 100);
    this.camera.lookAt(0, 0, 0);

    // also sets renderer initial size
    this.handleWindowResize();
    window.addEventListener("resize", this.handleWindowResize);

    window.addEventListener("mousemove", this.handleMouseMove);

    this.scene.add(new AmbientLight(0xffffff));
    this.scene.background = new Color(1, 1, 1);

    this.setAdversary("Buffalo");

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.spherical0 = new Spherical();
    this.spherical0.setFromVector3(this.camera.position);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.filmPass = new FilmPass(0, 0, 4096, 0);
    this.composer.addPass(this.filmPass);

    this.setState(state);
    requestAnimationFrame(this.animate);
  }

  handleMouseMove = (event: MouseEvent) => {
    event.preventDefault();
    const aspect = window.innerWidth / window.innerHeight;

    this.mouse.x = ((event.clientX / window.innerWidth) * 2 - 1) * aspect;
    this.mouse.y = (1 - event.clientY / window.innerHeight) * 2 - 1;

    if (
      this.state.parallaxEnabled &&
      this.state.parallaxRespondsToMouseMovement
    ) {
      const parallaxAmount =
        (((Math.PI / 4) * this.state.parallaxIntensity) / window.innerHeight) *
        3;
      (this.controls as any).rotateLeft(-parallaxAmount * event.movementX);
      (this.controls as any).rotateUp(-parallaxAmount * event.movementY);
    }
  };

  setImage(img: HTMLImageElement) {
    const texture = new Texture(img);
    img.onload = function () {
      texture.needsUpdate = true;
    };
    this.recreateAdversary(texture);
  }

  setAdversary(name: string) {
    new TextureLoader().load(
      `/2005-crowdstrike-adversary/adversaries/${name}.jpg`,
      (texture) => {
        this.recreateAdversary(texture);
      },
      (event) => console.log(event),
      (event) => console.error(event)
    )
  }

  setState(state: GUIState) {
    this.state = state;
    (this.filmPass.uniforms as any).nIntensity.value = state.noiseIntensity;
    (this.filmPass.uniforms as any).sIntensity.value = state.scanlineIntensity;
    this.adversary?.material.setState(state);
    (this.scene.background as Color).set(state.background);
  }

  cameraTarget?: Vector3;
  goDiagonalView() {
    this.cameraTarget = new Vector3(0, 0, 100);
    this.cameraTarget.applyEuler(new Euler(Math.PI / 6, Math.PI / 6));
  }

  goFrontalView() {
    this.cameraTarget = new Vector3(0, 0, 100);
  }

  private recreateAdversary(textureBase: Texture) {
    if (this.adversary != null) {
      this.scene.remove(this.adversary);
      this.adversary.material.dispose();
    }
    const adversaryMaterial = AdversaryMaterial.create(textureBase, this.state);
    this.adversary = new AdversaryMesh(adversaryMaterial);
    this.scene.add(this.adversary);

    this.composer.render();
  }

  handleWindowResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const aspect = window.innerWidth / window.innerHeight;
    const halfHeight = 150;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  };

  animate = () => {
    requestAnimationFrame(this.animate);
    if (this.cameraTarget != null) {
      this.updateCameraTarget();
    } else {
      if (this.state.parallaxEnabled) {
        this.updateCameraParallax();
      }
      this.controls.update();
    }
    this.adversary?.animate();
    this.composer.render();
  };

  updateCameraTarget() {
    if (this.cameraTarget != null) {
      if (this.camera.position.distanceTo(this.cameraTarget) < 1) {
        // we're done
        this.camera.position.copy(this.cameraTarget);
        this.camera.lookAt(0, 0, 0);
        delete this.cameraTarget;
      } else {
        this.camera.position.lerp(this.cameraTarget, 0.1);
        this.camera.lookAt(0, 0, 0);
      }
    }
  }

  private updateCameraParallax() {
    const controls = this.controls as any;
    if (this.state.parallaxRespondsToMouseMovement) {
      // lerp towards position0
      var damping = 0.1 * 2 ** (this.state.parallaxReturnSpeed - 3);
      var spherical = new Spherical();
      spherical.setFromVector3(this.camera.position);
      controls.rotateLeft((spherical.theta - this.spherical0.theta) * damping);
      controls.rotateUp((spherical.phi - this.spherical0.phi) * damping);
    } else {
      // reset rotation but don't reset zoom
      controls.target.copy(controls.target0);
      controls.object.position.copy(controls.position0);
      const parallaxAmount = (Math.PI / 4) * this.state.parallaxIntensity;
      controls.rotateLeft(-parallaxAmount * this.mouse.x);
      controls.rotateUp(parallaxAmount * this.mouse.y);
    }
  }

  private generateDisplacementMappedGeometry(image: HTMLImageElement) {
    var canvas = document.createElement("canvas");
    canvas.width = image.width / 10;
    canvas.height = image.height / 10;

    const context = canvas.getContext("2d");
    if (context) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const { width, height } = canvas;
      const imageData = context.getImageData(0, 0, width, height);
      // document.body.appendChild(canvas);
      // PlaneGeometry adds 1 vertex row and column, but we don't have
      // imageData there, so we must shrink PlaneGeometry to accomodate
      const geom = new PlaneGeometry(
        width - 1,
        height - 1,
        width - 1,
        height - 1
      );
      for (const vertex of geom.vertices) {
        // -0.5 to line it up perfectly with the grid
        const x = MathUtils.mapLinear(
          vertex.x - 0.5,
          -width / 2,
          width / 2,
          0,
          width
        );
        /// invert the y!
        const y = MathUtils.mapLinear(
          vertex.y - 0.5,
          height / 2,
          -height / 2,
          0,
          height
        );
        const imageDataIndex = (x + width * y) * 4;
        const r = imageData.data[imageDataIndex] / 255,
          g = imageData.data[imageDataIndex + 1] / 255,
          b = imageData.data[imageDataIndex + 2] / 255;
        const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        vertex.z = brightness * 20;
      }

      const scale = 200 / Math.max(width, height);
      geom.scale(scale, scale, 1);
      geom.computeFlatVertexNormals();
      return geom;
    }
  }
}

class AdversaryMesh extends Mesh<PlaneGeometry, AdversaryMaterial> {
  static GEOMETRY = new PlaneGeometry(200, 200, 512, 512);
  private timeStarted = performance.now();
  constructor(material: AdversaryMaterial) {
    super(AdversaryMesh.GEOMETRY, material);
  }

  animate() {
    const time = (performance.now() - this.timeStarted) / 1000;
    const zScale =
      (smoothstep(0, 5, time) *
        STATE.growLength) /
      this.material.maxBrightness;

    this.material.animate(zScale, time);

    this.position.z = -zScale / 2;
  }
}
