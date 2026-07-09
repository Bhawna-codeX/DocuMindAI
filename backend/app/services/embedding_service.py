"""
embedding_service.py
Service for generating vector embeddings for text chunks using
Google's Gemini embedding model (gemini-embedding-001).
"""

import os
from typing import List, Dict

from dotenv import load_dotenv
from google import genai
from google.genai import types


class EmbeddingGenerationError(Exception):
    """Raised when embeddings cannot be generated for one or more chunks."""
    pass


class MissingAPIKeyError(Exception):
    """Raised when the Gemini API key is missing from the environment/.env file."""
    pass


# Gemini embedding model. 3072-dim output by default.
GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"

# Gemini's embed_content endpoint has a batch limit; we stay well under it.
BATCH_SIZE = 50


def _load_api_key() -> str:
    """
    Load the Gemini API key from the .env file (or environment).

    Returns:
        The API key string.

    Raises:
        MissingAPIKeyError: If the key is not set anywhere.
    """
    # Loads variables from a .env file in the project root into os.environ.
    # Safe to call multiple times; does not override already-set env vars.
    load_dotenv()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise MissingAPIKeyError(
            "GEMINI_API_KEY not found. Please set it in your .env file."
        )
    return api_key


def _build_client() -> genai.Client:
    """
    Construct a Gemini API client using the loaded API key.
    A fresh client is created per call (no global state), which keeps
    this module free of shared mutable globals and safe for concurrent use.
    """
    api_key = _load_api_key()
    return genai.Client(api_key=api_key)


def _batch(items: List[Dict[str, object]], batch_size: int) -> List[List[Dict[str, object]]]:
    """Split a list into consecutive sub-lists of at most `batch_size` items."""
    return [items[i:i + batch_size] for i in range(0, len(items), batch_size)]


def generate_embeddings(
    chunks: List[Dict[str, object]],
    task_type: str = "RETRIEVAL_DOCUMENT",
) -> List[Dict[str, object]]:
    """
    Generate embeddings for a list of text chunks using Gemini's embedding model.

    Args:
        chunks: List of dicts in the form:
            [{"page": 1, "chunk_id": 1, "text": "..."}, ...]
            typically the output of chunk_text().

    Returns:
        The same chunk dicts, each augmented with an "embedding" field:
            [{"page": 1, "chunk_id": 1, "text": "...", "embedding": [...]}, ...]

    Raises:
        MissingAPIKeyError: If GEMINI_API_KEY is not configured.
        EmbeddingGenerationError: If the API call fails or returns an
            unexpected/mismatched result for any batch.
    """
    if not chunks:
        return []

    # Build a client scoped to this function call — no module-level globals.
    client = _build_client()

    embedded_chunks: List[Dict[str, object]] = []

    # Process in batches to stay within API request-size limits and to
    # reduce the number of round trips compared to one call per chunk.
    for batch in _batch(chunks, BATCH_SIZE):
        texts = [str(item.get("text", "")) for item in batch]

        try:
            response = client.models.embed_content(
                model=GEMINI_EMBEDDING_MODEL,
                contents=texts,
                config=types.EmbedContentConfig(task_type=task_type),
            )
        except Exception as e:
            raise EmbeddingGenerationError(
                f"Gemini API call failed while embedding a batch of {len(batch)} chunk(s): {str(e)}"
            )

        embeddings = getattr(response, "embeddings", None)
        if embeddings is None or len(embeddings) != len(batch):
            # Defensive check: ensures we never silently mismatch chunks to embeddings.
            raise EmbeddingGenerationError(
                "Mismatch between number of chunks sent and embeddings received "
                f"(sent {len(batch)}, received {len(embeddings) if embeddings else 0})."
            )

        # Re-attach each embedding to its corresponding original chunk.
        for original_chunk, embedding_obj in zip(batch, embeddings):
            vector = getattr(embedding_obj, "values", None)
            if not vector:
                raise EmbeddingGenerationError(
                    f"Empty embedding returned for chunk_id={original_chunk.get('chunk_id')} "
                    f"on page={original_chunk.get('page')}."
                )

            embedded_chunks.append({
                "page": original_chunk.get("page"),
                "chunk_id": original_chunk.get("chunk_id"),
                "text": original_chunk.get("text"),
                "embedding": list(vector),
            })

    return embedded_chunks