import {
  AmbientLight,

  CanvasTexture,
  Color,
  DoubleSide,
  Euler,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
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
import { GUIState } from "./App";
import { GradientEffect } from "./GradientEffect";
import { OrbitControls } from "./OrbitControls";
import { smoothstep } from "./smoothstep";

export class AdversaryDriver {
  public renderer: WebGLRenderer;
  public scene: Scene;
  public camera: OrthographicCamera;
  controls: OrbitControls;
  adversary?: Mesh;
  adversaryMaterial?: MeshStandardMaterial;
  timeStarted = 0;
  geom = new PlaneGeometry(200, 200, 512, 512);
  textureBase?: Texture;
  gradientEffect!: GradientEffect;
  // in [0 to 1]
  maxBrightness!: number;
  minBrightness!: number;
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

    this.loadDefaultImage();

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

    this.mouse.x = (event.clientX / window.innerWidth * 2 - 1) * aspect;
    this.mouse.y = (1 - event.clientY / window.innerHeight) * 2 - 1;

    if (this.state.parallaxEnabled && this.state.parallaxRespondsToMouseMovement) {
        const parallaxAmount = Math.PI / 4 * this.state.parallaxIntensity / window.innerHeight * 3;
        (this.controls as any).rotateLeft(-parallaxAmount * event.movementX);
        (this.controls as any).rotateUp(-parallaxAmount * event.movementY);
    }
  }

  setImage(img: HTMLImageElement) {
    const texture = new Texture(img);
    img.onload = function () {
      texture.needsUpdate = true;
    };
    this.recreateAdversary(texture);
  }

  setState(state: GUIState) {
    this.state = state;
    (this.filmPass.uniforms as any).nIntensity.value = state.noiseIntensity;
    (this.filmPass.uniforms as any).sIntensity.value = state.scanlineIntensity;
    this.gradientEffect?.material.update(state);
    if (this.adversaryMaterial != null) {
      if (state.gradientEnabled) {
        this.adversaryMaterial.map = this.gradientEffect.texture;
      } else {
        this.adversaryMaterial.map = this.textureBase!;
      }
      this.adversaryMaterial.needsUpdate = true;
    }
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
      this.adversaryMaterial?.dispose();
    }
    this.textureBase = textureBase;
    const {
      texture: displacementMap,
      maxBrightness,
      minBrightness,
    } = this.createDisplacementMap(textureBase)!;
    this.maxBrightness = maxBrightness;
    this.minBrightness = minBrightness;
    this.gradientEffect = new GradientEffect(
      textureBase,
      this.state,
      maxBrightness,
      minBrightness
    );
    this.adversaryMaterial = new MeshStandardMaterial({
      side: DoubleSide,
      map: this.gradientEffect.texture,
      displacementMap,
      displacementScale: 0,
      transparent: true,
      roughness: 1,
      metalness: 0,
    });
    if (this.state.gradientEnabled) {
      this.adversaryMaterial.map = this.gradientEffect.texture;
    } else {
      this.adversaryMaterial.map = this.textureBase!;
    }
    this.adversary = new Mesh(this.geom, this.adversaryMaterial);
    this.scene.add(this.adversary);

    this.composer.render();
    this.timeStarted = performance.now();
  }

  loadDefaultImage() {
    new TextureLoader().load(
      "/2005-crowdstrike-adversary/adversaries/Buffalo.jpg",
      (texture) => {
        this.recreateAdversary(texture);
      },
      (event) => console.log(event),
      (event) => console.error(event)
    );
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
    if (this.adversaryMaterial != null && this.adversary != null) {
      const zScale =
        (smoothstep(0, 5000, performance.now() - this.timeStarted) *
          this.state.growLength) /
        this.maxBrightness;
      this.adversaryMaterial.displacementScale = zScale;
      this.adversary.position.z = -zScale / 2;
    }
    this.gradientEffect?.material.update(this.state);
    this.gradientEffect?.render(this.renderer);
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
      var damping = 0.1 * (2 ** (this.state.parallaxReturnSpeed - 3));
      var spherical = new Spherical();
      spherical.setFromVector3(this.camera.position);
      controls.rotateLeft((spherical.theta - this.spherical0.theta) * damping);
      controls.rotateUp((spherical.phi - this.spherical0.phi) * damping);
    } else {
      // reset rotation but don't reset zoom
      controls.target.copy(controls.target0);
      controls.object.position.copy(controls.position0);
      const parallaxAmount = Math.PI / 4 * this.state.parallaxIntensity;
      controls.rotateLeft(-parallaxAmount * this.mouse.x);
      controls.rotateUp(parallaxAmount * this.mouse.y);
    }
  }

  private createDisplacementMap(source: Texture) {
    const { imageData, canvas } = downsampledImageData(
      source.image as HTMLImageElement,
      256
    );
    var maxBrightness = 0;
    var minBrightness = 1;

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i] / 255,
        g = imageData.data[i + 1] / 255,
        b = imageData.data[i + 2] / 255;
      const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      maxBrightness = Math.max(brightness, maxBrightness);
      minBrightness = Math.min(brightness, minBrightness);
      imageData.data[i] = imageData.data[i + 1] = imageData.data[
        i + 2
      ] = brightness;
    }
    // context.putImageData(imageData, 0, 0);
    const texture = new CanvasTexture(canvas);
    return { texture, imageData, maxBrightness, minBrightness };
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

export function downsampledImageData(image: HTMLImageElement, width: number) {
  var canvas = document.createElement("canvas");
  const height = (image.height / image.width) * width;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  return { canvas, imageData };
}
