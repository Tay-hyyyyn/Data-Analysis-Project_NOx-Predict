import { KPI_ANCHORS } from './schematic-roles'
import { formatKpi } from './numericHelpers'
import styles from './HmiSchematic.module.css'

export interface KpiTextsProps {
  nox: number
  ttxm: number
  dwatt: number
  lambda: number
}

export function KpiTexts(props: KpiTextsProps) {
  return (
    <g data-role="kpi-texts" className={styles.kpiTexts}>
      <text
        x={KPI_ANCHORS.nox.x}
        y={KPI_ANCHORS.nox.y}
        textAnchor={KPI_ANCHORS.nox.textAnchor}
        data-role="kpi-text-nox"
      >
        {formatKpi(props.nox, 1)}
      </text>
      <text
        x={KPI_ANCHORS.ttxm.x}
        y={KPI_ANCHORS.ttxm.y}
        textAnchor={KPI_ANCHORS.ttxm.textAnchor}
        data-role="kpi-text-ttxm"
      >
        {formatKpi(props.ttxm, 1)}
      </text>
      <text
        x={KPI_ANCHORS.dwatt.x}
        y={KPI_ANCHORS.dwatt.y}
        textAnchor={KPI_ANCHORS.dwatt.textAnchor}
        data-role="kpi-text-dwatt"
      >
        {formatKpi(props.dwatt, 1)}
      </text>
      <text
        x={KPI_ANCHORS.lambda.x}
        y={KPI_ANCHORS.lambda.y}
        textAnchor={KPI_ANCHORS.lambda.textAnchor}
        data-role="kpi-text-lambda"
      >
        {formatKpi(props.lambda, 2)}
      </text>
    </g>
  )
}
