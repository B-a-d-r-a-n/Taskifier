from fastapi import APIRouter, HTTPException
from models.schemas import ActionableRequest, ActionableResponse
from services.ollama import generate_actionable
import httpx

router = APIRouter()


@router.post("/actionable", response_model=ActionableResponse)
def actionable(req: ActionableRequest) -> ActionableResponse:
    try:
        result = generate_actionable(req.title, req.description)
        if not result:
            raise HTTPException(status_code=502, detail="AI returned empty response")
        return ActionableResponse(actionable=result)
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=502,
            detail="AI service unavailable right now",
        )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=502,
            detail="AI service unavailable right now",
        )
