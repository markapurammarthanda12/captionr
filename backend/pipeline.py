import subprocess
import os
import json
import librosa
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import tiktoken
from groq import Groq
from models import Segment
from typing import List


def extract_audio(video_path: str, output_path: str) -> str:
    """Extract audio from video using FFmpeg."""
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg audio extraction failed: {result.stderr}")
        
    # Generate Mel-Spectrogram for the deep NLP UI
    try:
        job_dir = os.path.dirname(output_path)
        y, sr = librosa.load(output_path, sr=16000)
        S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
        S_dB = librosa.power_to_db(S, ref=np.max)
        plt.figure(figsize=(10, 4))
        librosa.display.specshow(S_dB, sr=sr, x_axis='time', y_axis='mel')
        plt.axis('off')
        plt.tight_layout(pad=0)
        spec_path = os.path.join(job_dir, "spectrogram.png")
        plt.savefig(spec_path, bbox_inches='tight', pad_inches=0, facecolor='#0D0D0D')
        plt.close()
    except Exception as e:
        print(f"Spectrogram generation failed: {e}")
        
    return output_path


def transcribe(audio_path: str, api_key: str) -> List[Segment]:
    """Transcribe audio using Groq Whisper-large-v3."""
    client = Groq(api_key=api_key)

    with open(audio_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            file=(os.path.basename(audio_path), audio_file.read()),
            model="whisper-large-v3",
            response_format="verbose_json",
            timestamp_granularities=["word", "segment"],
        )

    segments = []
    # Try word-level first for "snappy" captions
    if hasattr(transcription, "words") and transcription.words:
        chunk = []
        for word_info in transcription.words:
            w = word_info["word"] if isinstance(word_info, dict) else word_info.word
            start = word_info["start"] if isinstance(word_info, dict) else word_info.start
            end = word_info["end"] if isinstance(word_info, dict) else word_info.end
            prob_raw = word_info.get("probability") if isinstance(word_info, dict) else getattr(word_info, "probability", None)
            prob = float(prob_raw) if prob_raw is not None else 0.95
            
            # Flush if there is a pause > 0.4 seconds to prevent frozen captions
            if chunk and (start - chunk[-1]["end"] > 0.4):
                seg_text = " ".join([c["word"].strip() for c in chunk]).strip()
                if seg_text:
                    avg_prob = sum(c["probability"] for c in chunk) / len(chunk)
                    segments.append(Segment(start=chunk[0]["start"], end=chunk[-1]["end"], text=seg_text, probability=avg_prob))
                chunk = []

            chunk.append({"word": w, "start": start, "end": end, "probability": prob})
            
            # Max 3 words per caption segment
            if len(chunk) >= 3:
                seg_text = " ".join([c["word"].strip() for c in chunk]).strip()
                if seg_text:
                    avg_prob = sum(c["probability"] for c in chunk) / len(chunk)
                    segments.append(Segment(start=chunk[0]["start"], end=chunk[-1]["end"], text=seg_text, probability=avg_prob))
                chunk = []
                
        if chunk:
            seg_text = " ".join([c["word"].strip() for c in chunk]).strip()
            if seg_text:
                avg_prob = sum(c["probability"] for c in chunk) / len(chunk)
                segments.append(Segment(start=chunk[0]["start"], end=chunk[-1]["end"], text=seg_text, probability=avg_prob))
    
    elif hasattr(transcription, "segments") and transcription.segments:
        # Fallback to normal segment level
        for seg in transcription.segments:
            segments.append(
                Segment(
                    start=seg["start"] if isinstance(seg, dict) else seg.start,
                    end=seg["end"] if isinstance(seg, dict) else seg.end,
                    text=(seg["text"] if isinstance(seg, dict) else seg.text).strip(),
                )
            )
    else:
        # Fallback: treat the whole transcription as one segment
        segments.append(
            Segment(start=0.0, end=30.0, text=transcription.text.strip())
        )

    return segments


def transliterate(segments: List[Segment], api_key: str) -> List[Segment]:
    """Transliterate non-Latin text to phonetic English using Groq Llama-3."""
    client = Groq(api_key=api_key)

    texts = [seg.text for seg in segments]
    prompt = (
        "You are a transliteration engine. Convert all texts from the following JSON array from their native script "
        "into phonetic English (romanized). If a text is already in English or numerical, keep it exactly the same. "
        "Output ONLY a valid JSON object containing exactly one key 'results', "
        "whose value is an array of the romanized strings mapping 1-to-1 with the input array.\n\n"
        "Input array:\n"
        f"{json.dumps(texts, ensure_ascii=False)}\n"
    )

    chat = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=2048,
        response_format={"type": "json_object"},
    )

    response_text = chat.choices[0].message.content.strip()

    # Parse the JSON object from the response
    try:
        data = json.loads(response_text)
        transliterated = data.get("results", texts)
        if not isinstance(transliterated, list):
            transliterated = texts
    except json.JSONDecodeError:
        # Fallback: just use original texts if completely catastrophic
        transliterated = texts

    try:
        enc = tiktoken.get_encoding("cl100k_base")
    except Exception as e:
        print(f"Tiktoken init error: {e}")
        enc = None
        
    for i, seg in enumerate(segments):
        transl = transliterated[i] if i < len(transliterated) else seg.text
        seg.transliterated = transl
        
        # Tokenize the Llama 3 output to demonstrate BPE Tokens mathematically
        if enc:
            try:
                token_ids = enc.encode(transl)
                seg.tokens = [{"id": tid, "text": enc.decode([tid])} for tid in token_ids]
            except Exception:
                seg.tokens = []
        else:
            seg.tokens = []

    return segments
