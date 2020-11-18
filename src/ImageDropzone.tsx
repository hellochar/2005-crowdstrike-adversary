import React, { useCallback } from "react";
import { DropEvent, FileRejection, useDropzone } from "react-dropzone";

export const ImageDropzone: React.FC<{
  onGotImage: (img: HTMLImageElement) => void;
}> = ({ onGotImage }) => {
  const onDrop = useCallback(
    (files: File[], rejected: FileRejection[], event: DropEvent) => {
      files.forEach((file) => {
        const reader = new FileReader();

        reader.onabort = () => console.log("file reading was aborted");
        reader.onerror = () => console.log("file reading has failed");
        reader.onload = () => {
          const img = document.createElement("img");
          img.src = reader.result as string;
          onGotImage(img);
        };
        reader.readAsDataURL(file);
      });
    },
    [onGotImage]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
  });

  return (
    <div className="dropzone" {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
          <p>Drag 'n' drop some files here, or click to select files</p>
        )}
    </div>
  );
};
