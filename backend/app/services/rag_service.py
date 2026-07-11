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


GEMINI_CHAT_MODEL = "gemini-3.5-flash"
NOT_FOUND_MESSAGE = "I couldn't find that information in the uploaded document."
DEFAULT_TOP_K = 5
# ----------------------------
# Conversation Memory
# ----------------------------

MAX_HISTORY = 10

conversation_history: Dict[str, List[Dict[str, str]]] = {}


def _load_api_key() -> str:
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise MissingAPIKeyError("GEMINI_API_KEY not found. Please set it in your .env file.")
    return api_key


def _build_client() -> genai.Client:
    """Fresh client per call — no module-level global state."""
    return genai.Client(api_key=_load_api_key())

def get_history(session_id: str):
    return conversation_history.get(session_id, [])


def update_history(session_id: str, question: str, answer: str):

    history = conversation_history.get(session_id, [])

    history.append({
        "role": "user",
        "content": question,
    })

    history.append({
        "role": "assistant",
        "content": answer,
    })

    history = history[-MAX_HISTORY:]

    conversation_history[session_id] = history


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


def _build_prompt(question: str, context_chunks: List[Dict[str, object]],history: List[Dict[str, str]],) -> str:
    """Assemble a strict, context-grounded prompt."""
    context_sections = []
    for chunk in context_chunks:
        source = chunk.get("source_document", "unknown")
        page = chunk.get("page", "unknown")
        text = chunk.get("text", "")
        context_sections.append(f"[Source: {source}, Page: {page}]\n{text}")

    context_block = "\n\n---\n\n".join(context_sections)

    history_text = ""

    for message in history:

        history_text += (
            f"{message['role'].capitalize()}: "
            f"{message['content']}\n"
        )

    return f"""
    You are DocuMind AI, an intelligent PDF document assistant.

    Your task is to answer ONLY using the information provided in the document context.

    IMPORTANT RULES

    1. Never use outside knowledge.
    2. Never guess.
    3. If the answer is not present, reply exactly:

    {NOT_FOUND_MESSAGE}

    4. Write in clean Markdown.
    5. Use headings where appropriate.
    6. Use bullet points whenever listing information.
    7. Keep answers concise but complete.
    8. If the answer comes from a specific page, naturally mention the page number.
    9. If the question asks for a summary, provide a structured summary instead of one long paragraph.

    -------------------------
    CONVERSATION HISTORY
    -------------------------

    {history_text}
    -------------------------
    DOCUMENT CONTEXT
    -------------------------

    {context_block}

    -------------------------
    USER QUESTION
    -------------------------

    {question}

    -------------------------
    ANSWER
    -------------------------
    """


def generate_answer(question: str, context_chunks: List[Dict[str, object]],session_id: str,) -> str:
    """Generate an answer with Gemini 2.5 Flash, grounded strictly in context_chunks."""
    if not context_chunks:
        return NOT_FOUND_MESSAGE

    history = get_history(session_id)

    prompt = _build_prompt(
        question,
        context_chunks,
        history,
    )
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


def ask_question(question: str,document_name: str,session_id: str, top_k: int = DEFAULT_TOP_K) -> Dict[str, object]:
    """End-to-end RAG entry point: retrieve -> generate -> return question/answer/sources."""
    context_chunks = retrieve_relevant_chunks(question,document_name, top_k=top_k)
    answer = generate_answer(question, context_chunks,session_id,)
    update_history(
        session_id,
        question,
        answer,
    )
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