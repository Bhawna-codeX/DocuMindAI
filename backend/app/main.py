from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import upload, chat

app = FastAPI(
    title="DocuMind AI",
    version="1.0.0"
)

# Allow React frontend to communicate with FastAPI

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://docu-mind-ai-rosy.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
   

app.include_router(upload.router)
app.include_router(chat.router)


@app.get("/")
def home():
    return {
        "message": "Welcome to DocuMind AI 🚀",
        "status": "Backend Running"
    }