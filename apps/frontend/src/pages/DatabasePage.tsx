/**
 * DB 스키마 페이지.
 *
 * 본 페이지는 database/db_definition.md v1.2 기준 운영 스키마를 요약한다.
 * 현재 실제 적재가 확정된 테이블은 sensor_data이며, 세션/입력/예측 로그 테이블은
 * 백엔드 영속화 도입 시점에 확정한다.
 */

/**
 * 식별자 표기 원칙:
 * - 운영 sensor_data는 train CSV(`NOx_train_*.csv`)만 적재한다.
 * - test CSV(`NOx_test_20250825.csv`)는 Kafka 스트리밍 시뮬레이션 입력으로 분리한다.
 * - `co`는 학습 타겟에서 제외되어 운영 테이블/로그에 추가하지 않는다.
 */
const erdTables = [
  {
    name: 'sensor_data',
    note: '운영 확정 — v1.2',
    columns: [
      ['measured_at', 'timestamp', 'PK, NOT NULL', '측정 시간'],
      ['syngas_flow', 'double precision', 'NOT NULL', '합성가스 유량'],
      ['igv_opening', 'double precision', 'NOT NULL', 'IGV 개도'],
      ['n2_offset', 'double precision', 'NOT NULL', 'N2 오프셋'],
      ['n2_valve_1', 'double precision', 'NOT NULL', 'N2 주입 제어밸브 1 개도'],
      ['syngas_srv', 'double precision', 'NOT NULL', 'Syngas SRV 개도'],
      ['syngas_gcv_1', 'double precision', 'NOT NULL', 'Syngas GCV 1 개도'],
      ['syngas_gcv_1a', 'double precision', 'NOT NULL', 'Syngas GCV 1A 개도'],
      ['syngas_gcv_2', 'double precision', 'NOT NULL', 'Syngas GCV 2 개도'],
      ['ibh_valve', 'double precision', 'NOT NULL', 'IBH 입구 가열 제어밸브 개도'],
      ['n2_flow', 'double precision', 'NOT NULL', 'N2 주입 유량'],
      ['nox_ppm', 'double precision', 'NOT NULL', 'NOx 농도'],
      ['exhaust_temp', 'double precision', 'NOT NULL', '배기가스 온도'],
      ['power_mw', 'double precision', 'NOT NULL', '발전기 출력'],
      ['npr_primary', 'double precision', 'NOT NULL', '1차 노즐 압력비'],
    ],
  },
  {
    name: 'simulation_session_log',
    note: '예정 — 백엔드 영속화 시점',
    columns: [
      ['id', 'bigint', 'PK', '세션 로그 ID'],
      ['sid', 'varchar(64)', 'UNIQUE', '세션 식별자'],
      ['started_at', 'timestamp', 'NOT NULL', '세션 시작 시간'],
      ['ended_at', 'timestamp', 'nullable', '세션 종료 시간'],
      ['notes', 'text', 'nullable', '비고'],
    ],
  },
  {
    name: 'simulation_input_log',
    note: '예정 — 백엔드 영속화 시점',
    columns: [
      ['id', 'bigint', 'PK', '입력 이력 ID'],
      ['sid', 'varchar(64)', 'FK', 'simulation_session_log.sid 참조'],
      ['created_at', 'timestamp', 'NOT NULL', '입력 기록 시간'],
      ['syngas_flow', 'double precision', 'NOT NULL', '합성가스 유량 목표값'],
      ['igv_opening', 'double precision', 'NOT NULL', 'IGV 개도 목표값'],
      ['n2_offset', 'double precision', 'NOT NULL', 'N2 오프셋 목표값'],
      ['n2_valve_1', 'double precision', 'NOT NULL', 'N2 주입 제어밸브 1 개도 목표값'],
      ['syngas_srv', 'double precision', 'NOT NULL', 'Syngas SRV 개도 목표값'],
      ['syngas_gcv_1', 'double precision', 'NOT NULL', 'Syngas GCV 1 개도 목표값'],
      ['syngas_gcv_1a', 'double precision', 'NOT NULL', 'Syngas GCV 1A 개도 목표값'],
      ['syngas_gcv_2', 'double precision', 'NOT NULL', 'Syngas GCV 2 개도 목표값'],
      ['ibh_valve', 'double precision', 'NOT NULL', 'IBH 입구 가열 제어밸브 개도 목표값'],
      ['n2_flow', 'double precision', 'NOT NULL', 'N2 주입 유량 목표값'],
    ],
  },
  {
    name: 'forecast_log',
    note: '예정 — 백엔드 영속화 시점',
    columns: [
      ['id', 'bigint', 'PK', '예측 이력 ID'],
      ['sid', 'varchar(64)', 'FK', 'simulation_session_log.sid 참조'],
      ['created_at', 'timestamp', 'NOT NULL', '예측 생성 시간'],
      ['target_time', 'timestamp', 'NOT NULL', '예측 대상 미래 시점'],
      ['predicted_nox', 'double precision', 'NOT NULL', '예측된 NOx 농도'],
      ['predicted_exhaust_temp', 'double precision', 'nullable', '예측된 배기가스 온도'],
      ['predicted_power_mw', 'double precision', 'nullable', '예측된 발전기 출력'],
      ['threshold_exceeded', 'boolean', 'NOT NULL', '임계값 초과 여부'],
    ],
  },
]

export function DatabasePage() {
  return (
    <main className="content-page">
      <div className="content-inner db-inner">
        <div className="section-label">DATABASE</div>
        <h1 className="section-title">데이터 모델 v1.2</h1>
        <p className="body-copy">
          IGCC 센서 train 데이터를 적재하는 운영 테이블과, 후속 백엔드 영속화 단계에서
          사용할 로그 테이블의 기준 스키마다.
        </p>

        <section
          className="panel"
          style={{
            padding: '14px 18px',
            margin: '12px 0 24px',
            borderColor: 'rgba(245, 158, 11, 0.45)',
            background: 'rgba(245, 158, 11, 0.08)',
          }}
        >
          <strong>구현 상태</strong> — `sensor_data`는 PostgreSQL에 적재 완료된 운영 테이블이다.
          세션·입력·예측 로그는 아직 백엔드 in-memory 상태를 대체하지 않으며,
          영속화 요구가 확정된 뒤 ORM/Alembic과 함께 도입한다.
        </section>

        <section className="erd-container">
          <div className="erd-wrap">
            <svg className="erd-svg" viewBox="0 0 900 456">
              <line x1="260" y1="310" x2="390" y2="260" className="erd-link" />
              <line x1="260" y1="330" x2="390" y2="390" className="erd-link" />
            </svg>
            <TableNode
              left={10}
              top={20}
              width={280}
              title="sensor_data"
              rows={[
                'measured_at',
                'syngas_flow, igv_opening, n2_offset',
                'n2_valve_1, syngas_srv',
                'syngas_gcv_1, syngas_gcv_1a, syngas_gcv_2',
                'ibh_valve, n2_flow',
                'nox_ppm, exhaust_temp, power_mw',
                'npr_primary',
              ]}
            />
            <TableNode left={10} top={285} width={250} title="simulation_session_log" rows={['id', 'sid', 'started_at', 'ended_at', 'notes']} />
            <TableNode
              left={390}
              top={190}
              width={290}
              title="simulation_input_log"
              rows={[
                'id',
                'sid',
                'created_at',
                'syngas_flow, igv_opening, n2_offset',
                'n2_valve_1, syngas_srv',
                'syngas_gcv_1, syngas_gcv_1a, syngas_gcv_2',
                'ibh_valve, n2_flow',
              ]}
            />
            <TableNode
              left={390}
              top={45}
              width={280}
              title="forecast_log"
              rows={['id', 'sid', 'created_at', 'target_time', 'predicted_nox', 'predicted_exhaust_temp', 'predicted_power_mw']}
            />
          </div>
        </section>

        <section className="content-section">
          <h2 className="section-title">테이블 명세</h2>
          <div className="spec-grid">
            {erdTables.map((table) => (
              <article key={table.name} className="panel spec-card">
                <header className="spec-header">
                  <div className="spec-title">{table.name}</div>
                  <span className="mono spec-count">{table.note}</span>
                </header>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>컬럼</th>
                      <th>타입</th>
                      <th>제약</th>
                      <th>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.columns.map(([name, type, constraint, description]) => (
                      <tr key={`${table.name}-${name}`}>
                        <td className="label-cell">{name}</td>
                        <td>{type}</td>
                        <td className="muted-cell">{constraint}</td>
                        <td className="description-cell">{description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            ))}
          </div>
        </section>
      </div>
      <PageFooter />
    </main>
  )
}

function TableNode({
  left,
  top,
  width,
  title,
  rows,
}: {
  left: number
  top: number
  width: number
  title: string
  rows: string[]
}) {
  return (
    <div className="table-node" style={{ left, top, width }}>
      <div className="table-node-header">{title}</div>
      {rows.map((row) => (
        <div key={row} className="table-node-row">
          <span className="mono">{row}</span>
        </div>
      ))}
    </div>
  )
}

function PageFooter() {
  return (
    <footer className="page-footer">
      <span>NOxO · 합성가스 발전 NOx 디지털 트윈 · 2026-04-29</span>
      <div className="footer-links">
        <span>PRD</span>
        <span>Architecture</span>
        <span>Repo</span>
      </div>
    </footer>
  )
}
