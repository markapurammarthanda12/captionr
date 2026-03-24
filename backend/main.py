import os
import uuid
import shutil
import traceback
import json
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from models import JobStatus, JobInfo, UploadResponse, STEP_LABELS
from pipeline import extract_audio, transcribe, transliterate
from renderer import burn_captions

app = FastAPI(title="Captionr API", version="1.0.0")

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store
jobs: dict[str, dict] = {}

JOBS_DIR = os.path.join(os.path.dirname(__file__), ".jobs")
os.makedirs(JOBS_DIR, exist_ok=True)


def update_job(job_id: str, status: JobStatus, error: str = None):
    """Update job status in the store."""
    jobs[job_id]["status"] = status
    jobs[job_id]["step_label"] = STEP_LABELS[status]
    if error:
        jobs[job_id]["error"] = error


def process_video(job_id: str, video_path: str, api_key: str):
    """Full processing pipeline run as a background task."""
    job_dir = os.path.join(JOBS_DIR, job_id)
    try:
        # Step 1: Extract audio
        update_job(job_id, JobStatus.EXTRACTING_AUDIO)
        audio_path = os.path.join(JOBS_DIR, job_id, "audio.wav")
        extract_audio(video_path, audio_path)

        # Step 2: Transcribe
        update_job(job_id, JobStatus.TRANSCRIBING)
        segments = transcribe(audio_path, api_key)
        
        # Save transcription debug info
        with open(os.path.join(job_dir, "transcription.json"), "w", encoding="utf-8") as f:
            json.dump([s.model_dump() for s in segments], f, indent=2)

        # Step 3: Transliterate
        update_job(job_id, JobStatus.TRANSLITERATING)
        segments = transliterate(segments, api_key)

        # Save transliteration debug info
        with open(os.path.join(job_dir, "transliteration.json"), "w", encoding="utf-8") as f:
            json.dump([s.model_dump() for s in segments], f, indent=2)

        # Step 4: Render captions
        update_job(job_id, JobStatus.RENDERING)
        output_path = os.path.join(JOBS_DIR, job_id, "output.mp4")
        burn_captions(video_path, segments, output_path)

        # Done
        update_job(job_id, JobStatus.COMPLETED)

    except Exception as e:
        traceback.print_exc()
        update_job(job_id, JobStatus.ERROR, error=str(e))


@app.post("/api/upload", response_model=UploadResponse)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    groq_api_key: str = Form(...),
):
    """Upload a video and start processing."""
    if not file.filename.lower().endswith(".mp4"):
        raise HTTPException(status_code=400, detail="Only .mp4 files are supported.")

    job_id = str(uuid.uuid4())
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    # Save uploaded file
    video_path = os.path.join(job_dir, "input.mp4")
    with open(video_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Initialize job
    jobs[job_id] = {
        "status": JobStatus.PENDING,
        "step_label": STEP_LABELS[JobStatus.PENDING],
        "error": None,
    }

    # Start background processing
    background_tasks.add_task(process_video, job_id, video_path, groq_api_key)

    return UploadResponse(job_id=job_id, message="Processing started.")


@app.get("/api/status/{job_id}", response_model=JobInfo)
async def get_status(job_id: str):
    """Poll for job status updates."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")

    job = jobs[job_id]
    return JobInfo(
        job_id=job_id,
        status=job["status"],
        step_label=job["step_label"],
        error=job.get("error"),
    )


@app.get("/api/download/{job_id}")
async def download_video(job_id: str):
    """Download the processed video."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")

    if jobs[job_id]["status"] != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Video not ready yet.")

    output_path = os.path.join(JOBS_DIR, job_id, "output.mp4")
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Output file not found.")

    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename=f"captionr_{job_id[:8]}.mp4",
    )


@app.get("/api/download/{job_id}/audio")
async def download_audio(job_id: str):
    """Download the extracted audio."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
    job_dir = os.path.join(JOBS_DIR, job_id)
    audio_path = os.path.join(job_dir, "audio.wav")
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(audio_path, media_type="audio/wav", filename="audio.wav")

@app.get("/api/download/{job_id}/spectrogram")
async def download_spectrogram(job_id: str):
    """Download the generated spectrogram."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
    job_dir = os.path.join(JOBS_DIR, job_id)
    spec_path = os.path.join(job_dir, "spectrogram.png")
    if not os.path.exists(spec_path):
        raise HTTPException(status_code=404, detail="Spectrogram not found")
    return FileResponse(spec_path, media_type="image/png", filename="spectrogram.png")


@app.get("/api/download/{job_id}/transcription")
async def download_transcription(job_id: str):
    """Download the Whisper transcription JSON."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
    json_path = os.path.join(JOBS_DIR, job_id, "transcription.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Transcription file not found.")
    return FileResponse(json_path, media_type="application/json", filename=f"whisper_transcription_{job_id[:8]}.json")


@app.get("/api/download/{job_id}/transliteration")
async def download_transliteration(job_id: str):
    """Download the Llama transliteration JSON."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
    json_path = os.path.join(JOBS_DIR, job_id, "transliteration.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Transliteration file not found.")
    return FileResponse(json_path, media_type="application/json", filename=f"llama_transliteration_{job_id[:8]}.json")


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    # Check FFmpeg
    ffmpeg_ok = shutil.which("ffmpeg") is not None
    return {
        "status": "ok",
        "ffmpeg_installed": ffmpeg_ok,
    }
