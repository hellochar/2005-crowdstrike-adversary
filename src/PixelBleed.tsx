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
import { glsl } from "./glsl";

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

const noise = glsl`
//	Classic Perlin 2D Noise 
//	by Stefan Gustavson
//
vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}


float cnoise(vec2 P){
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);
  vec4 norm = 1.79284291400159 - 0.85373472095314 * 
    vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}
`;

const fragmentShader = glsl`
uniform vec2 resolution; // The width and height of our screen
uniform sampler2D feedback; // Our input texture
uniform float time;
uniform vec2 mouse;

varying vec2 vUv;

${noise}

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
