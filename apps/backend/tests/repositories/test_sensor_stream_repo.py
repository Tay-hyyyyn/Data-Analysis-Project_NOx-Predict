"""SensorStreamRepository — sensor_data_stream 폴링 경로 검증."""

from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest

from app.repositories.sensor_stream_repo import SensorStreamRepository


@pytest.fixture
def mock_session_factory():
    """sensor_repo 테스트와 동일 패턴 — 동기 sessionmaker mock."""
    session = MagicMock()
    factory = MagicMock()
    factory.return_value.__enter__ = MagicMock(return_value=session)
    factory.return_value.__exit__ = MagicMock(return_value=None)
    return factory, session


def _set_rows(session, rows):
    session.execute.return_value.mappings.return_value.all.return_value = rows


def _set_first(session, row):
    session.execute.return_value.mappings.return_value.first.return_value = row


def _stream_row(
    ingested_at: datetime,
    measured_at: datetime,
    nox_ppm: float = 30.0,
) -> dict:
    """14 운영 + measured_at + ingested_at — DDL 컬럼 전부 채움."""
    return {
        "measured_at": measured_at,
        "ingested_at": ingested_at,
        "syngas_flow": 100.0,
        "igv_opening": 80.0,
        "n2_offset": 5.0,
        "n2_valve_1": 42.0,
        "syngas_srv": 60.0,
        "syngas_gcv_1": 55.0,
        "syngas_gcv_1a": 54.0,
        "syngas_gcv_2": 53.0,
        "ibh_valve": 30.0,
        "n2_flow": 25.0,
        "nox_ppm": nox_ppm,
        "exhaust_temp": 580.0,
        "power_mw": 165.0,
        "npr_primary": 1.5,
    }


@pytest.mark.asyncio
async def test_fetch_since_returns_domain_rows(mock_session_factory):
    """ingest_mode='stream' + ingested_at > cursor 결과를 도메인 dict로 반환."""
    factory, session = mock_session_factory
    base = datetime(2026, 5, 15, 10, 0, 0)
    rows = [
        _stream_row(base + timedelta(seconds=i), base + timedelta(seconds=i), nox_ppm=30.0 + i)
        for i in range(3)
    ]
    _set_rows(session, rows)

    repo = SensorStreamRepository(factory)
    result = await repo.fetch_since(base - timedelta(seconds=1), limit=10)

    assert len(result) == 3
    assert result[0]["nox_ppm"] == 30.0
    assert result[-1]["nox_ppm"] == 32.0
    # 도메인 키 14개 + measured_at + ingested_at = 16
    assert set(result[0].keys()) >= {"syngas_flow", "nox_ppm", "exhaust_temp", "measured_at", "ingested_at"}


@pytest.mark.asyncio
async def test_fetch_since_empty_when_no_new_rows(mock_session_factory):
    factory, session = mock_session_factory
    _set_rows(session, [])
    repo = SensorStreamRepository(factory)
    result = await repo.fetch_since(datetime(2026, 5, 15, 10, 0, 0), limit=10)
    assert result == []


@pytest.mark.asyncio
async def test_fetch_since_rejects_none_cursor(mock_session_factory):
    """None cursor는 explicit error — 호출자가 latest_ingested_at으로 초기화 필요."""
    factory, _ = mock_session_factory
    repo = SensorStreamRepository(factory)
    with pytest.raises(ValueError, match="cursor required"):
        await repo.fetch_since(None)


@pytest.mark.asyncio
async def test_fetch_since_passes_cursor_and_limit_to_query(mock_session_factory):
    """SQL 바인드 파라미터로 cursor·limit이 정확히 전달."""
    factory, session = mock_session_factory
    _set_rows(session, [])
    repo = SensorStreamRepository(factory)
    cursor = datetime(2026, 5, 15, 10, 0, 0)
    await repo.fetch_since(cursor, limit=50)
    call_args = session.execute.call_args
    params = call_args[0][1]
    assert params == {"cursor": cursor, "limit": 50}


@pytest.mark.asyncio
async def test_latest_ingested_at_returns_max(mock_session_factory):
    factory, session = mock_session_factory
    latest = datetime(2026, 5, 15, 10, 5, 0)
    _set_first(session, {"latest": latest})
    repo = SensorStreamRepository(factory)
    assert await repo.latest_ingested_at() == latest


@pytest.mark.asyncio
async def test_latest_ingested_at_returns_none_for_empty_table(mock_session_factory):
    factory, session = mock_session_factory
    _set_first(session, {"latest": None})
    repo = SensorStreamRepository(factory)
    assert await repo.latest_ingested_at() is None
