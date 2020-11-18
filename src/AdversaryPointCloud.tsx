import {
  Color,
  Geometry,
  MathUtils,
  Points,
  PointsMaterial,
  Texture,
  TextureLoader,
  Vector3
} from "three";
import { downsampledImageData } from "./AdversaryDriver";
import { STATE } from "./App";
import { perlin2 } from "./perlin";
import { smoothstep } from "./smoothstep";

export class AdversaryPointCloud extends Points {
  private geom: Geometry;
  private originalPositions: Vector3[];
  private originalColors: Color[];
  mat: PointsMaterial;
  constructor(public source: Texture) {
    super(newPCGeometry(source), newPCMaterial());
    this.geom = this.geometry as Geometry;
    this.mat = this.material as PointsMaterial;
    this.originalPositions = this.geom.vertices.map((x) => x.clone());
    this.originalColors = this.geom.colors.map((x) => x.clone());
  }

  public animate() {
    const time = performance.now() / 1000;
    const mode = time % 10 < 5 ? "mainnav" : "heightmap";

    for (let i = 0; i < this.geom.vertices.length; i++) {
      if (mode === "heightmap") {
        this.animateHeightmap(i, time);
      } else {
        switch (STATE.particleDistortion) {
          case "messycircle":
            this.animateCircleMessy(i, time);
            break;
          case "noiseflow":
            this.animateNoiseflow(i, time);
            break;
          case "sphere":
            this.animateSphere(i, time);
            break;
        }
      }
      const vertex = this.geom.vertices[i];
      const color = this.geom.colors[i];
      vertex.lerp(targetPosition, 0.2);
      color.lerp(targetColor, 0.15);
    }
    this.geom.colorsNeedUpdate = true;
    this.geom.verticesNeedUpdate = true;
  }

  animateSphere(i: number, time: number) {
    const vertex = this.geom.vertices[i];
    const color = this.geom.colors[i];
    const oPos = this.originalPositions[i];
    const originalColor = this.originalColors[i];

    const {x, y} = oPos;
    const radius = 100;

    // 0 to two-pi
    const polar = Math.atan2(y, x);
    // const polarLinesIndexFractional = ((polar + Math.PI) % (Math.PI * 2) / Math.PI * 2) * 8;
    // const targetIndex = Math.floor(polarLinesIndexFractional);
    // const targetIndexLerp = polarLinesIndexFractional - targetIndex;
    // const closestPolarLine = targetIndex * Math.PI * 2;
    // const targetX = Math.cos(closestPolarLine) * radius;
    // const newX = MathUtils.lerp(x, targetX, smoothstep(0, 1, targetIndexLerp));
    // const azimuth = Math.acos(z / radius)

    // radius = sqrt(x*x + y*y + z*z)
    // sqrt(r^2 - x*x - y*y) = z
    // always positive
    let z = Math.sqrt(radius * radius - x*x - y*y);
    // z += perlin3(x / 50, y / 50, time * 0.5) * 30 - 15;
    // z *= Math.sin(polar * 293912031232.31) < 0 ? -1 : 1;

    targetPosition.set(
      x,
      y,
      z
    );
  }

  animateNoiseflow(i: number, time: number) {
    const vertex = this.geom.vertices[i];
    const color = this.geom.colors[i];
    const originalPosition = this.originalPositions[i];
    const originalColor = this.originalColors[i];
    // circle experiment
    const dx = perlin2(
      originalPosition.x / 20,
      originalPosition.y / 20 + time * 0.5 - 4.213
    );
    const dy = perlin2(
      originalPosition.x / 20 + 1000,
      originalPosition.y / 20 + time * 0.5 + 26.586
    );
    const dz = perlin2(
      originalPosition.x / 20 + 9903,
      originalPosition.y / 20 - 200 + time * 0.5 + 90.492
    );
    targetPosition.set(
      originalPosition.x + dx * 50,
      originalPosition.y + dy * 50,
      dz * 50
    );
    targetColor.setRGB(0.92, 0.91, 0.93);
  }
  private animateCircleMessy(i: number, time: number) {
    const vertex = this.geom.vertices[i];
    const color = this.geom.colors[i];
    const originalPosition = this.originalPositions[i];
    const originalColor = this.originalColors[i];
    // const angle = MathUtils.mapLinear(i, 0, this.geom.vertices.length, 0, Math.PI * 2);
    const angle = Math.atan2(
      this.originalPositions[i].y,
      this.originalPositions[i].x
    );
    targetPosition.set(
      Math.cos(angle) * 80 + perlin2(i / 10, time) * 6 - 3,
      Math.sin(angle) * 80 + perlin2(i / 10 + 1.953, time + 399) * 6 - 3,
      this.originalPositions[i].z +
        6 *
          Math.sin(
            angle * 8 + time * 2.5
          )
    );
  }

  private animateHeightmap(i: number, time: number) {
    const vertex = this.geom.vertices[i];
    const color = this.geom.colors[i];
    const originalPosition = this.originalPositions[i];
    const originalColor = this.originalColors[i];
    targetPosition.set(
      originalPosition.x,
      originalPosition.y,
      originalPosition.z +
        1 * Math.sin(vertex.x / 4 + vertex.y / 7 + time * 0.5)
    );
    targetColor.set(originalColor);
  }
}

function newPCMaterial() {
  const sprite = new TextureLoader().load(
    "/2005-crowdstrike-adversary/textures/disc.png"
  );
  sprite.onUpdate = () => (material.needsUpdate = true);

  const material = new PointsMaterial({
    vertexColors: true,
    map: sprite,
    transparent: true,
    alphaTest: 0.2,
    // opacity: 0.75,
    sizeAttenuation: true,
    size: 6,
  });
  return material;
}

function newPCGeometry(source: Texture) {
  const geometry = new Geometry();

  const { imageData } = downsampledImageData(
    source.image as HTMLImageElement,
    128
  );

  const { width, height } = imageData;
  for (let ix = 0; ix < width; ix++) {
    for (let iy = 0; iy < height; iy++) {
      const x = MathUtils.mapLinear(ix + 0.5, 0, width, -width / 2, width / 2);
      /// invert the y!
      const y = MathUtils.mapLinear(
        iy + 0.5,
        0,
        height,
        height / 2,
        -height / 2
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

const targetPosition = new Vector3();
const targetColor = new Color();

function lerpTowardsGrid(x: number, grid: number) {
  const closest = Math.floor(x / grid) * grid;
  const lerp = (x - closest) / grid;
  return MathUtils.lerp(x, closest, smoothstep(0, 1, lerp));
}