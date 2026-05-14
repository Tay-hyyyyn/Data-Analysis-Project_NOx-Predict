"""도메인 예외 → HTTP 응답 변환."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.exceptions import (
    DomainError,
    DataNotEnoughError,
    DataSourceUnavailableError,
    InvalidControlInputError,
    InvalidResetPasswordError,
    PredictorUnavailableError,
    ResetUnavailableError,
    SessionLimitExceededError,
    SessionModeConflictError,
    SessionNotFoundError,
)


_STATUS_MAP: dict[type[DomainError], int] = {
    SessionNotFoundError: 404,
    SessionLimitExceededError: 429,
    InvalidControlInputError: 400,
    PredictorUnavailableError: 503,
    DataNotEnoughError: 503,
    DataSourceUnavailableError: 503,
    SessionModeConflictError: 409,
    ResetUnavailableError: 503,
    InvalidResetPasswordError: 401,
}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
        status = _STATUS_MAP.get(type(exc), 400)
        return JSONResponse(
            status_code=status,
            content={"detail": str(exc) or exc.error_code, "error_code": exc.error_code},
        )
