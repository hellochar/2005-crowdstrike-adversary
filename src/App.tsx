import React, { useCallback, useEffect, useRef, useState } from "react";
import { DropEvent, FileRejection, useDropzone } from "react-dropzone";
import {
  AmbientLight,
  Color,
  DirectionalLight,
  DoubleSide,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Texture,
  TextureLoader,
  WebGLRenderer
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import "./App.css";

function App() {
  const [img, setImage] = useState<HTMLImageElement>();
  return (
    <div className="App">
      <AdversaryRendering img={img} />
      <ImageDropzone onGotImage={setImage} />
    </div>
  );
}

const ImageDropzone: React.FC<{
  onGotImage: (img: HTMLImageElement) => void;
}> = ({ onGotImage }) => {
  const onDrop = useCallback(
    (files: File[], rejected: FileRejection[], event: DropEvent) => {
      files.forEach((file) => {
        const reader = new FileReader();

        reader.onabort = () => console.log("file reading was aborted");
        reader.onerror = () => console.log("file reading has failed");
        reader.onload = () => {
          const img = document.createElement("img");
          img.src = reader.result as string;
          onGotImage(img);
        };
        reader.readAsDataURL(file);
      });
    },
    [onGotImage]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
  });

  return (
    <div className="dropzone" {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
        <p>Drag 'n' drop some files here, or click to select files</p>
      )}
    </div>
  );
};

const AdversaryRendering = ({ img }: { img: HTMLImageElement | undefined }) => {
  const driver = useRef<AdversaryDriver>();
  const handleRef = React.useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas != null) {
      driver.current = new AdversaryDriver(canvas);
    }
  }, []);
  useEffect(() => {
    if (driver.current != null && img != null) {
      driver.current.setImage(img);
    }
  }, [img]);
  return <canvas ref={handleRef}></canvas>;
};

class AdversaryDriver {
  public renderer: WebGLRenderer;
  public scene: Scene;
  public camera: PerspectiveCamera;
  controls: OrbitControls;
  adversary?: Mesh;
  adversaryMaterial?: MeshStandardMaterial;
  timeStarted = 0;
  geom = new PlaneGeometry(200, 200, 512, 512);
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

    this.scene.add(new AmbientLight(0x404040));
    const directionalLight = new DirectionalLight(0xb2b3a1, 2);
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

  private recreateAdversary(texture: Texture) {
    if (this.adversary != null) {
      this.scene.remove(this.adversary);
      this.adversaryMaterial?.dispose();
    }
    this.adversaryMaterial = new MeshStandardMaterial({
      side: DoubleSide,
      map: texture,
      displacementMap: texture,
      displacementScale: 0,
      // displacementScale: 50,
      // bumpMap: texture,
      roughness: 0.5,
      metalness: 0.0,
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
      "adversaries/Buffalo.jpg",
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

function smoothstep(edge0: number, edge1: number, x: number) {
  // Scale, bias and saturate x to 0..1 range
  x = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  // Evaluate polynomial
  return x * x * (3 - 2 * x);
}

export default App;
