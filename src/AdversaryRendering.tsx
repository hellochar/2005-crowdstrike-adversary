import React, { useEffect, useRef } from "react";
import { AdversaryDriver } from "./AdversaryDriver";

export const AdversaryRendering = ({ img }: { img: HTMLImageElement | undefined; }) => {
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
