# Airflow 작업 가이드

<!--
이 가이드는 에이전트가 airflow 영역에서 코드를 건드리기 전에 반드시 알아야 할 컨텍스트를 담는다.
CLAUDE.md는 `@./AGENTS.md` 한 줄로 이 파일을 import 한다.
-->

## 1. WHAT — 이 모듈은 무엇을 하는가

데이터 파이프라인 DAG 정의 및 운영. 현재는 IGCC 가스터빈 센서 데이터를 `sensor_data` 테이블로 ETL 하는 단일 DAG(`noxo_sensor_etl_dag.py`)를 운영한다.

## 2. CONTENTS — 파일/디렉토리와 기술 스택

- `dags/noxo_sensor_etl_dag.py` — 센서 데이터 ETL DAG
- `README.md` — Airflow 운영 안내

기술 스택: Apache Airflow

배포 관련: [`docs/data-platform/airflow-operationalization.md`](../docs/data-platform/airflow-operationalization.md)

## 3. HOW — 일반적인 수정은 어떻게 하는가

<!--
DAG 추가/수정 시 절차.
-->

- **새 DAG**: `dags/<name>_dag.py` 추가. 단일 task 책임 분리, 의존 관계는 `>>`로 명시.
- **스케줄 변경**: `schedule_interval` 변경 시 staging DAG에서 검증 → production 반영.
- **외부 연결**: DB/Kafka 등 연결 정보는 Airflow Connections 또는 환경변수. DAG 코드에 secrets 하드코딩 금지.
- **테스트**: `airflow dags test <dag_id> <execution_date>`로 local backfill.

## 4. ⛔ HOW NOT — 시스템을 깨뜨리는 비명백한 함정 (중요)

- DAG에 secrets 하드코딩 — Airflow Variables 또는 환경변수 사용, 코드 노출 시 자격 증명 유출
- production DB에 직접 쓰기 — staging 거쳐서 검증, 직쓰기 시 ETL 버그가 운영 데이터 오염
- 단일 task에 과도한 책임 부여 — 작업 단위별로 task 분리 (실패 시 재시도 단위가 너무 큼)
- DAG 스케줄을 사전 검토 없이 production에 배포 — 잘못된 cron이 무한 backfill 유발
- 같은 `dag_id`를 다른 파일에서 중복 정의 — Airflow가 한쪽만 로드, 의도와 다른 DAG 실행 위험

## 5. WHERE — 다른 모듈과의 의존성

- **의존**:
  - [`database/AGENTS.md`](../database/AGENTS.md): `sensor_data` 적재 대상 (14컬럼)
  - [`docker/AGENTS.md`](../docker/AGENTS.md): `docker-compose.airflow.ec2.yml`로 배포
- **피의존**: 운영 데이터 소비자 전반 (backend, frontend, analysis)
- **경계 / 어댑터**:
  - 외부 소스(CSV/S3) → `sensor_data` 적재 (`noxo_sensor_etl_dag.py` 내부)

## 6. WHY — 코드에 안 적힌 배경 지식

- **EC2 배포**: `docker-compose.airflow.ec2.yml`로 운영. 상세는 [`docs/data-platform/airflow-operationalization.md`](../docs/data-platform/airflow-operationalization.md).
- **데이터 흐름**: Kafka 실시간 스트리밍(`docs/data-platform/kafka-*.md`)과는 별도 — Airflow는 batch ETL, Kafka는 실시간.
- **단일 DAG 운영**: 현재는 ETL 1개만 운영. 신규 DAG 추가 시 의존 관계 도식화 권장.

## 7. COMMANDS — 빌드/테스트/린트

- DAG 로컬 테스트: `airflow dags test noxo_sensor_etl_dag $(date -u +%Y-%m-%d)`
- DAG 목록: `airflow dags list`
- Docker Compose 기동: docker-compose 경유 ([`docker/AGENTS.md`](../docker/AGENTS.md))

**명령어 가드** (영역 고유 — 공통 가드는 root AGENTS.md 참조):
- `airflow dags backfill` 실행 시 범위 지정 누락 — 전체 기간 backfill 폭주 위험
- production scheduler를 일시 정지 없이 DAG 코드 hot-reload — 진행 중 task가 inconsistent state로 종료될 수 있음

## 8. ⚠️ LEARNED CAUTIONS — 학습된 주의사항

<!-- `learn` 스킬(`/learn` 또는 Codex의 `$learn`)로 누적되는 영역. -->

_(아직 없음)_
