# YNCC ChemBrief — 석유화학 산업 뉴스 인텔리전스

여천NCC 및 나프타 분해설비(NCC) 기반 석유화학 기업 실무자를 위한 일일 석유화학 산업 뉴스 스크랩·중복 제거·팩트체크 게시판 웹 애플리케이션입니다.

## 주요 기능

- **매일 09:00 KST 자동 스크랩 및 수동 실행**: Express 백엔드 스케줄러 및 상단 `지금 뉴스 스크랩 실행` 버튼 지원
- **Google Search Grounding 기반 수집 (`@google/genai`)**: EBN 산업경제, 한국경제, 매일경제, 서울경제, 연합인포맥스, 머니투데이, 이데일리, 화학저널, Reuters, ICIS, S&P Global 등 주요 매체 수집
- **여천NCC 4대 선별 기준**: 글로벌 수급·원료, 국내 정책·석화단지, NCC 마진·가동률, 실무(영업·구매·생산·안전·환경) 리스크 관리 기준
- **2단계 검증 파이프라인**:
  1. 본문 핵심 내용 50% 이상 중복 그룹 병합 (최다 조회수 우선, 미확인 시 최신 게시 시각 기준)
  2. Google Search 교차 검증을 통한 팩트체크 및 개별 기사 원문 URL 직접 연결

## 실행 방법

```bash
npm install
cp .env.example .env
# .env 파일에 GEMINI_API_KEY 설정
npm run dev
```

프로덕션 빌드 및 실행:

```bash
npm run build
npm start
```

## 배포 안내

이 애플리케이션은 `GEMINI_API_KEY` 보안 처리, Google Search Grounding 처리, 09:00 KST 스케줄러 구동을 위해 Node.js + Express 서버(`server.ts`)를 포함하고 있습니다.
- GitHub 저장소에 Push한 뒤 **Render, Railway, Google Cloud Run, Fly.io** 등 Node.js 풀스택 호스팅 플랫폼에 연결하고 환경 변수 `GEMINI_API_KEY`를 등록하여 배포하세요.
- 정적 호스팅 전용인 GitHub Pages(`*.github.io`)에서는 `/api/*` 백엔드 엔드포인트가 동작하지 않습니다.
