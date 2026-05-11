from collections import deque
from unittest.mock import AsyncMock, MagicMock
import pandas as pd
import pytest

from app.adapters.simulator.ml import MLSimulator
from app.core.session_context import SessionContext
from app.domain.tags import CONTROL_TAGS
from digital_twin.preprocess import RAW_FEATURES
from digital_twin.simulation import ControlVars


def _fake_snapshot_df(rows: int = 900) -> pd.DataFrame:
    cols = ["measured_at"] + list(RAW_FEATURES) + ["IGCC.DeNOX.AT_H1_901_PV", "IGCC.CC.G1.DWATT", "IGCC.CC.G1.TTXM"]
    return pd.DataFrame({c: [1.0] * rows if c != "measured_at"
                         else pd.date_range("2026-05-11", periods=rows, freq="1s")
                         for c in cols})


@pytest.fixture
def ml_simulator_with_dummy_models(patched_models_dir):
    return MLSimulator(models_dir=patched_models_dir)


@pytest.mark.integration
def test_e2e_predict_for_session_with_real_dummy_model(ml_simulator_with_dummy_models, monkeypatch):
    """더미 모델로 예측 성공 + cached_output_target 채워짐."""
    sim = ml_simulator_with_dummy_models
    df = _fake_snapshot_df(900)
    ctx = SessionContext.from_snapshot("sid-e2e", df)
    # 운영 패턴 시뮬: time.monotonic()이 boot 후 누적 시간이라 항상 last_ml_call_t(=0.0)보다 크다.
    # 100.0 - 0.0 >= 60.0 → interval gate trip → 첫 호출 ML 발화.
    monkeypatch.setattr("app.adapters.simulator.ml.time.monotonic", lambda: 100.0)
    controls = ControlVars(
        syngas_flow=1500.0, igv_opening=75.0, n2_offset=200.0,
        n2_valve_1=50.0, syngas_srv=60.0, syngas_gcv_1=55.0,
        syngas_gcv_1a=55.0, syngas_gcv_2=55.0, ibh_valve=30.0, n2_flow=100.0,
    )
    # 초기 호출 — interval gate 트립
    out = sim.predict_for_session(controls, ctx)
    assert out.nox is not None
    assert ctx.cached_output_target is not None


@pytest.mark.integration
def test_e2e_freeze_policy_preserves_disturbance_values(ml_simulator_with_dummy_models):
    """매 push 후에도 buffer 외란 컬럼은 스냅샷 freeze 값 유지 (NS-freeze invariant).

    스냅샷의 disturbance 값을 식별 가능한 sentinel(42.0)로, control은 1.0으로 설정한 뒤
    push_step_row가 다른 control 값(999.0)을 넣어도 disturbance가 42.0 그대로인지 검증.
    """
    # 외란 sentinel 42.0, 제어 1.0 — push 시 의도적으로 999.0을 넣어 freeze 깨짐 여부 검출
    rows = 900
    base_cols = ["measured_at"] + list(RAW_FEATURES) + ["IGCC.DeNOX.AT_H1_901_PV", "IGCC.CC.G1.DWATT", "IGCC.CC.G1.TTXM"]
    data = {}
    for c in base_cols:
        if c == "measured_at":
            data[c] = pd.date_range("2026-05-11", periods=rows, freq="1s")
        elif c in CONTROL_TAGS:
            data[c] = [1.0] * rows
        else:
            data[c] = [42.0] * rows  # 외란 + TTXM + target 모두 sentinel
    df = pd.DataFrame(data)

    ctx = SessionContext.from_snapshot("sid-e2e2", df)
    # 외란 키 (RAW - CONTROL_TAGS) 하나 선택해 freeze 값 확인
    dist_key = next(c for c in RAW_FEATURES if c not in CONTROL_TAGS)
    assert ctx.plant_context[dist_key] == 42.0  # snapshot으로부터 freeze

    # 의도적으로 다른 제어 값(999.0)으로 5번 push
    for _ in range(5):
        ctx.push_step_row({tag: 999.0 for tag in CONTROL_TAGS})

    # 외란은 freeze된 42.0, 제어만 999.0 — push_step_row의 dict merge 순서 검증
    last_row = ctx.recent_df_buffer[-1]
    for k in RAW_FEATURES:
        if k not in CONTROL_TAGS:
            assert last_row[k] == 42.0, f"{k} freeze 깨짐: expected 42.0, got {last_row[k]}"
        else:
            assert last_row[k] == 999.0, f"{k} 제어값 미반영: expected 999.0, got {last_row[k]}"


@pytest.mark.integration
def test_e2e_initial_ml_call_populates_cached_output(ml_simulator_with_dummy_models, monkeypatch):
    """NS12 — predict_for_session 1회 호출이 cached_output_target을 채운다."""
    sim = ml_simulator_with_dummy_models
    df = _fake_snapshot_df(900)
    ctx = SessionContext.from_snapshot("sid-e2e3", df)
    # 운영 패턴 시뮬: time.monotonic()이 boot 후 누적 시간이라 항상 last_ml_call_t(=0.0)보다 크다.
    # 100.0 - 0.0 >= 60.0 → interval gate trip → 첫 호출 ML 발화.
    monkeypatch.setattr("app.adapters.simulator.ml.time.monotonic", lambda: 100.0)
    assert ctx.cached_output_target is None
    controls = ControlVars(
        syngas_flow=1500.0, igv_opening=75.0, n2_offset=200.0,
        n2_valve_1=50.0, syngas_srv=60.0, syngas_gcv_1=55.0,
        syngas_gcv_1a=55.0, syngas_gcv_2=55.0, ibh_valve=30.0, n2_flow=100.0,
    )
    sim.predict_for_session(controls, ctx)
    assert ctx.cached_output_target is not None
