import React, { useEffect, useRef } from "react";
import { AdversaryDriver } from "./AdversaryDriver";
import { GUIState } from "./App";

export const AdversaryRendering = ({ img, state }: { img: HTMLImageElement | undefined; state: GUIState }) => {
  const driver = useRef<AdversaryDriver>();
  const handleRef = React.useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas != null) {
      driver.current = new AdversaryDriver(canvas, state);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (driver.current != null && img != null) {
      driver.current.setImage(img);
    }
  }, [img]);
  useEffect(() => {
    if (driver.current != null) {
      driver.current.setState(state);
    }
  }, [state]);
  return <canvas ref={handleRef}></canvas>;
};
