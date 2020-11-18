import {
  Color,

  ShaderMaterial,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget
} from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass";
import { GUIState } from "./App";

export class DuotoneEffect {
  public get texture() {
    return this.target.texture;
  }

  target: WebGLRenderTarget;
  private fsQuad: Pass.FullScreenQuad;
  public readonly material: DuoToneShaderMaterial;

  constructor(public source: Texture, state: GUIState, public maxBrightness: number) {
    this.target = new WebGLRenderTarget(
      source.image.width,
      source.image.height
    );
    this.material = new DuoToneShaderMaterial(source, state, maxBrightness);
    this.fsQuad = new Pass.FullScreenQuad(this.material);
  }

  public render(renderer: WebGLRenderer) {
    renderer.setRenderTarget(this.target);
    this.fsQuad.render(renderer);
    renderer.setRenderTarget(null);
  }
}

class DuoToneShaderMaterial extends ShaderMaterial {
  constructor(source: Texture, state: GUIState, maxBrightness: number) {
    super({
      uniforms: {
        tSource: { value: source },
        colorLight: { value: null },
        colorDark: { value: null },
        crush: { value: 0.0 },
        enabled: { value: true },
        maxBrightness: { value: maxBrightness },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
    });
    this.update(state);
    this.needsUpdate = true;
  }

  update(state: GUIState) {
    this.uniforms.colorLight.value = rgbaArray(new Color(state.duoToneLight), 1.0);
    this.uniforms.colorDark.value = rgbaArray(new Color(state.duoToneDark), 0.0);
    this.uniforms.enabled.value = state.duoToneEnabled;
    this.needsUpdate = true;
  }
}

function rgbaArray(color: Color, alpha: number) {
  return [...color.toArray(), alpha];
}

const vertexShader = glsl`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const fragmentShader = glsl`
uniform vec4 colorLight;
uniform vec4 colorDark;
uniform float crush;
uniform float maxBrightness;
uniform bool enabled;

uniform sampler2D tSource;
varying vec2 vUv;

void main() {
  vec4 baseColor = texture2D( tSource, vUv );

  if (enabled) {
    float grey = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114)) / maxBrightness;
    grey = smoothstep(crush, 1.0 - crush, grey);

    vec4 outColor = mix(colorDark, colorLight, grey);

    gl_FragColor = outColor;
  } else {
    gl_FragColor = baseColor;
  }
}
`;

function glsl(literals: TemplateStringsArray, ...placeholders: string[]) {
  let result = "";
  for (let i = 0; i < placeholders.length; i++) {
    result += literals[i];
    result += placeholders[i];
  }

  result += literals[literals.length - 1];
  return result;
}
