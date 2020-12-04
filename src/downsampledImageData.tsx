
export function downsampledImageData(image: HTMLImageElement, width: number) {
  var canvas = document.createElement("canvas");
  const height = (image.height / image.width) * width;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  return { canvas, imageData };
}
