"""ResetUnavailable/InvalidResetPassword 예외 → HTTP 매핑 테스트."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.errors import register_exception_handlers
from app.exceptions import InvalidResetPasswordError, ResetUnavailableError


def _build_app() -> FastAPI:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/raise-unavailable")
    def _raise_unavailable():
        raise ResetUnavailableError("docker socket missing")

    @app.get("/raise-invalid-pw")
    def _raise_invalid_pw():
        raise InvalidResetPasswordError()

    return app


def test_reset_unavailable_returns_503_with_error_code():
    client = TestClient(_build_app())
    res = client.get("/raise-unavailable")
    assert res.status_code == 503
    body = res.json()
    assert body["detail"] == "docker socket missing"
    assert body["error_code"] == "RESET_UNAVAILABLE"


def test_invalid_reset_password_returns_401_with_error_code():
    client = TestClient(_build_app())
    res = client.get("/raise-invalid-pw")
    assert res.status_code == 401
    body = res.json()
    assert body["detail"] == "Reset password does not match"
    assert body["error_code"] == "INVALID_RESET_PASSWORD"
