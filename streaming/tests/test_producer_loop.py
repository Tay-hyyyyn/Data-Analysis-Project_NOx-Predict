"""Producer 자동 루프 단위 테스트.

`run_producer_loop`를 추출해 외부에서 generator factory + producer + sleep을
주입할 수 있게 만든 뒤, 테스트는 가짜 generator로 1회차 + 2회차 반복을 검증.
"""

from unittest.mock import MagicMock

from streaming.producer import run_producer_loop


def _make_generator_factory(rows):
    """매 호출마다 동일한 rows를 yield하는 새 generator를 반환."""

    def factory():
        for row in rows:
            yield dict(row)

    return factory


def test_loop_repeats_after_csv_exhaustion_until_max_messages():
    rows = [
        {"measured_at": "2025-08-25 00:15:01", "values": {"a": 1}},
        {"measured_at": "2025-08-25 00:15:02", "values": {"a": 2}},
    ]
    producer = MagicMock()
    sleeps: list[float] = []

    sent_count = run_producer_loop(
        producer=producer,
        topic="t",
        generator_factory=_make_generator_factory(rows),
        interval_seconds=0,
        max_messages=5,
        sleep_fn=sleeps.append,
    )

    # 5개 발행: rows×2회 + rows[0] 1개 (3회차 첫 행에서 max 도달)
    assert sent_count == 5
    assert producer.send.call_count == 5
    # 발행된 measured_at 순서가 1, 2, 1, 2, 1 패턴인지 확인
    sent_keys = [call.kwargs["key"] for call in producer.send.call_args_list]
    assert sent_keys == [
        "2025-08-25 00:15:01",
        "2025-08-25 00:15:02",
        "2025-08-25 00:15:01",
        "2025-08-25 00:15:02",
        "2025-08-25 00:15:01",
    ]


def test_loop_with_max_zero_runs_indefinitely_so_we_break_with_factory():
    """max_messages=0이면 무한. 테스트는 factory를 1회만 yield하고 그 다음 호출에서 빈 iter를 주는 식으로 1회만 검증한 뒤 KeyboardInterrupt로 중단을 모사."""
    rows = [{"measured_at": "2025-08-25 00:15:01", "values": {"a": 1}}]
    producer = MagicMock()

    call_count = {"n": 0}

    def factory():
        call_count["n"] += 1
        if call_count["n"] > 2:
            raise KeyboardInterrupt
        for row in rows:
            yield dict(row)

    try:
        run_producer_loop(
            producer=producer,
            topic="t",
            generator_factory=factory,
            interval_seconds=0,
            max_messages=0,
            sleep_fn=lambda _s: None,
        )
    except KeyboardInterrupt:
        pass

    # 2회 루프 + KeyboardInterrupt 직전이므로 send는 정확히 2번
    assert producer.send.call_count == 2


def test_loop_attaches_published_at_field_to_each_message():
    rows = [{"measured_at": "2025-08-25 00:15:01", "values": {"a": 1}}]
    producer = MagicMock()

    run_producer_loop(
        producer=producer,
        topic="t",
        generator_factory=_make_generator_factory(rows),
        interval_seconds=0,
        max_messages=1,
        sleep_fn=lambda _s: None,
    )

    sent_value = producer.send.call_args.kwargs["value"]
    assert "published_at" in sent_value
    assert sent_value["published_at"].endswith("Z")


def test_loop_emits_bootstrap_reset_marker_before_each_cycle():
    rows = [
        {"measured_at": "2025-08-25 00:15:01", "values": {"a": 1}},
        {"measured_at": "2025-08-25 00:15:02", "values": {"a": 2}},
    ]
    producer = MagicMock()

    sent_count = run_producer_loop(
        producer=producer,
        topic="t",
        generator_factory=_make_generator_factory(rows),
        interval_seconds=0,
        max_messages=3,
        bootstrap_reset_factory=lambda loop_count: {
            "event_type": "bootstrap_reset",
            "loop": loop_count,
        },
        sleep_fn=lambda _s: None,
    )

    assert sent_count == 3
    sent_keys = [call.kwargs["key"] for call in producer.send.call_args_list]
    assert sent_keys == [
        "bootstrap_reset:1",
        "2025-08-25 00:15:01",
        "2025-08-25 00:15:02",
        "bootstrap_reset:2",
        "2025-08-25 00:15:01",
    ]
    first_marker = producer.send.call_args_list[0].kwargs["value"]
    assert first_marker["event_type"] == "bootstrap_reset"
    assert first_marker["published_at"].endswith("Z")
