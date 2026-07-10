"""
rag_service.py
Retrieval-Augmented Generation orchestration service.
"""

import os
from typing import List, Dict

from dotenv import load_dotenv
from google import genai

from app.services.embedding_service import (
    generate_embeddings,
    MissingAPIKeyError,
    EmbeddingGenerationError,
)
from app.services.chroma_service import (
    query_collection,
    ChromaQueryError,
    InvalidChunkDataError,
)


class RetrievalError(Exception):
    """Raised when relevant chunks cannot be retrieved for a question."""
    pass


class AnswerGenerationError(Exception):
    """Raised when Gemini fails to generate an answer from the retrieved context."""
    pass


GEMINI_CHAT_MODEL = "gemini-2.5-flash"
NOT_FOUND_MESSAGE = "I couldn't find that information in the uploaded document."
DEFAULT_TOP_K = 5


def _load_api_key() -> str:
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise MissingAPIKeyError("GEMINI_API_KEY not found. Please set it in your .env file.")
    return api_key


def _build_client() -> genai.Client:
    """Fresh client per call — no module-level global state."""
    return genai.Client(api_key=_load_api_key())


def retrieve_relevant_chunks(question: str,document_name: str, top_k: int = DEFAULT_TOP_K) -> List[Dict[str, object]]:
    """Embed the question (via embedding_service) and search ChromaDB (via chroma_service)."""
    if not question or not question.strip():
        raise RetrievalError("question must be a non-empty string.")

    # Reuse generate_embeddings() by wrapping the question in the same
    # chunk-shaped dict it expects, instead of duplicating Gemini call logic.
    pseudo_chunk = [{"page": 0, "chunk_id": 0, "text": question}]

    try:
        embedded = generate_embeddings(pseudo_chunk,task_type="RETRIEVAL_QUERY")
    except (MissingAPIKeyError, EmbeddingGenerationError) as e:
        raise RetrievalError(f"Failed to embed question: {str(e)}")

    if not embedded or "embedding" not in embedded[0]:
        raise RetrievalError("Embedding generation returned no result for the question.")

    question_embedding = embedded[0]["embedding"]

    try:
        matches = query_collection(query_embedding=question_embedding,document_name=document_name, top_k=top_k)
    except (InvalidChunkDataError, ChromaQueryError) as e:
        raise RetrievalError(f"Failed to retrieve relevant chunks: {str(e)}")

    return matches


def _build_prompt(question: str, context_chunks: List[Dict[str, object]]) -> str:
    """Assemble a strict, context-grounded prompt."""
    context_sections = []
    for chunk in context_chunks:
        source = chunk.get("source_document", "unknown")
        page = chunk.get("page", "unknown")
        text = chunk.get("text", "")
        context_sections.append(f"[Source: {source}, Page: {page}]\n{text}")

    context_block = "\n\n---\n\n".join(context_sections)

    return (
        "You are a document question-answering assistant. "
        "Answer the question using ONLY the information in the context below. "
        "Do not use any outside knowledge. "
        f'If the answer is not present in the context, respond exactly with: "{NOT_FOUND_MESSAGE}"\n\n'
        f"Context:\n{context_block}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )


def generate_answer(question: str, context_chunks: List[Dict[str, object]]) -> str:
    """Generate an answer with Gemini 2.5 Flash, grounded strictly in context_chunks."""
    if not context_chunks:
        return NOT_FOUND_MESSAGE

    prompt = _build_prompt(question, context_chunks)
    client = _build_client()

    try:
        response = client.models.generate_content(
            model=GEMINI_CHAT_MODEL,
            contents=prompt,
        )
    except Exception as e:
        raise AnswerGenerationError(f"Gemini API call failed while generating an answer: {str(e)}")

    answer_text = getattr(response, "text", None)
    if not answer_text or not answer_text.strip():
        raise AnswerGenerationError("Gemini returned an empty response.")

    return answer_text.strip()


def ask_question(question: str,document_name: str, top_k: int = DEFAULT_TOP_K) -> Dict[str, object]:
    """End-to-end RAG entry point: retrieve -> generate -> return question/answer/sources."""
    context_chunks = retrieve_relevant_chunks(question,document_name, top_k=top_k)
    answer = generate_answer(question, context_chunks)

    sources = [
        {
            "source_document": chunk.get("source_document"),
            "page": chunk.get("page"),
            "chunk_id": chunk.get("chunk_id"),
        }
        for chunk in context_chunks
    ]

    return {
        "question": question,
        "answer": answer,
        "sources": sources,
    }