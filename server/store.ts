import fs from 'fs';
import path from 'path';
import type {
  DailyBriefing,
  DailyWorkflowState,
  NewsArticle,
} from '../src/types/news.ts';
import { normalizeArticleKeywords } from './keywords.ts';
import { createSeedBriefings, SEED_SCHEMA_VERSION } from './seedData.ts';
import { formatKstDateTime, getKstDateString } from './time.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'briefings.json');

interface StoreData {
  seedVersion?: number;
  briefings: DailyBriefing[];
  draftBriefing?: DailyBriefing | null;
  lastRunAt: string | null;
}

function writeStore(data: StoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function hydrateBriefingKeywords(briefing: DailyBriefing): DailyBriefing {
  return {
    ...briefing,
    articles: briefing.articles.map((article) => ({
      ...article,
      keywords: normalizeArticleKeywords(
        article.keywords,
        article.title,
        article.criteriaCategory,
        `${article.summary} ${article.fullText}`
      ),
    })),
  };
}

function ensureStoreFile(): StoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initial: StoreData = {
      seedVersion: SEED_SCHEMA_VERSION,
      briefings: createSeedBriefings().map((b) => ({ ...b, isSaved: true })),
      draftBriefing: null,
      lastRunAt: null,
    };
    writeStore(initial);
    return initial;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as StoreData;
    const todayKst = getKstDateString();

    if (!Array.isArray(parsed.briefings) || parsed.briefings.length === 0) {
      const seeded: StoreData = {
        seedVersion: SEED_SCHEMA_VERSION,
        briefings: createSeedBriefings().map((b) => ({ ...b, isSaved: true })),
        draftBriefing: null,
        lastRunAt: parsed.lastRunAt ?? null,
      };
      writeStore(seeded);
      return seeded;
    }

    // Discard stale unsaved draft from a previous KST day on rollover
    const validDraft =
      parsed.draftBriefing && parsed.draftBriefing.date === todayKst
        ? hydrateBriefingKeywords({ ...parsed.draftBriefing, isSaved: false })
        : null;

    if ((parsed.seedVersion ?? 1) < SEED_SCHEMA_VERSION) {
      const freshSeeds = createSeedBriefings().map((b) => ({ ...b, isSaved: true }));
      const liveBriefings = parsed.briefings
        .filter((b) => b.triggerType !== 'curated_seed')
        .map((b) => hydrateBriefingKeywords({ ...b, isSaved: true }));
      const liveDates = new Set(liveBriefings.map((b) => b.date));
      const merged = [
        ...liveBriefings,
        ...freshSeeds.filter((s) => !liveDates.has(s.date)),
      ].sort((a, b) => b.date.localeCompare(a.date));

      const upgraded: StoreData = {
        seedVersion: SEED_SCHEMA_VERSION,
        briefings: merged,
        draftBriefing: validDraft,
        lastRunAt: parsed.lastRunAt ?? null,
      };
      writeStore(upgraded);
      return upgraded;
    }

    const hydratedBriefings = parsed.briefings.map((b) =>
      hydrateBriefingKeywords({ ...b, isSaved: b.isSaved ?? true })
    );

    if ((parsed.draftBriefing && !validDraft)) {
      const cleaned: StoreData = {
        seedVersion: parsed.seedVersion ?? SEED_SCHEMA_VERSION,
        briefings: hydratedBriefings,
        draftBriefing: null,
        lastRunAt: parsed.lastRunAt ?? null,
      };
      writeStore(cleaned);
      return cleaned;
    }

    return {
      ...parsed,
      briefings: hydratedBriefings,
      draftBriefing: validDraft,
    };
  } catch {
    const fallback: StoreData = {
      seedVersion: SEED_SCHEMA_VERSION,
      briefings: createSeedBriefings().map((b) => ({ ...b, isSaved: true })),
      draftBriefing: null,
      lastRunAt: null,
    };
    writeStore(fallback);
    return fallback;
  }
}

export function getWorkflowState(): DailyWorkflowState {
  const store = ensureStoreFile();
  const todayKst = getKstDateString();
  const savedToday = store.briefings.find(
    (b) => b.date === todayKst && b.triggerType !== 'curated_seed'
  );
  const isSavedToday = Boolean(savedToday);
  const hasDraftToday =
    !isSavedToday &&
    Boolean(
      store.draftBriefing &&
        store.draftBriefing.date === todayKst &&
        store.draftBriefing.articles.length > 0
    );

  return {
    todayKst,
    hasDraftToday,
    isSavedToday,
    savedAtToday: savedToday?.savedAt || savedToday?.generatedAt || null,
    canExecuteScrape: !isSavedToday,
    canSaveDraft: !isSavedToday && hasDraftToday,
  };
}

export function getAvailableDates(): string[] {
  const store = ensureStoreFile();
  const todayKst = getKstDateString();
  const dates = new Set(store.briefings.map((b) => b.date));
  if (store.draftBriefing && store.draftBriefing.date === todayKst) {
    dates.add(todayKst);
  }
  return [...dates].sort((a, b) => b.localeCompare(a));
}

export function getBriefingByDate(date?: string): DailyBriefing | null {
  const store = ensureStoreFile();
  const todayKst = getKstDateString();
  const targetDate = date || todayKst;

  const exactSaved = store.briefings.find((b) => b.date === targetDate);
  if (exactSaved) {
    return exactSaved;
  }

  if (
    targetDate === todayKst &&
    store.draftBriefing &&
    store.draftBriefing.date === todayKst
  ) {
    return store.draftBriefing;
  }

  if (!date && store.briefings.length > 0) {
    const sorted = [...store.briefings].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0];
  }
  return null;
}

export function getRecentLiveArticles(limitDays = 3): NewsArticle[] {
  const store = ensureStoreFile();
  return store.briefings
    .filter((b) => b.triggerType !== 'curated_seed')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limitDays)
    .flatMap((b) => b.articles);
}

export function getAllSavedArticles(): NewsArticle[] {
  const store = ensureStoreFile();
  return store.briefings.flatMap((b) => b.articles);
}

export function saveTodayDraft(briefing: DailyBriefing, lastRunAt: string): void {
  const store = ensureStoreFile();
  writeStore({
    seedVersion: SEED_SCHEMA_VERSION,
    briefings: store.briefings,
    draftBriefing: {
      ...briefing,
      isSaved: false,
    },
    lastRunAt,
  });
}

export function commitTodayDraft(): DailyBriefing {
  const store = ensureStoreFile();
  const todayKst = getKstDateString();

  const alreadySaved = store.briefings.find(
    (b) => b.date === todayKst && b.triggerType !== 'curated_seed'
  );
  if (alreadySaved) {
    throw new Error(
      `오늘(${todayKst}) 브리핑은 이미 저장이 완료되어 익일(00:00 KST)까지 추가로 저장하거나 재실행할 수 없습니다.`
    );
  }

  if (
    !store.draftBriefing ||
    store.draftBriefing.date !== todayKst ||
    store.draftBriefing.articles.length === 0
  ) {
    throw new Error(
      `저장할 오늘(${todayKst}) 작업수행 결과가 없습니다. 먼저 '작업수행' 버튼을 눌러 기사를 수집해 주세요.`
    );
  }

  const savedAt = formatKstDateTime();
  const committed: DailyBriefing = {
    ...store.draftBriefing,
    date: todayKst,
    savedAt,
    isSaved: true,
    articles: store.draftBriefing.articles.map((a) => ({
      ...a,
      briefingDate: todayKst,
    })),
  };

  const filtered = store.briefings.filter((b) => b.date !== todayKst);
  filtered.unshift(committed);
  const sorted = filtered.sort((a, b) => b.date.localeCompare(a.date));

  writeStore({
    seedVersion: SEED_SCHEMA_VERSION,
    briefings: sorted,
    draftBriefing: null,
    lastRunAt: store.lastRunAt ?? savedAt,
  });

  return committed;
}

export function getLastRunAt(): string | null {
  const store = ensureStoreFile();
  return store.lastRunAt;
}

export function getArticleById(id: string): NewsArticle | null {
  const store = ensureStoreFile();
  if (store.draftBriefing) {
    const inDraft = store.draftBriefing.articles.find((a) => a.id === id);
    if (inDraft) return inDraft;
  }
  for (const briefing of store.briefings) {
    const found = briefing.articles.find((a) => a.id === id);
    if (found) return found;
  }
  return null;
}
