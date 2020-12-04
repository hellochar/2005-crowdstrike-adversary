import {
  CanvasTexture,











  Texture
} from "three";
import { downsampledImageData } from "./downsampledImageData";


export function createDisplacementMap(source: Texture) {
  const { imageData, canvas } = downsampledImageData(
    source.image as HTMLImageElement,
    256
  );
  var maxBrightness = 0;
  var minBrightness = 1;

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i] / 255,
      g = imageData.data[i + 1] / 255,
      b = imageData.data[i + 2] / 255;
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    maxBrightness = Math.max(brightness, maxBrightness);
    minBrightness = Math.min(brightness, minBrightness);
    imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = brightness;
  }
  // context.putImageData(imageData, 0, 0);
  const texture = new CanvasTexture(canvas);
  return { texture, imageData, maxBrightness, minBrightness };
}
