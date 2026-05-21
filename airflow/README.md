# Airflow ETL 운영 가이드

NOxO 프로젝트의 원천 CSV 적재 파이프라인을 Airflow DAG로 실행합니다.

운영 배치 설계는 [`docs/data-platform/airflow-operationalization.md`](../docs/data-platform/airflow-operationalization.md)를 기준으로 진행합니다. 현재 인프라 범위에서는 Jenkins EC2가 아니라 App EC2에 Airflow를 함께 배치합니다.

## 실행

### Local

```bash
docker compose --env-file .env -f docker/docker-compose.data.yml up -d postgres airflow
```

로컬 PC에서 호스트 `5432` 포트가 막혀 있으면 실행 전에 `POSTGRES_PORT`를 다른 값으로 지정합니다. Airflow 컨테이너는 Docker 네트워크 내부의 `postgres:5432`로 연결하므로 이 값은 로컬 PC에서 DB에 직접 붙을 때 쓰는 호스트 포트만 바꿉니다.

```powershell
$env:POSTGRES_PORT = "15432"
docker compose --env-file .env -f docker/docker-compose.data.yml up -d postgres airflow
```

Airflow UI는 `http://localhost:8080`에서 확인합니다. `airflow standalone` 모드의 초기 관리자 계정은 컨테이너 로그에 출력됩니다.

```bash
docker logs noxo_airflow
```

### App EC2

App EC2에서는 기존 앱 배포 compose의 `postgres` 서비스를 재사용하고, Airflow만 `docker/docker-compose.airflow.ec2.yml`로 추가합니다.

```bash
docker compose --profile local-db --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  -f docker/docker-compose.ec2.yml \
  -f docker/docker-compose.airflow.ec2.yml \
  up -d postgres airflow
```

Airflow UI 포트는 `.env`의 `AIRFLOW_PORT`로 조정합니다. 외부에 넓게 열지 말고 보안 그룹 또는 SSH 터널로 제한해서 접근합니다.

```powershell
ssh -i "<app-ec2-key.pem>" -L 8080:localhost:8080 ubuntu@15.165.247.216
```

## DAG

- DAG ID: `noxo_sensor_data_etl`
- 주요 흐름: train CSV 파일 확인 -> PostgreSQL 연결 확인 -> ETL 실행 및 검증 -> Slack 성공 알림
- 실패 시: 실패한 task와 에러 메시지를 Slack으로 전송

## 환경변수

실제 Slack Webhook URL은 Git에 커밋하지 않고 `.env`의 `SLACK_WEBHOOK_URL`에만 저장합니다.

로컬 PC에서 직접 ETL을 실행할 때는 `DATABASE_URL`의 host가 `localhost`입니다. Airflow 컨테이너 안에서는 Docker Compose 네트워크를 사용하므로 `docker/docker-compose.data.yml`에서 host를 `postgres`로 주입합니다.

Airflow/EC2처럼 메모리가 제한된 환경에서는 ETL이 CSV를 chunk 단위로 읽어 적재합니다. 기본값은 `ETL_CHUNK_SIZE=50000`이며, 필요하면 `.env`에서 조정합니다.

기본 ETL 입력은 `NOx_train_*.csv`입니다. `NOx_test_20250825.csv`는 Kafka 스트리밍 시뮬레이션 입력으로 분리해서 운영 `sensor_data`에 섞어 적재하지 않습니다.
