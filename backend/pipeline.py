import subprocess
import os
import json
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
            
            chunk.append({"word": w, "start": start, "end": end})
            
            # Max 3 words per caption segment
            if len(chunk) >= 3:
                seg_text = "".join([c["word"] for c in chunk]).strip()
                if seg_text:
                    segments.append(Segment(start=chunk[0]["start"], end=chunk[-1]["end"], text=seg_text))
                chunk = []
                
        if chunk:
            seg_text = "".join([c["word"] for c in chunk]).strip()
            if seg_text:
                segments.append(Segment(start=chunk[0]["start"], end=chunk[-1]["end"], text=seg_text))
    
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
        "You are a transliteration engine. Convert the following texts from their native script "
        "into phonetic English (romanized). Return ONLY a valid JSON array of strings, "
        "one per input line. Do not add explanations.\n\n"
        "Input texts (JSON array):\n"
        f"{json.dumps(texts, ensure_ascii=False)}\n\n"
        "Output (JSON array of romanized strings):"
    )

    chat = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=2048,
    )

    response_text = chat.choices[0].message.content.strip()

    # Parse the JSON array from the response
    try:
        # Try to extract JSON from the response
        start_idx = response_text.find("[")
        end_idx = response_text.rfind("]") + 1
        if start_idx != -1 and end_idx > start_idx:
            transliterated = json.loads(response_text[start_idx:end_idx])
        else:
            transliterated = json.loads(response_text)
    except json.JSONDecodeError:
        # Fallback: just use original texts
        transliterated = texts

    for i, seg in enumerate(segments):
        if i < len(transliterated):
            seg.transliterated = transliterated[i]
        else:
            seg.transliterated = seg.text

    return segments
