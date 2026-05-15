from pydantic import BaseModel, Field


class ActionableRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)


class ActionableResponse(BaseModel):
    actionable: str
