"""
upload.py
Router for handling PDF file uploads in the RAG application.
"""

import os
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, status

from app.services.pdf_service import extract_text_from_pdf, PDFExtractionError
from app.services.chunk_service import chunk_text
# ---------------------------------------------------------------------------
# Router setup
# ---------------------------------------------------------------------------
router = APIRouter(
    prefix="/upload",
    tags=["Upload"],
)

# Resolve uploads directory relative to this file so it works regardless
# of where the app is launched from (e.g. uvicorn app.main:app)
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # -> backend/
UPLOAD_DIR = BASE_DIR / "uploads"

# Config
ALLOWED_CONTENT_TYPE = "application/pdf"
ALLOWED_EXTENSION = ".pdf"
MAX_FILE_SIZE_MB = 20  # adjust as needed
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


def ensure_upload_dir_exists() -> None:
    """Create the uploads directory automatically if it doesn't exist."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def validate_pdf(file: UploadFile) -> None:
    """
    Validate that the uploaded file is actually a PDF.
    Checks both the extension and the declared content type,
    since either alone can be spoofed/misreported.
    """
    filename = file.filename or ""
    extension = Path(filename).suffix.lower()

    if extension != ALLOWED_EXTENSION or file.content_type != ALLOWED_CONTENT_TYPE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed.",
        )


@router.post("/")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a single PDF file, save it to disk, and extract its text content.

    Returns:
        JSON with filename, size in bytes, number of pages with extracted
        text, and a success message.
    """
    # 1. Validate file type before touching the filesystem
    validate_pdf(file)

    # 2. Make sure the destination directory exists
    ensure_upload_dir_exists()

    # 3. Build a safe destination path (avoid path traversal via filename)
    safe_filename = os.path.basename(file.filename)
    destination_path = UPLOAD_DIR / safe_filename

    # --- Save the file to disk ---------------------------------------------
    try:
        size_bytes = 0
        with open(destination_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                size_bytes += len(chunk)
                if size_bytes > MAX_FILE_SIZE_BYTES:
                    buffer.close()
                    destination_path.unlink(missing_ok=True)  # clean up partial file
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_MB}MB.",
                    )
                buffer.write(chunk)

    except HTTPException:
        # Re-raise validation/size errors as-is
        raise
    except Exception as e:
        # Catch-all for unexpected I/O errors; clean up any partial file
        destination_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}",
        )
    finally:
        await file.close()

    # --- Extract text from the saved PDF ------------------------------------
    try:
        extracted_pages = extract_text_from_pdf(str(destination_path))
        chunks = chunk_text(extracted_pages)
    except PDFExtractionError as e:
        # The file was saved but couldn't be processed — clean it up so
        # we don't leave an unusable PDF sitting in the uploads folder.
        destination_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"PDF uploaded but text extraction failed: {str(e)}",
        )

    return {
    "filename": safe_filename,
    "size_bytes": size_bytes,
    "total_pages_extracted": len(extracted_pages),
    "total_chunks": len(chunks),
    "message": "File uploaded and processed successfully."
}