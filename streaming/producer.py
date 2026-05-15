import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Callable, Iterable

from kafka import KafkaProducer

from streaming.sensor_csv import (
    DEFAULT_INPUT_FILE,
    iter_sensor_rows_after_bootstrap,
)

BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:19092")
TOPIC = os.getenv("KAFKA_SENSOR_TOPIC", "noxo.sensor.raw")
INPUT_FILE = Path(os.getenv("KAFKA_INPUT_FILE", str(DEFAULT_INPUT_FILE)))
INTERVAL_SECONDS = float(os.getenv("KAFKA_PRODUCE_INTERVAL_SECONDS", "1"))
MAX_MESSAGES = int(os.getenv("KAFKA_MAX_MESSAGES", "0"))
BOOTSTRAP_MINUTES = int(os.getenv("KAFKA_BOOTSTRAP_MINUTES", "15"))
EMIT_BOOTSTRAP_RESET = (
    os.getenv("KAFKA_EMIT_BOOTSTRAP_RESET", "true").lower() == "true"
)
BOOTSTRAP_RESET_EVENT = "bootstrap_reset"


def build_producer() -> KafkaProducer:
    return KafkaProducer(
        bootstrap_servers=BOOTSTRAP_SERVERS,
        value_serializer=lambda message: json.dumps(message).encode("utf-8"),
        key_serializer=lambda key: key.encode("utf-8"),
    )


def run_producer_loop(
    *,
    producer,
    topic: str,
    generator_factory: Callable[[], Iterable[dict]],
    interval_seconds: float,
    max_messages: int,
    bootstrap_reset_factory: Callable[[int], dict] | None = None,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> int:
    """CSV 소진 시 처음으로 회귀하며 발행 루프 실행.

    `max_messages > 0`이면 N개 발행 후 즉시 종료(테스트/검증용 상한).
    `max_messages == 0`이면 SIGINT/예외로 중단될 때까지 무한 루프.

    반환값: 총 발행 메시지 수.
    """
    sent_count = 0
    loop_count = 0
    while True:
        loop_count += 1
        print(f"[Kafka Producer] loop #{loop_count} start")
        if bootstrap_reset_factory is not None:
            reset_message = bootstrap_reset_factory(loop_count)
            reset_message["published_at"] = (
                datetime.utcnow().isoformat(timespec="seconds") + "Z"
            )
            reset_key = f"{BOOTSTRAP_RESET_EVENT}:{loop_count}"
            producer.send(topic, key=reset_key, value=reset_message)
            print(
                f"[Kafka Producer] bootstrap reset marker sent loop={loop_count}"
            )
        sent_in_loop = 0
        for message in generator_factory():
            message["published_at"] = (
                datetime.utcnow().isoformat(timespec="seconds") + "Z"
            )
            producer.send(topic, key=message["measured_at"], value=message)
            sent_count += 1
            sent_in_loop += 1
            print(f"[Kafka Producer] sent #{sent_count}: {message['measured_at']}")
            if max_messages and sent_count >= max_messages:
                return sent_count
            sleep_fn(interval_seconds)
        print(
            f"[Kafka Producer] loop #{loop_count} done — "
            f"sent_in_loop={sent_in_loop}, restarting from start"
        )


def main() -> None:
    if not INPUT_FILE.is_file():
        raise FileNotFoundError(f"Kafka input CSV not found: {INPUT_FILE}")

    print(
        "[Kafka Producer] start "
        f"topic={TOPIC}, bootstrap={BOOTSTRAP_SERVERS}, input={INPUT_FILE}, "
        f"skip_bootstrap_minutes={BOOTSTRAP_MINUTES}, "
        f"max_messages={MAX_MESSAGES}, auto_loop={'on' if MAX_MESSAGES == 0 else 'off'}, "
        f"bootstrap_reset_marker={'on' if EMIT_BOOTSTRAP_RESET else 'off'}"
    )

    producer = build_producer()
    sent_total = 0
    try:
        sent_total = run_producer_loop(
            producer=producer,
            topic=TOPIC,
            generator_factory=lambda: iter_sensor_rows_after_bootstrap(
                INPUT_FILE, minutes=BOOTSTRAP_MINUTES
            ),
            interval_seconds=INTERVAL_SECONDS,
            max_messages=MAX_MESSAGES,
            bootstrap_reset_factory=(
                (lambda loop_count: {
                    "event_type": BOOTSTRAP_RESET_EVENT,
                    "source": INPUT_FILE.name,
                    "loop": loop_count,
                    "bootstrap_minutes": BOOTSTRAP_MINUTES,
                })
                if EMIT_BOOTSTRAP_RESET
                else None
            ),
        )
    finally:
        producer.flush()
        producer.close()
        print(f"[Kafka Producer] done. sent={sent_total}")


if __name__ == "__main__":
    main()
