import type { DailyBriefing, FallbackImageKey } from '../src/types/news.ts';
import { getKstDateString, getOffsetKstDateString } from './time.ts';

export const SEED_SCHEMA_VERSION = 2;

export const FALLBACK_IMAGE_MAP: Record<FallbackImageKey, string> = {
  ncc_plant_night: '/src/assets/images/ncc_plant_night_1795047558031.jpg',
  crude_naphtha_terminal: '/src/assets/images/crude_naphtha_terminal_1795047558284.jpg',
  refinery_piping_detail: '/src/assets/images/refinery_piping_detail_1795047558866.jpg',
  global_energy_port: '/src/assets/images/global_energy_port_1795047559804.jpg',
  plant_control_safety: '/src/assets/images/plant_control_safety_1795047559933.jpg',
};

export function createSeedBriefings(): DailyBriefing[] {
  const todayKst = getKstDateString();
  const yesterdayKst = getOffsetKstDateString(-1);

  const todayBriefing: DailyBriefing = {
    date: todayKst,
    generatedAt: `${todayKst} 09:00:00 KST`,
    triggerType: 'curated_seed',
    pipelineStats: {
      rawCollected: 12,
      duplicateClustersMerged: 3,
      deduplicatedCount: 8,
      factCheckPassed: 5,
      factCheckRejected: 1,
      finalPublished: 5,
      deduplicationLog: [
        {
          keptId: `seed-${todayKst}-1`,
          keptTitle: '석화업계 숨통 트이나…NCC 스프레드 손익분기점 넘겼다',
          keptSource: '머니투데이',
          mergedCount: 2,
          mergedTitles: [
            '동북아 에틸렌-나프타 스프레드 반등…크래커 마진 회복세 점검',
            '나프타 가격 변동 속 국내 NCC 수익성 BEP 상회 여부 주목',
          ],
          similarityOverlapPercent: 76,
          selectionRule: 'highest_views',
          ruleReason: '본문 유사도 76% 중복 그룹 내 최다 조회수(16,420회) 기사 우선 채택',
        },
        {
          keptId: `seed-${todayKst}-2`,
          keptTitle: '여수 NCC 139만톤 멈춘다…석유화학 구조조정 실행 단계 진입',
          keptSource: '이데일리',
          mergedCount: 2,
          mergedTitles: [
            '여천NCC·롯데케미칼 여수 NCC 통합 및 설비 감축 본격화',
            '여수산단 1호 사업재편 계획 가동, 2·3공장 가동 조정',
          ],
          similarityOverlapPercent: 71,
          selectionRule: 'highest_views',
          ruleReason: '본문 유사도 71% 중복 그룹 내 최다 조회수(14,150회) 기사 우선 채택',
        },
        {
          keptId: `seed-${todayKst}-4`,
          keptTitle: 'Asia petrochemical markets grapple with supply strain, weak demand',
          keptSource: 'ICIS',
          mergedCount: 1,
          mergedTitles: ['중국발 에틸렌 공급 과잉 지속…동북아 역내 수급 불균형 심화'],
          similarityOverlapPercent: 64,
          selectionRule: 'latest_timestamp',
          ruleReason: '조회수 메타데이터 미제공 외신 포함으로 최신 검증 시각 기준 채택',
        },
      ],
    },
    articles: [
      {
        id: `seed-${todayKst}-1`,
        briefingDate: todayKst,
        title: '석화업계 숨통 트이나…NCC 스프레드 손익분기점 넘겼다',
        summary:
          '최근 에틸렌 등 기초유분 가격과 원재료 나프타 가격 간의 차이인 NCC 스프레드가 국내 업계 손익분기점(톤당 250~300달러) 수준을 상회하는 흐름을 보이며 석유화학 업계의 수익성 개선 기대감이 커지고 있습니다. 다만 중동 정세 및 국제 유가 변동성에 따라 나프타 도입 단가가 재상승할 수 있어 단기 스프레드 반등이 장기 호황으로 이어질지는 신중한 모니터링이 필요합니다. 여천NCC는 스프레드 회복 구간에서 나프타와 LPG 원료 배합비를 탄력적으로 조정해 톤당 제조 마진을 극대화해야 합니다. 영업 및 생산 부서는 고객사별 계약 물량 이행과 스팟 판매 비중 조율을 통해 마진 개선분을 실적에 즉각 반영할 전략이 요구됩니다.',
        fullText: `국내 나프타 분해설비(NCC) 기반 석유화학 기업들의 핵심 수익성 지표인 에틸렌-나프타 스프레드가 장기간의 손익분기점(BEP) 하회 국면에서 벗어나 반등 조짐을 보이고 있다.\n\n머니투데이 보도 및 시장 데이터에 따르면 아시아 역내 수급 조정과 일부 설비 가동률 감축 효과가 맞물리며 에틸렌-나프타 스프레드가 손익분기점으로 통용되는 톤당 250~300달러 선을 넘나드는 흐름이 나타났다. 장기 불황으로 영업적자 부담이 컸던 국내 NCC 기업들로서는 변동비 마진 방어에 숨통이 트이는 신호다.\n\n그러나 중국의 대규모 에틸렌 증설 물량과 글로벌 다운스트림 수요의 완만한 회복 속도를 감안하면 구조적인 공급 과잉이 완전히 해소된 것은 아니다. 여천NCC 구매·생산·영업 실무진은 스프레드 반등 국면을 활용해 원재료 나프타·LPG 스팟 조달 타이밍을 정교화하고, 고수익 유분 중심의 제품 믹스 최적화에 집중해야 한다.`,
        sourceName: '머니투데이',
        sourceUrl: 'https://www.mt.co.kr/industry/2026/11/18/2026111713223063085',
        thumbnailUrl: FALLBACK_IMAGE_MAP.ncc_plant_night,
        fallbackImageKey: 'ncc_plant_night',
        publishedAt: `${todayKst} 08:15 KST`,
        viewCount: 16420,
        departments: ['생산', '구매', '영업'],
        criteriaCategory: 'NCC 마진·가동률',
        relevanceScore: 98,
        ynccImplication:
          'NCC 스프레드 BEP 회복 구간에서 LPG·나프타 원료 최적화(구매) 및 고마진 유분 우선 배분(영업·생산) 추진 필요.',
        factCheckStatus: 'verified',
        factCheckSummary:
          '교차 검증 완료: 머니투데이 원문 기사(2026-11-18) 및 국내 NCC 에틸렌-나프타 BEP(250~300달러/톤) 기준 수치 교차 확인됨.',
        verifiedSources: [
          {
            title: '머니투데이 원문: 석화업계 숨통 트이나…NCC 스프레드 손익분기점 넘겼다',
            uri: 'https://www.mt.co.kr/industry/2026/11/18/2026111713223063085',
          },
          {
            title: '한국경제: 석유화학 구조조정 및 스프레드 현황 분석',
            uri: 'https://www.hankyung.com/article/2026111683841',
          },
        ],
        isSample: true,
      },
      {
        id: `seed-${todayKst}-2`,
        briefingDate: todayKst,
        title: '여수 NCC 139만톤 멈춘다…석유화학 구조조정 실행 단계',
        summary:
          '정부가 여천NCC·롯데케미칼·한화솔루션·DL케미칼이 제출한 여수산단 사업재편 계획을 승인하면서 여수 지역 NCC 설비 총 139만 톤 규모의 가동 중단 및 설비 통합이 실행 단계에 접어들었습니다. 여천NCC 2공장(92만 톤)과 3공장(47만 톤) 가동 조정과 롯데케미칼 여수 NCC 통합 신설법인 출범을 통해 공급 과잉 해소가 추진됩니다. 정부는 7,000억 원 이상 규모의 금융·세제·무역보험 및 공용 파이프랙·수입 나프타 무관세 등 지원 패키지를 병행합니다. 여천NCC 생산·영업·안전 부서는 설비 휴지(Shutdown) 과정의 공정 안전(PSM) 확보와 잔여 가동 설비 중심의 파이프라인 고객사 공급 연속성 유지에 만전을 기해야 합니다.',
        fullText: `여수 국가산업단지 석유화학 '사업재편 1호' 계획이 정부 승인을 거쳐 본격적인 실행 단계에 진입했다.\n\n이데일리 및 연합인포맥스 보도에 따르면 이번 재편안은 여천NCC 2공장(연산 92만 톤)과 3공장(연산 47만 톤) 등 총 139만 톤 규모의 나프타 분해설비(NCC) 가동을 3년 이상 중단하고, 롯데케미칼 여수 NCC 기초소재 사업과 여천NCC를 통합하는 신설법인을 설립하는 내용을 골자로 한다. 한화솔루션·DL케미칼·롯데케미칼 3사가 지분을 3분의 1씩 공동 소유하며 다운스트림 자산을 연계하는 구조다.\n\n정부는 이에 발맞춰 채권단 금융 지원, 무역보험 확대, 기업 분할·합병 법인세 과세이연, 수입 나프타 무관세 적용 연장 등 7,000억 원 이상의 지원 패키지를 가동하고 있다. 여천NCC 실무진 입장에서는 휴지 설비의 안전 보존(Preservation), 통합 이후 스팀·배관 유틸리티 재조정, 그리고 기존 장기 거래처 물량 배분 계획의 정교한 관리가 핵심 과제로 부상했다.`,
        sourceName: '이데일리',
        sourceUrl: 'https://marketin.edaily.co.kr/News/ReadE?newsId=02824086645517472',
        thumbnailUrl: FALLBACK_IMAGE_MAP.refinery_piping_detail,
        fallbackImageKey: 'refinery_piping_detail',
        publishedAt: `${todayKst} 07:40 KST`,
        viewCount: 14150,
        departments: ['생산', '영업', '안전', '구매'],
        criteriaCategory: '국내 정책·단지',
        relevanceScore: 97,
        ynccImplication:
          '여천NCC 2·3공장(139만톤) 가동 조정 및 통합법인 전환 실행에 따른 설비 보존 안전(PSM) 및 거래처 공급 재편 대응 필수.',
        factCheckStatus: 'verified',
        factCheckSummary:
          '교차 검증 완료: 이데일리 및 연합인포맥스·산업부 보도 자료를 통해 여천NCC 2공장(92만톤)·3공장(47만톤) 총 139만톤 규모 감축 수치 확인.',
        verifiedSources: [
          {
            title: '이데일리 원문: 여수 NCC 139만톤 멈춘다…석유화학 구조조정 실행 단계',
            uri: 'https://marketin.edaily.co.kr/News/ReadE?newsId=02824086645517472',
          },
          {
            title: '연합인포맥스: 롯데·여천NCC 통합법인 설립 관련 기사',
            uri: 'https://news.einfomax.co.kr/news/articleView.html?idxno=4426175',
          },
        ],
        isSample: true,
      },
      {
        id: `seed-${todayKst}-3`,
        briefingDate: todayKst,
        title: '석유화학, 다시 혹한기…구조조정 골든타임 지나간다',
        summary:
          '국내 석유화학 산업이 중국발 공급 과잉과 중동·북미의 저가 에탄 기반 설비 대비 나프타 원가 열위라는 이중고 속에서 구조조정의 골든타임을 놓치지 말아야 한다는 경고가 나오고 있습니다. 산단 내 이해관계 조율과 기업결합 심사, 자산실사 절차로 통합 속도가 지체될 경우 현금흐름 압박이 심화될 수 있다는 지적입니다. 여천NCC는 범용 에틸렌 위주 수익 구조에서 벗어나 고부가 스페셜티 유도체 연계 및 에너지 원단위 절감 투자를 흔들림 없이 추진해야 합니다. 구매·재무·영업 실무진은 단기 시황 변동과 무관하게 보수적인 운전자금 관리와 저원가 원료 확보 채널 다변화를 유지해야 합니다.',
        fullText: `한국경제 분석에 따르면 국내 석유화학 업계는 일시적인 스프레드 등락과 무관하게 중장기 구조적 경쟁력 전환의 중대 기로에 서 있다.\n\n중동과 북미 석유화학 단지들이 값싼 천연가스 기반 에탄 크래커(ECC)를 앞세워 원가 우위를 공고히 하고 있고, 중국은 자국 내 초대형 COTC(원유 직접 화학전환) 및 NCC 설비를 공격적으로 증설해 자급률을 80~90% 이상으로 끌어올렸다. 반면 국내 NCC 기업들은 수입 나프타 의존도가 높아 원가 경쟁력 확보에 지속적인 부담을 안고 있다.\n\n전문가들은 여수·대산·울산 산단별 사업재편 실행 속도를 높여 중복 설비를 정리하고, 고부가·친환경 스페셜티 제품 비중을 확대하지 않으면 다음 업황 하강 국면에서 더욱 큰 타격을 받을 수 있다고 진단했다.`,
        sourceName: '한국경제',
        sourceUrl: 'https://www.hankyung.com/article/2026111683841',
        thumbnailUrl: FALLBACK_IMAGE_MAP.crude_naphtha_terminal,
        fallbackImageKey: 'crude_naphtha_terminal',
        publishedAt: `${todayKst} 07:10 KST`,
        viewCount: 11890,
        departments: ['영업', '구매', '생산'],
        criteriaCategory: '국내 정책·단지',
        relevanceScore: 94,
        ynccImplication:
          '에탄 크래커·중국 COTC 대비 원가 열위 극복을 위한 나프타 조달 원가 절감 및 산단 통합 시너지 조기 실행 필요.',
        factCheckStatus: 'verified',
        factCheckSummary:
          '교차 검증 완료: 한국경제(2026-11-16) 원문 및 KED Global 국내 석유화학 구조조정 동향 보도로 교차 검증됨.',
        verifiedSources: [
          {
            title: '한국경제 원문: 석유화학, 다시 혹한기…구조조정 골든타임 지나간다',
            uri: 'https://www.hankyung.com/article/2026111683841',
          },
          {
            title: 'KED Global: South Korea Petrochemical Restructuring',
            uri: 'https://www.kedglobal.com/corporate-restructuring/newsView/ked202509240015',
          },
        ],
        isSample: true,
      },
      {
        id: `seed-${todayKst}-4`,
        briefingDate: todayKst,
        title: 'Asia petrochemical markets grapple with supply strain, weak demand',
        summary:
          '글로벌 에너지·화학 정보기관 ICIS는 아시아 석유화학 시장이 역내 공급 과잉 압력과 패키징·자동차·건설 등 최종 수요 부진으로 인해 크래커 가동률 하향 조정이 장기화되고 있다고 진단했습니다. 원료인 나프타 가격 강세 및 수송 차질 리스크와 달리 다운스트림 폴리올레핀 제품 가격 전가력이 약해 동북아 NCC 마진이 지속적인 압박을 받고 있습니다. 여천NCC 영업 부서는 역내 동남아·인도 시장의 지역별 수요 편차를 점검해 수출 물량을 탄력 배분하고, 구매 부서는 아시아 역내 스팟 나프타 수급 경색 신호를 조기에 포착해 재고 버퍼를 관리해야 합니다.',
        fullText: `ICIS 시장 리포트에 따르면 아시아 석유화학 시장은 중국의 대규모 설비 증설에 따른 역내 공급 초과와 글로벌 제조업 경기 둔화로 인한 다운스트림 수요 약세가 맞물리며 복합적인 압박을 받고 있다.\n\n원유 및 정유 수급 변화에 따라 나프타 원재료 비용이 높은 수준에서 변동성을 보이는 반면, 폴리에틸렌(PE)·폴리프로필렌(PP) 등 주요 유도품 시장은 최종 소비재 및 건설 경기 둔화로 원가 상승분을 제품 가격에 충분히 전가하지 못하는 실정이다.\n\n이에 따라 한국·일본·대만 등 동북아 주요 나프타 크래커들은 수익성 방어를 위해 가동률을 탄력적으로 낮추거나 노후 크래커 폐쇄·통합을 가속화하고 있으며, 여천NCC 역시 C4(부타디엔) 및 BTX 등 비에틸렌 유분 수익성 확보와 원료 다변화 전략의 정밀한 운용이 요구된다.`,
        sourceName: 'ICIS',
        sourceUrl:
          'https://www.icis.com/explore/resources/news/2026/08/13/11228813/asia-petrochemical-markets-grapple-with-supply-strain-weak-demand/',
        thumbnailUrl: FALLBACK_IMAGE_MAP.global_energy_port,
        fallbackImageKey: 'global_energy_port',
        publishedAt: `${todayKst} 06:45 KST`,
        viewCount: null,
        departments: ['영업', '구매'],
        criteriaCategory: '글로벌 수급·원료',
        relevanceScore: 91,
        ynccImplication:
          '다운스트림 수요 부진 및 나프타 원가 변동성 지속에 따라 스팟 물량 수출처 다변화와 원료 재고 탄력 관리 권고.',
        factCheckStatus: 'verified',
        factCheckSummary:
          '교차 검증 완료: ICIS 아시아 석유화학 시황 보고서 원문 및 S&P Global APIC 2026 동향 분석으로 사실관계 확인.',
        verifiedSources: [
          {
            title: 'ICIS 원문: Asia petrochemical markets grapple with supply strain, weak demand',
            uri: 'https://www.icis.com/explore/resources/news/2026/08/13/11228813/asia-petrochemical-markets-grapple-with-supply-strain-weak-demand/',
          },
          {
            title: 'S&P Global: Emerging Stronger APIC 2026 Chemicals Report',
            uri: 'https://www.spglobal.com/energy/en/news-research/special-reports/chemicals/emerging-stronger-apic-2026',
          },
        ],
        isSample: true,
      },
      {
        id: `seed-${todayKst}-5`,
        briefingDate: todayKst,
        title: '여수국가산단 비산배출·정기보수 환경·안전 관리 강화 및 공용 배관 안전성 점검',
        summary:
          '여수시와 환경·안전 유관기관이 여수국가산업단지 내 대형 석유화학 사업장의 정기보수(대정비) 기간 플레어스택 가동 저감 조치와 VOCs 비산배출(LDAR) 및 공용 파이프랙 안전성 점검을 한층 강화하고 있습니다. 특히 배관 잔류가스 처리 시 가성소다(NaOH) 세정 및 스팀 주입량 최적화, 광학가스카메라(OGC) 상시 모니터링 및 사전예고제 이행이 핵심 준수 사항으로 강조됩니다. 여천NCC 안전·환경 및 생산 부서는 정기보수·부분가동 전환 시 플레어 화염·매연·악취 민원 예방 절차를 사전 점검하고 노후 배관 및 밸브·플랜지 밀폐 관리 이력을 철저히 검증해야 합니다.',
        fullText: `여수국가산업단지 내 설비 노후화와 강화된 대기환경·산업안전 규제에 대응해 여수시와 유역환경청, 산단 입주 기업들이 정기보수(Turnaround) 및 일상 운전 시의 환경·안전 관리 체계를 한층 고도화하고 있다.\n\n여수시 산단 정비계획 안내 및 지역 보도에 따르면 석유화학 플랜트의 가동 중단·재가동 과정에서 불가피하게 발생하는 플레어스택(Flare Stack) 연소 화염, 소음, 매연 등을 최소화하기 위해 배관 NaOH(가성소다) 세정 강화, 스팀 주입 최적화, 정비 일정 사전예고제 및 사업장별 모니터링 체계가 상시 가동되고 있다.\n\n아울러 벤젠·1,3-부타디엔 등 특정대기유해물질의 비산배출(LDAR) 억제를 위한 광학가스카메라(OGC) 점검과 공용 파이프랙 안전 진단이 강화되고 있어, 여천NCC 안전·환경팀과 공정운전팀은 밸브·펌프 씰(Seal) 예방 정비 및 비상 대응 매뉴얼 준수 여부를 수시 점검해야 한다.`,
        sourceName: '여수시청 / 남도투데이',
        sourceUrl:
          'https://www.yeosu.go.kr/www/sphere/environ/sandan_maintain?idx=581649&mode=view',
        thumbnailUrl: FALLBACK_IMAGE_MAP.plant_control_safety,
        fallbackImageKey: 'plant_control_safety',
        publishedAt: `${todayKst} 06:10 KST`,
        viewCount: 6820,
        departments: ['안전', '환경', '생산'],
        criteriaCategory: '실무·리스크 관리',
        relevanceScore: 89,
        ynccImplication:
          '정기보수·설비 정지 전환 시 플레어스택 매연 저감(NaOH 세정·스팀 조절) 및 OGC 비산배출 점검 수칙 사전 이행 필수.',
        factCheckStatus: 'verified',
        factCheckSummary:
          '교차 검증 완료: 여수시청 산단 정비계획 공식 게시물 및 남도투데이 여수산단 안전·환경 보도를 통해 교차 확인.',
        verifiedSources: [
          {
            title: '여수시청 공식 게시: 여수산단 입주업체 정비계획 및 환경 관리',
            uri: 'https://www.yeosu.go.kr/www/sphere/environ/sandan_maintain?idx=581649&mode=view',
          },
          {
            title: '남도투데이: 여수산단 환경·안전 관리 및 산업 동향',
            uri: 'https://www.namdotoday.kr/news/articleView.html?idxno=30148',
          },
        ],
        isSample: true,
      },
    ],
  };

  const yesterdayBriefing: DailyBriefing = {
    date: yesterdayKst,
    generatedAt: `${yesterdayKst} 09:00:00 KST`,
    triggerType: 'curated_seed',
    pipelineStats: {
      rawCollected: 9,
      duplicateClustersMerged: 1,
      deduplicatedCount: 7,
      factCheckPassed: 3,
      factCheckRejected: 0,
      finalPublished: 3,
      deduplicationLog: [
        {
          keptId: `seed-${yesterdayKst}-1`,
          keptTitle: '롯데케미칼·여천NCC 통합법인 출범 및 여수산단 사업재편 본격화',
          keptSource: '연합인포맥스',
          mergedCount: 2,
          mergedTitles: [
            '한화솔루션·DL케미칼·롯데케미칼 여수 NCC 통합 지분 구도 윤곽',
            '여수 1호 석유화학 사업재편 법인 통합 세부 논의',
          ],
          similarityOverlapPercent: 69,
          selectionRule: 'highest_views',
          ruleReason: '본문 유사도 69% 중복 그룹 내 최다 조회수(10,240회) 기사 선별',
        },
      ],
    },
    articles: [
      {
        id: `seed-${yesterdayKst}-1`,
        briefingDate: yesterdayKst,
        title: '롯데케미칼·여천NCC 통합법인 출범 및 여수산단 사업재편 본격화',
        summary:
          '롯데케미칼 여수공장의 NCC 등 기초소재 사업 물적분할과 여천NCC 통합을 골자로 한 여수산단 석유화학 사업재편 구도가 구체화되고 있습니다. 한화솔루션·DL케미칼·롯데케미칼 3사가 신설 통합법인 지분을 공동 보유하며 중복 설비 감축과 다운스트림 수직 계열화 시너지를 도모하는 구조입니다. 여천NCC 영업·구매 부서는 통합 이후 원료 나프타 공동 구매 협상력 제고 및 역내 고객사 공급망 통합 시나리오를 사전 검토할 필요가 있습니다.',
        fullText: `연합인포맥스 보도에 따르면 여수 국가산업단지 내 핵심 NCC 운영사인 여천NCC와 롯데케미칼 여수공장 기초소재 부문을 통합하는 신설 통합법인 설립 및 사업재편이 본격 추진되고 있다.\n\n이번 통합은 글로벌 공급 과잉 속에서 여수산단 내 유사 범용 설비의 중복 투자를 줄이고, 한화솔루션과 DL케미칼의 다운스트림 자산과의 연계를 통해 원가 및 물류 경쟁력을 극대화하기 위한 전략적 결단이다. 공정거래위원회 심사 및 자산 배분 실사가 완료되면 국내 최대 규모의 통합 NCC 체제가 가동될 전망이다.`,
        sourceName: '연합인포맥스',
        sourceUrl: 'https://news.einfomax.co.kr/news/articleView.html?idxno=4426175',
        thumbnailUrl: FALLBACK_IMAGE_MAP.ncc_plant_night,
        fallbackImageKey: 'ncc_plant_night',
        publishedAt: `${yesterdayKst} 08:20 KST`,
        viewCount: 10240,
        departments: ['생산', '구매', '영업'],
        criteriaCategory: '국내 정책·단지',
        relevanceScore: 95,
        ynccImplication:
          '통합법인 출범 대비 원료 공동 조달(구매) 및 스팀·파이프라인 유틸리티 연계 최적화(생산) 사전 준비 필요.',
        factCheckStatus: 'verified',
        factCheckSummary:
          '교차 검증 완료: 연합인포맥스 및 이데일리 여수산단 사업재편 1호 승인 보도로 사실관계 확인.',
        verifiedSources: [
          {
            title: '연합인포맥스 원문 기사',
            uri: 'https://news.einfomax.co.kr/news/articleView.html?idxno=4426175',
          },
          {
            title: '이데일리: 여수 NCC 139만톤 멈춘다',
            uri: 'https://marketin.edaily.co.kr/News/ReadE?newsId=02824086645517472',
          },
        ],
        isSample: true,
      },
      {
        id: `seed-${yesterdayKst}-2`,
        briefingDate: yesterdayKst,
        title: 'South Korea moves to cut petrochemical capacity amid prolonged margin slump',
        summary:
          '외신 KED Global은 한국 석유화학 산업이 중국의 공격적 설비 증설과 장기화된 마진 침체에 대응하기 위해 수백만 톤 규모의 에틸렌 생산능력 감축 및 산업 재편에 나섰다고 보도했습니다. 정부 주도의 세제·금융 인센티브와 연계해 여수·대산 등 주요 단지의 노후 범용 크래커 통합이 가속화되고 있습니다. 여천NCC는 글로벌 시장에서 한국산 기초유분의 공급 감소가 역내 수급 밸런스에 미치는 영향을 분석해 중장기 계약 단가 협상에 반영해야 합니다.',
        fullText: `KED Global 보도에 따르면 한국 정부와 주요 석유화학 기업들은 수년간 이어진 마진 압박과 중국발 공급 과잉을 타개하기 위해 역사적인 규모의 에틸렌 설비 합리화 및 구조조정에 착수했다.\n\n동아시아 전역에서 일본과 한국이 노후 나프타 크래커 가동을 축소하거나 통폐합하는 가운데, 업계에서는 단기적인 감산 비용에도 불구하고 중장기적으로 고부가 스페셜티 중심의 체질 개선이 필수적이라는 데 공감대를 형성하고 있다.`,
        sourceName: 'KED Global',
        sourceUrl:
          'https://www.kedglobal.com/corporate-restructuring/newsView/ked202509240015',
        thumbnailUrl: FALLBACK_IMAGE_MAP.global_energy_port,
        fallbackImageKey: 'global_energy_port',
        publishedAt: `${yesterdayKst} 07:45 KST`,
        viewCount: null,
        departments: ['영업', '생산'],
        criteriaCategory: '글로벌 수급·원료',
        relevanceScore: 90,
        ynccImplication:
          '한국·일본 역내 설비 합리화에 따른 아시아 에틸렌 수급 변화 모니터링 및 장기 공급 계약 조건 재점검 필요.',
        factCheckStatus: 'verified',
        factCheckSummary:
          '교차 검증 완료: KED Global 및 ICIS 동아시아 석유화학 설비 감축 보도로 교차 확인.',
        verifiedSources: [
          {
            title: 'KED Global 원문 기사',
            uri: 'https://www.kedglobal.com/corporate-restructuring/newsView/ked202509240015',
          },
        ],
        isSample: true,
      },
      {
        id: `seed-${yesterdayKst}-3`,
        briefingDate: yesterdayKst,
        title: '여수산단 노후 설비 안전망 강화 및 통합 인허가·친환경 전환 지원 추진',
        summary:
          '여수국가산업단지의 노후 설비 안전사고 예방과 탄소중립 대응을 위해 공용 파이프랙 안전성 점검 강화, 통합 환경 인허가 협의체 운영, 저탄소 공정 전환 지원이 동시에 추진되고 있습니다. 특히 EU CBAM 등 글로벌 환경 규제 확대에 대응한 온실가스·대기오염물질 저감 투자가 강조됩니다. 여천NCC 안전·환경 부서는 배관 건전성 평가와 저탄소 에너지 효율화 과제를 정부 지원 사업과 연계해 추진해야 합니다.',
        fullText: `남도투데이 및 관계부처 발표에 따르면 조성 수십 년이 경과한 여수국가산업단지의 지속가능성을 높이기 위해 노후 배관·파이프랙 안전망 구축과 친환경·저탄소 공정 전환 지원이 병행 추진되고 있다.\n\n여천NCC와 같은 대규모 NCC 사업장은 공용 파이프랙과 유틸리티 배관을 통한 인근 수요처 공급 비중이 높아, 설비 건전성 진단과 환경 인허가 규제 대응이 조업 안정성과 직결된다.`,
        sourceName: '남도투데이',
        sourceUrl: 'https://www.namdotoday.kr/news/articleView.html?idxno=30148',
        thumbnailUrl: FALLBACK_IMAGE_MAP.plant_control_safety,
        fallbackImageKey: 'plant_control_safety',
        publishedAt: `${yesterdayKst} 06:50 KST`,
        viewCount: 5410,
        departments: ['안전', '환경'],
        criteriaCategory: '실무·리스크 관리',
        relevanceScore: 87,
        ynccImplication:
          '여수산단 파이프랙 안전 진단 및 통합 환경 규제 대응 로드맵에 맞춘 사전 예방 정비 강화.',
        factCheckStatus: 'verified',
        factCheckSummary:
          '교차 검증 완료: 남도투데이 및 산업부 여수산단 안전망·환경 전환 발표 자료로 확인.',
        verifiedSources: [
          {
            title: '남도투데이 원문 기사',
            uri: 'https://www.namdotoday.kr/news/articleView.html?idxno=30148',
          },
        ],
        isSample: true,
      },
    ],
  };

  return [todayBriefing, yesterdayBriefing];
}
