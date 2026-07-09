from fastapi import FastAPI

from app.routers import upload, chat

app = FastAPI(
    title="DocuMind AI",
    version="1.0.0"
)

app.include_router(upload.router)
app.include_router(chat.router)

@app.get("/")
def home():
    return {
        "message": "Welcome to DocuMind AI 🚀",
        "status": "Backend Running"
    }