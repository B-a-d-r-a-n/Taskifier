import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import create_app
from models.schemas import ActionableRequest, ActionableResponse
from services.ollama import build_prompt


@pytest.fixture
def client():
    return TestClient(create_app())


class TestActionableSchema:
    def test_valid_request_with_description(self):
        req = ActionableRequest(title="Meeting notes", description="Review Q1 goals")
        assert req.title == "Meeting notes"
        assert req.description == "Review Q1 goals"

    def test_valid_request_without_description(self):
        req = ActionableRequest(title="Fix bug")
        assert req.title == "Fix bug"
        assert req.description is None

    def test_empty_title_rejected(self):
        with pytest.raises(Exception):
            ActionableRequest(title="")

    def test_response_model(self):
        resp = ActionableResponse(
            actionable="Review all Q1 goals before the meeting ends."
        )
        assert "Review" in resp.actionable


class TestOllamaService:
    def test_build_prompt_with_description(self):
        prompt = build_prompt("Meeting notes", "Review Q1 goals")
        assert "Title: Meeting notes" in prompt
        assert "Description: Review Q1 goals" in prompt

    def test_build_prompt_without_description(self):
        prompt = build_prompt("Fix bug", None)
        assert "Title: Fix bug" in prompt
        assert "Description" not in prompt

    @patch("services.ollama.generate_actionable")
    def test_generate_actionable_success(self, mock_gen):
        mock_gen.return_value = "Fix the login button on the homepage immediately."
        from services.ollama import generate_actionable

        result = generate_actionable("Bug", "Login button broken")
        assert "Fix" in result
        assert len(result) > 0
        mock_gen.assert_called_once_with("Bug", "Login button broken")

    @patch("services.ollama.generate_actionable")
    def test_generate_actionable_empty_response(self, mock_gen):
        mock_gen.return_value = ""
        from services.ollama import generate_actionable

        result = generate_actionable("Task", None)
        assert result == ""

    @patch("services.ollama.generate_actionable")
    def test_generate_actionable_timeout_returns_502(self, mock_gen):
        import httpx

        mock_gen.side_effect = httpx.TimeoutException("timeout")
        from services.ollama import generate_actionable

        with pytest.raises(httpx.TimeoutException):
            generate_actionable("Task", None)

    @patch("services.ollama.generate_actionable")
    def test_generate_actionable_connect_error(self, mock_gen):
        import httpx

        mock_gen.side_effect = httpx.ConnectError("connection refused")
        from services.ollama import generate_actionable

        with pytest.raises(httpx.ConnectError):
            generate_actionable("Task", None)


class TestActionableEndpoint:
    def test_health_check(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}

    def test_actionable_missing_body(self, client):
        res = client.post("/actionable")
        assert res.status_code == 422

    def test_actionable_missing_title(self, client):
        res = client.post("/actionable", json={"description": "some desc"})
        assert res.status_code == 422

    @patch("routers.actionable.generate_actionable")
    def test_actionable_success(self, mock_gen):
        mock_gen.return_value = "Review all Q1 goals before the meeting ends."
        client = TestClient(create_app())
        res = client.post(
            "/actionable", json={"title": "Meeting notes", "description": "Q1 review"}
        )
        assert res.status_code == 200
        assert "actionable" in res.json()
        assert (
            res.json()["actionable"] == "Review all Q1 goals before the meeting ends."
        )

    @patch("routers.actionable.generate_actionable")
    def test_actionable_no_description(self, mock_gen):
        mock_gen.return_value = "Fix the login button on the homepage immediately."
        client = TestClient(create_app())
        res = client.post("/actionable", json={"title": "Fix bug"})
        assert res.status_code == 200
        assert (
            res.json()["actionable"]
            == "Fix the login button on the homepage immediately."
        )

    @patch("routers.actionable.generate_actionable")
    def test_actionable_ollama_unreachable_returns_502(self, mock_gen):
        import httpx

        mock_gen.side_effect = httpx.ConnectError("connection refused")
        client = TestClient(create_app())
        res = client.post("/actionable", json={"title": "Task"})
        assert res.status_code == 502

    @patch("routers.actionable.generate_actionable")
    def test_actionable_timeout_returns_502(self, mock_gen):
        import httpx

        mock_gen.side_effect = httpx.TimeoutException("timeout")
        client = TestClient(create_app())
        res = client.post("/actionable", json={"title": "Task"})
        assert res.status_code == 502
