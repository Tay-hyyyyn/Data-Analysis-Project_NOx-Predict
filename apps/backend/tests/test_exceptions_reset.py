"""Reset 기능 도메인 예외 단위 테스트."""

import pytest

from app.exceptions import (
    DomainError,
    InvalidResetPasswordError,
    ResetUnavailableError,
)


def test_reset_unavailable_error_inherits_domain_error_with_code():
    err = ResetUnavailableError("docker socket missing")
    assert isinstance(err, DomainError)
    assert err.error_code == "RESET_UNAVAILABLE"
    assert str(err) == "docker socket missing"


def test_invalid_reset_password_error_inherits_domain_error_with_code():
    err = InvalidResetPasswordError()
    assert isinstance(err, DomainError)
    assert err.error_code == "INVALID_RESET_PASSWORD"
    assert str(err) == "Reset password does not match"
