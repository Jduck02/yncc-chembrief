import fs from 'fs';
import path from 'path';
import type { DailyBriefing, NewsArticle } from '../src/types/news.ts';
import { normalizeArticleKeywords } from './keywords.ts';
import { createSeedBriefings, SEED_SCHEMA_VERSION } from './seedData.ts';
import { getKstDateString } from './time.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'briefings.json');

interface StoreData {
  seedVersion?: number;
  briefings: DailyBriefing[];
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
      briefings: createSeedBriefings(),
      lastRunAt: null,
    };
    writeStore(initial);
    return initial;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as StoreData;

    if (!Array.isArray(parsed.briefings) || parsed.briefings.length === 0) {
      const seeded: StoreData = {
        seedVersion: SEED_SCHEMA_VERSION,
        briefings: createSeedBriefings(),
        lastRunAt: parsed.lastRunAt ?? null,
      };
      writeStore(seeded);
      return seeded;
    }

    // Upgrade older curated_seed entries to the latest verified exact-article-URL & keyword schema
    if ((parsed.seedVersion ?? 1) < SEED_SCHEMA_VERSION) {
      const freshSeeds = createSeedBriefings();
      const liveBriefings = parsed.briefings
        .filter((b) => b.triggerType !== 'curated_seed')
        .map(hydrateBriefingKeywords);
      const liveDates = new Set(liveBriefings.map((b) => b.date));
      const merged = [
        ...liveBriefings,
        ...freshSeeds.filter((s) => !liveDates.has(s.date)),
      ].sort((a, b) => b.date.localeCompare(a.date));

      const upgraded: StoreData = {
        seedVersion: SEED_SCHEMA_VERSION,
        briefings: merged,
        lastRunAt: parsed.lastRunAt ?? null,
      };
      writeStore(upgraded);
      return upgraded;
    }

    return {
      ...parsed,
      briefings: parsed.briefings.map(hydrateBriefingKeywords),
    };
  } catch {
    const fallback: StoreData = {
      seedVersion: SEED_SCHEMA_VERSION,
      briefings: createSeedBriefings(),
      lastRunAt: null,
    };
    writeStore(fallback);
    return fallback;
  }
}

export function getAvailableDates(): string[] {
  const store = ensureStoreFile();
  return [...store.briefings]
    .map((b) => b.date)
    .sort((a, b) => b.localeCompare(a));
}

export function getBriefingByDate(date?: string): DailyBriefing | null {
  const store = ensureStoreFile();
  const targetDate = date || getKstDateString();
  const exact = store.briefings.find((b) => b.date === targetDate);
  if (exact) {
    return exact;
  }
  if (!date && store.briefings.length > 0) {
    const sorted = [...store.briefings].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0];
  }
  return null;
}

export function saveBriefing(briefing: DailyBriefing, lastRunAt: string): void {
  const store = ensureStoreFile();
  const filtered = store.briefings.filter((b) => b.date !== briefing.date);
  filtered.unshift(briefing);
  const sorted = filtered.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  writeStore({
    seedVersion: SEED_SCHEMA_VERSION,
    briefings: sorted,
    lastRunAt,
  });
}

export function getLastRunAt(): string | null {
  const store = ensureStoreFile();
  return store.lastRunAt;
}

export function getArticleById(id: string): NewsArticle | null {
  const store = ensureStoreFile();
  for (const briefing of store.briefings) {
    const found = briefing.articles.find((a) => a.id === id);
    if (found) return found;
  }
  return null;
}
