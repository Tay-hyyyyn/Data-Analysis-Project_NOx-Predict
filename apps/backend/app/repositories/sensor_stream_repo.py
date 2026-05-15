"""sensor_data_stream 폴링 전용 repository.

KafkaSensorStream과 별개 경로 — kafka-etl-consumer가 적재한 row를
backend가 ingested_at cursor 기반으로 단조 증가 순서로 pull.

DDL은 `database/sensor_data_stream.sql` — 14 운영 컬럼 + 5 lineage + ingested_at.
schema SoT 변경은 협의 필요(`AGENTS.md` root 가드).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker

logger = logging.getLogger(__name__)

# sensor_data_stream의 14 운영 컬럼 — DDL 순서 보존.
# SensorBuffer가 받는 도메인 dict 키와 1:1 매핑(DB 컬럼명 == 도메인 식별자).
_STREAM_COLUMNS: tuple[str, ...] = (
    "syngas_flow",
    "igv_opening",
    "n2_offset",
    "n2_valve_1",
    "syngas_srv",
    "syngas_gcv_1",
    "syngas_gcv_1a",
    "syngas_gcv_2",
    "ibh_valve",
    "n2_flow",
    "nox_ppm",
    "exhaust_temp",
    "power_mw",
    "npr_primary",
)


class SensorStreamRepository:
    """sensor_data_stream의 stream-mode row를 ingested_at 기준으로 polling.

    bootstrap row는 별도 경로(KafkaSensorStream의 CSV)에서 들어오므로
    `ingest_mode='stream'`으로 한정해 중복 흡수를 방지한다.
    """

    def __init__(self, db_session_factory: sessionmaker[Session]):
        self.session_factory = db_session_factory

    async def fetch_since(
        self,
        ingested_at_after: datetime | None,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        """ingested_at > cursor 인 stream row를 ASC 정렬로 반환.

        cursor가 None이면 latest_ingested_at에서 시작하라는 의미 — 호출자가
        명시적으로 latest_ingested_at()으로 초기화한 뒤 호출한다.
        """
        if ingested_at_after is None:
            raise ValueError("ingested_at_after cursor required (use latest_ingested_at)")
        return await asyncio.to_thread(self._fetch_sync, ingested_at_after, limit)

    async def latest_ingested_at(self) -> datetime | None:
        """초기 cursor 결정용. 빈 테이블이면 None."""
        return await asyncio.to_thread(self._latest_sync)

    def _fetch_sync(self, cursor: datetime, limit: int) -> list[dict[str, Any]]:
        col_list = ", ".join(_STREAM_COLUMNS)
        sql = text(
            f"""
            SELECT measured_at, ingested_at, {col_list}
            FROM sensor_data_stream
            WHERE ingested_at > :cursor AND ingest_mode = 'stream'
            ORDER BY ingested_at ASC
            LIMIT :limit
            """
        )
        with self.session_factory() as session:
            result = session.execute(sql, {"cursor": cursor, "limit": int(limit)})
            rows = result.mappings().all()
        return [self._to_domain_dict(r) for r in rows]

    def _latest_sync(self) -> datetime | None:
        sql = text(
            """
            SELECT MAX(ingested_at) AS latest
            FROM sensor_data_stream
            WHERE ingest_mode = 'stream'
            """
        )
        with self.session_factory() as session:
            row = session.execute(sql).mappings().first()
        if row is None:
            return None
        latest = row["latest"]
        return latest if isinstance(latest, datetime) else None

    @staticmethod
    def _to_domain_dict(row: Any) -> dict[str, Any]:
        # sqlalchemy RowMapping → plain dict (SensorBuffer가 dict[str, Any] 기대).
        # ingested_at은 cursor 전진용으로 보존, measured_at은 도메인 시각.
        out: dict[str, Any] = {col: row[col] for col in _STREAM_COLUMNS}
        out["measured_at"] = row["measured_at"]
        out["ingested_at"] = row["ingested_at"]
        return out
