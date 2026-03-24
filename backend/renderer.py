import os
from moviepy import VideoFileClip, TextClip, CompositeVideoClip
from models import Segment
from typing import List


def burn_captions(video_path: str, segments: List[Segment], output_path: str) -> str:
    """Burn transliterated captions onto the video using MoviePy."""
    video = VideoFileClip(video_path)

    caption_clips = []
    for seg in segments:
        caption_text = seg.transliterated or seg.text
        if not caption_text.strip():
            continue

        try:
            # Responsive calculations
            font_sz = int(video.w * 0.065) # 6.5% of width
            max_width = int(video.w * 0.8)

            txt_clip = (
                TextClip(
                    text=caption_text,
                    font_size=font_sz,
                    color="white",
                    font="/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                    stroke_color="black",
                    stroke_width=int(font_sz * 0.05) or 1,
                    method="caption",
                    size=(max_width, None),
                    text_align="center",
                )
                .with_position(("center", int(video.h * 0.82)))
                .with_start(seg.start)
                .with_duration(min(seg.end - seg.start, video.duration - seg.start))
            )
            caption_clips.append(txt_clip)
        except Exception as e:
            print(f"Warning: Could not create caption for '{caption_text}': {e}")
            continue

    if caption_clips:
        final = CompositeVideoClip([video] + caption_clips)
    else:
        final = video

    final.write_videofile(
        output_path,
        codec="libx264",
        audio_codec="aac",
        fps=video.fps or 30,
        logger=None,
    )

    video.close()
    final.close()

    return output_path
