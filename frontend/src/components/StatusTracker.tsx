"use client";

import { useEffect, useState } from "react";
import PipelineVisualizer from "./PipelineVisualizer";

interface StatusTrackerProps {
  jobId: string | null;
  onComplete: () => void;
  onError: (msg: string) => void;
}

const STEPS = [
  { key: "extracting_audio", label: "Extracting Audio" },
  { key: "transcribing", label: "Transcribing" },
  { key: "transliterating", label: "Transliterating" },
  { key: "rendering", label: "Rendering" },
  { key: "completed", label: "Complete" },
];

export default function StatusTracker({ jobId, onComplete, onError }: StatusTrackerProps) {
  const [status, setStatus] = useState<string>("pending");
  const [stepLabel, setStepLabel] = useState<string>("Queued...");

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/status/${jobId}`);
        const data = await res.json();
        setStatus(data.status);
        setStepLabel(data.step_label);

        if (data.status === "completed") {
          clearInterval(interval);
          onComplete();
        } else if (data.status === "error") {
          clearInterval(interval);
          onError(data.error || "Unknown error");
        }
      } catch {
        // Silently retry
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, onComplete, onError]);

  const currentStepIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="w-full animate-fade-in">
      <div className="border border-border rounded-2xl bg-surface p-6">
        {/* Current step label */}
        <div className="flex items-center gap-3 mb-6">
          {status !== "completed" && status !== "error" && (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
          )}
          {status === "completed" && (
            <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
          {status === "error" && (
            <div className="w-5 h-5 rounded-full bg-error flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
          )}
          <span className="text-sm font-medium">{stepLabel}</span>
        </div>

        {/* Step progress */}
        <div className="flex gap-2">
          {STEPS.map((step, i) => {
            const isActive = step.key === status;
            const isDone = currentStepIndex > i || status === "completed";

            return (
              <div key={step.key} className="flex-1 flex flex-col gap-2">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${
                    isDone
                      ? "bg-white"
                      : isActive
                        ? "bg-white/60 animate-shimmer"
                        : "bg-border"
                  }`}
                />
                <span
                  className={`text-[10px] transition-colors ${
                    isDone || isActive ? "text-foreground" : "text-muted/40"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Pipeline Visualizer Sub-component */}
        <PipelineVisualizer jobId={jobId} status={status} />
      </div>
    </div>
  );
}
