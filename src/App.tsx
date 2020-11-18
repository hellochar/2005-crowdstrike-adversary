import React, { useState } from "react";
import { AdversaryRendering } from "./AdversaryRendering";
import "./App.css";
import { ImageDropzone } from "./ImageDropzone";

function App() {
  const [img, setImage] = useState<HTMLImageElement>();
  return (
    <div className="App">
      <AdversaryRendering img={img} />
      <ImageDropzone onGotImage={setImage} />
    </div>
  );
}

export default App;
