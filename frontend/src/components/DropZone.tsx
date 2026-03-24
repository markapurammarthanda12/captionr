"use client";

import { useState, useRef, useCallback } from "react";

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function DropZone({ onFileSelected, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".mp4")) {
        alert("Please upload an .mp4 file.");
        return;
      }
      setFileName(file.name);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      id="drop-zone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`
        relative w-full rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        ${isDragging
          ? "border-white bg-accent-dim scale-[1.01]"
          : fileName
            ? "border-border bg-surface"
            : "border-border hover:border-border-hover animate-pulse-border"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp4"
        onChange={handleChange}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center py-16 px-6">
        {fileName ? (
          <>
            {/* File selected state */}
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-border flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">{fileName}</p>
            <p className="text-xs text-muted mt-1">Ready to process</p>
          </>
        ) : (
          <>
            {/* Empty state */}
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-border flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">
              Drop your video here
            </p>
            <p className="text-xs text-muted mt-1">
              or click to browse · .mp4 only
            </p>
          </>
        )}
      </div>
    </div>
  );
}
