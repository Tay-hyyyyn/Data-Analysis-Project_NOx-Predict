# Kafka Streaming Simulation Plan

NOxO의 streaming simulation은 `NOx_test_20250825.csv`를 운영 DB에 적재하지 않고 Kafka-compatible topic으로 흘려보내는 구조로 시작한다.

## Concept

Kafka는 DB가 아니라 실시간 메시지 버스다.

```text
CSV test data -> Producer -> Kafka topic -> Consumer -> Backend/Frontend
```

- Producer: 데이터를 만들어 topic에 넣는 프로그램
- Topic: 메시지가 쌓이는 이름 있는 통로
- Consumer: topic에서 메시지를 읽어 처리하는 프로그램

이 프로젝트에서는 Kafka-compatible broker로 Redpanda를 우선 사용한다. Redpanda는 Kafka API를 지원하지만 Zookeeper가 필요 없어 로컬과 EC2에서 더 단순하게 운영할 수 있다.

포트폴리오에는 "Kafka protocol 기반 실시간 스트리밍 파이프라인" 또는 "Redpanda(Kafka-compatible broker)를 활용한 Kafka-style streaming simulation"처럼 표현한다. Apache Kafka 클러스터 자체를 운영했다고 과장하지 않는다.

## Current Scope

이번 단계의 목표는 브로커와 Producer를 검증하는 것이다.

- Broker: `redpanda`
- Topic: `noxo.sensor.raw`
- Producer input: `data/raw/250811-250825/NOx_test_20250825.csv`
- Message format: JSON
- Default interval: 1 second per row
- Loop reset marker: `event_type=bootstrap_reset`

현재 운영 연결은 Plan B를 기본으로 둔다. Backend가 Kafka를 직접 읽는 대신 `kafka-etl-consumer`가 `noxo.sensor.raw`를 읽어 `sensor_data_stream`에 적재하고, backend는 `SENSOR_STREAM_POLL_ENABLED=true`일 때 DB stream row를 polling해 WebSocket 세션 버퍼에 반영한다. 이때 `KAFKA_STREAM_ENABLED=false`를 유지해 direct Kafka consumer와 DB poller가 동시에 같은 buffer에 쓰지 않게 한다.

또한 백엔드는 `NOx_test_20250825.csv`의 초기 15분 구간을 preload data로 읽어 `GET /api/streaming/bootstrap`으로 제공할 수 있다. Producer는 같은 15분 구간을 건너뛰고 그 다음 시점부터 Kafka로 발행해 초기 화면과 실시간 구간이 겹치지 않도록 맞춘다.

CSV 끝까지 발행한 뒤 producer가 다음 loop를 시작할 때는 `bootstrap_reset` control message를 먼저 보낸다. Stream ETL consumer는 이 marker를 받으면 초기 15분을 `sensor_data_stream`에 다시 upsert하고, producer는 곧바로 00:15:00 이후 live replay를 이어간다.

## Message Shape

```json
{
  "source": "NOx_test_20250825.csv",
  "measured_at": "2025-08-25 00:00:00",
  "published_at": "2026-05-11T07:00:00Z",
  "values": {
    "IGCC.CC.G1.ca_fqsg_cl": 42.65938,
    "IGCC.CC.G1.csgv": 62.41586,
    "IGCC.DeNOX.AT_H1_901_PV": 29.19954
  }
}
```

`values`에는 CSV의 센서 태그들이 원천 태그명 그대로 들어간다. Backend consumer 단계에서 필요한 운영 필드만 골라 도메인 모델로 변환한다.

CSV의 보조 빈 컬럼(`Column1`)은 메시지에서 제외한다.

## Validation

2026-05-11 기준 로컬 Docker 환경에서 다음을 확인했다.

- Redpanda container: `noxo_redpanda`
- Kafka API broker: `redpanda:9092`
- External local port: `localhost:19092`
- Producer sample run: `KAFKA_MAX_MESSAGES=5`
- Consumed topic: `noxo.sensor.raw`
- First message key: `2025-08-25 00:00:00`
- Fifth message key: `2025-08-25 00:00:04`

## Local Run

Start Redpanda:

```bash
docker compose --env-file .env -f docker/docker-compose.kafka.yml up -d redpanda
```

Send a small sample from the test CSV:

```bash
KAFKA_MAX_MESSAGES=5 docker compose --env-file .env -f docker/docker-compose.kafka.yml --profile streaming run --rm kafka-producer
```

For Windows PowerShell:

```powershell
$env:KAFKA_MAX_MESSAGES = "5"
docker compose --env-file .env -f docker/docker-compose.kafka.yml --profile streaming run --rm kafka-producer
Remove-Item Env:\KAFKA_MAX_MESSAGES
```

Inspect messages with Redpanda:

```bash
docker exec -it noxo_redpanda rpk topic consume noxo.sensor.raw -n 5
```

Enable the backend DB poller:

```bash
SENSOR_STREAM_POLL_ENABLED=true KAFKA_STREAM_ENABLED=false docker compose --env-file .env -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d --build backend
```

For Windows PowerShell:

```powershell
$env:SENSOR_STREAM_POLL_ENABLED = "true"
$env:KAFKA_STREAM_ENABLED = "false"
docker compose --env-file .env -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d --build backend
Remove-Item Env:\SENSOR_STREAM_POLL_ENABLED
Remove-Item Env:\KAFKA_STREAM_ENABLED
```

Check the stream DB ingestion:

```bash
docker exec -it docker-postgres-1 psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT ingest_mode, COUNT(*), MIN(measured_at), MAX(measured_at)
FROM sensor_data_stream
GROUP BY ingest_mode
ORDER BY ingest_mode;"
```

Check the preload bootstrap window:

```bash
curl http://localhost:8000/api/streaming/bootstrap
```

## Next Step

After the preload window and backend consumer are verified, connect the bootstrap payload plus latest streaming state to frontend rendering. The likely path is bootstrap first, then polling or WebSocket for live updates.
