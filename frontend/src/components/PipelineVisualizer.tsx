"use client";
import { useEffect, useState } from "react";

interface PipelineVisualizerProps {
  jobId: string;
  status: string;
}

export default function PipelineVisualizer({ jobId, status }: PipelineVisualizerProps) {
  const [transcription, setTranscription] = useState<any[] | null>(null);
  const [transliteration, setTransliteration] = useState<any[] | null>(null);

  useEffect(() => {
    // Fetch transcription when transliterating starts
    if (["transliterating", "rendering", "completed"].includes(status) && !transcription) {
      fetch(`http://localhost:8000/api/download/${jobId}/transcription`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Not ready");
        })
        .then(data => setTranscription(data))
        .catch(() => {});
    }

    // Fetch transliteration when rendering starts
    if (["rendering", "completed"].includes(status) && !transliteration) {
      fetch(`http://localhost:8000/api/download/${jobId}/transliteration`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Not ready");
        })
        .then(data => setTransliteration(data))
        .catch(() => {});
    }
  }, [status, jobId, transcription, transliteration]);

  return (
    <div className="flex flex-col gap-4 mt-6">
      
      {/* 1. Audio Node */}
      {["transcribing", "transliterating", "rendering", "completed"].includes(status) && (
        <div className="border border-border rounded-xl bg-surface-light p-4 shadow-sm animate-fade-in">
           <div className="flex items-center gap-3 mb-3">
              <span className="w-6 h-6 rounded bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
              <h3 className="text-sm font-semibold text-white">Acoustic Feature Engineering</h3>
           </div>
           <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
             Transformers cannot process raw sound waves. We perform a Fast Fourier Transform (FFT) to convert 16kHz audio into a Mel-Scale Spectrogram—a 2D frequency tensor that acts as visual input for Whisper's Convolutional layers.
           </p>
           <div className="flex flex-col gap-2">
             <audio 
               src={`http://localhost:8000/api/download/${jobId}/audio`} 
               controls 
               className="w-full h-8 opacity-80 filter invert sepia saturate-0 hue-rotate-180" 
             />
             <div className="rounded-lg overflow-hidden border border-border/40 mt-1 bg-black flex items-center justify-center min-h-[80px]">
               <img 
                 src={`http://localhost:8000/api/download/${jobId}/spectrogram`} 
                 alt="Mel-Spectrogram Tensor" 
                 className="w-full h-auto object-cover opacity-90" 
                 onError={(e) => { e.currentTarget.style.display = 'none'; }} 
               />
             </div>
           </div>
        </div>
      )}

      {/* 2. Whisper Node */}
      {["transliterating", "rendering", "completed"].includes(status) && transcription && (
         <div className="border border-border rounded-xl bg-surface-light p-4 shadow-sm animate-fade-in">
           <div className="flex items-center gap-3 mb-3">
              <span className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">2</span>
              <h3 className="text-sm font-semibold text-white">ASR Token Log-Probabilities</h3>
           </div>
           <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
             Groq's Whisper generates sequential output by calculating a softmax probability distribution over its vocabulary. Below is the decoded text mapped to a confidence heatmap (Green = High LogProb, Yellow/Red = Lower Confidence).
           </p>
           
           <div className="flex flex-wrap gap-1.5 bg-[#0A0A0A] border border-border/40 rounded-lg p-3 max-h-48 overflow-y-auto shadow-inner text-sm mb-3">
             {transcription.map((t: any, i: number) => {
                let colorClass = "bg-green-500/10 text-green-400 border-green-500/20";
                if (t.probability < 0.8) colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
                else if (t.probability < 0.95) colorClass = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
                
                return (
                  <div key={i} className={`px-1.5 py-0.5 rounded border ${colorClass} text-xs font-medium cursor-help`} title={`Confidence: ${(t.probability * 100).toFixed(1)}%`}>
                    {t.text}
                  </div>
                );
             })}
           </div>

           <div className="bg-[#0A0A0A]/50 border border-border/20 rounded-lg p-2 max-h-24 overflow-y-auto font-mono text-[9px] text-muted flex">
              <pre>{JSON.stringify(transcription.slice(0, 3), null, 2)}</pre>
              {transcription.length > 3 && <span className="ml-2 mt-auto">... {transcription.length - 3} more segments.</span>}
           </div>
        </div>
      )}

      {/* 3. Llama Node */}
      {["rendering", "completed"].includes(status) && transliteration && (
         <div className="border border-border rounded-xl bg-surface-light p-4 shadow-sm animate-fade-in flex flex-col">
           <div className="flex items-center gap-3 mb-3">
              <span className="w-6 h-6 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">3</span>
              <h3 className="text-sm font-semibold text-white">LLM Byte-Pair Tokenization</h3>
           </div>
           <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
             Large Language Models (like Llama-3) do not read English words. They process integer array matrices assigned by a BPE Tokenizer. Here is the mathematical token representation generated during Zero-Shot Transliteration.
           </p>
           
           <div className="grid grid-cols-2 gap-3 text-[11px] mb-4">
              <div className="p-3 bg-[#0A0A0A] border border-border/40 rounded-lg flex flex-col h-full shadow-inner">
                 <span className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-2 font-semibold">Native Target (ASR)</span>
                 <p className="leading-relaxed">
                   {transliteration.slice(0, 15).map((t: any, i: number) => (
                      <span key={i} className="mr-1 inline-block">{t.text}</span>
                   ))}{transliteration.length > 15 ? '...' : ''}
                 </p>
              </div>
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex flex-col h-full">
                 <span className="text-[9px] text-primary/70 uppercase tracking-widest block mb-2 font-semibold">Romanized Output (LLM)</span>
                 <p className="leading-relaxed text-primary/90 font-medium">
                   {transliteration.slice(0, 15).map((t: any, i: number) => (
                      <span key={i} className="mr-1 inline-block">{t.transliterated || t.text}</span>
                   ))}{transliteration.length > 15 ? '...' : ''}
                 </p>
              </div>
           </div>

           <div className="flex flex-col gap-3 text-[11px] max-h-60 overflow-y-auto pr-2">
              {transliteration.map((t: any, i: number) => (
                <div key={i} className="flex flex-col gap-1.5 mb-2 border-b border-border/20 pb-2 last:border-0">
                  <span className="text-[11px] text-muted-foreground font-medium bg-surface/50 px-2 py-1 rounded inline-block w-max">
                    {t.text} <span className="text-muted-foreground/50 mx-1">→</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 items-start">
                    {t.tokens ? t.tokens.map((tok: any, j: number) => (
                      <div key={j} className="flex flex-col items-center justify-center bg-primary/10 border border-primary/20 rounded px-1.5 py-1 min-w-[36px] shadow-sm" title={`Token string: '${tok.text}'`}>
                        <span className="text-[8px] text-primary/50 font-mono mb-0.5">{tok.id}</span>
                        <span className="text-[11px] text-primary font-semibold leading-none whitespace-pre">
                          {tok.text.replace(/ /g, "␣")}
                        </span>
                      </div>
                    )) : (
                      <span className="text-primary/70 bg-primary/5 px-2 py-1 rounded">{t.transliterated || t.text}</span>
                    )}
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* 4. Rendering Node */}
      {status === "completed" && (
         <div className="border border-border rounded-xl bg-surface-light p-4 shadow-sm animate-fade-in flex flex-col">
           <div className="flex items-center gap-3 mb-3">
              <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">4</span>
              <h3 className="text-sm font-semibold text-white">Video Rendering (FFmpeg + MoviePy)</h3>
           </div>
           <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
             Finally, the raw NLP mathematical coordinates are passed back into computer vision processors. The translated phonetic captions are hardcoded onto the visual MP4 canvas matching the exact mathematical timeframes extracted by Whisper.
           </p>
           <div className="w-full aspect-video bg-black rounded-lg border border-border/40 overflow-hidden flex items-center justify-center relative">
             <video src={`http://localhost:8000/api/download/${jobId}`} controls className="w-full h-full object-contain" />
           </div>
        </div>
      )}
    </div>
  );
}
