# Docker 작업 가이드

<!--
이 가이드는 에이전트가 docker 영역에서 코드를 건드리기 전에 반드시 알아야 할 컨텍스트를 담는다.
CLAUDE.md는 `@./AGENTS.md` 한 줄로 이 파일을 import 한다.
-->

## 1. WHAT — 이 모듈은 무엇을 하는가

컨테이너 구성 (개발/프로덕션/EC2/Kafka/Airflow/Jenkins). 환경별로 분리된 compose 파일을 통해 frontend/backend/DB/streaming/CI 스택을 일관되게 기동한다.

## 2. CONTENTS — 파일/디렉토리와 기술 스택

- `docker-compose.yml` — 기본 compose 설정
- `docker-compose.dev.yml` — 개발 환경 override
- `docker-compose.prod.yml` — 프로덕션 환경 override
- `docker-compose.data.yml` — 데이터 관련 서비스 (DB 등)
- `docker-compose.ec2.yml` — EC2 배포 시 백엔드-PostgreSQL 연결 override
- `docker-compose.airflow.ec2.yml` — EC2용 Airflow 스택
- `docker-compose.kafka.yml` — Kafka 스트리밍 스택
- `jenkins-compose.yml`, `jenkins/` — 로컬 Jenkins CI 테스트 환경
- `README.md` — Docker 운영 안내

기술 스택: Docker, Docker Compose

## 3. HOW — 일반적인 수정은 어떻게 하는가

<!--
서비스 추가/수정 시 절차.
-->

- **새 서비스 추가**: `docker-compose.yml` (base)에 정의 → 환경별 override(`*.dev.yml`, `*.prod.yml`)에서 포트/볼륨 조정.
- **환경 분리**: dev/prod/ec2/airflow.ec2/kafka 각각 별도 compose 파일. 절대 base에 환경 특정 설정 섞지 않음.
- **이미지 빌드**: 각 앱(`apps/frontend/Dockerfile`, `apps/backend/Dockerfile`) 참조. compose의 `build` 섹션에서 context 지정.
- **secrets**: `.env` 파일 또는 docker secret 마운트. compose 파일에 평문 금지.

## 4. ⛔ HOW NOT — 시스템을 깨뜨리는 비명백한 함정 (중요)

- secrets를 compose 파일에 하드코딩 — `.env` 또는 secret 마운트, 평문 시 git 노출
- prod 설정을 dev 환경에서 임의 사용 — 환경별 compose 파일 분리 유지, 혼용 시 dev에서 prod DB 접근 등 사고
- 이미지 태그를 `latest`로 production 사용 — 명시적 버전 태그(예: `v1.2.3`) 사용, `latest` 시 재기동 시점에 의도치 않은 버전 풀
- 호스트 포트를 root 권한 포트(<1024)로 임의 노출 — 권한 문제 + 다른 서비스 충돌
- 동일 컨테이너 이름을 여러 compose 파일에서 정의 — `docker-compose up`이 한 쪽만 인식, 의도와 다른 서비스 기동
- volume 정의 없이 DB 컨테이너 재기동 — 데이터 유실 (named volume 또는 bind mount 필수)

## 5. WHERE — 다른 모듈과의 의존성

- **의존**:
  - [`apps/frontend/AGENTS.md`](../apps/frontend/AGENTS.md): `apps/frontend/Dockerfile`, `nginx.conf`
  - [`apps/backend/AGENTS.md`](../apps/backend/AGENTS.md): `apps/backend/Dockerfile`
  - [`airflow/AGENTS.md`](../airflow/AGENTS.md): Airflow DAG 폴더 마운트
- **피의존**:
  - [`docs/ci-cd/jenkins-local.md`](../docs/ci-cd/jenkins-local.md): Jenkins 로컬 환경
  - [`docs/data-platform/kafka-ec2-deploy-checklist.md`](../docs/data-platform/kafka-ec2-deploy-checklist.md): Kafka EC2 배포
- **경계 / 어댑터**:
  - 환경변수: `.env` (compose `env_file`)
  - 외부 네트워크: 명시적 `networks:` 정의

## 6. WHY — 코드에 안 적힌 배경 지식

- **compose 파일 분리 정책**: dev/prod/EC2/Kafka/Airflow/Jenkins를 별도 파일로 분리. 환경 간 변수만 다르고 베이스 동일 → override 패턴 (`-f base -f env`).
- **EC2 배포 (`docker-compose.ec2.yml`)**: 백엔드 컨테이너가 EC2 외부의 RDS PostgreSQL에 접속하는 설정 override. 로컬 dev는 컨테이너 내부 DB.
- **Jenkins 로컬**: 운영 Jenkins와 분리된 로컬 테스트 환경. CI 변경 시 로컬에서 검증 후 적용.
- **Kafka 스택**: 실시간 스트리밍 시뮬용. 상세는 [`docs/data-platform/kafka-streaming-simulation.md`](../docs/data-platform/kafka-streaming-simulation.md).

## 7. COMMANDS — 빌드/테스트/린트

- 개발 기동: `docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up`
- 프로덕션 기동: `docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d`
- EC2 배포: `docker compose -f docker/docker-compose.yml -f docker/docker-compose.ec2.yml up -d`
- Kafka 기동: `docker compose -f docker/docker-compose.kafka.yml up -d`
- 정지/정리: `docker compose ... down` (볼륨 유지) / `down -v` (볼륨 삭제)

**명령어 가드** (영역 고유 — 공통 가드는 root AGENTS.md 참조):
- `docker compose down -v` 실행 — named volume 삭제로 DB 데이터 유실, production에서 금지
- 이미지 태그 미지정으로 `docker compose pull` — `latest`가 의도치 않은 버전을 가져올 수 있음
- 동일 compose 파일 다중 실행 — `--project-name`으로 격리하지 않으면 컨테이너 충돌

## 8. ⚠️ LEARNED CAUTIONS — 학습된 주의사항

<!-- `learn` 스킬(`/learn` 또는 Codex의 `$learn`)로 누적되는 영역. -->

_(아직 없음)_
