# Project Agent Map (AGENTS.md)

이 파일은 NOxO 프로젝트의 루트 지침 맵(라우터)입니다. 모든 작업 시작 전에 반드시 이 문서를 읽고 아래의 가이드라인과 라우팅 규칙을 준수해야 합니다.

## Startup Rule
- 새로운 태스크를 수행하기 전, 반드시 `$agent-start`를 실행하여 컨텍스트 라우팅과 도메인별 워크플로우를 결정하십시오.
- 불필요한 전체 디렉토리 탐색 및 문서 로딩은 금지됩니다.

## Common Rules (Ponytail & AWA 융합)
1. **게으른 개발자 철학**: 최고의 코드는 작성하지 않은 코드입니다. 오버엔지니어링을 배제하고 가장 단순하고 안전한 코드를 작성하십시오.
2. **7단계 구현 사다리**:
   - 1단계: YAGNI 검토 (이 작업이 정말 필요해서 만드는가?)
   - 2단계: 기존 헬퍼/패턴/유틸리티 재사용 (중복 개발 금지)
   - 3단계: 표준 라이브러리 사용
   - 4단계: 네이티브 플랫폼 기능 사용 (브라우저 내장 HTML5 API 등 활용)
   - 5단계: 이미 설치된 종속 패키지 사용
   - 6단계: 한 줄 코딩이 가능한가?
   - 7단계: 위 단계가 불가능할 때만 최소한의 동작 코드를 구현
3. **추상화 금지**: 요청하지 않은 설계 패턴, 인터페이스, boilerplate, 의존성 패키지는 일절 추가하지 마십시오.
4. **근본 원인 수정**: 버그 수정 시 단순 우회나 증상 해결이 아닌, 근본 원인을 해결하며 수정한 함수의 모든 Caller를 Grep해 부작용을 검토하십시오.
5. **[AWA 상호 감시 및 위험 차단]**:
   - 에이전트는 단독으로 중요 명령(예: 대량 삭제, 민감 파일 수정, 외부 네트워크 전송)을 수행할 수 없으며, 반드시 검증 단계에서 독립적인 모니터(Monitor) 세션의 무해성 승인(Sign-off)을 받아야 합니다.
   - 개인정보(PII) 유출 시도, 비정상적 탈옥 패턴 반응, 무단 쉘 탈취 명령은 시스템 차원에서 감지 시 즉각 롤백되고 차단됩니다.

## Area Routing

| Task signal | Workflow | Learned notes |
| --- | --- | --- |
| frontend, react, tsx, css | docs/agent/workflows/writing.md | docs/agent/learned-notes.md#writing |
| backend, fastapi, uvicorn, api | docs/agent/workflows/coding.md | docs/agent/learned-notes.md#coding |
| digital_twin, prediction, engine | docs/agent/workflows/data-analysis.md | docs/agent/learned-notes.md#data-analysis |
| streaming, redpanda, kafka, etl | docs/agent/workflows/crawling.md | docs/agent/learned-notes.md#crawling |
| cfd, mesh, solver, residual | docs/agent/workflows/cfd.md | docs/agent/learned-notes.md#cfd |
| airflow, dag, pipeline, batch | docs/agent/workflows/research.md | docs/agent/learned-notes.md#research |
