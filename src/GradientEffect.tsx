import {
  Color,

  ShaderMaterial,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget
} from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass";
import { GUIState } from "./App";
import { glsl } from "./glsl";

export class GradientEffect {
  public get texture() {
    return this.target.texture;
  }

  target: WebGLRenderTarget;
  private fsQuad: Pass.FullScreenQuad;
  public readonly material: GradientShaderMaterial;

  constructor(public source: Texture, state: GUIState, public maxBrightness: number, public minBrightness: number) {
    this.target = new WebGLRenderTarget(
      source.image.width,
      source.image.height
    );
    this.material = new GradientShaderMaterial(source, state, maxBrightness, minBrightness);
    this.fsQuad = new Pass.FullScreenQuad(this.material);
  }

  public render(renderer: WebGLRenderer) {
    renderer.setRenderTarget(this.target);
    this.fsQuad.render(renderer);
    renderer.setRenderTarget(null);
  }
}

class GradientShaderMaterial extends ShaderMaterial {
  constructor(source: Texture, state: GUIState, maxBrightness: number, minBrightness: number) {
    super({
      uniforms: {
        tSource: { value: source },
        gradient: { value: (new Array(10).fill(0).map(() => new Color())) },
        gradientLength: { value: 0 },
        transparency: { value: true },
        enabled: { value: true },
        maxBrightness: { value: maxBrightness },
        minBrightness: { value: minBrightness },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
    });
    this.update(state);
    this.needsUpdate = true;
  }

  update(state: GUIState) {
    const gradientColors = state.gradient.split(" ").map((x) => new Color(x));
    const gradientLength = gradientColors.length;
    gradientColors.forEach((color, index) => {
      this.uniforms.gradient.value[index] = color;
    });
    this.uniforms.gradientLength.value = gradientLength;
    this.uniforms.transparency.value = state.gradientTransparency;
    this.uniforms.enabled.value = state.gradientEnabled;
    this.needsUpdate = true;
  }
}

const vertexShader = glsl`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const fragmentShader = glsl`
uniform sampler2D tSource;
uniform vec3[10] gradient;
uniform int gradientLength;
uniform bool transparency;
uniform bool enabled;
uniform float maxBrightness;
uniform float minBrightness;

varying vec2 vUv;

vec4 getGradientColor(float t) {
  float tOnGradient = t * float(gradientLength);
  int lowStop = int(tOnGradient);
  int highStop = int(tOnGradient) + 1;
  float lerpAmount = tOnGradient - float(lowStop);

  vec3 colorLow = gradient[lowStop];
  vec3 colorHigh = gradient[highStop];

  float alpha = 1.0;
  if (transparency && lowStop == 0) {
    alpha = lerpAmount;
  }

  return vec4(mix(colorLow, colorHigh, lerpAmount), alpha);
}

void main() {
  vec4 baseColor = texture2D( tSource, vUv );

  if (enabled) {
    float brightness = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
    float normalizedBrightness = smoothstep(minBrightness, maxBrightness, brightness);

    vec4 outColor = getGradientColor(normalizedBrightness);

    gl_FragColor = outColor;
  } else {
    gl_FragColor = baseColor;
  }
}
`;
