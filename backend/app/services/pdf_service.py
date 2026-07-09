"""
pdf_service.py
Service for extracting text content from PDF files using PyMuPDF (fitz).
"""

from typing import List, Dict
import fitz  # PyMuPDF


class PDFExtractionError(Exception):
    """Raised when a PDF file cannot be opened or processed."""
    pass


def extract_text_from_pdf(pdf_path: str) -> List[Dict[str, object]]:
    """
    Extract text content from every page of a PDF file.

    Args:
        pdf_path: Absolute or relative path to the PDF file.

    Returns:
        A list of dicts, one per non-empty page, e.g.:
        [
            {"page": 1, "text": "..."},
            {"page": 3, "text": "..."},
        ]
        Pages with no extractable text are skipped, so page numbers
        in the output may not be contiguous.

    Raises:
        PDFExtractionError: If the file cannot be opened or read.
    """
    # --- Open the document safely -----------------------------------------
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        # Covers file-not-found, corrupted PDF, permission errors, etc.
        raise PDFExtractionError(f"Failed to open PDF '{pdf_path}': {str(e)}")

    extracted_pages: List[Dict[str, object]] = []

    try:
        # --- Iterate through every page and pull text -----------------------
        for page_index in range(doc.page_count):
            page = doc.load_page(page_index)

            # "text" mode gives plain reading-order text; good default for RAG chunking
            page_text = page.get_text("text")

            # Normalize whitespace so empty/near-empty pages are reliably detected
            cleaned_text = page_text.strip()

            # Skip pages with no meaningful text (e.g. blank pages, pure-image pages)
            if not cleaned_text:
                continue

            extracted_pages.append({
                "page": page_index + 1,  # human-readable, 1-indexed page numbers
                "text": cleaned_text,
            })

    except Exception as e:
        doc.close()
        raise PDFExtractionError(f"Failed while extracting text from '{pdf_path}': {str(e)}")

    finally:
        # Always release the file handle, even if extraction fails midway
        doc.close()

    return extracted_pages