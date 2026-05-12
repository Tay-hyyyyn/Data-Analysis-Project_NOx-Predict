# Digital Twin 작업 가이드

<!--
이 가이드는 에이전트가 digital_twin 영역에서 코드를 건드리기 전에 반드시 알아야 할 컨텍스트를 담는다.
CLAUDE.md는 `@./AGENTS.md` 한 줄로 이 파일을 import 한다.
-->

## 1. WHAT — 이 모듈은 무엇을 하는가

합성가스 발전소 NOx 거동을 재현하는 stateful 시뮬 엔진. **Zeldovich ODE + ML 회귀(Ridge·LGB 앙상블) + 시간 상수 lag 모델**의 하이브리드 구조. 시뮬레이션 상태/임계/τ의 단일 진실 공급원(SoT)을 보유하며 backend가 어댑터로 호출한다.

## 2. CONTENTS — 파일/디렉토리와 기술 스택

- `simulation/engine.py` — 시뮬 루프 (`sim_step`)
- `simulation/chemistry.py` — Zeldovich ODE
- `simulation/lag.py` — 시간 상수 lag 모델
- `simulation/state.py` — `SimulationState` 도메인 객체 (**ControlVars 10필드 / OutputVars 5필드**)
- `simulation/features.py` — 피처 계산
- `simulation/config.py` — τ/임계치/dt SoT (Single Source of Truth, **운영 임계 9필드 포함**)
- `train.py`, `predict.py`, `preprocess.py` — ML 모델 학습/추론/전처리 (**1분 집계 + Ridge·LGB 앙상블**)
- `models/` — 학습된 모델 아티팩트 (`dt_lgb_model.pkl`, `dt_ridge_model.pkl`), `dt_model_metadata.json`
- `tests/` — pytest (23개 통과, `test_predict.py`, `test_preprocess.py`, `test_train.py`)

기술 스택: scipy, numpy, scikit-learn, LightGBM, joblib, pytest

## 3. HOW — 일반적인 수정은 어떻게 하는가

<!--
도메인 객체 / 시뮬 파라미터 / 모델 변경 시 따라야 할 절차.
-->

- **도메인 변경(ControlVars/OutputVars 등)**: `simulation/state.py`를 먼저 수정 → `simulation/config.py`의 τ/임계 동시 갱신 → backend `app/domain/tags.py::_FIELD_RULES` 동시 갱신 → 테스트 작성.
- **새 시뮬 파라미터**: `simulation/config.py`에 추가하고 호출부에서 직접 참조. 외부 하드코딩 금지.
- **모델 재학습**: `train.py`로 1분 집계 데이터에서 학습 → 결과를 `models/`에 저장. `models/dt_model_metadata.json` 갱신.
- **테스트 추가**: `tests/` 폴더. `conftest.py`가 import path 설정.

## 4. ⛔ HOW NOT — 시스템을 깨뜨리는 비명백한 함정 (중요)

- τ/임계치/dt 값을 `config.py` 외부에서 하드코딩 — SoT가 흩어져 한쪽 갱신 누락 시 시뮬과 백엔드 임계 불일치
- 도메인 객체(`SimulationState` 등)를 `simulation/` 외부에 정의 — 어댑터/백엔드에 중복 정의 시 분기 발생, SoT는 `simulation/`
- 모델 파일(`.pkl`)을 git에 커밋 — `.gitignore`로 제외됨, 커밋 시 repo 비대 + LFS 미구성
- Cantera 등 외부 화학 엔진 도입 — Phase 2 검토 사항 (`[추후 결정]`), 도입 시 dependency 폭증
- 시뮬 dt와 lag τ를 별도 관리 — 반드시 `config.py` 통해 일원화, 분리 시 시간 격자 어긋남
- `ControlVars` 필드를 10개 외로 변경 — 백엔드 `app/domain/tags.py::_FIELD_RULES`와 동시 갱신 필수, 한 쪽 누락 시 422 또는 KeyError
- `OutputVars`에 `co` 부활 — 학습 타겟에서 영구 제외 (자기상관 0.989 + 분포 이슈)
- **1초 데이터로 모델 재학습** — 분포 이동·자기상관(0.989) 문제로 R² 급락 (NOx R² 0.47 ← 1분 앙상블 0.71). 학습 단위는 1분 고정
- Ridge·LGB 중 하나만 단독 운영 — Ridge의 외삽 능력 + LGB의 비선형 미세조정 결합이 핵심, 단독 시 OOD 성능 급락

## 5. WHERE — 다른 모듈과의 의존성

- **의존**:
  - 입력 데이터: [`database/AGENTS.md`](../database/AGENTS.md)의 `sensor_data` 14컬럼 (운영 시), [`analysis/AGENTS.md`](../analysis/AGENTS.md)의 실험 데이터 (학습 시)
- **피의존**:
  - [`apps/backend/AGENTS.md`](../apps/backend/AGENTS.md): `app/adapters/simulator/`, `app/adapters/forecaster/` 경유로 호출
  - [`apps/backend/AGENTS.md`](../apps/backend/AGENTS.md)의 `GET /api/threshold`: `simulation/config.py::ThresholdConfig` 직결 9필드
- **경계 / 어댑터**:
  - 모델 파일: `models/*.pkl` (joblib 로드)
  - SoT 컨트랙트: `simulation/state.py::ControlVars`, `simulation/config.py::ThresholdConfig`

## 6. WHY — 코드에 안 적힌 배경 지식

- **현재 스펙 (PR #35/#37)**:
  - `ControlVars` 10개 — `state.py::ControlVars`. 단위/한계는 `[추후 결정]` 가안값
  - `OutputVars` 5개 — nox/exhaust_temp/power/lambda_/efficiency (`co` 제외, `docs/REFACTOR_FLAME_TEMP_TO_EXHAUST_TEMP.md`)
  - 모델 학습 단위 = 1분 — `preprocess.aggregate_to_1min(df)` (60행 평균)
  - 앙상블 = 0.7 Ridge + 0.3 LGB — `ENSEMBLE_W_RIDGE=0.7`, `RIDGE_ALPHA=0.01`
  - `predict()` 입력 — 최근 1초 시계열 60+ 행 (`recent_df`). 짧으면 경고 후 폴백
  - TTXM(`exhaust_temp`) 필수 입력 — 타겟이지만 lag 입력으로도 사용. 누락 시 ValueError
  - 운영 임계 SoT — `config.py::ThresholdConfig`. 백엔드 `GET /api/threshold`가 9필드 반환
  - 신규 7개 변수 τ — `TimeConstants` 가안 1.0초 (`[조사 필요]`)
- **`flame_temp` → `exhaust_temp` 개명 배경**: 화염 온도는 직접 측정 불가/부정확, 배기 온도가 실측 가능한 운영 SoT.
- **1초 vs 1분 학습 시도 이력**: 1초 학습 시 R²가 1.0 가까이 나오는 것이 자기상관 0.989에서 기인. 1분 집계 후 NOx R² 0.71로 현실적 성능.

## 7. COMMANDS — 빌드/테스트/린트

- 테스트: `pytest digital_twin/tests/` (repo root에서)
- 학습: `python digital_twin/train.py` <!-- 모델 산출물은 models/에 저장됨 -->
- 추론 smoke: `python digital_twin/predict.py` <!-- 실제 데이터/모델 필요 -->

**명령어 가드** (영역 고유 — 공통 가드는 root AGENTS.md 참조):
- `python digital_twin/train.py`를 production 데이터로 실행 후 결과를 그대로 커밋 — `.pkl`은 git 제외, 별도 저장소(S3 등)로 관리
- `predict()` 호출 시 60행 미만 입력 — 경고만 나오고 폴백되지만 정확도 저하

## 8. ⚠️ LEARNED CAUTIONS — 학습된 주의사항

<!-- `learn` 스킬(`/learn` 또는 Codex의 `$learn`)로 누적되는 영역. -->

_(아직 없음)_
