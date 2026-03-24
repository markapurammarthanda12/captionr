import os
import json
import traceback
from pipeline import transcribe, transliterate

# Get newest job dir
jobs_dir = ".jobs"
job_dirs = [os.path.join(jobs_dir, d) for d in os.listdir(jobs_dir) if os.path.isdir(os.path.join(jobs_dir, d))]
job_dirs.sort(key=os.path.getmtime, reverse=True)
newest_job = job_dirs[0]

print(f"Testing job: {newest_job}")

try:
    with open(os.path.join(newest_job, "job_info.json"), "r") as f:
        job_info = json.load(f)
        api_key = job_info.get("groq_api_key")
except Exception as e:
    print(f"Failed to load job_info.json: {e}")
    exit(1)

audio_path = os.path.join(newest_job, "audio.wav")

if not os.path.exists(audio_path):
    print("Audio file missing.")
else:
    print("Testing transcription...")
    try:
        segments = transcribe(audio_path, api_key)
        print(f"Transcription OK! Got {len(segments)} segments.")
        
        print("Testing transliteration...")
        segments = transliterate(segments, api_key)
        print("Transliteration OK!")
    except Exception as e:
        print("Pipeline failed!")
        traceback.print_exc()
