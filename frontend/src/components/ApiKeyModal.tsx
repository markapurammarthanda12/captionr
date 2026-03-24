"use client";

import { useState, useEffect } from "react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("groq_api_key") || "";
      setApiKey(stored);
      setSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem("groq_api_key", apiKey.trim());
    setSaved(true);
    setTimeout(() => onClose(), 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 border border-border rounded-2xl bg-surface p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <label className="block mb-2 text-sm text-muted">Groq API Key</label>
        <input
          id="api-key-input"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="gsk_..."
          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-border-hover transition-colors"
        />
        <p className="mt-2 text-xs text-muted">
          Your key is stored locally and never persisted on the server.
        </p>

        <button
          id="save-api-key"
          onClick={handleSave}
          disabled={!apiKey.trim()}
          className={`mt-6 w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
            ${saved
              ? "bg-success/10 text-success border border-success/20"
              : apiKey.trim()
                ? "bg-white text-black hover:bg-white/90"
                : "bg-border text-muted cursor-not-allowed"
            }`}
        >
          {saved ? "✓ Saved" : "Save Key"}
        </button>
      </div>
    </div>
  );
}
