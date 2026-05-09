import styles from './HmiSchematic.module.css'

// combustor bbox: (773.6, 404.63, 63.31×7.5). 가운데(805) 위에 flame을 배치.
export function FlameOverlay() {
  return (
    <g data-role="flame">
      <ellipse cx={805} cy={400} rx={32} ry={10} className={styles.flameOuter} />
      <ellipse cx={805} cy={398} rx={20} ry={6}  className={styles.flameMid} />
      <ellipse cx={805} cy={396} rx={10} ry={3}  className={styles.flameInner} />
    </g>
  )
}
