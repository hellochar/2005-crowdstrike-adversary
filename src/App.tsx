import React, { useCallback, useEffect, useState } from "react";
import DatGui, {
  DatBoolean,
  DatButton,
  DatColor,
  DatFolder,
  DatNumber,

  DatString
} from "react-dat-gui";
import "react-dat-gui/dist/index.css";
import { AdversaryRendering, DRIVER } from "./AdversaryRendering";
import "./App.css";
import { ImageDropzone } from "./ImageDropzone";

export interface GUIState {
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
  breatheWaviness: number;
  breatheSpeed: number;
  breatheWholeBodyMovement: number;
  breatheTallPointExaggeration: number;
  breatheNoiseSpeed: number;
  breatheNoiseAmount: number;
}

export const STATE: GUIState = {
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
  breatheWaviness: 2.2,
  breatheSpeed: 1.0,
  breatheWholeBodyMovement: 2.0,
  breatheTallPointExaggeration: 20,
  breatheNoiseSpeed: 0.2,
  breatheNoiseAmount: 4,
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
        <DatColor path="background" label="Background" />
        <DatNumber
          path="growLength"
          label="Grow Length"
          min={0}
          max={500}
          step={5}
        />
        <DatFolder closed={true} title="Postprocessing">
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
        <DatFolder closed={true} title="Parallax">
          <DatBoolean path="parallaxEnabled" label="Parallax Enabled?" />
          <DatNumber path="parallaxIntensity" label="Intensity" min={0} max={2} step={0.01} />
          <DatBoolean path="parallaxRespondsToMouseMovement" label="Returns to 0?" />
          <DatNumber path="parallaxReturnSpeed" label="Return to 0 Speed" min={0} max={6} step={0.1} />
        </DatFolder>
        <DatFolder closed={true} title={"Gradient"}>
          <DatBoolean path="gradientEnabled" label="Gradient Enabled?" />
          <DatString path="gradient" label="Gradient" />
          <DatBoolean path="gradientTransparency" label="Transparency?" />
        </DatFolder>
        <DatFolder title="Breathe" closed={true}>
            <DatNumber label="Speed" path="breatheSpeed" min={0} max={5} step={0.01} />
            <DatNumber label="Tall Point Exaggeration" path="breatheTallPointExaggeration" min={-100} max={100} step={1} />
            <DatNumber label="Waviness" path="breatheWaviness" min={0} max={15} step={0.1} />
            <DatNumber label="Whole Body Motion" path="breatheWholeBodyMovement" min={-20} max={20} step={0.01} />
            <DatNumber label="Noise Speed" path="breatheNoiseSpeed" min={0} max={2} step={0.01} />
            <DatNumber label="Noise Amount" path="breatheNoiseAmount" min={0} max={10} step={0.01} />
        </DatFolder>
        <DatButton label="Go to Frontal View" onClick={handleCameraFrontalView} />
        <DatButton label="Go to Diagonal View" onClick={handleCameraDiagonalView} />
      </DatGui>
    </div>
  );
}

export default App;
