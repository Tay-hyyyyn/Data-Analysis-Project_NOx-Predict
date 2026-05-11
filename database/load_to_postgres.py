import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text


BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_TARGET_FOLDER = BASE_DIR / "data" / "raw" / "250811-250825"
DEFAULT_FILE_PATTERN = "NOx_train_*.csv"
DEFAULT_CHUNK_SIZE = 50000
TABLE_NAME = "sensor_data"

COLUMN_MAPPING = {
    "TagName": "measured_at",
    "IGCC.CC.G1.ca_fqsg_cl": "syngas_flow",
    "IGCC.CC.G1.csgv": "igv_opening",
    "IGCC.CC.G1.NQKR3_MONITOR": "n2_offset",
    "IGCC.CC.G1.nicvs1": "n2_valve_1",
    "IGCC.CC.G1.FSAGR": "syngas_srv",
    "IGCC.CC.G1.FSAG11": "syngas_gcv_1",
    "IGCC.CC.G1.FSAG11A": "syngas_gcv_1a",
    "IGCC.CC.G1.FSAG12": "syngas_gcv_2",
    "IGCC.CC.G1.CSBHX": "ibh_valve",
    "IGCC.CC.G1.NQJ": "n2_flow",
    "IGCC.DeNOX.AT_H1_901_PV": "nox_ppm",
    "IGCC.CC.G1.TTXM": "exhaust_temp",
    "IGCC.CC.G1.DWATT": "power_mw",
    "IGCC.CC.G1.VNPR_P": "npr_primary",
}

CORE_COLUMNS = list(COLUMN_MAPPING.values())
NUMERIC_COLUMNS = [column for column in CORE_COLUMNS if column != "measured_at"]


def build_create_table_sql() -> str:
    numeric_definitions = ",\n            ".join(
        f"{column} DOUBLE PRECISION NOT NULL" for column in NUMERIC_COLUMNS
    )
    return f"""
        DROP TABLE IF EXISTS {TABLE_NAME};

        CREATE TABLE {TABLE_NAME} (
            measured_at TIMESTAMP PRIMARY KEY,
            {numeric_definitions}
        );

        CREATE INDEX IF NOT EXISTS idx_{TABLE_NAME}_measured_at
            ON {TABLE_NAME} (measured_at DESC);
    """


def get_database_url() -> str:
    try:
        load_dotenv()
    except PermissionError:
        pass

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("[에러] DATABASE_URL 환경변수가 없습니다.")
    return database_url


def get_chunk_size() -> int:
    return int(os.getenv("ETL_CHUNK_SIZE", str(DEFAULT_CHUNK_SIZE)))


def extract_sensor_csv(
    target_folder: Path = DEFAULT_TARGET_FOLDER,
    file_pattern: str = DEFAULT_FILE_PATTERN,
) -> pd.DataFrame:
    print("[Extract] 데이터를 불러오는 중...")
    file_list = sorted(target_folder.glob(file_pattern))

    if not file_list:
        raise FileNotFoundError(
            f"[에러] CSV 파일을 찾을 수 없습니다: {target_folder / file_pattern}"
        )

    df_list = [
        pd.read_csv(file, skiprows=[1, 2, 3, 4])
        for file in file_list
    ]
    return pd.concat(df_list, ignore_index=True)


def transform_sensor_data(df: pd.DataFrame) -> pd.DataFrame:
    df = df.drop(columns=["IGCC.CC.G1.ttfr1", "Column1"], errors="ignore")

    missing_columns = [column for column in COLUMN_MAPPING if column not in df.columns]
    if missing_columns:
        raise KeyError(f"[에러] 원천 CSV에 필수 컬럼이 없습니다: {missing_columns}")

    df = df.rename(columns=COLUMN_MAPPING)
    df["measured_at"] = pd.to_datetime(df["measured_at"], errors="coerce")

    df_core = df[CORE_COLUMNS].copy()

    df_core[NUMERIC_COLUMNS] = df_core[NUMERIC_COLUMNS].apply(pd.to_numeric, errors="coerce")
    df_core = df_core.dropna(subset=CORE_COLUMNS)

    print(f"[Transform] 전처리 완료. 총 {len(df_core)}행의 데이터를 DB에 적재합니다...")
    return df_core


def load_sensor_data(df: pd.DataFrame, database_url: str | None = None) -> None:
    engine = create_engine(database_url or get_database_url())
    with engine.begin() as conn:
        conn.execute(text(build_create_table_sql()))

    append_sensor_data(df, engine)
    print("[Load] PostgreSQL DB 적재가 끝났습니다.")


def append_sensor_data(df: pd.DataFrame, engine) -> None:
    df.to_sql(
        name=TABLE_NAME,
        con=engine,
        if_exists="append",
        index=False,
        chunksize=10000,
        method="multi",
    )


def validate_sensor_data(database_url: str | None = None) -> dict:
    engine = create_engine(database_url or get_database_url())
    null_checks = "\n                        OR ".join(
        f"{column} IS NULL" for column in CORE_COLUMNS
    )
    query = text(
        f"""
        SELECT
            COUNT(*) AS row_count,
            MIN(measured_at) AS start_at,
            MAX(measured_at) AS end_at,
            SUM(
                CASE
                    WHEN {null_checks}
                    THEN 1
                    ELSE 0
                END
            ) AS null_row_count
        FROM {TABLE_NAME}
        """
    )

    with engine.connect() as conn:
        row = conn.execute(query).mappings().one()

    result = dict(row)
    if result["row_count"] == 0:
        raise ValueError("[에러] sensor_data 테이블에 적재된 데이터가 없습니다.")
    if result["null_row_count"] > 0:
        raise ValueError(f"[에러] 핵심 컬럼에 결측 행이 있습니다: {result['null_row_count']}")

    print(
        "[Validate] 검증 완료. "
        f"rows={result['row_count']}, "
        f"range={result['start_at']} ~ {result['end_at']}"
    )
    return result


def run_pipeline() -> dict:
    database_url = get_database_url()
    engine = create_engine(database_url)

    with engine.begin() as conn:
        conn.execute(text(build_create_table_sql()))

    total_loaded = 0
    file_list = sorted(DEFAULT_TARGET_FOLDER.glob(DEFAULT_FILE_PATTERN))
    if not file_list:
        raise FileNotFoundError(
            f"[에러] CSV 파일을 찾을 수 없습니다: {DEFAULT_TARGET_FOLDER / DEFAULT_FILE_PATTERN}"
        )

    for file in file_list:
        print(f"[Extract] chunk 단위로 데이터를 불러오는 중: {file.name}")
        for raw_chunk in pd.read_csv(
            file,
            skiprows=[1, 2, 3, 4],
            chunksize=get_chunk_size(),
        ):
            sensor_chunk = transform_sensor_data(raw_chunk)
            append_sensor_data(sensor_chunk, engine)
            total_loaded += len(sensor_chunk)
            print(f"[Load] 누적 적재 행 수: {total_loaded}")

    print("[Load] PostgreSQL DB 적재가 끝났습니다.")
    return validate_sensor_data(database_url)


if __name__ == "__main__":
    run_pipeline()
