import {
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  MathUtils,
  Mesh,
  MeshStandardMaterial,

  PerspectiveCamera,

  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  TextureLoader,
  WebGLRenderer,
  WebGLRenderTarget
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Pass } from "three/examples/jsm/postprocessing/Pass";
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

  constructor(public canvas: HTMLCanvasElement) {
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

    this.scene.add(new AmbientLight(0x404040, 1.3));
    const directionalLight = new DirectionalLight(0xb2b3a1, 1.3);
    directionalLight.position.set(0, 0, 10);
    this.scene.add(directionalLight);
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

    requestAnimationFrame(this.animate);
  }

  setImage(img: HTMLImageElement) {
    const texture = new Texture(img);
    img.onload = function () {
      texture.needsUpdate = true;
    };
    this.recreateAdversary(texture);
  }

  private recreateAdversary(textureBase: Texture) {
    if (this.adversary != null) {
      this.scene.remove(this.adversary);
      this.adversaryMaterial?.dispose();
    }
    this.textureBase = textureBase;
    this.duotoneEffect = new DuotoneEffect(textureBase);
    this.duotoneEffect.render(this.renderer);
    const displacementMap = this.createDisplacementMap(
      textureBase,
    );
    this.adversaryMaterial = new MeshStandardMaterial({
      side: DoubleSide,
      map: this.duotoneEffect.texture,
      displacementMap,
      displacementScale: 0,
      // displacementScale: 50,
      // bumpMap: this.textureBase,
      roughness: 1,
      metalness: 0,
    });
    // const geom = this.generateDisplacementMappedGeometry(texture.image as HTMLImageElement);
    this.adversary = new Mesh(
      // geom,
      this.geom,
      this.adversaryMaterial
    );
    this.scene.add(this.adversary);
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
        smoothstep(0, 5000, performance.now() - this.timeStarted) * 50;
    }
    this.renderer.render(this.scene, this.camera);
  };

  private createDisplacementMap(texture: Texture) {
    const image = texture.image as HTMLImageElement;
    var canvas = document.createElement("canvas");
    canvas.width = image.width / 3;
    canvas.height = image.height / 3;

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
        imageData.data[i] = imageData.data[i + 1] = imageData.data[
          i + 2
        ] = Math.floor(brightness * 255);
      }
      context.putImageData(imageData, 0, 0);
      const texture = new CanvasTexture(canvas);
      return texture;
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
  private material: ShaderMaterial;

  constructor(public source: Texture) {
    this.target = new WebGLRenderTarget(
      source.image.width,
      source.image.height,
    );
    this.material = DuoToneShaderMaterial;
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
  for(let i = 0; i < placeholders.length; i++) {
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

uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
  vec4 baseColor = texture2D( tDiffuse, vUv );

  float grey = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
  grey = smoothstep(crush, 1.0 - crush, grey);

  vec3 outColor = mix(colorDark, colorLight, grey);

  gl_FragColor = vec4(outColor, 1.0);
}
`;

const DuoToneShaderMaterial = new ShaderMaterial({
  uniforms: {
    colorLight: { value: new Color(0x317671) },
    colorDark: { value: new Color(0x772E49) },
    crush: { value: 0.0, },
  },
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
});
