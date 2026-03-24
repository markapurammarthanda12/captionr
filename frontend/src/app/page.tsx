"use client";

import { useState, useCallback } from "react";
import Header from "@/components/Header";
import ApiKeyModal from "@/components/ApiKeyModal";
import DropZone from "@/components/DropZone";
import StatusTracker from "@/components/StatusTracker";
import DownloadCard from "@/components/DownloadCard";

type AppState = "idle" | "uploading" | "processing" | "completed" | "error";

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleFileSelected = useCallback(async (file: File) => {
    const apiKey = localStorage.getItem("groq_api_key");
    if (!apiKey) {
      setSettingsOpen(true);
      return;
    }

    setAppState("uploading");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("groq_api_key", apiKey);

      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data = await res.json();
      setJobId(data.job_id);
      setAppState("processing");
    } catch (err: any) {
      setAppState("error");
      setErrorMsg(err.message || "Failed to upload video");
    }
  }, []);

  const handleComplete = useCallback(() => {
    setAppState("completed");
  }, []);

  const handleError = useCallback((msg: string) => {
    setAppState("error");
    setErrorMsg(msg);
  }, []);

  const handleReset = () => {
    setAppState("idle");
    setJobId(null);
    setErrorMsg("");
  };

  return (
    <>
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <ApiKeyModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <main className="flex-1 flex items-start justify-center px-6 py-16">
        <div className="w-full max-w-xl flex flex-col gap-6">
          {/* Title */}
          <div className="text-center mb-2 animate-fade-in">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              Caption your videos
            </h1>
            <p className="text-sm text-muted">
              Upload a video, and we'll transcribe, transliterate, and burn captions automatically.
            </p>
          </div>

          {/* Drop Zone */}
          <DropZone
            onFileSelected={handleFileSelected}
            disabled={appState === "uploading" || appState === "processing"}
          />

          {/* Uploading state */}
          {appState === "uploading" && (
            <div className="flex items-center justify-center gap-3 py-4 animate-fade-in">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
              <span className="text-sm text-muted">Uploading...</span>
            </div>
          )}

          {/* Processing status tracker */}
          {(appState === "processing" || appState === "completed") && jobId && (
            <StatusTracker
              jobId={jobId}
              onComplete={handleComplete}
              onError={handleError}
            />
          )}

          {/* Completed download card */}
          {appState === "completed" && jobId && (
            <DownloadCard jobId={jobId} />
          )}

          {/* Error state */}
          {appState === "error" && (
            <div className="border border-error/20 rounded-2xl bg-error/5 p-6 text-center animate-fade-in">
              <p className="text-sm text-error font-medium mb-1">Something went wrong</p>
              <p className="text-xs text-muted">{errorMsg}</p>
            </div>
          )}

          {/* Reset button */}
          {(appState === "completed" || appState === "error") && (
            <button
              id="reset-button"
              onClick={handleReset}
              className="mx-auto px-6 py-2.5 rounded-xl border border-border text-sm text-muted hover:text-foreground hover:border-border-hover transition-all duration-200 cursor-pointer animate-fade-in"
            >
              Process another video
            </button>
          )}

          {/* Footer hint */}
          {appState === "idle" && (
            <p className="text-center text-xs text-muted/40 mt-4 animate-fade-in">
              Make sure to set your Groq API key in Settings before uploading.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
