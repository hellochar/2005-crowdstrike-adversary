import React, { useState } from "react";
import DatGui, {
  DatBoolean,
  DatColor,
  DatFolder,
  DatNumber,
  DatSelect
} from "react-dat-gui";
import "react-dat-gui/dist/index.css";
import { AdversaryRendering } from "./AdversaryRendering";
import "./App.css";
import { ImageDropzone } from "./ImageDropzone";

export interface GUIState {
  mode: "heightmap" | "particles";
  background: string;
  ambientLight: string;
  directionalLight: string;
  duoToneLight: string;
  duoToneDark: string;
  duoToneEnabled: boolean;
  growLength: number;
}

function App() {
  const [img, setImage] = useState<HTMLImageElement>();
  const [state, setState] = useState<GUIState>({
    mode: "heightmap",
    background: "#ffffff",
    growLength: 50,
    ambientLight: "#535353",
    directionalLight: "#d2d2d2",
    duoToneEnabled: true,
    duoToneLight: "#317671",
    duoToneDark: "#772E49",
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
        <DatFolder closed={false} title={"Duo Tone"}>
          <DatBoolean path="duoToneEnabled" label="Duo Tone Enabled?" />
          <DatColor path="duoToneLight" label="Duo Tone Light" />
          <DatColor path="duoToneDark" label="Duo Tone Dark" />
        </DatFolder>
      </DatGui>
    </div>
  );
}

export default App;
