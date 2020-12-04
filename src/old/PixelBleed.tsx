import {
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  OrthographicCamera,
  PlaneBufferGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget
} from "three";
import { glsl } from "../glsl";
import { GLSL_NOISE } from "../GLSL_NOISE";

// adapted from https://github.com/jpupper/WebShaderGallery/blob/master/js/render.js
export class PixelBleed {
  public renderer: WebGLRenderer;
  public scene: Scene;
  public camera: OrthographicCamera;
  textureA: WebGLRenderTarget;
  textureB: WebGLRenderTarget;
  bufferMaterial: ShaderMaterial;
  finalMaterial: MeshBasicMaterial;
  bufferObject: Mesh<any, any>;
  bufferScene = new Scene();
  quad: Mesh<any, any>;
  mouse = new Vector2();
  constructor(public canvas: HTMLCanvasElement, public imgTexture: Texture) {
    this.renderer = new WebGLRenderer({ canvas });

    this.scene = new Scene();

    const { width, height } = canvas;
    this.camera = new OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
      1,
      1000
    );
    this.camera.position.z = 2;

    this.textureA = new WebGLRenderTarget(canvas.width, canvas.height, {
      minFilter: LinearFilter,
      magFilter: NearestFilter,
    });
    this.textureB = new WebGLRenderTarget(canvas.width, canvas.height, {
      minFilter: LinearFilter,
      magFilter: NearestFilter,
    });
    // pipeline:
    // start: textureA is source, textureB is the target. This is caused by:
    //    bufferMaterial uses textureA as a uniform
    //    finalMaterial uses textureB as a map
    // renderB() updates B
    // swap() makes B now A, and you can start again
    this.bufferMaterial = new ShaderMaterial({
      uniforms: {
        feedback: { value: this.textureA.texture },
        resolution: { value: new Vector2(canvas.width, canvas.height) },
        mouse: { value: new Vector2(0, 0) },
        time: { value: Math.random() * Math.PI * 2 + Math.PI },
      },
      vertexShader,
      fragmentShader,
    });
    const plane = new PlaneBufferGeometry(canvas.width, canvas.height);
    this.bufferObject = new Mesh(plane, this.bufferMaterial);
    this.bufferScene.add(this.bufferObject);

    //Prepare buffer scene to be drawn into
    this.finalMaterial = new MeshBasicMaterial({ map: this.textureB.texture, transparent: true });
    this.quad = new Mesh(plane, this.finalMaterial);
    this.scene.add(this.quad);

    //Draw img onto textureA
    this.finalMaterial.map = imgTexture;
    this.renderer.setRenderTarget(this.textureA);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.finalMaterial.map = this.textureB.texture;

    requestAnimationFrame(this.animate);
    console.log(this);
    window.addEventListener("mousemove", this.onDocumentMouseMove);
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    //Draw to textureB
    this.renderB();

    // textureB is now in textureA
    // this.swap();

    this.bufferObject.material.uniforms.mouse.value = new Vector2(
      this.mouse.x,
      this.mouse.y
    );
    // this.bufferObject.material.uniforms.touchesCount.value = touchesCount;
    // this.bufferObject.material.uniforms.touchesPos.value = touchesPos;
    //Update time
    this.bufferMaterial.uniforms.time.value += 0.01;

    this.renderer.render(this.scene, this.camera);
  };

  renderB() {
    this.renderer.setRenderTarget(this.textureB);
    this.renderer.clear();
    this.renderer.render(this.bufferScene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  swap() {
    //Swap textureA and B
    var t = this.textureA;
    this.textureA = this.textureB;
    this.textureB = t;
    this.finalMaterial.map = this.textureB.texture;

    this.bufferMaterial.uniforms.feedback.value = this.textureA.texture;
  }

  onDocumentMouseMove = (event: MouseEvent) => {
    event.preventDefault();

    this.mouse.x = event.clientX / window.innerWidth;
    this.mouse.y = 1 - event.clientY / window.innerHeight;
  }
}

const vertexShader = glsl`
varying vec2 vUv;

void main()	{
	vUv = uv;
	gl_Position = vec4( position, 1.0 );
}
`;

const fragmentShader = glsl`
uniform vec2 resolution; // The width and height of our screen
uniform sampler2D feedback; // Our input texture
uniform float time;
uniform vec2 mouse;

varying vec2 vUv;

${GLSL_NOISE}

float brightness(vec3 col) {
  return dot(col.rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 delta = 1.0 / resolution.xy;
  vec2 mouseNorm = vec2(0.5) - mouse;

  vec4 uv0 = texture2D(feedback, uv);
  vec4 finalColor = uv0;

  float dif = 1.0; // sin(time) * 0.2;
  vec2 puv = uv;
  for (int i = 0; i < 10; i++) {
    vec2 offset = vec2(
      cnoise(puv * 2. + vec2(time, 0)),
      cnoise(puv * 2. + vec2(91.3 - time, -123.2 + time))
    );
    offset -= mouseNorm * 10.;

    puv = puv + delta * offset * 2.;

    vec4 up = texture2D(feedback, puv);

    if (dif * (brightness(up.rgb) - brightness(finalColor.rgb)) > 0.) {
      finalColor = mix(finalColor, up, 0.5);
    }
  }

  gl_FragColor = finalColor;
}
`;
