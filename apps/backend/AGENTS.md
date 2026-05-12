# Backend 작업 가이드

<!--
이 가이드는 에이전트가 backend 영역에서 코드를 건드리기 전에 반드시 알아야 할 컨텍스트를 담는다.
CLAUDE.md는 `@./AGENTS.md` 한 줄로 이 파일을 import 한다.
-->

## 1. WHAT — 이 모듈은 무엇을 하는가

FastAPI 기반 API 서버. 시뮬 세션 관리, 제어 입력 주입, WebSocket 실시간 스트리밍, 5분 horizon NOx 예측 API를 담당한다. 운영 임계값을 단일 진실원에서 노출(`GET /api/threshold`)한다.

## 2. CONTENTS — 파일/디렉토리와 기술 스택

- `app/api/` — REST/WebSocket 엔드포인트
- `app/services/` — 비즈니스 로직 (`session_service`, `forecast_service`, `threshold_service`)
- `app/domain/` — 도메인 모델 + IGCC 태그 매핑 (`tags.py` — 제어 10개의 `_FIELD_RULES`가 SoT)
- `app/repositories/` — DB 접근 레이어 (**현재 비어있음 — sensor/threshold repo 폐기됨**)
- `app/adapters/` — 외부 시스템 어댑터
  - `simulator/` — 실시간 시뮬 어댑터 (구 `predictor`에서 개명)
  - `forecaster/` — 5분 horizon NOx 예측 어댑터 (신설)
- `app/db/` — DB 연결, 세션 (**ORM 모델 모두 폐기 — `db/models/__init__.py` 빈 상태**)
- `app/schemas/` — Pydantic 요청/응답 스키마
- `app/core/`, `config.py` — 공통 유틸, 설정 (`syngas_lhv` 등)
- `app/core/lifespan.py` — DI 슬롯 (Simulator/Forecaster 별도)
- `tests/` — pytest 테스트 (29개)
- `pytest.ini`, `requirements.txt`, `Dockerfile`

기술 스택: FastAPI 0.115, Pydantic 2.9, SQLAlchemy 2.0, psycopg 3.2, kafka-python, asyncio, pytest

## 3. HOW — 일반적인 수정은 어떻게 하는가

<!--
새 엔드포인트 / 도메인 변경 시 따라야 할 절차.
-->

- **새 엔드포인트**: `app/api/` 라우터 추가 → `app/schemas/`에 Pydantic schema → `app/services/`에 로직 → 테스트는 `tests/`.
- **외부 의존(예: DT 모델) 호출**: `app/adapters/` 어댑터를 통해서만. 서비스가 모델을 직접 import하지 않음.
- **DI 슬롯**: Simulator/Forecaster는 `app/core/lifespan.py`에서 별도 슬롯으로 주입. 통합 금지.
- **schema 변경 시**: 프론트(`apps/frontend/`)의 타입과 동시 갱신. PR 메시지에 `[API 임시]` 마커.
- **테스트 추가**: `tests/`에 pytest 파일. `asyncio_mode = auto`이므로 `async def test_*` 그대로.

## 4. ⛔ HOW NOT — 시스템을 깨뜨리는 비명백한 함정 (중요)

- 시뮬 세션 상태를 DB에 직접 저장 — in-memory State Store만 사용 (초기 버전 결정), DB 직쓰기 시 세션 일관성 깨짐
- DT 모델을 서비스에서 직접 import — `app/adapters/`를 통해서만 호출, 직접 import 시 테스트 시 모킹 불가
- API 응답 스키마를 임의 변경 — 프론트와 컨트랙트 깨짐, 협의 (`[API 임시]`) 후 동시 PR
- DB 컬럼명을 추측해서 사용 — 운영 시 쿼리 실패, DB 팀 협의 후 (`[DB 협의 필요]`) 진행
- `co` 필드를 schema/응답에 부활시키기 — 학습 타겟에서 영구 제외 (`docs/REFACTOR_FLAME_TEMP_TO_EXHAUST_TEMP.md`)
- `ControlVars` 필드를 10개 외로 변경 — `tags.py::_FIELD_RULES`와 `digital_twin/simulation/state.py::ControlVars`를 동시 갱신해야 양쪽 검증 통과
- `threshold_config` ORM/repo 재도입 — 운영 임계 SoT는 코드(`digital_twin/simulation/config.py::ThresholdConfig`)이며 DB 동기화는 폐기됨
- `prediction_service`로 명명 복귀 — `forecast_service`가 현행 (5분 horizon 명시 의도)
- Simulator와 Forecaster를 단일 어댑터로 통합 — DI 슬롯 분리 유지, 통합 시 테스트/모킹 어려움 + 책임 혼재

## 5. WHERE — 다른 모듈과의 의존성

<!-- 강결합 — ThresholdConfig는 GET /api/threshold 9필드와 직결된 API contract SoT. 영역 진입 후 자동 import로 침묵의 가정 방지. -->
@../../digital_twin/AGENTS.md

- **의존 (약결합)**:
  - [`digital_twin/AGENTS.md`](../../digital_twin/AGENTS.md): 시뮬 엔진(`simulation/`)과 ML 모델(`models/`) — 어댑터 경유로만 호출
  - [`database/AGENTS.md`](../../database/AGENTS.md): `sensor_data` 14컬럼 schema (psycopg + SQLAlchemy)
- **피의존**:
  - [`apps/frontend/AGENTS.md`](../frontend/AGENTS.md): REST + WebSocket 클라이언트
- **경계 / 어댑터**:
  - `app/adapters/simulator/`, `app/adapters/forecaster/` — DT와의 경계
  - `app/db/` — PostgreSQL과의 경계 (ORM 모델 비어있음, raw 쿼리 또는 SQLAlchemy core 직접 사용)

## 6. WHY — 코드에 안 적힌 배경 지식

- **현재 스펙 (PR #35/#36/#38)**:
  - `ControlVars` 10개 — `app/domain/tags.py`의 `_FIELD_RULES`가 SoT
  - `OutputVars` — nox/exhaust_temp/power/lambda_/efficiency (5개, `co` 제외)
  - Simulator vs Forecaster 분리 — DI 슬롯 별도 (`app/core/lifespan.py`)
  - Forecast horizon 5분 고정 — `target_minutes` 필드 제거 (`schemas/prediction.py`)
  - `efficiency` 후처리 — `power / (syngas_flow × syngas_lhv)`를 `sim_loop`에서 계산
  - 운영 임계 SoT — `digital_twin/simulation/config.py::ThresholdConfig` 직결, `GET /api/threshold` 9필드 반환
  - sensor 엔드포인트 폐기 — 운영 데이터 조회 페이지 미구현
- **repository 폐기 배경**: 초기에 sensor/threshold repo를 두었으나, threshold는 DT config가 SoT가 되었고 sensor 조회는 미구현으로 빈 폴더 유지.

## 7. COMMANDS — 빌드/테스트/린트

- 개발 서버: `uvicorn app.main:app --reload` (또는 docker-compose 사용)
- 테스트: `pytest` <!-- pytest.ini의 asyncio_mode = auto, pythonpath = . ../.. -->
- 통합 테스트: `pytest -m integration` (실제 모델/DB 필요)
- Docker 빌드: docker-compose 경유 ([`docker/AGENTS.md`](../../docker/AGENTS.md))

**명령어 가드** (영역 고유 — 공통 가드는 root AGENTS.md 참조):
- pytest를 루트가 아닌 곳에서 실행 시 `digital_twin` import 실패 — 반드시 `apps/backend/` 또는 repo root에서 실행
- `pytest -m integration`은 실제 DB/모델 필요 — staging 환경에서만 실행

## 8. ⚠️ LEARNED CAUTIONS — 학습된 주의사항

<!-- `learn` 스킬(`/learn` 또는 Codex의 `$learn`)로 누적되는 영역. -->

_(아직 없음)_
