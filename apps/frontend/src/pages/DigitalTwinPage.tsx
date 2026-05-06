import { useOutletContext } from 'react-router-dom'
import { useConsoleState } from '../features/dashboard/useConsoleState'
import type { AppOutletContext } from '../app/App'

export function DigitalTwinPage() {
  const { mode } = useOutletContext<AppOutletContext>()
  const { state } = useConsoleState(mode)

  const sg = state.variables.syngas.value
  const n2 = state.variables.n2.value
  const igv = state.variables.load.value
  const { nox, co, exhaust, lambda, power } = state.metrics
  const efficiency = Math.min(99, Math.max(60, (89 * power) / 248.6)).toFixed(1)
  const noxColor = nox > 50 ? '#ff0000' : '#0000ff'

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', background: '#bebebe' }}>
      <svg
        viewBox="0 0 1456 816"
        width="100%"
        height="100%"
        style={{ display: 'block', background: '#bebebe' }}
      >
        <defs>
          <linearGradient id="gPink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff88ff" />
            <stop offset="40%" stopColor="#ff00ff" />
            <stop offset="100%" stopColor="#aa00aa" />
          </linearGradient>
          <linearGradient id="gOlive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ddcc44" />
            <stop offset="40%" stopColor="#bbaa00" />
            <stop offset="100%" stopColor="#886600" />
          </linearGradient>
          <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6644" />
            <stop offset="40%" stopColor="#dd2200" />
            <stop offset="100%" stopColor="#880000" />
          </linearGradient>
          <linearGradient id="gBlue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4488ff" />
            <stop offset="50%" stopColor="#0044cc" />
            <stop offset="100%" stopColor="#002288" />
          </linearGradient>
          <linearGradient id="gTurb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8e8e8" />
            <stop offset="20%" stopColor="#d4d4d4" />
            <stop offset="60%" stopColor="#b0b0b0" />
            <stop offset="100%" stopColor="#888888" />
          </linearGradient>
          <linearGradient id="gTurbSide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0d0d0" />
            <stop offset="50%" stopColor="#b8b8b8" />
            <stop offset="100%" stopColor="#909090" />
          </linearGradient>
          <radialGradient id="gCan" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#ff9966" />
            <stop offset="50%" stopColor="#cc3300" />
            <stop offset="100%" stopColor="#880000" />
          </radialGradient>
          <linearGradient id="gPanel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d8d8d8" />
            <stop offset="100%" stopColor="#c0c0c0" />
          </linearGradient>
        </defs>

        {/* ── LEFT PANELS ── */}

        {/* Purge Timer 패널 */}
        <rect x="14" y="8" width="120" height="100" fill="url(#gPanel)" stroke="#999" strokeWidth="1.5" rx="1" />
        <text x="74" y="22" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">Purge Timer</text>
        <rect x="18" y="26" width="112" height="18" rx="1" fill="#0000aa" stroke="#333" />
        <text x="74" y="39" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#00aaff">26373.0</text>
        <text x="74" y="56" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">Re Purge Timer</text>
        <rect x="18" y="60" width="112" height="18" rx="1" fill="#0000aa" stroke="#333" />
        <text x="74" y="73" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#00aaff">11.3</text>

        {/* SYNGAS 패널 */}
        <rect x="155" y="8" width="118" height="95" fill="url(#gPanel)" stroke="#999" strokeWidth="1.5" rx="1" />
        <text x="214" y="20" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">SYNGAS</text>
        <circle cx="167" cy="32" r="7" fill="#111" />
        <circle cx="167" cy="48" r="7" fill="#111" />
        <circle cx="167" cy="64" r="7" fill="#111" />
        <text x="215" y="36" fontSize="10" fontWeight="bold" fill="#0000ff">{sg.toFixed(1)}</text>
        <text x="245" y="36" fontSize="9" fill="#333">raw</text>
        <text x="215" y="52" fontSize="10" fontWeight="bold" fill="#0000ff">184.4</text>
        <text x="247" y="52" fontSize="9" fill="#333">°C</text>
        <text x="215" y="68" fontSize="10" fontWeight="bold" fill="#0000ff">44.7</text>
        <text x="245" y="68" fontSize="9" fill="#333">kg/s</text>
        <text x="215" y="84" fontSize="9" fill="#0000ff">9086.5 kg/m3</text>
        <text x="215" y="98" fontSize="9" fontWeight="bold" fill="#00aa00">GC Normal</text>

        {/* N2 INJECT 패널 */}
        <rect x="155" y="185" width="118" height="70" fill="url(#gPanel)" stroke="#999" strokeWidth="1.5" rx="1" />
        <text x="214" y="198" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">N2 INJECT</text>
        <text x="215" y="213" fontSize="10" fontWeight="bold" fill="#0000ff">{n2.toFixed(1)}</text>
        <text x="258" y="213" fontSize="9" fill="#333">raw</text>
        <text x="215" y="228" fontSize="10" fontWeight="bold" fill="#0000ff">36.0</text>
        <text x="245" y="228" fontSize="9" fill="#333">°C</text>
        <text x="215" y="243" fontSize="10" fontWeight="bold" fill="#0000ff">0.3</text>
        <text x="240" y="243" fontSize="9" fill="#333">kg/s</text>

        {/* Fuel Split 패널 */}
        <rect x="14" y="190" width="135" height="115" fill="url(#gPanel)" stroke="#999" strokeWidth="1.5" rx="1" />
        <text x="81" y="204" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">Fuel Split</text>
        <text x="22" y="218" fontSize="9" fill="#333">FSR</text>
        <text x="80" y="218" fontSize="10" fontWeight="bold" fill="#0000ff">69.0</text>
        <text x="108" y="218" fontSize="9" fill="#333">%</text>
        <text x="22" y="233" fontSize="9" fill="#333">N2 FSR</text>
        <text x="80" y="233" fontSize="10" fontWeight="bold" fill="#0000ff">0.0</text>
        <text x="108" y="233" fontSize="9" fill="#333">%</text>
        <text x="22" y="248" fontSize="9" fill="#333">SG FSR</text>
        <text x="80" y="248" fontSize="10" fontWeight="bold" fill="#0000ff">69.0</text>
        <text x="108" y="248" fontSize="9" fill="#333">%</text>
        <text x="22" y="263" fontSize="9" fill="#333">FX1</text>
        <text x="80" y="263" fontSize="10" fontWeight="bold" fill="#0000ff">100.0</text>
        <text x="108" y="263" fontSize="9" fill="#333">%</text>
        <text x="22" y="278" fontSize="9" fill="#333">SIM</text>
        <text x="80" y="278" fontSize="10" fontWeight="bold" fill="#0000ff">128.4</text>
        <text x="112" y="278" fontSize="9" fill="#333">s</text>
        <text x="22" y="293" fontSize="9" fill="#333">Eff</text>
        <text x="80" y="293" fontSize="10" fontWeight="bold" fill="#00aa00">{efficiency}</text>
        <text x="105" y="293" fontSize="9" fill="#333">%</text>

        {/* Generator/System 패널 */}
        <rect x="200" y="340" width="180" height="90" fill="url(#gPanel)" stroke="#999" strokeWidth="1.5" rx="1" />
        <text x="250" y="356" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">Generator</text>
        <text x="320" y="356" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">System</text>
        <line x1="285" y1="345" x2="285" y2="430" stroke="#999" strokeWidth="1" />
        <text x="240" y="372" fontSize="10" fill="#0000ff">17.9</text>
        <text x="268" y="372" fontSize="9" fill="#333">kV</text>
        <text x="310" y="372" fontSize="10" fill="#0000ff">17.9</text>
        <text x="338" y="372" fontSize="9" fill="#333">kV</text>
        <text x="240" y="388" fontSize="10" fill="#0000ff">60.0</text>
        <text x="268" y="388" fontSize="9" fill="#333">Hz</text>
        <text x="310" y="388" fontSize="10" fill="#0000ff">60.0</text>
        <text x="338" y="388" fontSize="9" fill="#333">Hz</text>

        {/* CLOSE 버튼 */}
        <rect x="200" y="395" width="70" height="26" rx="2" fill="#cc0000" stroke="#880000" strokeWidth="2" />
        <text x="235" y="412" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#fff">CLOSE</text>

        {/* 출력 박스 (MW, MVAR) */}
        <rect x="380" y="340" width="160" height="65" rx="2" fill="url(#gPanel)" stroke="#999" strokeWidth="1.5" />
        <rect x="384" y="348" width="152" height="20" rx="1" fill="#0000aa" stroke="#333" />
        <text x="460" y="362" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#00aaff">{power.toFixed(1)} MW</text>
        <rect x="384" y="372" width="152" height="20" rx="1" fill="#0000aa" stroke="#333" />
        <text x="460" y="386" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#00aaff">35.9 MVAR</text>
        <circle cx="362" cy="370" r="10" fill="#333" />
        <text x="362" y="374" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">11</text>

        {/* ── SYNGAS 메인 수평 배관 (핑크/마젠타) ── */}
        <rect x="273" y="102" width="440" height="13" fill="url(#gPink)" />
        <rect x="273" y="103" width="440" height="4" fill="#ffaaff" opacity=".5" />

        {/* 밸브 VS4-11 */}
        <g transform="translate(305,99)">
          <polygon points="0,0 20,10 0,20" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <polygon points="20,0 0,10 20,20" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <line x1="10" y1="0" x2="10" y2="-8" stroke="#005500" strokeWidth="2" />
          <line x1="10" y1="20" x2="10" y2="28" stroke="#005500" strokeWidth="2" />
          <text x="10" y="-11" fontSize="9" textAnchor="middle" fill="#333">VS4-11</text>
        </g>

        {/* 밸브 VSR-11 */}
        <g transform="translate(380,99)">
          <polygon points="0,0 20,10 0,20" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <polygon points="20,0 0,10 20,20" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <line x1="10" y1="0" x2="10" y2="-8" stroke="#005500" strokeWidth="2" />
          <line x1="10" y1="20" x2="10" y2="28" stroke="#005500" strokeWidth="2" />
          <text x="10" y="-11" fontSize="9" textAnchor="middle" fill="#333">VSR-11</text>
        </g>

        {/* FPSG2 센서 */}
        <circle cx="470" cy="108" r="10" fill="#111" stroke="#333" strokeWidth="1" />
        <rect x="445" y="78" width="80" height="22" rx="2" fill="url(#gPanel)" stroke="#888" />
        <text x="485" y="88" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#333">FPSG2</text>
        <text x="485" y="97" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#0000ff">27.0 kg/cm²</text>
        <line x1="485" y1="100" x2="470" y2="108" stroke="#555" strokeWidth="1" />

        {/* VGC-11A */}
        <g transform="translate(548,98)">
          <polygon points="0,0 20,10 0,20" fill="#cc0000" stroke="#880000" strokeWidth="1.5" />
          <polygon points="20,0 0,10 20,20" fill="#cc0000" stroke="#880000" strokeWidth="1.5" />
          <text x="10" y="-3" fontSize="8" textAnchor="middle" fill="#333">VGC-11A</text>
        </g>
        <rect x="525" y="124" width="72" height="26" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="561" y="135" fontSize="8" textAnchor="middle" fill="#333">DM 45.9 %</text>
        <text x="561" y="146" fontSize="8" textAnchor="middle" fill="#333">FB 45.9 %</text>

        {/* ── SYNGAS 직사각형 매니폴드 ── */}
        {/* 왼쪽 수직 ↑ */}
        <rect x="600" y="55" width="13" height="60" fill="url(#gPink)" />
        <rect x="600" y="56" width="4" height="60" fill="#ffaaff" opacity=".5" />
        {/* 상단 수평 → */}
        <rect x="600" y="55" width="220" height="13" fill="url(#gPink)" />
        <rect x="600" y="56" width="220" height="4" fill="#ffaaff" opacity=".5" />
        {/* 오른쪽 수직 ↓ */}
        <rect x="807" y="55" width="13" height="60" fill="url(#gPink)" />
        <rect x="807" y="56" width="4" height="60" fill="#ffaaff" opacity=".5" />
        {/* 하단 수평 (우측) */}
        <rect x="713" y="102" width="107" height="13" fill="url(#gPink)" />
        <rect x="713" y="103" width="107" height="4" fill="#ffaaff" opacity=".5" />

        {/* VGC-11 (매니폴드 상단 왼쪽) */}
        <g transform="translate(596,60) rotate(90)">
          <polygon points="0,0 18,9 0,18" fill="#cc0000" stroke="#880000" strokeWidth="1.5" />
          <polygon points="18,0 0,9 18,18" fill="#cc0000" stroke="#880000" strokeWidth="1.5" />
        </g>
        <rect x="555" y="35" width="72" height="22" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="591" y="46" fontSize="8" textAnchor="middle" fill="#333">VGC-11</text>
        <text x="591" y="55" fontSize="8" textAnchor="middle" fill="#0000ff">DM 76.0%</text>

        {/* VGC-12 (매니폴드 상단 오른쪽) */}
        <g transform="translate(803,60) rotate(90)">
          <polygon points="0,0 18,9 0,18" fill="#cc0000" stroke="#880000" strokeWidth="1.5" />
          <polygon points="18,0 0,9 18,18" fill="#cc0000" stroke="#880000" strokeWidth="1.5" />
        </g>
        <rect x="810" y="35" width="58" height="22" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="839" y="46" fontSize="8" textAnchor="middle" fill="#333">VGC-12</text>

        {/* FPG3 (매니폴드 하단) */}
        <circle cx="760" cy="108" r="10" fill="#111" stroke="#333" strokeWidth="1" />
        <rect x="730" y="122" width="80" height="22" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="770" y="132" fontSize="8" textAnchor="middle" fill="#333">FPG 3</text>
        <text x="770" y="141" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#0000ff">15.7 kg/cm²</text>

        {/* 포인트 10 */}
        <circle cx="870" cy="108" r="10" fill="#333" />
        <text x="870" y="112" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">10</text>
        <rect x="848" y="88" width="60" height="18" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="878" y="100" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#0000ff">15.7 kg/cm²</text>

        {/* ── N2 수평 배관 (올리브/노란색) ── */}
        <rect x="273" y="222" width="440" height="12" fill="url(#gOlive)" />
        <rect x="273" y="223" width="440" height="4" fill="#eedd66" opacity=".5" />

        {/* VS4-1 */}
        <g transform="translate(305,218)">
          <polygon points="0,0 20,10 0,20" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <polygon points="20,0 0,10 20,20" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <line x1="10" y1="0" x2="10" y2="-8" stroke="#005500" strokeWidth="2" />
          <line x1="10" y1="20" x2="10" y2="28" stroke="#005500" strokeWidth="2" />
          <text x="10" y="-11" fontSize="9" textAnchor="middle" fill="#333">VS4-1</text>
        </g>

        {/* VSR-1 */}
        <g transform="translate(380,218)">
          <polygon points="0,0 20,10 0,20" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <polygon points="20,0 0,10 20,20" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <line x1="10" y1="0" x2="10" y2="-8" stroke="#005500" strokeWidth="2" />
          <line x1="10" y1="20" x2="10" y2="28" stroke="#005500" strokeWidth="2" />
          <text x="10" y="-11" fontSize="9" textAnchor="middle" fill="#333">VSR-1</text>
        </g>

        {/* FPG2 */}
        <circle cx="466" cy="228" r="10" fill="#111" stroke="#333" strokeWidth="1" />
        <rect x="440" y="242" width="68" height="22" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="474" y="252" fontSize="8" textAnchor="middle" fill="#333">FPG2</text>
        <text x="474" y="261" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#0000ff">0.0 kg/cm²</text>

        {/* VGC-1 */}
        <g transform="translate(516,218)">
          <polygon points="0,0 20,10 0,20" fill="#cc0000" stroke="#880000" strokeWidth="1.5" />
          <polygon points="20,0 0,10 20,20" fill="#cc0000" stroke="#880000" strokeWidth="1.5" />
          <text x="10" y="-3" fontSize="8" textAnchor="middle" fill="#333">VGC-1</text>
        </g>
        <rect x="500" y="244" width="72" height="22" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="536" y="254" fontSize="8" textAnchor="middle" fill="#333">DM -25.0%</text>
        <text x="536" y="264" fontSize="8" textAnchor="middle" fill="#333">FB  0.1%</text>

        {/* ── 인렛 덕트 + 측정 포인트 12/13/14/15(IGV) ── */}
        <rect x="580" y="200" width="80" height="180" fill="#c0c0c0" stroke="#888" strokeWidth="1.5" />
        <circle cx="600" cy="230" r="10" fill="#333" />
        <text x="600" y="234" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">12</text>
        <rect x="558" y="210" width="105" height="18" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="610" y="221" fontSize="8" textAnchor="middle" fill="#333">INLET</text>
        <text x="640" y="221" fontSize="9" fontWeight="bold" fill="#0000ff">53.0 mmH₂O</text>
        <circle cx="600" cy="260" r="10" fill="#333" />
        <text x="600" y="264" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">13</text>
        <rect x="618" y="253" width="68" height="14" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="652" y="263" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#0000ff">30.1 °C</text>
        <circle cx="600" cy="290" r="10" fill="#333" />
        <text x="600" y="294" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">14</text>
        <rect x="618" y="283" width="80" height="14" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="658" y="293" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#0000ff">755.2 mmHg</text>

        {/* IGV 포인트 15 */}
        <circle cx="630" cy="362" r="10" fill="#333" />
        <text x="630" y="366" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">15</text>
        <rect x="590" y="375" width="105" height="40" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="642" y="387" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#333">IGV</text>
        <text x="642" y="399" fontSize="9" textAnchor="middle" fill="#0000ff">DM {igv.toFixed(1)} %</text>
        <text x="642" y="411" fontSize="9" textAnchor="middle" fill="#0000ff">FB {igv.toFixed(1)} %</text>

        {/* MAX VIB */}
        <rect x="590" y="420" width="105" height="28" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="642" y="432" fontSize="9" textAnchor="middle" fill="#333">MAX VIB</text>
        <rect x="596" y="435" width="93" height="10" rx="1" fill="#0000aa" />
        <text x="642" y="444" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#00aaff">6.7 mm/s</text>

        {/* ── 가스터빈 본체 (3/4 사선 시점) ── */}

        {/* 터빈 메인 케이싱 */}
        <polygon points="660,145  1120,170  1120,500  660,520"
          fill="url(#gTurb)" stroke="#666" strokeWidth="2.5" />

        {/* 컴프레서 페이스 (왼쪽 원형 - 3/4시점이라 타원) */}
        <ellipse cx="660" cy="332" rx="22" ry="188" fill="#b8b8b8" stroke="#777" strokeWidth="2.5" />
        <ellipse cx="660" cy="332" rx="16" ry="140" fill="#c8c8c8" stroke="#888" strokeWidth="2" />
        <ellipse cx="660" cy="332" rx="10" ry="90" fill="#d4d4d4" stroke="#999" strokeWidth="1.5" />
        <ellipse cx="660" cy="332" rx="5" ry="44" fill="#c0c0c0" stroke="#888" strokeWidth="1" />

        {/* 블레이드 스테이지 수직선 */}
        <line x1="740" y1="151" x2="740" y2="513" stroke="#aaa" strokeWidth="1.2" strokeDasharray="5,3" opacity=".7" />
        <line x1="820" y1="156" x2="820" y2="507" stroke="#aaa" strokeWidth="1.2" strokeDasharray="5,3" opacity=".7" />
        <line x1="910" y1="161" x2="910" y2="502" stroke="#aaa" strokeWidth="1.2" strokeDasharray="5,3" opacity=".7" />
        <line x1="1010" y1="166" x2="1010" y2="496" stroke="#aaa" strokeWidth="1.2" strokeDasharray="5,3" opacity=".7" />

        {/* 블레이드 디스크들 */}
        <ellipse cx="700" cy="332" rx="14" ry="175" fill="#b0b0b0" stroke="#999" strokeWidth="1.5" opacity=".85" />
        <ellipse cx="770" cy="332" rx="13" ry="155" fill="#a8a8a8" stroke="#999" strokeWidth="1.2" opacity=".8" />
        <ellipse cx="860" cy="332" rx="12" ry="132" fill="#a0a0a0" stroke="#888" strokeWidth="1.2" opacity=".8" />
        <ellipse cx="960" cy="332" rx="10" ry="108" fill="#989898" stroke="#888" strokeWidth="1" opacity=".75" />
        <ellipse cx="1060" cy="332" rx="8" ry="85" fill="#909090" stroke="#888" strokeWidth="1" opacity=".75" />

        {/* 중심 샤프트 */}
        <rect x="660" y="320" width="460" height="24" rx="5" fill="#909090" stroke="#707070" strokeWidth="2" />
        <rect x="660" y="325" width="460" height="14" rx="3" fill="#a8a8a8" />

        {/* 연소캔 A */}
        <ellipse cx="740" cy="175" rx="40" ry="26" fill="url(#gCan)" stroke="#660000" strokeWidth="2" />
        <text x="740" y="180" fontSize="13" fontWeight="bold" textAnchor="middle" fill="#fff">A</text>
        <rect x="724" y="175" width="32" height="20" fill="#aa2200" stroke="#880000" strokeWidth="1" />

        {/* 연소캔 B */}
        <ellipse cx="740" cy="246" rx="40" ry="26" fill="url(#gCan)" stroke="#660000" strokeWidth="2" />
        <text x="740" y="251" fontSize="13" fontWeight="bold" textAnchor="middle" fill="#fff">B</text>
        <rect x="724" y="246" width="32" height="20" fill="#aa2200" stroke="#880000" strokeWidth="1" />

        {/* 연소캔 C */}
        <ellipse cx="740" cy="418" rx="40" ry="26" fill="url(#gCan)" stroke="#660000" strokeWidth="2" />
        <text x="740" y="423" fontSize="13" fontWeight="bold" textAnchor="middle" fill="#fff">C</text>
        <rect x="724" y="418" width="32" height="20" fill="#aa2200" stroke="#880000" strokeWidth="1" />

        {/* 연소캔 D */}
        <ellipse cx="740" cy="488" rx="40" ry="26" fill="url(#gCan)" stroke="#660000" strokeWidth="2" />
        <text x="740" y="493" fontSize="13" fontWeight="bold" textAnchor="middle" fill="#fff">D</text>
        <rect x="724" y="488" width="32" height="20" fill="#aa2200" stroke="#880000" strokeWidth="1" />

        {/* 포인트 16 (CPD) */}
        <circle cx="870" cy="195" r="10" fill="#333" />
        <text x="870" y="199" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">16</text>
        <rect x="840" y="170" width="80" height="20" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="880" y="180" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#333">CPD</text>
        <text x="880" y="189" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#0000ff">13.1 kg/cm²</text>

        {/* 포인트 17 (CTD) */}
        <circle cx="920" cy="380" r="10" fill="#333" />
        <text x="920" y="384" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">17</text>
        <rect x="930" y="370" width="74" height="20" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="967" y="380" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#333">CTD</text>
        <text x="967" y="389" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#cc4400">391.5 °C</text>

        {/* λ 표시 */}
        <rect x="800" y="530" width="100" height="22" rx="2" fill="#0000aa" stroke="#333" />
        <text x="850" y="545" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#00aaff" fontFamily="Courier New">λ = {lambda.toFixed(2)}</text>

        {/* ── CBV 밸브들 (터빈 오른쪽) ── */}
        <rect x="1126" y="185" width="78" height="18" rx="2" fill="#22aa22" stroke="#005500" />
        <text x="1165" y="197" fontSize="9" textAnchor="middle" fill="#fff">CBV#1 Clsd</text>
        <rect x="1126" y="207" width="78" height="18" rx="2" fill="#22aa22" stroke="#005500" />
        <text x="1165" y="219" fontSize="9" textAnchor="middle" fill="#fff">CBV#3 Clsd</text>
        <rect x="1126" y="445" width="78" height="18" rx="2" fill="#22aa22" stroke="#005500" />
        <text x="1165" y="457" fontSize="9" textAnchor="middle" fill="#fff">CBV#4 Clsd</text>
        <rect x="1126" y="467" width="78" height="18" rx="2" fill="#22aa22" stroke="#005500" />
        <text x="1165" y="479" fontSize="9" textAnchor="middle" fill="#fff">CBV#2 Clsd</text>

        {/* ── DGAN / 오른쪽 패널 ── */}
        <rect x="1214" y="8" width="120" height="110" fill="url(#gPanel)" stroke="#999" strokeWidth="1.5" rx="1" />
        <text x="1274" y="22" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">DGAN</text>
        <text x="1222" y="36" fontSize="9" fill="#0000ff">27.8</text><text x="1255" y="36" fontSize="8" fill="#333">kg/cm²</text>
        <text x="1222" y="50" fontSize="9" fill="#0000ff">116.1</text><text x="1258" y="50" fontSize="8" fill="#333">°C</text>
        <text x="1222" y="64" fontSize="9" fill="#0000ff">30.6</text><text x="1255" y="64" fontSize="8" fill="#333">kg/s</text>
        <text x="1222" y="78" fontSize="9" fill="#0000ff">3.7</text><text x="1248" y="78" fontSize="8" fill="#333">% O2</text>

        {/* 오른쪽 수치 패널 */}
        <rect x="1214" y="122" width="230" height="370" fill="url(#gPanel)" stroke="#999" strokeWidth="1.5" rx="1" />
        <text x="1220" y="136" fontSize="9" fill="#333">Speed Cntrl Ref</text><text x="1370" y="136" fontSize="9" fill="#0000ff">102.9</text><text x="1400" y="136" fontSize="8" fill="#333">%</text>
        <text x="1220" y="150" fontSize="9" fill="#333">Speed in %</text><text x="1370" y="150" fontSize="9" fill="#0000ff">100.0</text><text x="1400" y="150" fontSize="8" fill="#333">%</text>
        <circle cx="1218" cy="162" r="9" fill="#333" /><text x="1218" y="166" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#fff">19</text>
        <text x="1230" y="164" fontSize="9" fill="#333">Speed in RPM</text><text x="1370" y="164" fontSize="9" fill="#0000ff">3600</text><text x="1402" y="164" fontSize="8" fill="#333">rpm</text>
        <circle cx="1218" cy="178" r="9" fill="#333" /><text x="1218" y="182" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#fff">20</text>
        <text x="1230" y="180" fontSize="9" fill="#333">Ambient Temp</text><text x="1370" y="180" fontSize="9" fill="#0000ff">29.9</text><text x="1400" y="180" fontSize="8" fill="#333">°C</text>
        <circle cx="1218" cy="194" r="9" fill="#333" /><text x="1218" y="198" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#fff">21</text>
        <text x="1230" y="196" fontSize="9" fill="#333">Exh. Mass Flow</text><text x="1370" y="196" fontSize="9" fill="#0000ff">426.1</text><text x="1402" y="196" fontSize="8" fill="#333">kg/s</text>
        <text x="1220" y="212" fontSize="9" fill="#333">Lube Oil Temp</text><text x="1370" y="212" fontSize="9" fill="#0000ff">48.8</text><text x="1400" y="212" fontSize="8" fill="#333">°C</text>
        <line x1="1216" y1="220" x2="1440" y2="220" stroke="#aaa" strokeWidth="1" />
        <text x="1220" y="234" fontSize="9" fill="#333">FSR</text><text x="1370" y="234" fontSize="9" fill="#0000ff">69.0</text><text x="1400" y="234" fontSize="8" fill="#333">%</text>
        <text x="1220" y="248" fontSize="9" fill="#333">IGV</text><text x="1370" y="248" fontSize="9" fill="#0000ff">{igv.toFixed(1)}</text><text x="1400" y="248" fontSize="8" fill="#333">°</text>
        <text x="1220" y="262" fontSize="9" fill="#333">CPR</text><text x="1370" y="262" fontSize="9" fill="#0000ff">13.8</text><text x="1400" y="262" fontSize="8" fill="#333">ratio</text>
        <text x="1220" y="276" fontSize="9" fill="#333">Max Vib</text><text x="1370" y="276" fontSize="9" fill="#0000ff">6.7</text><text x="1400" y="276" fontSize="8" fill="#333">mm/s</text>
        <line x1="1216" y1="284" x2="1440" y2="284" stroke="#aaa" strokeWidth="1" />
        <text x="1220" y="298" fontSize="9" fill="#333">Exh. Spread Lim</text><text x="1370" y="298" fontSize="9" fill="#0000ff">93.5</text><text x="1400" y="298" fontSize="8" fill="#333">°C</text>
        <circle cx="1218" cy="310" r="9" fill="#333" /><text x="1218" y="314" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#fff">22</text>
        <text x="1230" y="312" fontSize="9" fill="#333">Exh. Temp</text><text x="1370" y="312" fontSize="9" fontWeight="bold" fill="#ff4400">{exhaust.toFixed(1)}</text><text x="1400" y="312" fontSize="8" fill="#333">°C</text>
        <text x="1220" y="326" fontSize="9" fill="#333">Exh. Spread #1</text><text x="1370" y="326" fontSize="9" fill="#0000ff">30.9</text><text x="1400" y="326" fontSize="8" fill="#333">°C</text>
        <text x="1220" y="340" fontSize="9" fill="#333">Exh. Spread #2</text><text x="1370" y="340" fontSize="9" fill="#0000ff">30.1</text><text x="1400" y="340" fontSize="8" fill="#333">°C</text>
        <text x="1220" y="354" fontSize="9" fill="#333">Exh. Spread #3</text><text x="1370" y="354" fontSize="9" fill="#0000ff">29.2</text><text x="1400" y="354" fontSize="8" fill="#333">°C</text>
        <text x="1220" y="368" fontSize="9" fill="#333">Exh. Spread #4</text><text x="1370" y="368" fontSize="9" fill="#0000ff">26.2</text><text x="1400" y="368" fontSize="8" fill="#333">°C</text>
        <line x1="1216" y1="376" x2="1440" y2="376" stroke="#aaa" strokeWidth="1" />
        <text x="1220" y="390" fontSize="9" fill="#333">NOx</text><text x="1370" y="390" fontSize="9" fontWeight="bold" fill={noxColor}>{nox.toFixed(1)}</text><text x="1400" y="390" fontSize="8" fill="#333">ppm</text>
        <text x="1220" y="404" fontSize="9" fill="#333">CO</text><text x="1370" y="404" fontSize="9" fill="#0000ff">{co.toFixed(1)}</text><text x="1400" y="404" fontSize="8" fill="#333">ppm</text>
        <text x="1220" y="418" fontSize="9" fill="#333">Efficiency</text><text x="1370" y="418" fontSize="9" fill="#00aa00">{efficiency}</text><text x="1400" y="418" fontSize="8" fill="#333">%</text>
        <text x="1220" y="432" fontSize="9" fill="#333">Comb Reference</text><text x="1370" y="432" fontSize="9" fill="#0000ff">92.2</text>
        <text x="1220" y="446" fontSize="9" fill="#333">Power Output</text><text x="1370" y="446" fontSize="9" fill="#0000ff">{power.toFixed(1)}</text><text x="1400" y="446" fontSize="8" fill="#333">MW</text>
        <text x="1220" y="460" fontSize="9" fill="#333">MVAR</text><text x="1370" y="460" fontSize="9" fill="#0000ff">35.9</text><text x="1400" y="460" fontSize="8" fill="#333">MVAR</text>

        {/* NPNJ2 / VS7-1 / VNC-1 */}
        <rect x="1050" y="80" width="65" height="22" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="1082" y="91" fontSize="8" textAnchor="middle" fill="#333">NPNJ2</text>
        <text x="1082" y="100" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#0000ff">16.0 kg/cm²</text>
        {/* 파란 수직선 */}
        <rect x="1082" y="102" width="10" height="88" fill="url(#gBlue)" />
        <g transform="translate(1078,128)">
          <polygon points="0,0 18,9 0,18" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <polygon points="18,0 0,9 18,18" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <text x="9" y="-3" fontSize="8" textAnchor="middle" fill="#333">VS7-1</text>
        </g>
        <rect x="1100" y="175" width="62" height="20" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="1131" y="186" fontSize="8" textAnchor="middle" fill="#333">VNC-1</text>
        <rect x="1100" y="185" width="62" height="22" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="1131" y="195" fontSize="8" textAnchor="middle" fill="#0000ff">DM 28.7%</text>
        <text x="1131" y="204" fontSize="8" textAnchor="middle" fill="#0000ff">FB 28.4%</text>

        {/* FPSG3 */}
        <circle cx="1030" cy="228" r="10" fill="#111" stroke="#333" strokeWidth="1" />
        <rect x="995" y="238" width="78" height="20" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="1034" y="248" fontSize="8" textAnchor="middle" fill="#333">FPSG 3</text>
        <text x="1034" y="257" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#0000ff">15.7 kg/cm²</text>

        {/* ── N2 하단 배관 (빨간색) ── */}
        {/* N2 하단 패널 */}
        <rect x="155" y="558" width="118" height="65" fill="url(#gPanel)" stroke="#999" strokeWidth="1.5" rx="1" />
        <text x="214" y="572" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">N2 DILUT</text>
        <text x="214" y="587" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#0000ff">{n2.toFixed(1)}</text>
        <text x="214" y="600" fontSize="9" textAnchor="middle" fill="#333">32.4 °C</text>
        <text x="214" y="613" fontSize="9" textAnchor="middle" fill="#333">0.3 kg/s</text>

        {/* 하단 수평 배관 */}
        <rect x="273" y="575" width="520" height="12" fill="url(#gRed)" />
        <rect x="273" y="576" width="520" height="4" fill="#ff8866" opacity=".5" />

        {/* VS3-1 */}
        <g transform="translate(440,572)">
          <polygon points="0,0 20,10 0,20" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <polygon points="20,0 0,10 20,20" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <text x="10" y="-3" fontSize="9" textAnchor="middle" fill="#333">VS3-1</text>
        </g>

        {/* VA4-1 */}
        <g transform="translate(620,572)">
          <polygon points="0,0 20,10 0,20" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <polygon points="20,0 0,10 20,20" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
          <text x="10" y="-3" fontSize="9" textAnchor="middle" fill="#333">VA4-1</text>
        </g>

        {/* 수직 상승 (↑) → IBH */}
        <rect x="710" y="450" width="12" height="137" fill="url(#gRed)" />
        <rect x="710" y="451" width="4" height="137" fill="#ff8866" opacity=".5" />
        <circle cx="716" cy="468" r="10" fill="#333" />
        <text x="716" y="472" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">18</text>
        <rect x="680" y="478" width="105" height="28" rx="1" fill="url(#gPanel)" stroke="#888" />
        <text x="732" y="490" fontSize="8" textAnchor="middle" fill="#333">IBH  DM -25.0%</text>
        <text x="732" y="500" fontSize="8" textAnchor="middle" fill="#333">FB  0.2%</text>
        <text x="718" y="600" fontSize="9" fill="#333">-0.1 %</text>

        {/* ── 하단 상태/제어 바 ── */}
        <rect x="0" y="640" width="1456" height="176" fill="#c0c0c0" stroke="#888" strokeWidth="1" />

        {/* Status 패널 */}
        <rect x="8" y="650" width="250" height="158" fill="url(#gPanel)" stroke="#999" strokeWidth="1.5" rx="1" />
        <text x="70" y="665" fontSize="10" fontWeight="bold" fill="#333">Status</text>
        <rect x="88" y="654" width="164" height="18" rx="1" fill="#e8e8e8" stroke="#aaa" />
        <text x="170" y="666" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#0000ff">RUNNING</text>
        <rect x="88" y="675" width="164" height="16" rx="1" fill="#e8e8e8" stroke="#aaa" />
        <text x="170" y="686" fontSize="9" textAnchor="middle" fill="#333">NO STATUS</text>
        <text x="14" y="702" fontSize="9" fill="#333">Startup Status</text><text x="130" y="702" fontSize="9" fontWeight="bold" fill="#0000ff">PART LOAD</text>
        <text x="14" y="716" fontSize="9" fill="#333">Turbine Status</text><text x="130" y="716" fontSize="8" fontWeight="bold" fill="#0000ff">EXT LOAD CTRL</text>
        <text x="14" y="730" fontSize="9" fill="#333">Control Mode</text><text x="130" y="730" fontSize="9" fontWeight="bold" fill="#0000ff">AUTO</text>
        <text x="14" y="744" fontSize="9" fill="#333">Fuel Control</text><text x="130" y="744" fontSize="9" fontWeight="bold" fill="#ff6600">CPR LIMIT</text>
        <text x="14" y="758" fontSize="9" fill="#333">Misc. Status</text><text x="130" y="758" fontSize="9" fill="#333">NO STATUS</text>
        <text x="14" y="772" fontSize="9" fill="#333">IGV Control</text><text x="130" y="772" fontSize="9" fontWeight="bold" fill="#0000ff">MACH_NUM</text>
        <text x="14" y="786" fontSize="9" fill="#333">Speed Level</text><text x="130" y="786" fontSize="9" fill="#333">&gt;95% - 14HS</text>

        {/* Mode Select */}
        <rect x="270" y="648" width="84" height="14" rx="1" fill="#d0d0d0" stroke="#888" />
        <text x="312" y="658" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#333">Mode Select</text>
        <rect x="270" y="665" width="84" height="20" rx="2" fill="#aaaaaa" stroke="#777" strokeWidth="1.5" />
        <text x="312" y="678" fontSize="10" textAnchor="middle" fill="#333">Off</text>
        <rect x="270" y="688" width="84" height="20" rx="2" fill="#aaaaaa" stroke="#777" strokeWidth="1.5" />
        <text x="312" y="701" fontSize="10" textAnchor="middle" fill="#333">Crank</text>
        <rect x="270" y="711" width="84" height="20" rx="2" fill="#aaaaaa" stroke="#777" strokeWidth="1.5" />
        <text x="312" y="724" fontSize="10" textAnchor="middle" fill="#333">Fire</text>
        <rect x="270" y="734" width="84" height="20" rx="2" fill="#cc0000" stroke="#880000" strokeWidth="1.5" />
        <text x="312" y="747" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">Auto</text>
        <rect x="270" y="757" width="84" height="20" rx="2" fill="#aaaaaa" stroke="#777" strokeWidth="1.5" />
        <text x="312" y="770" fontSize="10" textAnchor="middle" fill="#333">Remote</text>

        {/* Master Control */}
        <rect x="364" y="648" width="84" height="14" rx="1" fill="#d0d0d0" stroke="#888" />
        <text x="406" y="658" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#333">Master Control</text>
        <rect x="364" y="665" width="84" height="24" rx="2" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
        <text x="406" y="681" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#fff">Start</text>
        <rect x="364" y="692" width="84" height="24" rx="2" fill="#aaaaaa" stroke="#777" strokeWidth="1.5" />
        <text x="406" y="708" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#333">Stop</text>

        {/* Load Select */}
        <rect x="458" y="648" width="100" height="14" rx="1" fill="#d0d0d0" stroke="#888" />
        <text x="508" y="658" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#333">Load Select</text>
        <rect x="458" y="665" width="100" height="20" rx="2" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
        <text x="508" y="678" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#fff">Base Load</text>
        <rect x="458" y="688" width="100" height="20" rx="2" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
        <text x="508" y="701" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#fff">Preselect Load</text>
        <rect x="458" y="711" width="100" height="20" rx="2" fill="#cc0000" stroke="#880000" strokeWidth="1.5" />
        <text x="508" y="724" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#fff">Ext Load Cntrl</text>
        <rect x="458" y="734" width="100" height="20" rx="2" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
        <text x="508" y="747" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#fff">SG Follow</text>

        {/* Fuel Select */}
        <rect x="568" y="648" width="100" height="14" rx="1" fill="#d0d0d0" stroke="#888" />
        <text x="618" y="658" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#333">Fuel Select</text>
        <rect x="568" y="665" width="100" height="20" rx="2" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
        <text x="618" y="678" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">Gas</text>
        <rect x="568" y="688" width="100" height="20" rx="2" fill="#cc0000" stroke="#880000" strokeWidth="1.5" />
        <text x="618" y="701" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">Syngas</text>

        {/* MW Control */}
        <rect x="678" y="648" width="175" height="130" rx="2" fill="url(#gPanel)" stroke="#999" strokeWidth="1.5" />
        <text x="735" y="663" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">MW Control</text>
        <text x="795" y="663" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">SetPoint</text>
        <line x1="678" y1="668" x2="853" y2="668" stroke="#aaa" strokeWidth="1" />
        <text x="690" y="684" fontSize="9" fill="#333">Setpoint</text>
        <rect x="750" y="673" width="76" height="16" rx="1" fill="#0000aa" stroke="#333" />
        <text x="788" y="685" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#00aaff">170.4 MW</text>
        <text x="690" y="706" fontSize="9" fill="#333">MEGAWATTS</text>
        <rect x="750" y="695" width="76" height="16" rx="1" fill="#0000aa" stroke="#333" />
        <text x="788" y="707" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#00aaff">{power.toFixed(1)} MW</text>

        {/* Generator Control Mode */}
        <rect x="862" y="648" width="100" height="14" rx="1" fill="#d0d0d0" stroke="#888" />
        <text x="912" y="658" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#333">Gen Control Mode</text>
        <rect x="862" y="665" width="100" height="20" rx="2" fill="#cc0000" stroke="#880000" strokeWidth="1.5" />
        <text x="912" y="678" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">Voltage</text>
        <rect x="862" y="688" width="100" height="20" rx="2" fill="#aaaaaa" stroke="#777" strokeWidth="1.5" />
        <text x="912" y="701" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">PF</text>
        <rect x="862" y="711" width="100" height="20" rx="2" fill="#aaaaaa" stroke="#777" strokeWidth="1.5" />
        <text x="912" y="724" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">VAR</text>

        {/* Speed/Load Control */}
        <rect x="972" y="648" width="100" height="14" rx="1" fill="#d0d0d0" stroke="#888" />
        <text x="1022" y="658" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#333">Speed/Load Ctrl</text>
        <rect x="972" y="665" width="100" height="20" rx="2" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
        <text x="1022" y="678" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">Raise</text>
        <rect x="972" y="688" width="100" height="20" rx="2" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
        <text x="1022" y="701" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">Lower</text>

        {/* Syngas Control */}
        <rect x="1082" y="648" width="100" height="14" rx="1" fill="#d0d0d0" stroke="#888" />
        <text x="1132" y="658" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#333">Syngas Control</text>
        <rect x="1082" y="665" width="100" height="20" rx="2" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
        <text x="1132" y="678" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">Raise</text>
        <rect x="1082" y="688" width="100" height="20" rx="2" fill="#22aa22" stroke="#005500" strokeWidth="1.5" />
        <text x="1132" y="701" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">Lower</text>

        {/* Right buttons */}
        <rect x="1310" y="655" width="130" height="22" rx="2" fill="url(#gPanel)" stroke="#888" strokeWidth="1.5" />
        <text x="1375" y="669" fontSize="10" textAnchor="middle" fill="#333">Startup Trend</text>
        <rect x="1310" y="682" width="130" height="22" rx="2" fill="url(#gPanel)" stroke="#888" strokeWidth="1.5" />
        <text x="1375" y="696" fontSize="10" textAnchor="middle" fill="#333">Master Reset</text>
        <rect x="1310" y="709" width="130" height="22" rx="2" fill="url(#gPanel)" stroke="#888" strokeWidth="1.5" />
        <text x="1375" y="723" fontSize="10" textAnchor="middle" fill="#333">Diagnostic Reset</text>
      </svg>
    </div>
  )
}
