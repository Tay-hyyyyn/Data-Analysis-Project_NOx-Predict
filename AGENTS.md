# NOxO Project - Claude/Codex/Antigravity/Cursor 작업 지침

<!--
이 파일은 map 역할을 한다. 작업 시 해당 영역의 AGENTS.md를 먼저 읽고 진행한다.
CLAUDE.md는 `@./AGENTS.md` 한 줄로 이 파일을 import 한다 (단일 진실 공급원).

root에 모든 가이드를 몰아넣지 않고 영역별로 분리한 이유는 토큰 효율 + 컨텍스트 정확도다.
작업 영역만 정확히 참조하면 다른 영역 가이드가 컨텍스트를 오염시키지 않는다.
-->

<!--
디렉토리 트리(`ls`로 알 수 있는 정보)는 의도적으로 넣지 않는다 (영상의 G1 안티패턴).
root map은 라우팅(영역별 가이드 링크)에만 집중한다.
-->

## 영역별 가이드

작업 영역에 해당하는 `AGENTS.md`를 먼저 읽고 진행한다.

- **apps/frontend** — UI/대시보드 작업 → [`apps/frontend/AGENTS.md`](apps/frontend/AGENTS.md)
- **apps/backend** — API/시뮬 세션 작업 → [`apps/backend/AGENTS.md`](apps/backend/AGENTS.md)
- **digital_twin** — 시뮬 엔진/모델 작업 → [`digital_twin/AGENTS.md`](digital_twin/AGENTS.md)
- **database** — 스키마/쿼리 → [`database/AGENTS.md`](database/AGENTS.md)
- **analysis** — 분석 노트북/리포트 → [`analysis/AGENTS.md`](analysis/AGENTS.md)
- **airflow** — DAG/파이프라인 → [`airflow/AGENTS.md`](airflow/AGENTS.md)
- **docker** — 컨테이너/배포 → [`docker/AGENTS.md`](docker/AGENTS.md)

## 영역 가이드의 구조

<!-- 각 영역의 AGENTS.md는 다음 8섹션 템플릿을 따른다. -->

1. **WHAT** — 이 모듈이 무엇을 하는가
2. **CONTENTS** — 디렉토리 맵 + 기술 스택
3. **HOW** — 일반적인 수정은 어떻게 하는가
4. **HOW NOT** — 시스템을 깨뜨리는 비명백한 함정
5. **WHERE** — 다른 모듈과의 의존성
6. **WHY** — 코드에 안 적힌 배경 지식
7. **COMMANDS** — 빌드/테스트/린트 명령어
8. **LEARNED CAUTIONS** — `learn` 스킬로 누적

## Git 컨벤션

모든 커밋/푸시 작업은 [`docs/GIT_CONVENTIONS.md`](docs/GIT_CONVENTIONS.md)를 따른다.

<!--
2026-05 변경: `@./AGENTS.md` import 방식으로 전환.
이전의 `.githooks/pre-commit` + `scripts/sync-agents-md.sh` 기반 양방향 sync는 폐기되었다.
이제 본문은 AGENTS.md에만 작성하고, CLAUDE.md는 `@./AGENTS.md` 한 줄로 import한다.
Claude Code는 import를 자동 따라가고, Codex/Antigravity/Cursor는 AGENTS.md를 직접 읽는다.
-->

## 공통 명령어 가드 (전역)

<!-- 영역별 빌드/테스트/린트는 각 가이드의 7. COMMANDS 참고. 여기는 전역 금지 사항만. -->

- `--no-verify` 사용 금지 — pre-commit hook 우회로 broken state commit
- `git push --force`를 `main`/`dev` 브랜치에 적용 금지 — 협업자 변경 유실
- `data/**` 하위 raw CSV를 git에 add 금지 — 용량/보안 정책 ([`database/db_definition.md`](database/db_definition.md) §1)

## 주의사항 학습 (learn 스킬)

<!--
작업 중 실수가 발견되면 다음 형태로 호출해 해당 영역 AGENTS.md의
"⚠️ LEARNED CAUTIONS" 섹션에 누적한다.
-->

- Claude Code/Cursor/Antigravity: `/learn <메모>` (인자 없이도 호출 가능)
- Codex: `$learn <메모>`

스킬 위치: `.claude/skills/learn/`, `.agents/skills/learn/`, `.agents/workflows/learn.md`
