import { DoubleSide, ShaderMaterial, Texture } from "three";
import { DRIVER } from "./AdversaryRendering";
import { GUIState, STATE } from "./App";
import { createDisplacementMap } from "./createDisplacementMap";
import { glsl } from "./glsl";
import { GLSL_NOISE } from "./GLSL_NOISE";
import { GradientEffect } from "./GradientEffect";

export class AdversaryMaterial extends ShaderMaterial {
  public textureCache: Record<string, Texture> = {};
  private activeTexture: string = "Buffalo";

  constructor(
    public baseTexture: Texture,
    // in [0 to 1]
    public minBrightness: number,
    public maxBrightness: number,
    public gradientEffect: GradientEffect
  ) {
    super({
      uniforms: {
        time: { value: 0 },

        // used for heightmap
        displacementScale: { value: 0 },

        // used for heightmap
        baseTexture: { value: baseTexture },

        // only used for coloring
        map: { value: null },
      },
      fragmentShader,
      vertexShader,
      side: DoubleSide,
      transparent: true,
    });
    this.updateMap();
  }

  private updateMap() {
    if (STATE.gradientEnabled) {
      this.uniforms.map.value = this.gradientEffect.texture;
    } else {
      this.uniforms.map.value = this.baseTexture;
    }
    this.needsUpdate = true;
  }

  public setState(state: GUIState) {
    this.updateMap();
  }

  animate(zScale: number, time: number) {
    this.uniforms.time.value = time;
    this.uniforms.displacementScale.value = zScale;
    this.gradientEffect.material.update(STATE);
    this.gradientEffect.render(DRIVER.renderer);
    this.needsUpdate = true;
  }

  static create(textureBase: Texture, state: GUIState) {
    const {
      maxBrightness,
      minBrightness,
    } = createDisplacementMap(textureBase)!;
    const gradientEffect = new GradientEffect(
      textureBase,
      state,
      maxBrightness,
      minBrightness
    );
    return new AdversaryMaterial(
      textureBase,
      minBrightness,
      maxBrightness,
      gradientEffect
    );
  }
}

const vertexShader = glsl`
uniform float displacementScale;
uniform sampler2D baseTexture;
uniform float time;
varying vec2 vUv;

${GLSL_NOISE}

void main() {
  vUv = uv;

  vec4 baseColor = texture2D( baseTexture, vUv );
  float brightness = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));

  vec3 transformed = position;

  float dz = displacementScale * brightness;

  transformed.z += dz;

  vec2 offset = vec2(0., 0.);

  float t = time + (1.0 + length(transformed.xy)) / 100.0 * 2.2;

  // make the entire thing expand and shrink
  offset += transformed.xy / 100.0 * (1.0 + sin(t)) * 2.0;

  // make taller points expand/shrink more
  offset += transformed.xy / 100.0 * (1.0 + sin(t)) * 20.0 * brightness * brightness;

  // add some flow noise to the taller points
  float noiseTime = t * 0.2;
  offset += vec2(
    cnoise(uv * 0.5 + vec2(noiseTime, 0)),
    cnoise(uv * 0.5 + vec2(91.3 - noiseTime, -123.2 + noiseTime))
  ) * 4.0 * brightness;

  transformed.xy += offset;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const fragmentShader = glsl`
varying vec2 vUv;
uniform sampler2D map;

void main() {
  gl_FragColor = texture2D( map, vUv );
}
`;