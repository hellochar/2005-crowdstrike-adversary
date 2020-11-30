import React, { useEffect, useState } from "react";
import DatGui, {
  DatBoolean,
  DatColor,
  DatFolder,
  DatNumber,
  DatSelect,
  DatString
} from "react-dat-gui";
import "react-dat-gui/dist/index.css";
import { AdversaryRendering } from "./AdversaryRendering";
import "./App.css";
import { ImageDropzone } from "./ImageDropzone";

export interface GUIState {
  mode: "heightmap" | "particles";
  particleDistortion: "messycircle" | "noiseflow" | "sphere";
  noiseIntensity: number;
  scanlineIntensity: number;
  background: string;
  gradient: string;
  gradientEnabled: boolean;
  growLength: number;
  gradientTransparency: boolean;
}

export const STATE: GUIState = {
  mode: "heightmap",
  particleDistortion: "noiseflow",
  background: "#ffffff",
  growLength: 50,
  noiseIntensity: 0.35,
  scanlineIntensity: 0.0,
  gradientEnabled: true,
  gradient: "#131B1D #31474D #FC0000 #ABABAB #FFFFFF",
  gradientTransparency: true,
}

function App() {
  const [img, setImage] = useState<HTMLImageElement>();
  const [state, setState] = useState<GUIState>(STATE);
  useEffect(() => {
    Object.assign(STATE, state);
  }, [state]);
  return (
    <div className="App">
      <AdversaryRendering img={img} state={state} />
      <ImageDropzone onGotImage={setImage} />
      <DatGui data={state} onUpdate={setState}>
        <DatSelect path="mode" label="Mode" options={["heightmap", "particles"]} />
        <DatSelect path="particleDistortion" label="Particle Distortion" options={["noiseflow", "sphere", "messycircle"]} />
        <DatColor path="background" label="Background" />
        <DatNumber
          path="growLength"
          label="Grow Length"
          min={0}
          max={999}
          step={10}
        />
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
        <DatFolder closed={false} title={"Gradient"}>
          <DatBoolean path="gradientEnabled" label="Gradient Enabled?" />
          <DatString path="gradient" label="Gradient" />
          <DatBoolean path="gradientTransparency" label="Transparency?" />
        </DatFolder>
      </DatGui>
    </div>
  );
}

export default App;
