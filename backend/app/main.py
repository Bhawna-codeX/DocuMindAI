from fastapi import FastAPI

from app.routers.upload import router as upload_router

app = FastAPI(
    title="DocuMind AI",
    version="1.0.0"
)

app.include_router(upload_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to DocuMind AI",
        "status": "Backend Running"
    }