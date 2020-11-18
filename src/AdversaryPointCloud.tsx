import {
    Color,



    Geometry,
    MathUtils,






    Points,
    PointsMaterial,



    TextureLoader,
    Vector3
} from "three";

export class AdversaryPointCloud extends Points {
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
          this.originalPositions[i].z + 1 * Math.sin((vertex.x / 4 + vertex.y / 7) + performance.now() / 1000 * 0.5)
        );
      } else {
        // const angle = MathUtils.mapLinear(i, 0, this.geom.vertices.length, 0, Math.PI * 2);
        const angle = Math.atan2(this.originalPositions[i].y, this.originalPositions[i].x);
        targetPosition.set(
          Math.cos(angle) * 200,
          Math.sin(angle) * 200,
          this.originalPositions[i].z + 30 + 30 * Math.sin((vertex.x / 1 + vertex.y / 2) + performance.now() / 1000 * 2.5)
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

  const { width, height } = imageData;
  for (let ix = 0; ix < width; ix++) {
    for (let iy = 0; iy < height; iy++) {
      const x = MathUtils.mapLinear(
        ix + 0.5, 0, width,
        -width / 2,
        width / 2
      );
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
