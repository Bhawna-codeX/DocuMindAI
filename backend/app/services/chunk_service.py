"""
chunk_service.py
Service for splitting extracted PDF page text into overlapping,
fixed-size chunks suitable for embedding in a RAG pipeline.
"""

from typing import List, Dict


def chunk_text(
    pages: List[Dict[str, object]],
    chunk_size: int = 500,
    overlap: int = 100,
) -> List[Dict[str, object]]:
    """
    Split page-level text into overlapping word-based chunks.

    Args:
        pages: List of dicts in the form [{"page": 1, "text": "..."}, ...],
               typically the output of extract_text_from_pdf().
        chunk_size: Number of words per chunk.
        overlap: Number of words shared between consecutive chunks
                 (provides context continuity for embeddings/retrieval).

    Returns:
        A list of dicts, one per chunk, e.g.:
        [
            {"page": 1, "chunk_id": 1, "text": "..."},
            {"page": 1, "chunk_id": 2, "text": "..."},
        ]
        chunk_id increments globally across the entire document (not
        reset per page), so every chunk has a unique, stable identifier.

    Raises:
        ValueError: If chunk_size <= 0, overlap < 0, or overlap >= chunk_size.
    """
    # --- Validate parameters up front ---------------------------------------
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0.")
    if overlap < 0:
        raise ValueError("overlap cannot be negative.")
    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size.")

    chunks: List[Dict[str, object]] = []
    chunk_id = 0  # global counter, incremented for every chunk produced

    # Step size between the start of one chunk and the start of the next.
    # e.g. chunk_size=500, overlap=100 -> step=400, so each new chunk
    # re-includes the last 100 words of the previous chunk.
    step = chunk_size - overlap

    for page_entry in pages:
        page_number = page_entry.get("page")
        page_text = page_entry.get("text", "")

        # Skip pages with no meaningful text
        if not page_text or not page_text.strip():
            continue

        # Word-based splitting keeps chunk boundaries readable and avoids
        # cutting words in half (unlike raw character slicing).
        words = page_text.split()

        # Skip pages that produced no words after splitting (edge case:
        # whitespace-only text that passed the initial strip() check)
        if not words:
            continue

        total_words = len(words)
        start = 0

        # Slide a window over the word list, advancing by `step` each time
        while start < total_words:
            end = start + chunk_size
            chunk_words = words[start:end]

            # Guard against empty slices (shouldn't normally happen given
            # the while condition, but kept for safety/robustness)
            if chunk_words:
                chunk_id += 1
                chunks.append({
                    "page": page_number,
                    "chunk_id": chunk_id,
                    "text": " ".join(chunk_words),
                })

            # If this chunk already reached the end of the page's words,
            # stop — otherwise the overlap logic would create a redundant
            # trailing chunk that just repeats the tail of the previous one.
            if end >= total_words:
                break

            start += step

    return chunks