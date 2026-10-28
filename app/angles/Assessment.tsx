"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, CircleStop, Pause, Play, RotateCcw, Video } from "lucide-react";
import { analyzePose, saveResult, SquatCounter, type Point, type Result } from "@/lib/angles/assessment";

type Snapshot = { reps: number; left: number | null; right: number | null; phase: string; reliable: boolean };
const blank: Snapshot = { reps: 0, left: null, right: null, phase: "Ready when you are", reliable: false };
const edges = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,31],[28,32]];

export default function Assessment({ owner, workout, onSaved, onDirty }: {
  owner: string | null; workout: boolean; onSaved: () => void; onDirty: (dirty: boolean) => void;
}) {
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const worker = useRef<Worker | null>(null), stream = useRef<MediaStream | null>(null);
  const generation = useRef(0), epoch = useRef(0), frame = useRef(0), inFlight = useRef(false), pausedRef = useRef(false);
  const counter = useRef(new SquatCounter());
  const draft = useRef({ id: "", startedAt: 0, samples: 0, min: 180, max: 0, finished: null as Result | null });
  const [initialOwner] = useState(owner);
  const [snapshot, setSnapshot] = useState(blank);
  const [source, setSource] = useState<"camera" | "demo" | null>(null);
  const [busy, setBusy] = useState(false), [running, setRunning] = useState(false), [paused, setPaused] = useState(false);
  const [message, setMessage] = useState("");
  const [hasSamples, setHasSamples] = useState(false), [finished, setFinished] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");

  function stop() {
    generation.current++; epoch.current++; cancelAnimationFrame(frame.current);
    worker.current?.terminate(); worker.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    video.current?.pause();
    if (video.current) { video.current.srcObject = null; video.current.removeAttribute("src"); video.current.load(); }
    inFlight.current = false;
  }
  useEffect(() => () => { stop(); }, []);
  useEffect(() => {
    function interrupt() {
      if (document.hidden) { pausedRef.current = true; epoch.current++; counter.current.invalidate(); setPaused(true); video.current?.pause(); }
    }
    function unload(event: BeforeUnloadEvent) { if (draft.current.samples && !draft.current.finished) { event.preventDefault(); event.returnValue = ""; } }
    document.addEventListener("visibilitychange", interrupt);
    window.addEventListener("beforeunload", unload);
    return () => { document.removeEventListener("visibilitychange", interrupt); window.removeEventListener("beforeunload", unload); };
  }, []);
  useEffect(() => {
    if (owner !== initialOwner) { pausedRef.current = true; epoch.current++; counter.current.invalidate(); const frame = requestAnimationFrame(() => setPaused(true)); return () => cancelAnimationFrame(frame); }
  }, [owner, initialOwner]);

  async function start(nextSource: "camera" | "demo") {
    stop(); const token = generation.current;
    setBusy(true); setMessage(""); setSnapshot(blank); setPaused(false); pausedRef.current = false;
    counter.current = new SquatCounter();
    draft.current = { id: crypto.randomUUID(), startedAt: Date.now(), samples: 0, min: 180, max: 0, finished: null };
    onDirty(false); setHasSamples(false); setFinished(false); setSource(nextSource);
    try {
      const element = video.current!;
      if (nextSource === "camera") {
        if (!navigator.mediaDevices?.getUserMedia) throw Error("Camera access requires localhost or HTTPS and a supported browser.");
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
        if (generation.current !== token) { media.getTracks().forEach(track => track.stop()); return; }
        stream.current = media; element.srcObject = media;
        media.getVideoTracks()[0].onended = () => { if (generation.current === token) { stop(); setRunning(false); setMessage("Camera disconnected. Your captured result is still available to save."); } };
      } else { element.src = "/angles-assets/assessment_bodyweight_squat.mp4"; element.loop = true; }
      await element.play();
      if (generation.current !== token) return;
      const detector = new Worker("/angles-assets/pose-worker.js"); worker.current = detector;
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(Error("The pose model took too long to load. Try again.")), 30000);
        detector.onerror = () => { clearTimeout(timeout); reject(Error("The pose worker could not start. Try another browser.")); };
        detector.onmessage = ({ data }) => {
          if (data.type === "ready") { clearTimeout(timeout); resolve(); }
          if (data.type === "error") { clearTimeout(timeout); reject(Error("The pose model could not load. Try again.")); }
        };
        detector.postMessage({ type: "init" });
      });
      if (generation.current !== token) { detector.terminate(); return; }
      detector.onmessage = ({ data }: MessageEvent<{ type: string; points: Point[]; time: number; epoch: number; width: number; height: number }>) => {
        inFlight.current = false;
        if (generation.current !== token) return;
        if (data.type === "error") { stop(); setRunning(false); setMessage("Tracking stopped unexpectedly. Captured results are preserved; save them or restart."); return; }
        if (data.type !== "pose" || pausedRef.current || data.epoch !== epoch.current || draft.current.finished) return;
        const { reliable, left, right } = analyzePose(data.points, data.width, data.height);
        counter.current.update(reliable ? (left! + right!) / 2 : null, reliable, data.time);
        if (reliable && nextSource === "camera") {
          draft.current.samples++; setHasSamples(true);
          draft.current.min = Math.min(draft.current.min, Math.round(left!), Math.round(right!));
          draft.current.max = Math.max(draft.current.max, Math.round(left!), Math.round(right!));
          onDirty(true);
        }
        setSnapshot({ reps: counter.current.reps, reliable, left: reliable ? Math.round(left!) : null,
          right: reliable ? Math.round(right!) : null, phase: reliable ? counter.current.phase : "Step back · keep your full body visible" });
        const surface = canvas.current!;
        surface.width = data.width; surface.height = data.height;
        const ctx = surface.getContext("2d")!; ctx.clearRect(0, 0, surface.width, surface.height);
        ctx.strokeStyle = reliable ? "#74e8cb" : "#ffc660"; ctx.lineWidth = 3;
        for (const [a, b] of edges) {
          const p = data.points[a], q = data.points[b]; if (!p || !q || (p.visibility ?? 0) < 0.5 || (q.visibility ?? 0) < 0.5) continue;
          ctx.beginPath(); ctx.moveTo(p.x * surface.width, p.y * surface.height); ctx.lineTo(q.x * surface.width, q.y * surface.height); ctx.stroke();
        }
      };
      detector.onerror = () => { if (generation.current === token) { stop(); setRunning(false); setMessage("Tracking could not continue. Captured results are preserved."); } };
      let previous = -1, lastSent = 0;
      const tick = async (now: number) => {
        if (generation.current !== token) return;
        frame.current = requestAnimationFrame(tick);
        if (pausedRef.current || inFlight.current || element.readyState < 2 || previous === element.currentTime || now - lastSent < 80) return;
        previous = element.currentTime; lastSent = now; inFlight.current = true;
        try {
          const image = await createImageBitmap(element);
          if (generation.current !== token || pausedRef.current) { image.close(); inFlight.current = false; return; }
          detector.postMessage({ type: "frame", image, time: now, epoch: epoch.current }, [image]);
        } catch { inFlight.current = false; if (generation.current === token) { stop(); setRunning(false); setMessage("Camera frames could not be processed. Try again."); } }
      };
      setRunning(true); frame.current = requestAnimationFrame(tick);
    } catch (error) {
      if (generation.current === token) { stop(); setRunning(false); setMessage(error instanceof Error ? error.message : "Camera could not start."); }
    } finally { if (generation.current === token || generation.current === token + 1) setBusy(false); }
  }
  function togglePause() {
    pausedRef.current = !pausedRef.current; epoch.current++; counter.current.invalidate(); setPaused(pausedRef.current);
    if (pausedRef.current) video.current?.pause(); else video.current?.play().catch(() => setMessage("Press Resume again to restart playback."));
  }
  function finish() {
    if (source === "demo") return;
    if (owner !== initialOwner) { setMessage("Return to the account that started this assessment before saving."); return; }
    if (!draft.current.samples) { setMessage("Capture a reliable full-body pose before saving a result."); return; }
    pausedRef.current = true; setPaused(true);
    const result = draft.current.finished ?? { id: draft.current.id, startedAt: draft.current.startedAt, completedAt: Date.now(),
      mode: workout ? "Workout" : "Assessment", reps: counter.current.reps, minKneeAngle: draft.current.min,
      maxKneeAngle: draft.current.max, reliableSamples: draft.current.samples } satisfies Result;
    draft.current.finished = result; setFinished(true);
    stop(); setRunning(false);
    try { saveResult(localStorage, initialOwner, result); onDirty(false); onSaved(); }
    catch { setMessage("History could not be saved. Your result is still here—free browser storage and retry Finish & save."); }
  }

  return <section className="an-workspace">
    <div className="an-section-heading"><div><span className="an-eyebrow">{workout ? "Your workout" : "Free assessment"}</span><h1>Bodyweight squat<span>.</span></h1></div><span className="an-chip"><span className="an-dot" /> On-device vision</span></div>
    <div className="an-assessment-grid"><div className="an-camera-stage">
      <video ref={video} muted playsInline className={source === "camera" && facing === "user" ? "an-mirrored" : ""} aria-label={source === "demo" ? "Exercise demonstration analysis" : "Live camera preview"} />
      <canvas ref={canvas} className={source === "camera" && facing === "user" ? "an-mirrored" : ""} aria-hidden="true" />
      {!running && !busy && <div className="an-camera-empty"><Camera size={42} /><h2>Your movement, in view.</h2><p>Keep your shoulders, hips, knees and feet visible. Stand tall to begin.</p></div>}
      {busy && <div className="an-camera-empty" role="status"><span className="an-spinner" /><p>Preparing your camera and pose model…</p></div>}
      {running && <div className="an-camera-status"><span className={snapshot.reliable ? "an-dot" : "an-dot an-amber"} />{source === "demo" ? "DEMO · not your assessment" : paused ? "Paused" : snapshot.phase}</div>}
    </div><aside className="an-assessment-panel"><span className="an-eyebrow">Movement signals</span>
      <div className="an-rep"><strong>{snapshot.reps.toString().padStart(2, "0")}</strong><span>repetitions</span></div>
      <div className="an-metrics"><div><small>LEFT KNEE</small><strong>{snapshot.left === null ? "—" : `${snapshot.left}°`}</strong></div><div><small>RIGHT KNEE</small><strong>{snapshot.right === null ? "—" : `${snapshot.right}°`}</strong></div></div>
      <p className="an-phase" role="status">{owner !== initialOwner ? "Account changed · session paused" : paused ? "Session paused" : snapshot.phase}</p>
      {!running && !hasSamples && <><label className="an-field">Camera<select value={facing} onChange={e => setFacing(e.target.value as "user" | "environment")} disabled={busy}><option value="user">Front camera</option><option value="environment">Rear camera</option></select></label><button className="an-primary" disabled={busy || owner !== initialOwner} onClick={() => start("camera")}><Camera size={18} /> Enable camera</button><button className="an-secondary" disabled={busy || owner !== initialOwner} onClick={() => start("demo")}><Video size={18} /> Test with exercise video</button></>}
      {running && <button className="an-secondary" onClick={togglePause} disabled={owner !== initialOwner || finished}>{paused ? <Play size={18} /> : <Pause size={18} />}{paused ? "Resume" : "Pause"}</button>}
      {source !== "demo" && <button className="an-primary" onClick={finish} disabled={busy || owner !== initialOwner || !hasSamples}><Check size={18} /> Finish & save</button>}
      {(running || hasSamples) && <button className="an-text-button" onClick={() => { if (draft.current.samples && !window.confirm("Discard this unsaved result and restart?")) return; start(source ?? "camera"); }} disabled={busy || owner !== initialOwner}><RotateCcw size={15} /> Restart</button>}
      {source === "demo" && <button className="an-text-button" onClick={() => { stop(); setRunning(false); setSource(null); }}><CircleStop size={16} /> Stop demo</button>}
      {message && <p className="an-notice" role="alert">{message}</p>}
      <p className="an-fine-print">Experimental image-space estimates. Not a clinical measurement. Frames stay on this device; only completed summaries can sync to your account.</p>
    </aside></div>
  </section>;
}
