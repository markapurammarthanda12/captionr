from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    EXTRACTING_AUDIO = "extracting_audio"
    TRANSCRIBING = "transcribing"
    TRANSLITERATING = "transliterating"
    RENDERING = "rendering"
    COMPLETED = "completed"
    ERROR = "error"


STEP_LABELS = {
    JobStatus.PENDING: "Queued...",
    JobStatus.EXTRACTING_AUDIO: "Extracting Audio...",
    JobStatus.TRANSCRIBING: "Transcribing with Whisper...",
    JobStatus.TRANSLITERATING: "Transliterating to Phonetic English...",
    JobStatus.RENDERING: "Rendering Captions onto Video...",
    JobStatus.COMPLETED: "Done! Your video is ready.",
    JobStatus.ERROR: "An error occurred.",
}


class Segment(BaseModel):
    start: float
    end: float
    text: str
    transliterated: Optional[str] = None
    probability: Optional[float] = None
    tokens: Optional[list] = None


class JobInfo(BaseModel):
    job_id: str
    status: JobStatus
    step_label: str
    error: Optional[str] = None


class UploadResponse(BaseModel):
    job_id: str
    message: str
