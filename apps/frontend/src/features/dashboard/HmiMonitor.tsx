import { useState } from 'react'
import type { VariableConfig, VariableKey } from './mockConsole'
import './HmiMonitor.css'

export type HmiMonitorProps = {
  controls: Record<VariableKey, VariableConfig>
  nox: number
  exhaust: number
  lambda: number
  power: number
  fsagr?: number
  fsag11?: number
  fsag11a?: number
  fsag12?: number
  csbhx?: number
  csgv?: number
}

// PNG와 동일한 viewBox
const VIEW_W = 1316
const VIEW_H = 430

// 배경/라인 색상
const BG = '#06121f'
const BG_PANEL = '#0a1a2a'
const CYAN = '#22d3ee'
const CYAN_DIM = '#0e4a5c'
const PINK = '#f472b6'
const PINK_DIM = '#7a1f3f'
const GREEN = '#4ade80'
const GREEN_DIM = '#1e5034'
const ORANGE = '#fb923c'
const PURPLE = '#a78bfa'
const TEXT_DIM = '#5a7a90'
const WHITE = '#e2f1ff'

// 좌표 — 모두 PNG 픽셀 측정값 기반 (1316×430)
type LabelBox = { x: number; y: number; w: number; h: number }

// 좌측 박스 (PNG zoom 측정: x=17~207, y=40~110 / y=140~213)
const FUEL_BOX: LabelBox = { x: 17, y: 65, w: 175, h: 60 }
const AIR_BOX: LabelBox = { x: 17, y: 165, w: 175, h: 60 }

// 상단 적색 라벨 박스 (PNG 측정: 박스 stroke y=137~140이 하단, 박스 폭 ~80px)
// FSAGR: x=193~273, FSAG11: x=553~644, FSAG11A: x=670~761, FSAG12: x=786~866 추정
const FSAGR_BOX: LabelBox = { x: 193, y: 110, w: 80, h: 45 }
const FSAG11_BOX: LabelBox = { x: 553, y: 95, w: 92, h: 44 }
const FSAG11A_BOX: LabelBox = { x: 670, y: 95, w: 92, h: 44 }
const FSAG12_BOX: LabelBox = { x: 786, y: 95, w: 80, h: 44 }

// 하단 시안 라벨 박스 (PNG 라벨 측정: CSBHX center=303, csgv center=475 추정)
const CSBHX_BOX: LabelBox = { x: 263, y: 270, w: 80, h: 45 }
const CSGV_BOX: LabelBox = { x: 435, y: 270, w: 80, h: 45 }

// 우측 KPI 박스 (PNG 측정: x=1134~1296, y=83~291 사이 4개 균일분할)
const NOX_BOX: LabelBox = { x: 1134, y: 88, w: 162, h: 46 }
const TTXM_BOX: LabelBox = { x: 1134, y: 140, w: 162, h: 46 }
const DWATT_BOX: LabelBox = { x: 1134, y: 192, w: 162, h: 46 }
const LAMBDA_BOX: LabelBox = { x: 1134, y: 244, w: 162, h: 46 }

// 중앙 기계부품 — 라벨 위치(y=324~330) 기준 측정값
// GENERATOR center x=632, COMPRESSOR x=729, COMBUSTOR x=826, TURBINE x=923, EXHAUST x=1018
const GEN_CX = 632
const COMP_X1 = 700, COMP_X2 = 760, COMP_CX = 730
const COMB_X1 = 790, COMB_X2 = 862, COMB_CX = 826
const TURB_X1 = 902, TURB_X2 = 945, TURB_CX = 923
const EXH_X1 = 985, EXH_X2 = 1055, EXH_CX = 1018
const MACH_Y_TOP = 195
const MACH_Y_BOT = 305
const MACH_Y_MID = 250
const LABEL_Y = 327

// 미니 라인차트 path 생성
function miniChart(x: number, y: number, w: number, h: number, seed: number): string {
  const pts: [number, number][] = []
  let cy = y + h / 2
  for (let i = 0; i <= 12; i++) {
    const px = x + (i / 12) * w
    cy = y + h * 0.3 + Math.sin(i * 0.7 + seed) * h * 0.25 + (Math.cos(i * 1.3 + seed * 2)) * h * 0.15
    pts.push([px, cy])
  }
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
}

export function HmiMonitor({
  controls,
  nox,
  exhaust,
  lambda,
  power,
  fsagr = 76.0,
  fsag11 = 45.0,
  fsag11a = 45.9,
  fsag12 = 76.0,
  csbhx = 75.0,
  csgv = 75.0,
}: HmiMonitorProps) {
  const [showGrid, setShowGrid] = useState(false)

  const syngas = controls.syngasFlow.value
  const n2 = controls.n2Flow.value
  const air = 75.0 // mock

  return (
    <div className="hmi-monitor">
      <div className="hmi-toolbar">
        <button
          type="button"
          className={`hmi-overlay-toggle ${showGrid ? 'on' : 'off'}`}
          onClick={() => setShowGrid((p) => !p)}
        >
          GRID {showGrid ? 'ON' : 'OFF'}
        </button>
      </div>

      <svg
        className="hmi-svg"
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 적색 파이프 그라데이션 */}
          <linearGradient id="pipe-red" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>
          {/* 시안 파이프 */}
          <linearGradient id="pipe-cyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
          {/* 녹색 파이프 */}
          <linearGradient id="pipe-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          {/* 컴프레서/터빈 사다리꼴 */}
          <linearGradient id="trapezoid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f3548" />
            <stop offset="50%" stopColor="#3a5a78" />
            <stop offset="100%" stopColor="#1f3548" />
          </linearGradient>
          {/* 연소기 본체 */}
          <linearGradient id="combustor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a1a18" />
            <stop offset="50%" stopColor="#5a3020" />
            <stop offset="100%" stopColor="#2a1a18" />
          </linearGradient>
          {/* 불꽃 */}
          <radialGradient id="flame" cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="40%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.3" />
          </radialGradient>
          {/* KPI 미니차트 글로우 */}
          <filter id="glow-cyan">
            <feGaussianBlur stdDeviation="0.8" />
          </filter>
        </defs>

        {/* === 배경 === */}
        <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill={BG} />

        {/* === 외곽 프레임 === */}
        <rect x="2" y="2" width={VIEW_W - 4} height={VIEW_H - 4} fill="none" stroke={CYAN_DIM} strokeWidth="1" />
        {/* 상단 헤더 라인 (y=83) */}
        <line x1="20" y1="60" x2={VIEW_W - 20} y2="60" stroke={CYAN_DIM} strokeWidth="0.8" opacity="0.6" />
        {/* 하단 푸터 라인 */}
        <line x1="20" y1="370" x2={VIEW_W - 20} y2="370" stroke={CYAN_DIM} strokeWidth="0.8" opacity="0.6" />

        {/* === 좌측 계통 라벨 === */}
        <text x="20" y="65" fill={TEXT_DIM} fontSize="9" fontFamily="ui-sans-serif, system-ui">합성가스 계통</text>
        <text x="20" y="155" fill={TEXT_DIM} fontSize="9" fontFamily="ui-sans-serif, system-ui">질소 계통</text>
        <text x="20" y="265" fill={TEXT_DIM} fontSize="9" fontFamily="ui-sans-serif, system-ui">공기 계통</text>

        {/* === 좌측 FUEL 박스 (ca_fqsg_cl) === */}
        <g>
          <rect x={FUEL_BOX.x} y={FUEL_BOX.y} width={FUEL_BOX.w} height={FUEL_BOX.h} fill="#021a13" stroke={GREEN_DIM} strokeWidth="1" rx="3" />
          <text x={FUEL_BOX.x + 8} y={FUEL_BOX.y + 16} fill={GREEN} fontSize="10" fontFamily="ui-monospace, monospace" fontWeight="600">ca_fqsg_cl</text>
          <text x={FUEL_BOX.x + 8} y={FUEL_BOX.y + 45} fill={GREEN} fontSize="20" fontFamily="ui-monospace, monospace" fontWeight="700">{syngas.toFixed(1)}</text>
          <text x={FUEL_BOX.x + FUEL_BOX.w - 8} y={FUEL_BOX.y + 45} fill={GREEN} fontSize="10" fontFamily="ui-monospace, monospace" opacity="0.85" textAnchor="end">kg/s</text>
          {/* 좌측 dot 연결 */}
          <circle cx={FUEL_BOX.x + FUEL_BOX.w + 2} cy={FUEL_BOX.y + FUEL_BOX.h / 2} r="1.5" fill={GREEN} />
        </g>

        {/* === 좌측 N2 박스 (NOKR3_MONITOR) === */}
        <g>
          <rect x={AIR_BOX.x} y={AIR_BOX.y} width={AIR_BOX.w} height={AIR_BOX.h} fill="#021a13" stroke={GREEN_DIM} strokeWidth="1" rx="3" />
          <text x={AIR_BOX.x + 8} y={AIR_BOX.y + 16} fill={GREEN} fontSize="10" fontFamily="ui-monospace, monospace" fontWeight="600">NOKR3_MONITOR</text>
          <text x={AIR_BOX.x + 8} y={AIR_BOX.y + 45} fill={GREEN} fontSize="20" fontFamily="ui-monospace, monospace" fontWeight="700">{n2.toFixed(1)}</text>
          <text x={AIR_BOX.x + AIR_BOX.w - 8} y={AIR_BOX.y + 45} fill={GREEN} fontSize="10" fontFamily="ui-monospace, monospace" opacity="0.85" textAnchor="end">raw</text>
          <circle cx={AIR_BOX.x + AIR_BOX.w + 2} cy={AIR_BOX.y + AIR_BOX.h / 2} r="1.5" fill={GREEN} />
        </g>

        {/* === 상단 적색 파이프 라인 === */}
        <g className="hmi-pipe-red">
          {/* FUEL 박스 → FSAGR */}
          <path d={`M ${FUEL_BOX.x + FUEL_BOX.w} 132 H ${FSAGR_BOX.x}`} fill="none" stroke="url(#pipe-red)" strokeWidth="3" strokeLinecap="round" />
          {/* FSAGR (y=132) → 수직 상승 → FSAG11 (y=117) */}
          <path d={`M ${FSAGR_BOX.x + FSAGR_BOX.w} 132 L ${FSAG11_BOX.x - 5} 132 L ${FSAG11_BOX.x - 5} 117 L ${FSAG11_BOX.x} 117`} fill="none" stroke="url(#pipe-red)" strokeWidth="3" />
          <path d={`M ${FSAG11_BOX.x + FSAG11_BOX.w} 117 H ${FSAG11A_BOX.x}`} fill="none" stroke="url(#pipe-red)" strokeWidth="3" />
          <path d={`M ${FSAG11A_BOX.x + FSAG11A_BOX.w} 117 H ${FSAG12_BOX.x}`} fill="none" stroke="url(#pipe-red)" strokeWidth="3" />
          {/* FSAG12 → 컴프레서 상단 (수직 진입) */}
          <path d={`M ${FSAG12_BOX.x + FSAG12_BOX.w} 117 H ${COMP_X2 + 10} V ${MACH_Y_TOP - 5}`} fill="none" stroke="url(#pipe-red)" strokeWidth="3" />
          {/* 흐름 dots */}
          <path d={`M ${FUEL_BOX.x + FUEL_BOX.w} 132 H ${FSAGR_BOX.x} M ${FSAGR_BOX.x + FSAGR_BOX.w} 132 H ${FSAG11_BOX.x} M ${FSAG11_BOX.x + FSAG11_BOX.w} 117 H ${FSAG11A_BOX.x} M ${FSAG11A_BOX.x + FSAG11A_BOX.w} 117 H ${FSAG12_BOX.x} M ${FSAG12_BOX.x + FSAG12_BOX.w} 117 H ${COMP_X2 + 10}`} fill="none" stroke="#fde7f3" strokeWidth="1.5" strokeDasharray="2 14" strokeLinecap="round" className="hmi-flow-anim" opacity="0.85" />
        </g>

        {/* === 상단 적색 라벨 박스 4개 === */}
        {[
          { box: FSAGR_BOX, label: 'FSAGR', value: fsagr, unit: '%' },
          { box: FSAG11_BOX, label: 'FSAG11', value: fsag11, unit: '%' },
          { box: FSAG11A_BOX, label: 'FSAG11A', value: fsag11a, unit: '%' },
          { box: FSAG12_BOX, label: 'FSAG12', value: fsag12, unit: '%' },
        ].map((b, i) => (
          <g key={`top-${i}`}>
            <rect x={b.box.x} y={b.box.y} width={b.box.w} height={b.box.h} fill="#1a0a18" stroke={PINK_DIM} strokeWidth="1" rx="2" />
            <text x={b.box.x + b.box.w / 2} y={b.box.y + 12} fill={PINK} fontSize="9" fontFamily="ui-monospace, monospace" fontWeight="700" textAnchor="middle">{b.label}</text>
            <text x={b.box.x + b.box.w / 2 - 6} y={b.box.y + 30} fill={PINK} fontSize="14" fontFamily="ui-monospace, monospace" fontWeight="700" textAnchor="middle">{b.value.toFixed(1)}</text>
            <text x={b.box.x + b.box.w - 8} y={b.box.y + 30} fill={PINK} fontSize="9" fontFamily="ui-monospace, monospace" textAnchor="end">{b.unit}</text>
            {/* 진행 막대 */}
            <rect x={b.box.x + 6} y={b.box.y + b.box.h - 8} width={b.box.w - 12} height="3" fill={PINK_DIM} opacity="0.5" />
            <rect x={b.box.x + 6} y={b.box.y + b.box.h - 8} width={(b.box.w - 12) * (b.value / 100)} height="3" fill={PINK} opacity="0.85" />
          </g>
        ))}

        {/* === 상단 라벨 박스 사이 X 밸브 === */}
        {[
          { x: (FSAGR_BOX.x + FSAGR_BOX.w + FSAG11_BOX.x) / 2 - 10, y: 124 },
          { x: (FSAG11_BOX.x + FSAG11_BOX.w + FSAG11A_BOX.x) / 2 - 10, y: 109 },
          { x: (FSAG11A_BOX.x + FSAG11A_BOX.w + FSAG12_BOX.x) / 2 - 10, y: 109 },
        ].map((v, i) => (
          <g key={`v-top-${i}`} transform={`translate(${v.x}, ${v.y})`}>
            <polygon points="0,0 18,8 0,16" fill="none" stroke={PINK} strokeWidth="1" />
            <polygon points="18,0 0,8 18,16" fill="none" stroke={PINK} strokeWidth="1" />
            <line x1="9" y1="0" x2="9" y2="-4" stroke={PINK} strokeWidth="1" />
          </g>
        ))}

        {/* === 하단 시안 파이프 라인 === */}
        <g className="hmi-pipe-cyan">
          {(() => { const PY = CSBHX_BOX.y + CSBHX_BOX.h / 2; return (
            <>
              <path d={`M ${AIR_BOX.x + AIR_BOX.w} ${PY} H ${CSBHX_BOX.x}`} fill="none" stroke="url(#pipe-cyan)" strokeWidth="3" />
              <path d={`M ${CSBHX_BOX.x + CSBHX_BOX.w} ${PY} H ${CSGV_BOX.x}`} fill="none" stroke="url(#pipe-cyan)" strokeWidth="3" />
              <path d={`M ${CSGV_BOX.x + CSGV_BOX.w} ${PY} H ${COMP_X2 + 10} V ${MACH_Y_BOT + 5}`} fill="none" stroke="url(#pipe-cyan)" strokeWidth="3" />
              <path d={`M ${AIR_BOX.x + AIR_BOX.w} ${PY} H ${CSBHX_BOX.x} M ${CSBHX_BOX.x + CSBHX_BOX.w} ${PY} H ${CSGV_BOX.x} M ${CSGV_BOX.x + CSGV_BOX.w} ${PY} H ${COMP_X2 + 10}`} fill="none" stroke="#cffafe" strokeWidth="1.5" strokeDasharray="2 14" strokeLinecap="round" className="hmi-flow-anim" opacity="0.85" />
            </>
          ) })()}
        </g>

        {/* === 하단 시안 라벨 박스 2개 === */}
        {[
          { box: CSBHX_BOX, label: 'CSBHX', value: csbhx, unit: '%' },
          { box: CSGV_BOX, label: 'csgv', value: csgv, unit: '%' },
        ].map((b, i) => (
          <g key={`bot-${i}`}>
            <rect x={b.box.x} y={b.box.y} width={b.box.w} height={b.box.h} fill="#021824" stroke={CYAN_DIM} strokeWidth="1" rx="2" />
            <text x={b.box.x + b.box.w / 2} y={b.box.y + 12} fill={CYAN} fontSize="9" fontFamily="ui-monospace, monospace" fontWeight="700" textAnchor="middle">{b.label}</text>
            <text x={b.box.x + b.box.w / 2 - 6} y={b.box.y + 30} fill={CYAN} fontSize="14" fontFamily="ui-monospace, monospace" fontWeight="700" textAnchor="middle">{b.value.toFixed(1)}</text>
            <text x={b.box.x + b.box.w - 8} y={b.box.y + 30} fill={CYAN} fontSize="9" fontFamily="ui-monospace, monospace" textAnchor="end">{b.unit}</text>
            {/* 진행 막대 */}
            <rect x={b.box.x + 6} y={b.box.y + b.box.h - 8} width={b.box.w - 12} height="3" fill={CYAN_DIM} opacity="0.5" />
            <rect x={b.box.x + 6} y={b.box.y + b.box.h - 8} width={(b.box.w - 12) * (b.value / 100)} height="3" fill={CYAN} opacity="0.85" />
          </g>
        ))}

        {/* === 하단 박스 사이 X 밸브 === */}
        {[
          { x: (CSBHX_BOX.x + CSBHX_BOX.w + CSGV_BOX.x) / 2 - 10, y: CSBHX_BOX.y + CSBHX_BOX.h / 2 - 8 },
        ].map((v, i) => (
          <g key={`v-bot-${i}`} transform={`translate(${v.x}, ${v.y})`}>
            <polygon points="0,0 18,8 0,16" fill="none" stroke={CYAN} strokeWidth="1" />
            <polygon points="18,0 0,8 18,16" fill="none" stroke={CYAN} strokeWidth="1" />
            <line x1="9" y1="0" x2="9" y2="-4" stroke={CYAN} strokeWidth="1" />
          </g>
        ))}

        {/* === 중간 녹색 라인 + 75.0%/15.7 kg/s 박스 === */}
        <g>
          {/* 녹색 파이프 — N2 박스 → G 진입 */}
          <path d={`M ${AIR_BOX.x + AIR_BOX.w} ${MACH_Y_MID} H ${GEN_CX - 22}`} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
          <path d={`M ${AIR_BOX.x + AIR_BOX.w} ${MACH_Y_MID} H ${GEN_CX - 22}`} fill="none" stroke="#bbf7d0" strokeWidth="1.5" strokeDasharray="2 14" className="hmi-flow-anim" opacity="0.95" />
          {/* 중간 보조 박스 (75.0% 와 15.7 kg/s) — PNG 위치: x=290~360, x=440~520 부근 */}
          <rect x="295" y={MACH_Y_MID - 12} width="55" height="22" fill="#021a13" stroke={GREEN_DIM} strokeWidth="0.8" rx="2" />
          <text x="322" y={MACH_Y_MID + 4} fill={GREEN} fontSize="11" fontFamily="ui-monospace, monospace" textAnchor="middle" fontWeight="700">75.0 %</text>
          <rect x="445" y={MACH_Y_MID - 12} width="65" height="22" fill="#021a13" stroke={GREEN_DIM} strokeWidth="0.8" rx="2" />
          <text x="477" y={MACH_Y_MID + 4} fill={GREEN} fontSize="11" fontFamily="ui-monospace, monospace" textAnchor="middle" fontWeight="700">{air.toFixed(1)} kg/s</text>
        </g>

        {/* === 중앙 기계부품: G → 컴프레서 → 연소기 → 터빈 → 배기 (PNG 라벨 좌표 기준) === */}
        <g>
          {/* 제너레이터 G (좌측 첫번째) center x=632 */}
          <circle cx={GEN_CX} cy={MACH_Y_MID} r="22" fill={BG_PANEL} stroke={CYAN} strokeWidth="1.2" />
          <text x={GEN_CX} y={MACH_Y_MID + 8} fill={CYAN} fontSize="20" fontFamily="ui-sans-serif" fontWeight="700" textAnchor="middle">G</text>
          <circle cx={GEN_CX - 7} cy={MACH_Y_MID + 30} r="1.5" fill={CYAN} opacity="0.5" />
          <circle cx={GEN_CX} cy={MACH_Y_MID + 30} r="1.5" fill={CYAN} />
          <circle cx={GEN_CX + 7} cy={MACH_Y_MID + 30} r="1.5" fill={CYAN} opacity="0.5" />
          <text x={GEN_CX} y={LABEL_Y} fill="#5a8aa0" fontSize="9" fontFamily="ui-sans-serif" textAnchor="middle" letterSpacing="0.5">GENERATOR</text>

          {/* G → 컴프레서 연결 */}
          <line x1={GEN_CX + 22} y1={MACH_Y_MID} x2={COMP_X1} y2={MACH_Y_MID} stroke={CYAN_DIM} strokeWidth="1.2" />

          {/* 컴프레서 (좌가 작음) x=700~760 */}
          <polygon points={`${COMP_X1},${MACH_Y_TOP + 12} ${COMP_X2},${MACH_Y_TOP} ${COMP_X2},${MACH_Y_BOT} ${COMP_X1},${MACH_Y_BOT - 12}`} fill="url(#trapezoid)" stroke={CYAN} strokeWidth="0.8" />
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`cl${i}`} x1={COMP_X1 + 5 + i * 7} y1={MACH_Y_TOP + 12 - i * 1.7} x2={COMP_X1 + 5 + i * 7} y2={MACH_Y_BOT - 12 + i * 1.7} stroke={CYAN_DIM} strokeWidth="0.5" opacity="0.7" />
          ))}
          <text x={COMP_CX} y={LABEL_Y} fill="#5a8aa0" fontSize="9" fontFamily="ui-sans-serif" textAnchor="middle" letterSpacing="0.5">COMPRESSOR</text>

          {/* 연소기 본체 x=790~862, 불꽃 3개 세로 */}
          <rect x={COMB_X1} y={MACH_Y_TOP} width={COMB_X2 - COMB_X1} height={MACH_Y_BOT - MACH_Y_TOP} fill="url(#combustor)" stroke={CYAN} strokeWidth="0.8" rx="3" />
          {/* 연소기 좌측 cap (입력) */}
          <rect x={COMB_X1 - 8} y={MACH_Y_MID - 18} width="8" height="36" fill="url(#trapezoid)" stroke={CYAN_DIM} strokeWidth="0.5" />
          {/* 연소기 우측 cap (출력) */}
          <rect x={COMB_X2} y={MACH_Y_MID - 18} width="8" height="36" fill="url(#trapezoid)" stroke={CYAN_DIM} strokeWidth="0.5" />
          {/* 내부 가로 분할선 (3개 셀로 분할) */}
          <line x1={COMB_X1 + 5} y1={MACH_Y_TOP + 35} x2={COMB_X2 - 5} y2={MACH_Y_TOP + 35} stroke={ORANGE} strokeWidth="0.5" opacity="0.4" />
          <line x1={COMB_X1 + 5} y1={MACH_Y_TOP + 73} x2={COMB_X2 - 5} y2={MACH_Y_TOP + 73} stroke={ORANGE} strokeWidth="0.5" opacity="0.4" />
          {/* 불꽃 3개 세로 */}
          <ellipse cx={COMB_CX} cy={MACH_Y_TOP + 18} rx="9" ry="12" fill="url(#flame)" className="hmi-flame" />
          <ellipse cx={COMB_CX} cy={MACH_Y_TOP + 53} rx="9" ry="12" fill="url(#flame)" className="hmi-flame" />
          <ellipse cx={COMB_CX} cy={MACH_Y_TOP + 90} rx="9" ry="12" fill="url(#flame)" className="hmi-flame" />
          <text x={COMB_CX} y={LABEL_Y} fill="#5a8aa0" fontSize="9" fontFamily="ui-sans-serif" textAnchor="middle" letterSpacing="0.5">COMBUSTOR</text>

          {/* 터빈 (좌가 작고 우가 큼) x=902~945 */}
          <polygon points={`${TURB_X1},${MACH_Y_TOP} ${TURB_X2},${MACH_Y_TOP - 5} ${TURB_X2},${MACH_Y_BOT + 5} ${TURB_X1},${MACH_Y_BOT}`} fill="url(#trapezoid)" stroke={CYAN} strokeWidth="0.8" />
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`tl${i}`} x1={TURB_X1 + 4 + i * 6} y1={MACH_Y_TOP - i * 0.5} x2={TURB_X1 + 4 + i * 6} y2={MACH_Y_BOT + i * 0.5} stroke={CYAN_DIM} strokeWidth="0.5" opacity="0.7" />
          ))}
          <text x={TURB_CX} y={LABEL_Y} fill="#5a8aa0" fontSize="9" fontFamily="ui-sans-serif" textAnchor="middle" letterSpacing="0.5">TURBINE</text>

          {/* 배기 x=985~1055 (가장 큰 사다리꼴) */}
          <polygon points={`${EXH_X1},${MACH_Y_TOP - 5} ${EXH_X2},${MACH_Y_TOP - 12} ${EXH_X2},${MACH_Y_BOT + 12} ${EXH_X1},${MACH_Y_BOT + 5}`} fill="url(#trapezoid)" stroke={CYAN} strokeWidth="0.8" />
          <text x={EXH_CX} y={LABEL_Y} fill="#5a8aa0" fontSize="9" fontFamily="ui-sans-serif" textAnchor="middle" letterSpacing="0.5">EXHAUST</text>

          {/* 샤프트 (G→컴프레서→터빈 중앙선) */}
          <line x1={GEN_CX + 22} y1={MACH_Y_MID} x2={EXH_X1} y2={MACH_Y_MID} stroke={CYAN_DIM} strokeWidth="0.4" opacity="0.4" />
        </g>

        {/* === 우측 KPI 4개 === */}
        {[
          { box: NOX_BOX, label: 'NOx', value: nox, unit: 'ppm', color: CYAN, seed: 1.1 },
          { box: TTXM_BOX, label: 'TTXM', value: exhaust, unit: '°C', color: ORANGE, seed: 2.3 },
          { box: DWATT_BOX, label: 'DWATT', value: power, unit: 'MW', color: CYAN, seed: 3.7 },
          { box: LAMBDA_BOX, label: 'λ (lambda)', value: lambda, unit: '', color: CYAN, seed: 4.5 },
        ].map((k, i) => (
          <g key={`kpi-${i}`}>
            <rect x={k.box.x} y={k.box.y} width={k.box.w} height={k.box.h} fill="#021824" stroke={k.color} strokeWidth="0.8" strokeOpacity="0.5" rx="3" />
            <text x={k.box.x + 8} y={k.box.y + 14} fill={k.color} fontSize="9" fontFamily="ui-sans-serif" fontWeight="700">{k.label}</text>
            <text x={k.box.x + 8} y={k.box.y + 36} fill={k.color} fontSize="18" fontFamily="ui-monospace, monospace" fontWeight="700">{k.value.toFixed(k.label.startsWith('λ') ? 2 : 1)}</text>
            <text x={k.box.x + 78} y={k.box.y + 36} fill={k.color} fontSize="9" fontFamily="ui-monospace, monospace" opacity="0.85">{k.unit}</text>
            {/* 미니차트 - 우측에 더 크게 */}
            <path d={miniChart(k.box.x + 100, k.box.y + 14, 56, 28, k.seed)} fill="none" stroke={k.color} strokeWidth="1.3" filter="url(#glow-cyan)" />
            {/* 좌측 점선 dot 연결 */}
            <line x1={k.box.x - 12} y1={k.box.y + k.box.h / 2} x2={k.box.x} y2={k.box.y + k.box.h / 2} stroke={k.color} strokeWidth="0.6" strokeDasharray="1.5 2" opacity="0.5" />
            <circle cx={k.box.x - 12} cy={k.box.y + k.box.h / 2} r="1.5" fill={k.color} opacity="0.8" />
          </g>
        ))}

        {/* 그리드 (디버그) */}
        {showGrid && (
          <g className="hmi-grid">
            {Array.from({ length: 26 }).map((_, i) => (
              <g key={`vg${i}`}>
                <line x1={(i + 1) * 50} y1={0} x2={(i + 1) * 50} y2={VIEW_H} stroke={CYAN} strokeWidth="0.4" opacity="0.3" />
                {(i + 1) % 2 === 0 && (
                  <text x={(i + 1) * 50 + 2} y={10} fill={CYAN} fontSize="7" opacity="0.7">{(i + 1) * 50}</text>
                )}
              </g>
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <g key={`hg${i}`}>
                <line x1={0} y1={(i + 1) * 50} x2={VIEW_W} y2={(i + 1) * 50} stroke={CYAN} strokeWidth="0.4" opacity="0.3" />
                <text x={2} y={(i + 1) * 50 - 2} fill={CYAN} fontSize="7" opacity="0.7">{(i + 1) * 50}</text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  )
}
