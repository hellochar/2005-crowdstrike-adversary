import {
  AmbientLight,

  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,

  Geometry,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,

  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Pass } from "three/examples/jsm/postprocessing/Pass";
import { GUIState } from "./App";
import { smoothstep } from "./smoothstep";

export class AdversaryDriver {
  public renderer: WebGLRenderer;
  public scene: Scene;
  public camera: PerspectiveCamera;
  controls: OrbitControls;
  adversary?: Mesh;
  adversaryMaterial?: MeshStandardMaterial;
  timeStarted = 0;
  geom = new PlaneGeometry(200, 200, 512, 512);
  textureBase?: Texture;
  duotoneEffect!: DuotoneEffect;
  ambientLight: AmbientLight;
  directionalLight: DirectionalLight;
  pointCloud?: AdversaryPointCloud;

  constructor(public canvas: HTMLCanvasElement, private state: GUIState) {
    this.renderer = new WebGLRenderer({ canvas });
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.scene = new Scene();

    this.camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      2000
    );
    this.camera.position.set(150, 0, 150);
    this.camera.lookAt(0, 0, 0);

    // also sets renderer initial size
    this.handleWindowResize();
    window.addEventListener("resize", this.handleWindowResize);

    this.ambientLight = new AmbientLight();
    this.scene.add(this.ambientLight);
    this.directionalLight = new DirectionalLight();
    this.directionalLight.position.set(0, 0, 10);
    this.scene.add(this.directionalLight);
    this.scene.background = new Color(1, 1, 1);

    // const mesh = new Mesh(
    //   new TorusKnotBufferGeometry(100, 30),
    //   new MeshStandardMaterial()
    // );
    // this.scene.add(mesh);
    // this.scene.add(new AxesHelper(100));
    this.loadDefaultImage();

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.autoRotate = true;

    this.setState(state);
    requestAnimationFrame(this.animate);
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
    this.duotoneEffect?.material.update(state);
    if (this.adversaryMaterial != null) {
      if (state.duoToneEnabled) {
        this.adversaryMaterial.map = this.duotoneEffect.texture;
      } else {
        this.adversaryMaterial.map = this.textureBase!;
      }
      this.adversaryMaterial.needsUpdate = true;
    }
    this.ambientLight.color.set(state.ambientLight);
    this.directionalLight.color.set(state.directionalLight);
    (this.scene.background as Color).set(state.background);
    if (state.mode === "heightmap" && this.adversary != null && this.adversary.parent == null) {
      this.scene.add(this.adversary);
      if (this.pointCloud) {
        this.scene.remove(this.pointCloud);
      }
    } else if (state.mode === "particles" && this.pointCloud != null && this.pointCloud.parent == null) {
      this.scene.add(this.pointCloud);
      if (this.adversary) {
        this.scene.remove(this.adversary);  
      }
    }
  }

  private recreateAdversary(textureBase: Texture) {
    if (this.adversary != null) {
      this.scene.remove(this.adversary);
      this.adversaryMaterial?.dispose();
    }
    if (this.pointCloud != null) {
      this.scene.remove(this.pointCloud);
    }
    this.textureBase = textureBase;
    this.duotoneEffect = new DuotoneEffect(textureBase, this.state);
    const { texture: displacementMap, imageData } = this.createDisplacementMap(textureBase)!;
    this.adversaryMaterial = new MeshStandardMaterial({
      side: DoubleSide,
      map: this.duotoneEffect.texture,
      displacementMap,
      displacementScale: 0,
      // bumpMap: this.textureBase,
      roughness: 1,
      metalness: 0,
    });
    if (this.state.duoToneEnabled) {
      this.adversaryMaterial.map = this.duotoneEffect.texture;
    } else {
      this.adversaryMaterial.map = this.textureBase!;
    }
    // const geom = this.generateDisplacementMappedGeometry(texture.image as HTMLImageElement);
    this.adversary = new Mesh(this.geom, this.adversaryMaterial);
    this.pointCloud = new AdversaryPointCloud(imageData);
    if (this.state.mode === "heightmap") {
      this.scene.add(this.adversary);
    } else {
      this.scene.add(this.pointCloud);
    }

    this.renderer.render(this.scene, this.camera);
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
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  };

  animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    if (this.adversaryMaterial != null) {
      this.adversaryMaterial.displacementScale =
        smoothstep(0, 5000, performance.now() - this.timeStarted) * this.state.growLength;
    }
    // if (this.textureBase != null) {
    //   this.textureBase.needsUpdate = true;
    // }
    this.pointCloud?.animate();
    this.duotoneEffect?.material.update(this.state);
    this.duotoneEffect?.render(this.renderer);
    this.renderer.render(this.scene, this.camera);
  };

  private createDisplacementMap(texture: Texture) {
    const image = texture.image as HTMLImageElement;
    var canvas = document.createElement("canvas");
    canvas.width = image.width / 15;
    canvas.height = image.height / 15;

    const context = canvas.getContext("2d");
    if (context) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const { width, height } = canvas;
      const imageData = context.getImageData(0, 0, width, height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i] / 255,
          g = imageData.data[i + 1] / 255,
          b = imageData.data[i + 2] / 255;
        const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        // imageData.data[i] = imageData.data[i + 1] = imageData.data[
        //   i + 2
        // ] = Math.floor(brightness * 255);
      }
      // context.putImageData(imageData, 0, 0);
      const texture = new CanvasTexture(canvas);
      return {texture, imageData};
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

class DuotoneEffect {
  public get texture() {
    return this.target.texture;
  }

  target: WebGLRenderTarget;
  private fsQuad: Pass.FullScreenQuad;
  public readonly material: DuoToneShaderMaterial;

  constructor(public source: Texture, state: GUIState) {
    this.target = new WebGLRenderTarget(
      source.image.width,
      source.image.height
    );
    this.material = new DuoToneShaderMaterial(source, state);
    this.fsQuad = new Pass.FullScreenQuad(this.material);
  }

  public render(renderer: WebGLRenderer) {
    renderer.setRenderTarget(this.target);
    this.fsQuad.render(renderer);
    renderer.setRenderTarget(null);
  }
}

function glsl(literals: TemplateStringsArray, ...placeholders: string[]) {
  let result = "";
  for (let i = 0; i < placeholders.length; i++) {
    result += literals[i];
    result += placeholders[i];
  }

  result += literals[literals.length - 1];
  return result;
}

const vertexShader = glsl`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = glsl`
uniform vec3 colorLight;
uniform vec3 colorDark;
uniform float crush;
uniform bool enabled;

uniform sampler2D tSource;
varying vec2 vUv;

void main() {
  vec4 baseColor = texture2D( tSource, vUv );

  if (enabled) {
    float grey = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
    grey = smoothstep(crush, 1.0 - crush, grey);

    vec3 outColor = mix(colorDark, colorLight, grey);

    gl_FragColor = vec4(outColor, 1.0);
  } else {
    gl_FragColor = baseColor;
  }
}
`;

class DuoToneShaderMaterial extends ShaderMaterial {
  constructor(source: Texture, state: GUIState) {
    super({
      uniforms: {
        tSource: { value: source },
        colorLight: { value: new Color(state.duoToneLight) },
        colorDark: { value: new Color(state.duoToneDark) },
        crush: { value: 0.0 },
        enabled: { value: true }
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });
    this.needsUpdate = true;
  }

  update(state: GUIState) {
    this.uniforms.colorLight.value.set(state.duoToneLight);
    this.uniforms.colorDark.value.set(state.duoToneDark);
    this.uniforms.enabled.value = state.duoToneEnabled;
    this.needsUpdate = true;
  }
}

class AdversaryPointCloud extends Points {
  private geom: Geometry;
  private originalPositions: Vector3[];
  constructor(public imageData: ImageData) {
    super(newPCGeometry(imageData), newPCMaterial());
    this.geom = this.geometry as Geometry;
    this.originalPositions = this.geom.vertices.map((x) => x.clone());
  }

  public animate() {
    const mode = performance.now() / 1000 % 10 < 5 ? "circle" : "heightmap";

    const targetPosition = new Vector3();
    for (let i = 0; i < this.geom.vertices.length; i++) {
      const vertex = this.geom.vertices[i];
      const color = this.geom.colors[i];
      color.multiplyScalar(MathUtils.randFloat(0.98, 1 / 0.98));
      if (mode === "heightmap") {
        targetPosition.set(
          this.originalPositions[i].x,
          this.originalPositions[i].y, 
          this.originalPositions[i].z + 1 * Math.sin((vertex.x / 4 + vertex.y / 7) + performance.now() / 1000 * 0.5),
        );
      } else {
        // const angle = MathUtils.mapLinear(i, 0, this.geom.vertices.length, 0, Math.PI * 2);
        const angle = Math.atan2(this.originalPositions[i].y, this.originalPositions[i].x);
        targetPosition.set(
          Math.cos(angle) * 200,
          Math.sin(angle) * 200,
          this.originalPositions[i].z + 30 + 30 * Math.sin((vertex.x / 1 + vertex.y / 2) + performance.now() / 1000 * 2.5),
        );
      }
      vertex.lerp(targetPosition, 0.2);
    }
    this.geom.colorsNeedUpdate = true;
    this.geom.verticesNeedUpdate = true;
  }
}

function newPCMaterial() {
  const sprite = new TextureLoader().load('/2005-crowdstrike-adversary/textures/disc.png');

  return new PointsMaterial({
    vertexColors: true,
    map: sprite,
    transparent: true,
    alphaTest: 0.2,
    opacity: 0.5,
    sizeAttenuation: true,
    size: 3
  });
}

function newPCGeometry(imageData: ImageData) {
  const geometry = new Geometry();

  const {width, height} = imageData;
  for (let ix = 0; ix < width; ix++) {
    for (let iy = 0; iy < height; iy++) {
        const x = MathUtils.mapLinear(
          ix + 0.5, 0, width,
          -width / 2,
          width / 2,
        );
        /// invert the y!
        const y = MathUtils.mapLinear(
          iy + 0.5,
          0,
          height,
          height / 2,
          -height / 2,
        );
        const imageDataIndex = (ix + width * iy) * 4;
        const r = imageData.data[imageDataIndex] / 255,
          g = imageData.data[imageDataIndex + 1] / 255,
          b = imageData.data[imageDataIndex + 2] / 255;
        const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const z = brightness * 50;
      geometry.vertices.push(new Vector3(x, y, z));
      geometry.colors.push(new Color(r, g, b));
    }
  }
  const scale = 200 / Math.max(width, height);
  geometry.scale(scale, scale, 1);
  console.log(geometry);
  return geometry;
}
