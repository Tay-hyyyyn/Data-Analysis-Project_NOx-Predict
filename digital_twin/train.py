import json
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from lightgbm import LGBMRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from preprocess import load_data, split_xy, FEATURES, TARGETS

MODELS_DIR = Path(__file__).parent / "models"


def build_model() -> MultiOutputRegressor:
    return MultiOutputRegressor(
        LGBMRegressor(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            num_leaves=31,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1,
            verbose=-1,
        ),
        n_jobs=-1,
    )


def train_model(
    X_train: pd.DataFrame, y_train: pd.DataFrame
) -> MultiOutputRegressor:
    model = build_model()
    model.fit(X_train, y_train)
    return model


def evaluate_model(
    model: MultiOutputRegressor,
    X: pd.DataFrame,
    y: pd.DataFrame,
) -> dict:
    y_pred = model.predict(X)
    results = {}
    for i, target in enumerate(TARGETS):
        results[target] = {
            "mae": float(mean_absolute_error(y.iloc[:, i], y_pred[:, i])),
            "rmse": float(np.sqrt(mean_squared_error(y.iloc[:, i], y_pred[:, i]))),
            "r2": float(r2_score(y.iloc[:, i], y_pred[:, i])),
        }
    return results


def save_artifacts(
    model: MultiOutputRegressor,
    features: list,
    train_metrics: dict,
    test_metrics: dict,
    train_samples: int,
    test_samples: int,
    npr_hinge_threshold: float,
) -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODELS_DIR / "dt_multi_model.pkl")
    metadata = {
        "model_type": "MultiOutputRegressor(LGBMRegressor)",
        "features": features,
        "targets": TARGETS,
        "n_features": len(features),
        "train_samples": train_samples,
        "test_samples": test_samples,
        "feature_engineering": {
            "removed": ["IGCC.DeNOX.AIT_H1_902 (H1: 준누수 제외)"],
            "added_h5_npr": ["feat_NPR_avg", "feat_NPR_gap", "feat_NPR_hinge", "feat_NPR_x_NQJ"],
            "added_h3_nqj_lag": ["feat_NQJ_lag_1min", "feat_NQJ_lag_3min", "feat_NQJ_lag_5min"],
            "added_h4_ttxm": ["feat_TTXM_lag_1min", "feat_TTXM_roll_5min", "feat_TTXM_roll_15min"],
            "npr_hinge_threshold": npr_hinge_threshold,
        },
        "train_performance": train_metrics,
        "test_performance": test_metrics,
    }
    with open(MODELS_DIR / "dt_model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    root = Path(__file__).parent.parent

    print("Loading train data...")
    train_df, npr_threshold = load_data(root / "data" / "NOx_train_20250811_20250824.csv")
    print(f"  NPR hinge threshold (train median): {npr_threshold:.4f}")

    print("Loading test data...")
    test_df, _ = load_data(
        root / "data" / "NOx_test_20250825.csv",
        npr_hinge_threshold=npr_threshold,   # 학습 기준값 고정
    )

    X_train, y_train = split_xy(train_df)
    X_test, y_test = split_xy(test_df)
    print(f"Train: {len(X_train):,} rows | Test: {len(X_test):,} rows")
    print(f"Features: {len(FEATURES)} (RAW 39 + DERIVED 10)")

    print("\nTraining MultiOutputRegressor(LGBMRegressor)...")
    model = train_model(X_train, y_train)

    print("Evaluating...")
    train_metrics = evaluate_model(model, X_train, y_train)
    test_metrics = evaluate_model(model, X_test, y_test)

    target_labels = {
        "IGCC.DeNOX.AT_H1_901_PV": "NOx (ppm)",
        "IGCC.CC.G1.DWATT": "발전량 (MW)",
        "IGCC.CC.G1.TTXM": "배기가스온도 (°C)",
    }
    for target in TARGETS:
        label = target_labels[target]
        tm = train_metrics[target]
        te = test_metrics[target]
        print(f"\n[{label}]")
        print(f"  Train  MAE={tm['mae']:.4f}  RMSE={tm['rmse']:.4f}  R²={tm['r2']:.4f}")
        print(f"  Test   MAE={te['mae']:.4f}  RMSE={te['rmse']:.4f}  R²={te['r2']:.4f}")

    save_artifacts(
        model=model,
        features=X_train.columns.tolist(),
        train_metrics=train_metrics,
        test_metrics=test_metrics,
        train_samples=len(X_train),
        test_samples=len(X_test),
        npr_hinge_threshold=npr_threshold,
    )
    print("\nArtifacts saved to digital_twin/models/")
