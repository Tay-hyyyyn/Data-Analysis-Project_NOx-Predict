"""SensorStreamPoller — SensorStreamRepository → SensorBuffer 주입 검증."""

import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock

import pytest

from app.core.sensor_buffer import SensorBuffer
from app.core.sensor_stream_poller import SensorStreamPoller


def _row(ingested_at: datetime, nox_ppm: float = 30.0) -> dict:
    return {
        "syngas_flow": 100.0, "igv_opening": 80.0, "n2_offset": 5.0,
        "n2_valve_1": 42.0, "syngas_srv": 60.0, "syngas_gcv_1": 55.0,
        "syngas_gcv_1a": 54.0, "syngas_gcv_2": 53.0, "ibh_valve": 30.0,
        "n2_flow": 25.0, "nox_ppm": nox_ppm, "exhaust_temp": 580.0,
        "power_mw": 165.0, "npr_primary": 1.5,
        "measured_at": ingested_at, "ingested_at": ingested_at,
    }


def _make_poller(
    fetch_rows: list[dict] | Exception,
    initial_latest: datetime | None = datetime(2026, 5, 15, 10, 0, 0),
) -> tuple[SensorStreamPoller, SensorBuffer, AsyncMock]:
    repo = AsyncMock()
    repo.latest_ingested_at.return_value = initial_latest
    if isinstance(fetch_rows, Exception):
        repo.fetch_since.side_effect = fetch_rows
    else:
        repo.fetch_since.return_value = fetch_rows
    buf = SensorBuffer(maxlen=900)
    poller = SensorStreamPoller(repo, buf, poll_interval_sec=0.01)
    return poller, buf, repo


@pytest.mark.asyncio
async def test_tick_appends_rows_to_buffer():
    """fetch_since 결과가 그대로 SensorBuffer.append 된다(ingested_at 제외)."""
    base = datetime(2026, 5, 15, 10, 0, 1)
    rows = [_row(base + timedelta(seconds=i), nox_ppm=30.0 + i) for i in range(3)]
    poller, buf, repo = _make_poller(rows)
    await poller.start()
    try:
        await asyncio.sleep(0.05)
    finally:
        await poller.stop()

    assert len(buf) >= 3
    latest = buf.latest_row()
    assert latest is not None
    assert "ingested_at" not in latest  # lineage strip
    assert "measured_at" in latest
    assert latest["nox_ppm"] in {30.0, 31.0, 32.0}


@pytest.mark.asyncio
async def test_last_seen_advances_to_last_row_ingested_at():
    """ASC 정렬 가정 — cursor가 마지막 row.ingested_at으로 전진."""
    base = datetime(2026, 5, 15, 10, 0, 1)
    rows = [_row(base + timedelta(seconds=i)) for i in range(3)]
    poller, _, repo = _make_poller(rows, initial_latest=base - timedelta(seconds=1))
    await poller.start()
    try:
        await asyncio.sleep(0.05)
    finally:
        await poller.stop()

    assert poller.last_seen == base + timedelta(seconds=2)


@pytest.mark.asyncio
async def test_empty_fetch_does_not_advance_cursor():
    initial = datetime(2026, 5, 15, 10, 0, 0)
    poller, _, _ = _make_poller([], initial_latest=initial)
    await poller.start()
    try:
        await asyncio.sleep(0.05)
    finally:
        await poller.stop()
    assert poller.last_seen == initial


@pytest.mark.asyncio
async def test_consecutive_failures_mark_down_after_threshold():
    """5회 연속 실패 시 is_down=True + last_error 보존."""
    poller, _, repo = _make_poller(RuntimeError("db boom"))
    await poller.start()
    try:
        # poll_interval=0.01s × ~10 tick → 5회 threshold 충분히 초과.
        await asyncio.sleep(0.15)
    finally:
        await poller.stop()

    assert poller.is_down is True
    assert poller.last_error is not None
    assert "db boom" in poller.last_error


@pytest.mark.asyncio
async def test_recovery_resets_failure_state():
    """down 상태에서 다음 fetch 성공 시 자동 복구."""
    base = datetime(2026, 5, 15, 10, 0, 1)
    repo = AsyncMock()
    repo.latest_ingested_at.return_value = base - timedelta(seconds=1)

    call_counter = {"n": 0}
    success_row = _row(base)

    async def fetch_side_effect(*args, **kwargs):
        call_counter["n"] += 1
        if call_counter["n"] <= 5:
            raise RuntimeError("db boom")
        return [success_row]

    repo.fetch_since.side_effect = fetch_side_effect
    buf = SensorBuffer(maxlen=900)
    poller = SensorStreamPoller(repo, buf, poll_interval_sec=0.01)

    await poller.start()
    try:
        await asyncio.sleep(0.25)
    finally:
        await poller.stop()

    assert poller.is_down is False
    assert poller.last_error is None
    assert len(buf) >= 1


@pytest.mark.asyncio
async def test_start_with_repo_init_failure_does_not_crash():
    """latest_ingested_at 초기 조회 실패 시 down 상태로 시작하되 crash 없음."""
    repo = AsyncMock()
    repo.latest_ingested_at.side_effect = RuntimeError("init boom")
    buf = SensorBuffer(maxlen=900)
    poller = SensorStreamPoller(repo, buf, poll_interval_sec=0.01)

    await poller.start()
    try:
        await asyncio.sleep(0.02)
    finally:
        await poller.stop()

    assert poller.is_down is True
    assert poller.last_seen is None


@pytest.mark.asyncio
async def test_stop_is_idempotent():
    poller, _, _ = _make_poller([])
    await poller.start()
    await poller.stop()
    await poller.stop()  # double stop must not raise
