"use client";

interface DownloadCardProps {
  jobId: string;
}

export default function DownloadCard({ jobId }: DownloadCardProps) {
  const handleDownload = () => {
    window.open(`http://localhost:8000/api/download/${jobId}`, "_blank");
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="border border-border rounded-2xl bg-surface p-6 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>

        <div className="text-center">
          <p className="text-sm font-medium">Your video is ready</p>
          <p className="text-xs text-muted mt-1">Captions have been burned in</p>
        </div>

        <button
          id="download-button"
          onClick={handleDownload}
          className="w-full py-3 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition-all duration-200 cursor-pointer"
        >
          Download Video
        </button>

        <div className="w-full mt-2 pt-4 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground mb-3 font-semibold tracking-wider uppercase text-center">
            NLP Pipeline Data
          </p>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => window.open(`http://localhost:8000/api/download/${jobId}/audio`, "_blank")} 
              className="text-xs py-2 px-3 rounded-lg bg-surface border border-border hover:bg-white/5 transition-colors w-full text-left flex justify-between items-center group/btn text-muted-foreground hover:text-white cursor-pointer"
            >
              <span>1. Extracted Audio (.wav)</span>
              <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">↓</span>
            </button>
            <button 
              onClick={() => window.open(`http://localhost:8000/api/download/${jobId}/transcription`, "_blank")} 
              className="text-xs py-2 px-3 rounded-lg bg-surface border border-border hover:bg-white/5 transition-colors w-full text-left flex justify-between items-center group/btn text-muted-foreground hover:text-white cursor-pointer"
            >
              <span>2. Whisper Transcription (.json)</span>
              <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">↓</span>
            </button>
            <button 
              onClick={() => window.open(`http://localhost:8000/api/download/${jobId}/transliteration`, "_blank")} 
              className="text-xs py-2 px-3 rounded-lg bg-surface border border-border hover:bg-white/5 transition-colors w-full text-left flex justify-between items-center group/btn text-muted-foreground hover:text-white cursor-pointer"
            >
              <span>3. Llama Transliteration (.json)</span>
              <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">↓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
