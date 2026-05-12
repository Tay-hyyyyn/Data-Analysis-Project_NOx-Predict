import { KPI_ANCHORS } from './schematic-roles'
import styles from './HmiSchematic.module.css'

// KPI_ANCHORS의 좌표는 숫자값 텍스트 위치 — 라벨은 그 위쪽으로 약간 띄운다.
const LABEL_Y_OFFSET = -20

type Anchor = (typeof KPI_ANCHORS)[keyof typeof KPI_ANCHORS]

const LABELS: ReadonlyArray<{ key: keyof typeof KPI_ANCHORS; text: string }> = [
  { key: 'syngas', text: '합성가스 유량' },
  { key: 'csgv', text: 'IGV 개도' },
  { key: 'nqkr3', text: '질소 오프셋' },
  { key: 'nicvs1', text: 'N2 제어밸브 #1' },
  { key: 'fsagr', text: 'Syngas SRV' },
  { key: 'fsag11', text: 'Syngas GCV #1' },
  { key: 'fsag11a', text: 'Syngas GCV #1A' },
  { key: 'fsag12', text: 'Syngas GCV #2' },
  { key: 'csbhx', text: 'IBH 가열밸브' },
  { key: 'nqj', text: 'N2 주입 유량' },
  { key: 'nox', text: 'NOx' },
  { key: 'ttxm', text: '배기온도' },
  { key: 'dwatt', text: '발전량' },
  { key: 'lambda', text: '공기비' },
]

export function LabelTexts() {
  return (
    <g data-role="label-texts" className={styles.labelTexts}>
      {LABELS.map(({ key, text }) => {
        const anchor: Anchor = KPI_ANCHORS[key]
        return (
          <text
            key={key}
            x={anchor.x}
            y={anchor.y + LABEL_Y_OFFSET}
            textAnchor={anchor.textAnchor}
            data-role={`label-${key}`}
          >
            {text}
          </text>
        )
      })}
    </g>
  )
}
