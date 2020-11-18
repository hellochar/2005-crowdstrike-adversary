import React, { useRef } from "react";
import "react-dat-gui/dist/index.css";
import { TextureLoader } from "three";
import { PixelBleed } from "./PixelBleed";

function AppPixelBleed() {
  const driver = useRef<PixelBleed>();
  const handleRef = React.useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas != null) {
      new TextureLoader().load("/2005-crowdstrike-adversary/tone-mapped-Buffalo.png", (imgTexture) => {
        canvas.width = imgTexture.image.width;
        canvas.height = imgTexture.image.height;
        driver.current = new PixelBleed(canvas, imgTexture);
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div style={{background: "grey", width: "100vw", height: "100vh"}}>
      <canvas ref={handleRef} style={{position: "absolute", "left": "50%", top: "50%", transform: "translate(-50%, -50%)"}}></canvas>
    </div>
  );
}

export default AppPixelBleed;
