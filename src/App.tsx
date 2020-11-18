import React, { useState } from "react";
import DatGui, {
  DatBoolean,
  DatColor,
  DatFolder,
  DatNumber
} from "react-dat-gui";
import "react-dat-gui/dist/index.css";
import { AdversaryRendering } from "./AdversaryRendering";
import "./App.css";
import { ImageDropzone } from "./ImageDropzone";

export interface GUIState {
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
        <DatColor path="background" label="Background" />
        <DatColor path="ambientLight" label="Ambient Light" />
        <DatColor path="directionalLight" label="Directional Light" />
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
