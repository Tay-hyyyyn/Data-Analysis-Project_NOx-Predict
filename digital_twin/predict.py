"""
digital_twin/predict.py
========================
추론 인터페이스.

입력 방식
---------
1. 원시 센서값 dict (RAW_FEATURES 39개) + 선택적으로 시계열 버퍼 전달
   - 파생 피처(H5 즉시)는 자동 계산
   - lag 피처(H3/H4)는 recent_df(최근 시계열)로 계산, 없으면 현재값으로 대체

2. 전체 피처 dict (FEATURES 49개, 파생 피처 포함)
   - 외부에서 이미 파생 피처를 계산해 전달하는 경우

주의: lag 피처는 최소 5분(300초) 이전 데이터가 필요합니다.
      recent_df 없이 호출 시 현재값으로 대체되어 정확도가 낮아질 수 있습니다.
"""

import json
import warnings
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

from preprocess import FEATURES, RAW_FEATURES, TARGETS, add_derived_features

MODELS_DIR = Path(__file__).parent / "models"


def load_model(model_path: Path | None = None) -> object:
    path = Path(model_path) if model_path else MODELS_DIR / "dt_multi_model.pkl"
    if not path.exists():
        raise FileNotFoundError(f"Model not found: {path}")
    return joblib.load(path)


def _load_npr_threshold() -> float:
    """metadata.json에서 NPR hinge 기준값 로드."""
    meta_path = MODELS_DIR / "dt_model_metadata.json"
    if meta_path.exists():
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
        return meta.get("feature_engineering", {}).get("npr_hinge_threshold", 0.0)
    return 0.0


def predict(
    model: object,
    inputs: dict | pd.DataFrame,
    recent_df: pd.DataFrame | None = None,
) -> dict:
    """NOx, 발전량, 배기가스온도 예측.

    Parameters
    ----------
    model:
        load_model()로 로드한 LightGBM MultiOutput 모델.
    inputs:
        현재 시점 센서값.
        - dict: RAW_FEATURES 39개 또는 FEATURES 49개 포함
        - pd.DataFrame: 1행 이상 (첫 번째 행만 사용)
    recent_df:
        최근 5분(300행 이상) 시계열 DataFrame.
        RAW_FEATURES 컬럼 포함 필요. lag 피처 정확도에 영향.
        None이면 현재값으로 lag 대체 (정확도 저하 경고).

    Returns
    -------
    dict
        {타깃명: 예측값} 형태.
    """
    # 1. inputs → 단일 행 DataFrame
    if isinstance(inputs, dict):
        row = pd.DataFrame([inputs])
    else:
        row = inputs.iloc[[0]].copy()

    # 2. 이미 파생 피처가 모두 있으면 바로 사용
    if all(f in row.columns for f in FEATURES):
        df_feat = row[FEATURES]
        y_pred = model.predict(df_feat)
        return {t: float(y_pred[0, i]) for i, t in enumerate(TARGETS)}

    # 3. 파생 피처 계산
    # RAW_FEATURES 컬럼 존재 확인
    missing_raw = set(RAW_FEATURES) - set(row.columns)
    if missing_raw:
        raise ValueError(f"입력에 원시 피처가 없습니다: {sorted(missing_raw)}")

    npr_threshold = _load_npr_threshold()

    if recent_df is not None:
        # recent_df 끝에 현재 row 붙여서 lag/rolling 계산
        buf = pd.concat([recent_df[RAW_FEATURES], row[RAW_FEATURES]], ignore_index=True)
        buf, _ = add_derived_features(buf, npr_hinge_threshold=npr_threshold)
        df_feat = buf.iloc[[-1]][FEATURES]
    else:
        # lag 피처 없음 — 현재값으로 대체
        warnings.warn(
            "recent_df가 없어 lag 피처(feat_NQJ_lag_*, feat_TTXM_*)를 현재값으로 대체합니다. "
            "정확도가 낮아질 수 있습니다.",
            UserWarning,
            stacklevel=2,
        )
        buf, _ = add_derived_features(row[RAW_FEATURES].copy(), npr_hinge_threshold=npr_threshold)
        # shift로 생긴 NaN → 현재값으로 fillna
        for col in FEATURES:
            if col not in buf.columns or buf[col].isna().any():
                # 대응되는 원시 피처 이름 추출 (feat_NQJ_lag_* → NQJ, feat_TTXM_* → TTXM)
                if "NQJ" in col:
                    buf[col] = row["IGCC.CC.G1.NQJ"].values[0]
                elif "TTXM" in col:
                    buf[col] = row["IGCC.CC.G1.TTXM"].values[0]
                else:
                    buf[col] = 0.0
        df_feat = buf[FEATURES]

    y_pred = model.predict(df_feat)
    return {t: float(y_pred[0, i]) for i, t in enumerate(TARGETS)}
