from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.actionable import router as actionable_router
from dotenv import load_dotenv

load_dotenv()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Taskifier AI",
        version="0.1.0",
        description="Internal AI service for Taskifier — rewrites tasks into actionable statements",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://192.168.1.180:3000"],
        allow_credentials=True,
        allow_methods=["POST"],
        allow_headers=["*"],
    )

    app.include_router(actionable_router)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
