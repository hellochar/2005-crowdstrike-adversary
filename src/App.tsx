import React, { useCallback, useEffect, useState } from "react";
import DatGui, {
  DatBoolean,
  DatButton,
  DatColor,
  DatFolder,
  DatNumber,
  DatSelect,
  DatString
} from "react-dat-gui";
import "react-dat-gui/dist/index.css";
import { AdversaryRendering, DRIVER } from "./AdversaryRendering";
import "./App.css";
import { ImageDropzone } from "./ImageDropzone";

export interface GUIState {
  mode: "heightmap" | "particles";
  particleDistortion: "messycircle" | "noiseflow" | "sphere";
  noiseIntensity: number;
  scanlineIntensity: number;
  parallaxEnabled: boolean;
  parallaxRespondsToMouseMovement: boolean;
  parallaxReturnSpeed: number;
  parallaxIntensity: number;
  background: string;
  gradient: string;
  gradientEnabled: boolean;
  growLength: number;
  gradientTransparency: boolean;
}

export const STATE: GUIState = {
  mode: "heightmap",
  particleDistortion: "noiseflow",
  background: "#808080",
  growLength: 50,
  noiseIntensity: 0.25,
  scanlineIntensity: 0.0,
  parallaxEnabled: false,
  parallaxIntensity: 0.5,
  parallaxRespondsToMouseMovement: false,
  parallaxReturnSpeed: 3,
  gradientEnabled: true,
  gradient: "#131B1D #31474D #FC0000 #ABABAB #FFFFFF",
  gradientTransparency: true,
};

function App() {
  const [img, setImage] = useState<HTMLImageElement>();
  const [state, setState] = useState<GUIState>(STATE);
  const [showUI, setShowUI] = useState(true);
  useEffect(() => {
    Object.assign(STATE, state);
  }, [state]);
  useEffect(() => {
    const handleKeyup = (event: KeyboardEvent) => {
      if (event.code === "KeyZ") {
        setShowUI((show) => !show);
      }
    };
    window.addEventListener("keyup", handleKeyup);
    return () => {
      window.removeEventListener("keyup", handleKeyup);
    }
  });
  const handleCameraFrontalView = useCallback(() => {
    DRIVER?.goFrontalView();
  }, []);
  const handleCameraDiagonalView = useCallback(() => {
    DRIVER?.goDiagonalView();
  }, []);
  return (
    <div className={`App${!showUI ? " hide-ui" : ""}`}>
      <AdversaryRendering img={img} state={state} />
      <ImageDropzone onGotImage={setImage} />
      <DatGui data={state} onUpdate={setState}>
        <DatSelect
          path="mode"
          label="Mode"
          options={["heightmap", "particles"]}
        />
        <DatSelect
          path="particleDistortion"
          label="Particle Distortion"
          options={["noiseflow", "sphere", "messycircle"]}
        />
        <DatColor path="background" label="Background" />
        <DatNumber
          path="growLength"
          label="Grow Length"
          min={0}
          max={500}
          step={5}
        />
        <DatFolder closed={false} title="Postprocessing">
          <DatNumber
            path="noiseIntensity"
            label="Noise"
            min={0}
            max={1}
            step={0.01}
          />
          <DatNumber
            path="scanlineIntensity"
            label="Scanlines"
            min={0}
            max={1}
            step={0.01}
          />
        </DatFolder>
        <DatFolder closed={false} title="Parallax">
          <DatBoolean path="parallaxEnabled" label="Parallax Enabled?" />
          <DatNumber path="parallaxIntensity" label="Intensity" min={0} max={2} step={0.01} />
          <DatBoolean path="parallaxRespondsToMouseMovement" label="Returns to 0?" />
          <DatNumber path="parallaxReturnSpeed" label="Return to 0 Speed" min={0} max={6} step={0.1} />
        </DatFolder>
        <DatFolder closed={false} title={"Gradient"}>
          <DatBoolean path="gradientEnabled" label="Gradient Enabled?" />
          <DatString path="gradient" label="Gradient" />
          <DatBoolean path="gradientTransparency" label="Transparency?" />
        </DatFolder>
        <DatButton label="Go to Frontal View" onClick={handleCameraFrontalView} />
        <DatButton label="Go to Diagonal View" onClick={handleCameraDiagonalView} />
      </DatGui>
    </div>
  );
}

export default App;
