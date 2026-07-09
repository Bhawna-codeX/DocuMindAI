"""
chroma_service.py
Service for persisting embedded text chunks into a local ChromaDB
vector store, keyed per source document, for later semantic retrieval.
"""

from pathlib import Path
from typing import List, Dict

import chromadb
from chromadb.api.models.Collection import Collection

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Resolve the persistent storage path relative to this file so it always
# resolves to backend/chroma_db/ regardless of the process's working dir.
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # -> backend/
CHROMA_DB_DIR = BASE_DIR / "chroma_db"

COLLECTION_NAME = "documind_collection"


class ChromaStorageError(Exception):
    """Raised when embedded chunks cannot be stored in ChromaDB."""
    pass


class InvalidChunkDataError(Exception):
    """Raised when input chunk data is missing required fields (e.g. embedding)."""
    pass

class ChromaQueryError(Exception):
    """Raised when a similarity search against ChromaDB fails."""
    pass

def _get_collection() -> Collection:
    """
    Build a fresh PersistentClient and return the target collection,
    creating it if it doesn't already exist.

    A new client is created per call rather than stored as a module-level
    global — this keeps the module free of shared mutable state and avoids
    issues with stale connections across requests/workers.

    Raises:
        ChromaStorageError: If the client or collection cannot be initialized.
    """
    try:
        # Ensure the on-disk directory exists before ChromaDB tries to use it.
        CHROMA_DB_DIR.mkdir(parents=True, exist_ok=True)

        client = chromadb.PersistentClient(path=str(CHROMA_DB_DIR))

        # get_or_create_collection is idempotent: creates the collection on
        # first run, reuses it on every subsequent call.
        collection = client.get_or_create_collection(name=COLLECTION_NAME)
        return collection

    except Exception as e:
        raise ChromaStorageError(
            f"Failed to initialize ChromaDB collection '{COLLECTION_NAME}': {str(e)}"
        )


def _validate_chunk(chunk: Dict[str, object]) -> None:
    """
    Validate that a single embedded chunk has all required fields
    before it's sent to ChromaDB.

    Raises:
        InvalidChunkDataError: If any required field is missing or malformed.
    """
    required_fields = ("page", "chunk_id", "text", "embedding")
    missing = [field for field in required_fields if field not in chunk]

    if missing:
        raise InvalidChunkDataError(
            f"Chunk is missing required field(s): {', '.join(missing)}."
        )

    embedding = chunk.get("embedding")
    if not isinstance(embedding, (list, tuple)) or len(embedding) == 0:
        raise InvalidChunkDataError(
            f"Chunk chunk_id={chunk.get('chunk_id')} has an invalid or empty embedding."
        )


def store_embeddings(
    embedded_chunks: List[Dict[str, object]],
    document_name: str,
) -> int:
    """
    Store embedded text chunks for a document into the ChromaDB
    'documind_collection', upserting so re-runs on the same document
    safely overwrite prior entries instead of duplicating them.

    Args:
        embedded_chunks: List of dicts in the form:
            [{"page": 1, "chunk_id": 1, "text": "...", "embedding": [...]}, ...]
            typically the output of generate_embeddings().
        document_name: Name of the source document, e.g. "resume.pdf".
            Used to build stable, human-readable chunk IDs
            (e.g. "resume.pdf_chunk_1") and stored as metadata.

    Returns:
        The number of chunks successfully upserted.

    Raises:
        InvalidChunkDataError: If input data is malformed.
        ChromaStorageError: If the upsert operation fails.
    """
    if not embedded_chunks:
        return 0

    if not document_name or not document_name.strip():
        raise InvalidChunkDataError("document_name must be a non-empty string.")

    # Validate every chunk up front so a bad record fails fast, before
    # any partial write is attempted against the database.
    for chunk in embedded_chunks:
        _validate_chunk(chunk)

    # Build the parallel lists ChromaDB's upsert() API expects.
    ids: List[str] = []
    embeddings: List[List[float]] = []
    documents: List[str] = []
    metadatas: List[Dict[str, object]] = []

    for chunk in embedded_chunks:
        chunk_id = chunk["chunk_id"]
        page = chunk["page"]
        text = str(chunk["text"])
        embedding = list(chunk["embedding"])

        # Stable, human-readable ID per chunk, scoped to the source document
        # (e.g. "resume.pdf_chunk_1"). Reusing this ID on re-ingestion
        # causes upsert() to overwrite the existing entry rather than duplicate it.
        ids.append(f"{document_name}_chunk_{chunk_id}")
        embeddings.append(embedding)
        documents.append(text)
        metadatas.append({
            "page": page,
            "chunk_id": chunk_id,
            "source_document": document_name,
        })

    collection = _get_collection()

    try:
        # upsert (not add) so re-processing the same document updates
        # existing vectors in place instead of creating duplicates.
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
    except Exception as e:
        raise ChromaStorageError(
            f"Failed to upsert {len(ids)} chunk(s) for document "
            f"'{document_name}' into ChromaDB: {str(e)}"
        )

    return len(ids)

def query_collection(
    query_embedding: List[float],
    top_k: int = 5,
) -> List[Dict[str, object]]:
    """
    Run a similarity search against the 'documind_collection' using a
    precomputed query embedding, and return the closest matching chunks.
    """
    if not isinstance(query_embedding, (list, tuple)) or len(query_embedding) == 0:
        raise InvalidChunkDataError("query_embedding must be a non-empty list of floats.")
    if top_k <= 0:
        raise InvalidChunkDataError("top_k must be greater than 0.")

    collection = _get_collection()

    try:
        results = collection.query(
            query_embeddings=[list(query_embedding)],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        raise ChromaQueryError(f"ChromaDB similarity search failed: {str(e)}")

    documents = (results.get("documents") or [[]])[0]
    metadatas = (results.get("metadatas") or [[]])[0]
    distances = (results.get("distances") or [[]])[0]

    matches: List[Dict[str, object]] = []
    for text, metadata, distance in zip(documents, metadatas, distances):
        metadata = metadata or {}
        matches.append({
            "text": text,
            "page": metadata.get("page"),
            "chunk_id": metadata.get("chunk_id"),
            "source_document": metadata.get("source_document"),
            "distance": distance,
        })

    return matches
