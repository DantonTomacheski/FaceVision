import { useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";

export function useWebcam() {
  const webcamRef = useRef<HTMLVideoElement>(null);
  const { webcamState, webcamError, initWebcam, setWebcamRef } = useAppStore();

  useEffect(() => {
    if (webcamRef.current) {
      setWebcamRef(webcamRef as React.RefObject<HTMLVideoElement>);
    }
  }, [setWebcamRef]);

  const startWebcam = async () => {
    try {
      // initWebcam já configura o srcObject no store
      await initWebcam();
      console.log("Webcam initialized successfully");
    } catch (error) {
      console.error("Error starting webcam:", error);
    }
  };

  return {
    webcamRef,
    webcamState,
    webcamError,
    startWebcam,
  };
}
