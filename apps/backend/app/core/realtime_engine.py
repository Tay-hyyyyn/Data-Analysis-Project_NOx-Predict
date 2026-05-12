"""1초 tick 통합 엔진.

모든 활성 세션을 1개 asyncio task가 순회하며 mode/override 기반으로 추론한다.
기존 SimLoopManager 폐기, RealtimeEngine이 단일 진입점.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from typing import Any

from app.adapters.forecaster import Forecaster, ForecastInput
from app.adapters.simulator import Simulator
from app.config import Settings
from app.core.sensor_buffer import SensorBuffer
from app.core.session import Session
from app.core.ws_manager import WebSocketManager
from digital_twin.simulation import (
    DEFAULT_CONFIG,
    ControlVars,
    DTConfig,
    OutputVars,
)

logger = logging.getLogger(__name__)

FORECAST_HORIZON_MINUTES = 5  # spec §0.2


class RealtimeEngine:
    """전역 1초 tick + 세션 순회 + WS broadcast."""

    def __init__(
        self,
        settings: Settings,
        sensor_buffer: SensorBuffer,
        simulator: Simulator,
        forecaster: Forecaster,
        ws_manager: WebSocketManager,
        sessions: dict[str, Session],
        dt_config: DTConfig = DEFAULT_CONFIG,
    ) -> None:
        self.settings = settings
        self.sensor_buffer = sensor_buffer
        self.simulator = simulator
        self.forecaster = forecaster
        self.ws_manager = ws_manager
        self.sessions = sessions
        self.dt_config = dt_config
        self.tick_interval = dt_config.sim_step.dt
        self._task: asyncio.Task[None] | None = None
        self._stop_event: asyncio.Event | None = None

    async def start(self) -> None:
        if self._task is not None:
            return
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run_forever(), name="realtime-engine")
        logger.info("RealtimeEngine started (tick=%.2fs)", self.tick_interval)

    async def stop(self) -> None:
        if self._stop_event is not None:
            self._stop_event.set()
        if self._task is not None:
            self._task.cancel()
            with suppress(asyncio.CancelledError):
                await self._task
        self._task = None
        self._stop_event = None

    async def _run_forever(self) -> None:
        try:
            while self._stop_event is not None and not self._stop_event.is_set():
                await self._tick()
                await asyncio.sleep(self.tick_interval)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("realtime_engine_crashed")

    async def _tick(self) -> None:
        kafka_row = self.sensor_buffer.latest_row()
        if kafka_row is None:
            return  # buffer 비어있음 — bootstrap 실패한 비정상 상태
        sessions_snapshot = list(self.sessions.items())
        if not sessions_snapshot:
            return
        await asyncio.gather(
            *[
                self._step_and_broadcast(sid, session, kafka_row)
                for sid, session in sessions_snapshot
            ],
            return_exceptions=True,
        )

    async def _step_and_broadcast(
        self, sid: str, session: Session, kafka_row: dict[str, Any]
    ) -> None:
        try:
            session.tick += 1
            payload = self._step_session(session, kafka_row)
            await self.ws_manager.broadcast(sid, payload)
        except Exception:
            logger.exception("tick_failed sid=%s", sid)

    def _step_session(
        self, session: Session, kafka_row: dict[str, Any]
    ) -> dict[str, Any]:
        kafka_controls = self._kafka_row_to_controls(kafka_row)

        # 1. input_controls 결정
        if session.control_override is not None:
            input_controls = session.control_override
            override_active = True
        else:
            input_controls = kafka_controls
            override_active = False

        # 2. SessionContext.recent_df_buffer 갱신 (외란 + 사용된 제어)
        synthesized = self._synthesize_row(kafka_row, input_controls)
        session.context.recent_df_buffer.append(synthesized)

        # 3. DT current 추론
        current_outputs = self.simulator.predict_for_session(
            input_controls, session.context
        )

        # 4. realtime 모드면 forecast
        forecast_payload = None
        warning = None
        if session.mode == "realtime":
            try:
                features = self._controls_to_features(input_controls)
                predicted = self.forecaster.predict(ForecastInput(features=features))
                forecast_payload = self._build_forecast_payload(predicted)
            except Exception as exc:
                logger.warning("forecast_failed sid=%s err=%s", session.sid, exc)
                warning = "forecast unavailable"

        # 5. payload 조립
        return self._build_payload(
            session=session,
            input_controls=input_controls,
            current_outputs=current_outputs,
            override_active=override_active,
            kafka_controls=kafka_controls,
            kafka_ts=kafka_row.get("measured_at"),
            forecast_payload=forecast_payload,
            warning=warning,
        )

    def _kafka_row_to_controls(self, kafka_row: dict[str, Any]) -> ControlVars:
        return ControlVars(
            syngas_flow=float(kafka_row.get("syngas_flow", 0.0)),
            igv_opening=float(kafka_row.get("igv_opening", 0.0)),
            n2_offset=float(kafka_row.get("n2_offset", 0.0)),
            n2_valve_1=float(kafka_row.get("n2_valve_1", 0.0)),
            syngas_srv=float(kafka_row.get("syngas_srv", 0.0)),
            syngas_gcv_1=float(kafka_row.get("syngas_gcv_1", 0.0)),
            syngas_gcv_1a=float(kafka_row.get("syngas_gcv_1a", 0.0)),
            syngas_gcv_2=float(kafka_row.get("syngas_gcv_2", 0.0)),
            ibh_valve=float(kafka_row.get("ibh_valve", 0.0)),
            n2_flow=float(kafka_row.get("n2_flow", 0.0)),
        )

    def _synthesize_row(
        self, kafka_row: dict[str, Any], input_controls: ControlVars
    ) -> dict[str, Any]:
        """외란(kafka) + input_controls 합쳐 한 행 dict 반환 — recent_df_buffer용."""
        merged = dict(kafka_row)
        merged.update({
            "syngas_flow": input_controls.syngas_flow,
            "igv_opening": input_controls.igv_opening,
            "n2_offset": input_controls.n2_offset,
            "n2_valve_1": input_controls.n2_valve_1,
            "syngas_srv": input_controls.syngas_srv,
            "syngas_gcv_1": input_controls.syngas_gcv_1,
            "syngas_gcv_1a": input_controls.syngas_gcv_1a,
            "syngas_gcv_2": input_controls.syngas_gcv_2,
            "ibh_valve": input_controls.ibh_valve,
            "n2_flow": input_controls.n2_flow,
        })
        return merged

    def _controls_to_features(self, controls: ControlVars) -> dict[str, float]:
        return {
            "syngas_flow": controls.syngas_flow,
            "igv_opening": controls.igv_opening,
            "n2_offset": controls.n2_offset,
            "n2_valve_1": controls.n2_valve_1,
            "syngas_srv": controls.syngas_srv,
            "syngas_gcv_1": controls.syngas_gcv_1,
            "syngas_gcv_1a": controls.syngas_gcv_1a,
            "syngas_gcv_2": controls.syngas_gcv_2,
            "ibh_valve": controls.ibh_valve,
            "n2_flow": controls.n2_flow,
        }

    def _build_forecast_payload(self, predicted_nox: float) -> dict[str, Any]:
        threshold = self.dt_config.thresholds.nox_warning_ppm
        target = datetime.now(timezone.utc) + timedelta(minutes=FORECAST_HORIZON_MINUTES)
        return {
            "predicted_nox": round(predicted_nox, 3),
            "target_time": target.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "threshold_value": threshold,
            "threshold_exceeded": predicted_nox > threshold,
        }

    def _build_payload(
        self,
        *,
        session: Session,
        input_controls: ControlVars,
        current_outputs: OutputVars,
        override_active: bool,
        kafka_controls: ControlVars,
        kafka_ts: Any,
        forecast_payload: dict[str, Any] | None,
        warning: str | None,
    ) -> dict[str, Any]:
        now_iso = (
            datetime.now(timezone.utc)
            .isoformat(timespec="milliseconds")
            .replace("+00:00", "Z")
        )
        controls_dict = self._controls_to_features(input_controls)
        outputs_dict = {
            "nox": current_outputs.nox,
            "exhaust_temp": current_outputs.exhaust_temp,
            "power": current_outputs.power,
            "lambda_": current_outputs.lambda_,
            "efficiency": current_outputs.efficiency,
        }
        kafka_latest_dict = None
        if override_active:
            kafka_latest_dict = {
                "controls": self._controls_to_features(kafka_controls),
                "ts": kafka_ts if isinstance(kafka_ts, str) else now_iso,
            }
        return {
            "v": 1,
            "sid": session.sid,
            "tick": session.tick,
            "ts": now_iso,
            "mode": session.mode,
            "override_active": override_active,
            "current": {"controls": controls_dict, "outputs": outputs_dict},
            "kafka_latest": kafka_latest_dict,
            "forecast": forecast_payload,
            "warning": warning,
        }
