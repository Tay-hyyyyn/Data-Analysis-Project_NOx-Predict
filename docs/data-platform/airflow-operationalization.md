# Airflow Operationalization Plan

NOxO Airflow 운영화는 현재 인프라 범위 안에서 App EC2에 배치한다. 별도 데이터 EC2는 비용과 운영 여유상 이번 프로젝트 범위에서 제외한다.

## Current Repo State

- `airflow/dags/noxo_sensor_etl_dag.py`
  - DAG ID: `noxo_sensor_data_etl`
  - Flow: raw CSV check -> PostgreSQL connection check -> sensor ETL -> Slack success notification
  - Failure callback sends Slack notification when `SLACK_WEBHOOK_URL` is set.
- `database/load_to_postgres.py`
  - Input: `data/raw/250811-250825/NOx_train_*.csv`
  - Excludes `NOx_test_20250825.csv` by file pattern so test data remains available for Kafka simulation.
  - Current load strategy drops and recreates `sensor_data`, then appends transformed rows.
- `docker/docker-compose.data.yml`
  - Runs PostgreSQL and a single `airflow standalone` container.
  - Airflow UI defaults to `${AIRFLOW_PORT:-8080}`.
  - Airflow receives `DATABASE_URL` with Docker hostname `postgres`.
- `docker/docker-compose.airflow.ec2.yml`
  - Adds only the Airflow service to the existing App EC2 compose stack.
  - Reuses the app stack's `postgres` service instead of creating a second database container.
  - Mounts project code and DAG files read-only, with Airflow logs stored in named volumes.

## Local Validation

Validated on `2026-05-11` from branch `airflow-operationalization`.

- Airflow UI responded at `http://127.0.0.1:8080`.
- DAG import check passed with no import errors.
- Manual DAG run: `manual_airflow_local_validation_20260511`
- Task results:
  - `check_raw_csv_files`: success
  - `check_postgres_connection`: success
  - `run_sensor_etl`: success
  - `notify_success`: success
- PostgreSQL verification:
  - `row_count`: `1,209,599`
  - `start_at`: `2025-08-11 00:00:00`
  - `end_at`: `2025-08-24 23:59:59`

## App EC2 Validation

Validated on `2026-05-11` against App EC2 `15.165.247.216`.

- Existing app stack before Airflow:
  - `docker-frontend-1`: running
  - `docker-backend-1`: running
  - `docker-postgres-1`: healthy
- Existing DB state before Airflow run:
  - `row_count`: `1,209,599`
  - `start_at`: `2025-08-11 00:00:00`
  - `end_at`: `2025-08-24 23:59:59`
- Airflow deployment:
  - Compose override: `docker/docker-compose.airflow.ec2.yml`
  - Container: `noxo_airflow`
  - Reused existing `docker-postgres-1` on `docker_noxo-net`
- First EC2 issue:
  - DAG import failed because Airflow could not read `/opt/airflow/project/.env`.
  - Fix: DAG and ETL code now tolerate unreadable `.env` files when compose has already injected environment variables.
- Second EC2 issue:
  - Full-file CSV loading was killed with return code `-9` on App EC2.
  - Fix: ETL now reads and loads CSV data in chunks with default `ETL_CHUNK_SIZE=50000`.
- Manual DAG run: `app_ec2_airflow_validation_20260511`
- Task results:
  - `check_raw_csv_files`: success
  - `check_postgres_connection`: success
  - `run_sensor_etl`: success
  - `notify_success`: success
- PostgreSQL verification after DAG success:
  - `row_count`: `1,209,599`
  - `start_at`: `2025-08-11 00:00:00`
  - `end_at`: `2025-08-24 23:59:59`
- App health after Airflow deployment:
  - `http://localhost/api/health`: `{"status":"ok"}`
  - `http://15.165.247.216/api/health`: `{"status":"ok"}`
- Airflow UI:
  - Running on App EC2 port `8080`
  - External direct access was blocked, so use SSH tunnel or restricted security group access for UI operation.

### Slack Notification Validation

After setting `SLACK_WEBHOOK_URL` in the App EC2 `.env`, the Airflow container was recreated so the new environment variable was injected.

Manual DAG run: `app_ec2_airflow_slack_validation_20260511`

- `check_raw_csv_files`: success
- `check_postgres_connection`: success
- `run_sensor_etl`: success
- `notify_success`: success
- PostgreSQL verification:
  - `row_count`: `1,209,599`
  - `start_at`: `2025-08-11 00:00:00`
  - `end_at`: `2025-08-24 23:59:59`
- Slack result:
  - `[Slack] 알림 전송 완료. status=200`
  - Expected message format:

```text
[NOxO ETL 성공]
- table: public.sensor_data
- rows: 1,209,599
- period: 2025-08-11 00:00:00 ~ 2025-08-24 23:59:59
- null rows: 0
```

## Placement Decision

### Selected: App EC2 co-location

Run Airflow on the App EC2 where the application PostgreSQL container already lives.

Reasons:

- The ETL target DB is already reachable on the same Docker network.
- Train CSV loading is batch-oriented and low-frequency, so it does not justify a separate instance yet.
- Jenkins remains focused on CI/CD and is not mixed with long-running data services.
- This keeps the portfolio story simple: App EC2 serves backend/frontend plus the data pipeline runtime.
- The project currently has only two practical hosts, App EC2 and CI/CD EC2. Between them, App EC2 is closer to the data plane.

Operational boundaries:

- Airflow writes only to the intended service DB or staging DB.
- Airflow secrets stay in `.env` or server-side secret storage, never in DAG code.
- Airflow UI access should be restricted by security group, VPN, or SSH tunnel. Do not expose it broadly.

## Why Not CI/CD EC2

Do not run Airflow on the Jenkins EC2 as the main plan.

Jenkins should remain disposable CI/CD infrastructure. Placing Airflow there mixes deployment automation, data pipeline state, Slack credentials, and long-running services on one host.

If App EC2 resource usage becomes tight, reduce Airflow's schedule frequency and keep DAG execution manual or low-frequency rather than moving it to the CI/CD server first.

## Target Runtime Design

For local/dev verification:

```text
docker/docker-compose.data.yml
postgres
airflow standalone
```

For App EC2 operation:

```text
App EC2
├── backend
├── frontend/nginx
├── postgres
└── airflow
    ├── scheduler
    ├── webserver
    ├── dags
    └── logs
```

Recommended next compose direction:

- Keep the current `airflow standalone` mode for local smoke tests.
- Use `docker/docker-compose.airflow.ec2.yml` to attach Airflow to the existing App EC2 stack.
- Persist Airflow logs with named volumes.
- Later, replace `airflow standalone` with separate `airflow-webserver` and `airflow-scheduler` services if the DAG workload grows.

## DAG Hardening Checklist

- Replace destructive full reload with an explicit mode:
  - `full_refresh` for controlled rebuilds.
  - `incremental` or upsert mode for routine operation.
- Add row-count expectation for the train dataset.
  - Current known train-only expectation: `1,209,599` rows from `2025-08-11 00:00:00` to `2025-08-24 23:59:59`.
- Validate the DAG in Airflow, not only by importing the Python file.
- Confirm Slack success and failure messages from Airflow, separate from Jenkins Slack alerts.
- Document Airflow UI access:
  - Local: `http://localhost:8080`
  - EC2: restricted access only, preferably SSH tunnel or limited security group.
- Decide whether Airflow writes directly to production `sensor_data` or first loads into staging.

## Next Execution Steps

1. Run local Airflow smoke test with `docker/docker-compose.data.yml`.
2. Trigger `noxo_sensor_data_etl` manually from the Airflow UI.
3. Verify `sensor_data` row count and date range after DAG completion.
4. Confirm Slack success notification.
5. Deploy the App EC2 Airflow override with the existing application compose stack.
6. Deploy the Airflow runtime to App EC2 after local verification.
