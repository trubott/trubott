"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Zap, User } from "lucide-react";

// Dynamically import face-api to avoid SSR issues and bloat
let faceapi: any = null;

type Props = {
  nonce?: string;
  exp?: number;
  sig?: string;
  method?: string;
  onSuccess?: () => void;
};

type CheckState =
  | { kind: "idle" }
  | { kind: "loading_session" }
  | { kind: "loading_model" }
  | { kind: "running"; presenceFrac: number; blink: boolean; yaw: boolean; age?: number; gender?: string }
  | { kind: "submitting" }
  | { kind: "passed" }
  | { kind: "error"; message: string };

const PRESENCE_TARGET_MS = 3_000;
const BLINK_THRESHOLD = 0.5;
const YAW_THRESHOLD_DEG = 10;

const MEDIAPIPE_VERSION = "0.10.18";
const WASM_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export function FaceCheckClient({ 
  nonce: initialNonce, 
  exp: initialExp, 
  sig: initialSig, 
  method: initialMethod,
  onSuccess,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<CheckState>({ kind: "idle" });
  const [estimates, setEstimates] = useState<{ age: number; gender: string } | null>(null);
  
  const [session, setSession] = useState<{ nonce: string, exp: number, sig: string, method: string } | null>(
    initialNonce && initialExp && initialSig && initialMethod 
    ? { nonce: initialNonce, exp: initialExp, sig: initialSig, method: initialMethod }
    : null
  );

  const router = useRouter();

  useEffect(() => () => cleanupRef.current?.(), []);

  const loadSession = useCallback(async () => {
    setState({ kind: "loading_session" });
    try {
      const res = await fetch("/api/face/session");
      if (!res.ok) throw new Error("Could not initialize secure session");
      const data = await res.json();
      setSession(data);
      setState({ kind: "idle" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Session failed" });
    }
  }, []);

  useEffect(() => {
    if (!session && state.kind !== "error") {
      loadSession();
    }
  }, [session, loadSession, state.kind]);

  async function start() {
    if (!session) return;
    if (state.kind === "running" || state.kind === "submitting") return;
    
    setState({ kind: "loading_model" });
    try {
      // Load MediaPipe
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "VIDEO",
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        numFaces: 1,
      });

      // Load face-api.js for Age/Gender
      if (!faceapi) {
        faceapi = await import("@vladmandic/face-api");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.ageGenderNet.loadFromUri("/models")
        ]);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) throw new Error("video element gone");
      video.srcObject = stream;
      await video.play();

      let presenceStart: number | null = null;
      let blinkSeen = false;
      let yawSeen = false;
      let stopped = false;
      let lastEstimationT = 0;
      let currentAge: number | undefined;
      let currentGender: string | undefined;

      const stopAll = () => {
        if (stopped) return;
        stopped = true;
        stream.getTracks().forEach((t) => t.stop());
        landmarker.close();
      };
      cleanupRef.current = stopAll;

      setState({ kind: "running", presenceFrac: 0, blink: false, yaw: false });

      const loop = async () => {
        if (stopped) return;
        const t = performance.now();
        
        // MediaPipe Liveness
        const result = landmarker.detectForVideo(video, t);
        const present = result.faceLandmarks.length > 0;

        if (present) {
          presenceStart = presenceStart ?? t;
          const blendshapes = result.faceBlendshapes[0]?.categories ?? [];
          const eyeL = blendshapes.find((b) => b.categoryName === "eyeBlinkLeft")?.score ?? 0;
          const eyeR = blendshapes.find((b) => b.categoryName === "eyeBlinkRight")?.score ?? 0;
          if ((eyeL + eyeR) / 2 > BLINK_THRESHOLD) blinkSeen = true;

          const mat = result.facialTransformationMatrixes[0]?.data as number[] | Float32Array | undefined;
          if (mat) {
            const r20 = mat[8] ?? 0;
            const r22 = mat[10] ?? 0;
            const yawDeg = (Math.atan2(-r20, r22) * 180) / Math.PI;
            if (Math.abs(yawDeg) > YAW_THRESHOLD_DEG) yawSeen = true;
          }

          // Age/Gender estimation every 1.5s to avoid heavy load
          if (t - lastEstimationT > 1500) {
            lastEstimationT = t;
            try {
              const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withAgeAndGender();
              if (detection) {
                currentAge = Math.round(detection.age);
                currentGender = detection.gender;
                setEstimates({ age: currentAge!, gender: currentGender! });
              }
            } catch (e) {
              console.warn("FaceAPI estimation failed", e);
            }
          }

          const presenceMs = t - presenceStart;
          setState({
            kind: "running",
            presenceFrac: Math.min(1, presenceMs / PRESENCE_TARGET_MS),
            blink: blinkSeen,
            yaw: yawSeen,
            age: currentAge,
            gender: currentGender
          });

          if (presenceMs >= PRESENCE_TARGET_MS && blinkSeen && yawSeen) {
            stopAll();
            await submit(currentAge, currentGender);
            return;
          }
        } else {
          presenceStart = null;
        }

        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Camera access denied." });
    }
  }

  async function submit(age?: number, gender?: string) {
    if (!session) return;
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/face/attest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...session,
          method: "mediapipe-blink-yaw-v1",
          ageMin: age ? Math.max(0, age - 5) : undefined,
          ageMax: age ? age + 5 : undefined,
          genderEstimate: gender
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setState({ kind: "passed" });
      setTimeout(() => router.refresh(), 250);
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Submit failed" });
    }
  }

  if (state.kind === "passed") {
    return (
      <div className="p-8 text-center animate-in fade-in duration-500">
        <div className="mx-auto h-12 w-12 bg-green-500 text-white rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={24} />
        </div>
        <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Biometric Passed</h2>
        <p className="mt-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest">Verified</p>
        
        {estimates && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Age Est.</span>
              <span className="text-xs font-black text-slate-900 uppercase">{estimates.age}y</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Gender</span>
              <span className="text-xs font-black text-slate-900 uppercase">{estimates.gender}</span>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (onSuccess) {
              onSuccess();
              return;
            }
            window.location.href = "/dashboard";
          }}
          className="mt-8 inline-flex h-11 items-center justify-center bg-slate-900 px-8 text-[10px] font-black text-white uppercase tracking-widest transition-all hover:bg-slate-800"
        >
          Go To Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="relative aspect-[4/3] w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 shadow-xl group">
        <video
          ref={videoRef}
          className="h-full w-full -scale-x-100 object-cover"
          autoPlay
          muted
          playsInline
        />
        
        {state.kind !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-8 text-center text-white">
            <div className="h-12 w-12 bg-white/10 flex items-center justify-center rounded-xl mb-4">
              {state.kind === "loading_session" || state.kind === "loading_model" || state.kind === "submitting" ? (
                <Loader2 size={24} className="animate-spin text-blue-400" />
              ) : (
                <Camera size={24} />
              )}
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">
              {state.kind === "loading_session" && "Securing..."}
              {state.kind === "loading_model" && "Initializing AI..."}
              {state.kind === "submitting" && "Finalizing..."}
              {state.kind === "idle" && "Ready for scan"}
            </h3>
          </div>
        )}

        {state.kind === "running" && (
          <div className="absolute top-0 left-0 right-0 p-4">
             <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300" 
                  style={{ width: `${state.presenceFrac * 100}%` }}
                />
             </div>
             
             {/* Live Estimates Overlay */}
             {(state.age || state.gender) && (
               <div className="mt-4 flex gap-2 animate-in slide-in-from-top-2">
                 {state.age && (
                   <div className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg border border-white/20 flex items-center gap-1.5 shadow-lg">
                     <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Age</span>
                     <span className="text-[10px] font-black text-slate-900">{state.age}</span>
                   </div>
                 )}
                 {state.gender && (
                   <div className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg border border-white/20 flex items-center gap-1.5 shadow-lg">
                     <User size={10} className="text-blue-500" />
                     <span className="text-[10px] font-black text-slate-900 uppercase">{state.gender}</span>
                   </div>
                 )}
               </div>
             )}
          </div>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {state.kind === "running" ? (
          <div className="grid grid-cols-2 gap-2">
            <Badge done={state.blink} label="Blink" />
            <Badge done={state.yaw} label="Rotation" />
          </div>
        ) : state.kind === "idle" ? (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={start}
              className="w-full h-12 bg-blue-600 rounded-xl text-white font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:translate-y-0.5"
            >
              <Camera size={16} />
              START SCAN
            </button>
            <div className="flex items-center justify-center gap-6 text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em]">
              <div className="flex items-center gap-2"><ShieldCheck size={10} className="text-blue-500" /> Encrypted</div>
              <div className="flex items-center gap-2"><Zap size={10} className="text-blue-500" /> Real-time</div>
            </div>
          </div>
        ) : null}
      </div>

      {state.kind === "error" && (
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4">
          <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-black text-red-900 text-[9px] uppercase tracking-widest leading-none">Sensor Error</h4>
            <p className="text-[9px] text-red-600 mt-2 uppercase tracking-wider font-bold leading-relaxed">{state.message}</p>
            <button 
              onClick={() => { setSession(null); setState({ kind: "idle" }); }}
              className="mt-4 text-[8px] font-black text-red-700 uppercase tracking-[0.2em] underline underline-offset-4"
            >
              Reset Sensors
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ done, label }: { done: boolean; label: string }) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all duration-300 ${
        done
          ? "bg-green-50/70 border-green-200 text-green-700 shadow-sm"
          : "bg-slate-50/70 border-slate-200 text-slate-500"
      }`}
    >
      <span className="text-[12px] sm:text-[13px] font-black uppercase tracking-[0.18em]">{label}</span>
      <div className={`h-6 w-6 flex items-center justify-center ${done ? 'text-green-600' : 'text-slate-300'}`}>
        {done ? <CheckCircle2 size={16} /> : <div className="h-1.5 w-1.5 bg-current rounded-full" />}
      </div>
    </div>
  );
}
