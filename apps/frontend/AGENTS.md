# Frontend 작업 가이드

<!--
이 가이드는 에이전트가 frontend 영역에서 코드를 건드리기 전에 반드시 알아야 할 컨텍스트를 담는다.
CLAUDE.md는 `@./AGENTS.md` 한 줄로 이 파일을 import 한다.
-->

## 1. WHAT — 이 모듈은 무엇을 하는가

React + Vite 기반 운영자 대시보드. 공장 도면(HMI), 제어 패널, Trend Plot, 멀티 변수 모니터링 UI를 제공한다. 백엔드 시뮬/예측 API를 호출해 실시간 운전 데이터와 5분 NOx 예측을 시각화한다.

## 2. CONTENTS — 파일/디렉토리와 기술 스택

- `src/app/` — `App.tsx`, `router.tsx` (앱 진입점, 라우팅)
- `src/pages/` — 화면 단위 컴포넌트 (Service, About, Database, Team, DigitalTwin)
- `src/features/dashboard/` — 대시보드 핵심 기능
  - `HmiSchematic/` — SVG 기반 공정 도면 (14 KPI, 빌드 파이프라인 자동 산출)
  - `useThresholds.ts` — `GET /api/threshold` 마운트 시 1회 호출 (임계 단일 진실원 hook)
  - `mockConsole.ts`, `useConsoleState.ts` — 시뮬/예측 모드 상태 관리
- `src/assets/` — 이미지, 정적 자원
- `src/index.css`, `main.tsx` — 글로벌 스타일, 엔트리
- `scripts/buildHmiSvg/` — SVG 정제 + `schematic-roles.ts` 자동 산출 (npm script)
- `vitest.config.ts`, `vite.config.ts`, `eslint.config.js` — 도구 설정
- `Dockerfile`, `nginx.conf` — 컨테이너 빌드 & 정적 서빙

기술 스택: React 19, TypeScript, Vite, vitest, eslint, react-router-dom v7

## 3. HOW — 일반적인 수정은 어떻게 하는가

<!--
새 기능 추가/수정 시 따라야 할 절차.
- features 레이어부터 손대고 pages는 합성만 한다.
- API 호출은 hook으로 추상화 (예: useThresholds).
- 타입은 백엔드 schema와 1:1 동기화.
-->

- **새 화면 추가**: `src/pages/<Name>.tsx` 생성 → `src/app/router.tsx`에 route 등록.
- **새 대시보드 기능**: `src/features/dashboard/<feature>/` 폴더에 컴포넌트 + hook 묶음. 페이지는 합성만.
- **API 연동**: hook 단위로 캡슐화 (`useThresholds` 패턴). 백엔드 schema 변경 시 type 정의 동시 갱신.
- **HMI SVG 변경**: `scripts/buildHmiSvg`의 입력만 수정. `schematic-roles.ts`, `schematic.svg`는 산출물이므로 수기 편집 금지.
- **테스트**: `src/test/` 또는 컴포넌트 옆 `*.test.tsx`에 추가. vitest + @testing-library/react.

## 4. ⛔ HOW NOT — 시스템을 깨뜨리는 비명백한 함정 (중요)

- 백엔드 API 스키마를 추측해서 호출 — `docs/BACKEND_PRD.md` 또는 `[API 임시]` 협의 후 반영해야 422/500 방지
- WebSocket 연결을 페이지 단위로 직접 생성 — features 레이어에서 관리하지 않으면 페이지 이동 시 연결 누수
- 타입 정의를 `any`로 회피 — 런타임 에러 추적 불가, schema drift 은닉
- 변수명을 PRD/Architecture 문서와 다르게 임의 변경 (예: `flame_temp` ↔ `exhaust_temp`) — 백엔드/DB와 컨트랙트 깨짐
- 임계값을 컴포넌트/페이지에 하드코딩 — `useThresholds` hook을 통해서만 접근 (SoT는 `digital_twin/simulation/config.py::ThresholdConfig`)
- `co` 시계열/카드/테이블 행 부활 — 백엔드 미전송 + 학습 타겟 영구 제외 (`docs/REFACTOR_FLAME_TEMP_TO_EXHAUST_TEMP.md`)
- `ControlPayload`에 10필드 외 임의 키 추가/제거 — 백엔드 `ControlPayload`와 1:1 동기화 필수, 한 쪽 누락 시 422
- 수기 SVG 편집 — `scripts/buildHmiSvg`로 자동 산출, `schematic-roles.ts`/`schematic.svg`는 산출물이라 수기 변경분이 다음 빌드에 덮어쓰임

## 5. WHERE — 다른 모듈과의 의존성

<!-- 강결합 — backend가 API contract(Pydantic schema, 엔드포인트)의 SoT. frontend는 TS 타입을 backend 정의를 따라가야 한다. 영역 진입 후 자동 import로 침묵의 가정 방지. -->
@../backend/AGENTS.md

- **의존 (약결합)**:
  - [`digital_twin/AGENTS.md`](../../digital_twin/AGENTS.md)의 `ControlVars`/`OutputVars` 정의 (개념적 SoT, 코드 import는 안 함)
- **피의존**: 없음 (브라우저 최종단)
- **경계 / 어댑터**:
  - HTTP/WebSocket 호출: `src/features/dashboard/` 내부 hook
  - HMI 도면 산출 파이프라인: `scripts/buildHmiSvg/` ↔ `src/features/dashboard/HmiSchematic/`

## 6. WHY — 코드에 안 적힌 배경 지식

- **현재 스펙 (PR #35/#36/#38 누적)**:
  - `ControlPayload` 10필드 — `sendControl`이 모든 필드 전송 (기존 3개 → 백엔드 422 발생 이력)
  - 표시값 우선순위 — 발전량(MW)이 아닌 **발전 효율** 우선 (KPI/sidebar/테이블). 도면 KPI는 MW 유지
  - 임계 SoT — `useThresholds` hook (`GET /api/threshold`), 화면 내 하드코딩 금지
  - 예측 모드 — 1Hz `POST /api/prediction` 폴링 → `predictedNox` 갱신, sidebar 컨트롤 잠금
  - `MetricPoint` 누적 필드 — efficiency 포함 (60초 변동폭 표시용)
  - HMI 도면 — 수기 `HmiMonitor.tsx` 폐기됨, `HmiSchematic` 진입 컴포넌트 + svgr inline 사용
- **CO 시계열 제거 배경**: 학습 타겟에서 영구 제외 (자기상관 + 분포 이슈). 백엔드도 미전송.
- **`flame_temp` → `exhaust_temp` 개명**: 화염 온도가 아닌 배기 온도가 운영 SoT라는 도메인 결정.

## 7. COMMANDS — 빌드/테스트/린트

- 개발 서버: `npm run dev`
- 빌드: `npm run build` <!-- tsc -b && vite build -->
- 테스트: `npm test` <!-- vitest run, watch 모드 자동 제외 -->
- 린트: `npm run lint`
- 타입체크: 빌드 시 `tsc -b`로 함께 수행
- HMI SVG 산출: `npm run hmi:build`

**명령어 가드** (영역 고유 — 공통 가드는 root AGENTS.md 참조):
- `npm run test:watch` / `npm run test:ui`는 자동화에서 hang 유발 — CI/스크립트에서는 `npm test`만 사용
- `package-lock.json`을 임의 갱신 후 미커밋 상태로 둠 — 다른 작업자 환경 불일치

## 8. ⚠️ LEARNED CAUTIONS — 학습된 주의사항

<!-- `learn` 스킬(`/learn` 또는 Codex의 `$learn`)로 누적되는 영역. -->

_(아직 없음)_
