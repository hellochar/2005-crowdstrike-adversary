import React, { useState } from "react";
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
  background: string;
  gradient: string;
  gradientEnabled: boolean;
  growLength: number;
  gradientTransparency: boolean;
}

function App() {
  const [img, setImage] = useState<HTMLImageElement>();
  const [state, setState] = useState<GUIState>({
    mode: "heightmap",
    background: "#ffffff",
    growLength: 50,
    gradientEnabled: true,
    gradient: "#131B1D #31474D #FC0000 #ABABAB #FFFFFF",
    gradientTransparency: true,
  });
  return (
    <div className="App">
      <AdversaryRendering img={img} state={state} />
      <ImageDropzone onGotImage={setImage} />
      <DatGui data={state} onUpdate={setState}>
        <DatSelect path="mode" label="Mode" options={["heightmap", "particles"]} />
        <DatColor path="background" label="Background" />
        <DatNumber
          path="growLength"
          label="Grow Length"
          min={0}
          max={999}
          step={10}
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
