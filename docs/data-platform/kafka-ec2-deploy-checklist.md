# Kafka EC2 Deploy Checklist

이 문서는 App EC2에서 Kafka streaming을 실제로 띄우고 확인할 때 순서대로 점검하기 위한 체크리스트다.

## Goal

App EC2에서 다음 흐름이 실제로 동작하는지 확인한다.

```text
Redpanda -> stream ETL consumer -> sensor_data_stream -> backend DB poller -> WebSocket
```

필요하면 이후 producer도 같은 서버에서 테스트한다.

## Preconditions

다음 항목이 먼저 준비되어 있어야 한다.

- `dev`에 Kafka streaming 코드 merge 완료
- App EC2에서 최신 `dev` pull 가능
- backend가 정상 기동 가능한 모델 파일 준비
- `.env` 또는 배포 환경변수 편집 가능
- Docker와 Docker Compose 동작 가능

## Decide First

먼저 아래를 확정한다.

- Redpanda를 App EC2에 같이 띄울지
- 아니면 외부 Kafka-compatible broker를 붙일지

현재 프로젝트 상태에서는 App EC2에 Redpanda를 같이 띄우는 것이 가장 단순하다.

## Required Environment Variables

backend Plan B polling용:

```text
KAFKA_STREAM_ENABLED=false
SENSOR_STREAM_POLL_ENABLED=true
SENSOR_STREAM_POLL_INTERVAL_SEC=1
SENSOR_STREAM_POLL_BATCH_SIZE=200
KAFKA_BOOTSTRAP_SERVERS=redpanda:9092
KAFKA_SENSOR_TOPIC=noxo.sensor.raw
KAFKA_CONSUMER_GROUP_ID=noxo-backend-stream
KAFKA_BOOTSTRAP_MINUTES=15
KAFKA_BOOTSTRAP_FILE=/app/data/raw/250811-250825/NOx_test_20250825.csv
KAFKA_EMIT_BOOTSTRAP_RESET=true
```

producer 테스트용 선택값:

```text
KAFKA_PRODUCE_INTERVAL_SECONDS=1
KAFKA_MAX_MESSAGES=5
```

## Step 1. App EC2 Repo Check

- `~/NOxO_Project_Repo`가 최신 `dev`인지 확인
- `digital_twin/models/` 아래 필요한 모델 파일 존재 확인
- backend가 모델 누락으로 죽지 않는 상태인지 확인

## Step 2. Streaming Stack Start

```bash
docker compose --env-file .env -f docker/docker-compose.kafka.yml --profile streaming up -d --build
```

확인 포인트:

- `noxo_redpanda` 컨테이너가 `Up`
- `kafka-producer` 컨테이너가 `Up`
- `docker-kafka-etl-consumer-1` 컨테이너가 `Up`
- producer loop 시작 로그에 `bootstrap reset marker sent` 출력
- 포트 바인딩 정책이 기존 서비스와 충돌하지 않음
- backend가 접근할 내부 주소는 `redpanda:9092`

## Step 3. Backend Poller Start

배포 compose 또는 실행 환경에 Plan B env를 포함한 뒤 backend 재기동:

```bash
docker compose --env-file .env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d --build backend
```

확인 포인트:

- backend startup 에러 없음
- `KAFKA_STREAM_ENABLED=false`
- `SENSOR_STREAM_POLL_ENABLED=true`
- backend가 `sensor_data_stream`을 1초 단위로 polling

## Step 4. DB Stream Check

```bash
SELECT ingest_mode,
       COUNT(*) AS rows,
       MIN(measured_at) AS start_at,
       MAX(measured_at) AS end_at
FROM sensor_data_stream
GROUP BY ingest_mode
ORDER BY ingest_mode;
```

초기 기대값:

```text
bootstrap | 900 | 2025-08-25 00:00:00 | 2025-08-25 00:14:59
stream    | N   | 2025-08-25 00:15:00 | ...
```

## Step 5. Producer Test

test CSV 일부만 발행:

```bash
KAFKA_MAX_MESSAGES=5 docker compose --env-file .env -f docker/docker-compose.kafka.yml --profile streaming run --rm kafka-producer
```

확인 포인트:

- producer 로그에 `sent #1`부터 `sent #5` 출력
- stream ETL consumer가 `sensor_data_stream`에 `ingest_mode='stream'`으로 upsert

## Step 6. Front/Backend Recheck

기대 결과:

- backend session WebSocket에서 bootstrap 이후 stream 값이 이어짐
- 새 stream row가 들어오면 dashboard 값이 갱신됨

## Step 7. External Check

필요하면 nginx 또는 외부 health와 별도로 backend 내부 상태를 같이 본다.

- `/api/health`
- `/api/streaming/latest`
- `docker logs docker-backend-1`
- `docker logs noxo_redpanda`

## Failure Guide

`502 Bad Gateway`

- backend 컨테이너 자체가 죽는지 먼저 확인
- Kafka 문제가 아니라 모델 파일, startup exception일 수 있음

dashboard 값이 갱신되지 않음

- producer 미실행
- topic 이름 불일치
- `kafka-etl-consumer` 미실행
- `SENSOR_STREAM_POLL_ENABLED=true` 미적용
- broker 주소 불일치

`last_error`에 값이 생김

- Redpanda 미기동
- `KAFKA_BOOTSTRAP_SERVERS` 오기입
- 네트워크/compose 서비스명 불일치

## Recommended Next Step

EC2에서 latest API까지 확인되면 다음 작업은 둘 중 하나다.

- 프론트 polling 연결
- backend WebSocket 통합 설계
