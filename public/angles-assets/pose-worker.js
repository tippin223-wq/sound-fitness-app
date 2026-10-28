/* MediaPipe 1.2.0 runs here so inference does not block the interface. No frames leave this worker. */
importScripts("/angles-assets/vision_bundle.js");
let detector;
self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      const files = await Vision.FilesetResolver.forVisionTasks("/angles-assets/wasm");
      detector = await Vision.PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: "/angles-assets/pose_landmarker_lite.task", delegate: "CPU" },
        runningMode: "VIDEO", numPoses: 1, minPoseDetectionConfidence: 0.6,
        minPosePresenceConfidence: 0.6, minTrackingConfidence: 0.6, outputSegmentationMasks: false,
      });
      self.postMessage({ type: "ready" });
    } catch (error) { self.postMessage({ type: "error", message: String(error) }); }
    return;
  }
  if (data.type === "frame") {
    try {
      const result = detector.detectForVideo(data.image, data.time);
      self.postMessage({ type: "pose", points: result.landmarks[0] ?? [], time: data.time, epoch: data.epoch,
        width: data.image.width, height: data.image.height });
    } catch (error) { self.postMessage({ type: "error", message: String(error) }); }
    finally { data.image.close(); }
  }
};
