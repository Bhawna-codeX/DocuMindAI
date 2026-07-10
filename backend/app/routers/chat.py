"""
chat.py
Router for asking questions about uploaded PDFs using the RAG pipeline.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.rag_service import (
    ask_question,
    RetrievalError,
    AnswerGenerationError,
)

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


class ChatRequest(BaseModel):
    question: str
    document_name: str


@router.post("/")
def chat(request: ChatRequest):
    try:
        return ask_question(
            question=request.question,
            document_name=request.document_name,
        )

    except RetrievalError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    except AnswerGenerationError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}",
        )

    except RetrievalError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    except AnswerGenerationError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}",
        )