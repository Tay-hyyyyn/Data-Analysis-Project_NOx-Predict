"""SensorStreamRepository → SensorBuffer 폴링 어댑터.

KafkaSensorStream의 DB 버전. Kafka consumer 대신 ingested_at 기반 단조 증가
폴링으로 stream row를 SensorBuffer에 주입한다.

상호배타 — KafkaSensorStream과 동시 활성화 금지(둘 다 buffer.append → 중복).
lifespan에서 KAFKA_STREAM_ENABLED ↔ SENSOR_STREAM_POLL_ENABLED 가드.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from datetime import datetime
from typing import Any

from app.core.sensor_buffer import SensorBuffer
from app.repositories.sensor_stream_repo import SensorStreamRepository

logger = logging.getLogger(__name__)

# DB 폴링 실패 임계 — 5회 연속 실패 시 down 판정 + warning 로그.
_FAILURE_THRESHOLD = 5


class SensorStreamPoller:
    """sensor_data_stream을 주기 폴링해 SensorBuffer에 append."""

    def __init__(
        self,
        repo: SensorStreamRepository,
        sensor_buffer: SensorBuffer,
        *,
        poll_interval_sec: float = 1.0,
        fetch_limit: int = 200,
    ) -> None:
        self._repo = repo
        self._buffer = sensor_buffer
        self._poll_interval = poll_interval_sec
        self._fetch_limit = fetch_limit
        self._last_seen: datetime | None = None
        self._task: asyncio.Task[None] | None = None
        self._stop_event: asyncio.Event | None = None
        self._consecutive_failures = 0
        self._down = False
        self._last_error: str | None = None

    @property
    def last_seen(self) -> datetime | None:
        return self._last_seen

    @property
    def is_down(self) -> bool:
        return self._down

    @property
    def last_error(self) -> str | None:
        return self._last_error

    async def start(self) -> None:
        """초기 cursor를 latest_ingested_at로 설정 후 폴링 루프 시작.

        latest 조회 실패 시 cursor=epoch 0으로 시작하면 전체 테이블 재처리
        위험 → 시작 자체를 skip하고 down 상태로 진입(다음 tick에서 재시도).
        """
        if self._task is not None:
            return
        try:
            self._last_seen = await self._repo.latest_ingested_at()
        except Exception as exc:
            logger.error("sensor_stream_poll_init_failed err=%s", exc)
            self._last_error = repr(exc)
            self._consecutive_failures = _FAILURE_THRESHOLD
            self._down = True
            # cursor 미설정 상태로는 fetch_since 호출 불가 — 루프는 시작하되
            # _last_seen이 None이면 매 tick latest 재조회로 자기 치유.
        logger.info(
            "sensor_stream_poller_started last_seen=%s interval=%.2fs",
            self._last_seen, self._poll_interval,
        )
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run(), name="sensor_stream_poller")

    async def stop(self) -> None:
        if self._task is None:
            return
        assert self._stop_event is not None
        self._stop_event.set()
        with suppress(asyncio.CancelledError):
            await self._task
        self._task = None
        self._stop_event = None
        logger.info("sensor_stream_poller_stopped")

    async def _run(self) -> None:
        assert self._stop_event is not None
        while not self._stop_event.is_set():
            await self._tick_once()
            try:
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=self._poll_interval,
                )
            except asyncio.TimeoutError:
                pass

    async def _tick_once(self) -> None:
        try:
            await self._fetch_and_append()
        except Exception as exc:
            self._record_failure(exc)
            return
        self._record_success()

    async def _fetch_and_append(self) -> None:
        # cursor 미설정(start init 실패) → latest 재조회로 복구 시도.
        if self._last_seen is None:
            self._last_seen = await self._repo.latest_ingested_at()
            if self._last_seen is None:
                return  # 여전히 빈 테이블 — 다음 tick에서 재시도.
        rows = await self._repo.fetch_since(self._last_seen, limit=self._fetch_limit)
        if not rows:
            return
        for row in rows:
            self._buffer.append(self._strip_lineage(row))
        # 마지막 row의 ingested_at으로 cursor 전진(ASC 정렬 보장).
        self._last_seen = rows[-1]["ingested_at"]

    @staticmethod
    def _strip_lineage(row: dict[str, Any]) -> dict[str, Any]:
        # SensorBuffer는 도메인 키만 기대 — lineage용 ingested_at은 제거.
        # measured_at은 SessionContext가 시각 분석용으로 사용하므로 보존.
        return {k: v for k, v in row.items() if k != "ingested_at"}

    def _record_success(self) -> None:
        if self._down:
            logger.info("sensor_stream_poll_recovered last_seen=%s", self._last_seen)
        self._consecutive_failures = 0
        self._down = False
        self._last_error = None

    def _record_failure(self, exc: BaseException) -> None:
        self._consecutive_failures += 1
        self._last_error = repr(exc)
        if (
            not self._down
            and self._consecutive_failures >= _FAILURE_THRESHOLD
        ):
            self._down = True
            logger.error(
                "sensor_stream_poll_db_down failures=%d err=%s",
                self._consecutive_failures, exc,
            )
        else:
            logger.warning(
                "sensor_stream_poll_failed n=%d err=%s",
                self._consecutive_failures, exc,
            )
