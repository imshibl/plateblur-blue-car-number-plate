import re
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool

from .image_processing import process_image
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded


MAX_UPLOAD_BYTES = 20 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}

app = FastAPI(title="PlateBlur API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://plateblur.bilcodes.com",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["X-Detected-Plates", "Content-Disposition"],
)

# Create rate limiter
limiter = Limiter(key_func=get_remote_address)

# Register limiter
app.state.limiter = limiter

# Handle rate limit errors
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/blur")
@limiter.limit("5/minute")
async def blur_image(request: Request, image: UploadFile = File(...)) -> Response:
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Upload a JPEG, PNG, WebP, or BMP image.",
        )

    image_bytes = await image.read(MAX_UPLOAD_BYTES + 1)
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Images must be 20 MB or smaller.")
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")

    try:
        processed_image, plate_count = await run_in_threadpool(
            process_image, image_bytes
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    filename = Path(image.filename or "image").stem or "image"
    filename = re.sub(r"[^A-Za-z0-9._-]+", "-", filename)
    return Response(
        content=processed_image,
        media_type="image/jpeg",
        headers={
            "Content-Disposition": f'inline; filename="{filename}-blurred.jpg"',
            "X-Detected-Plates": str(plate_count),
        },
    )
