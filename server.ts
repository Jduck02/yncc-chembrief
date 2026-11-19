import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { dailyScheduler } from './server/scheduler.ts';
import {
  getArticleById,
  getAvailableDates,
  getBriefingByDate,
} from './server/store.ts';
import { getKstDateString } from './server/time.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, todayKst: getKstDateString() });
  });

  app.get('/api/briefings', (req, res) => {
    const requestedDate =
      typeof req.query.date === 'string' && req.query.date.trim() !== ''
        ? req.query.date.trim()
        : undefined;

    const availableDates = getAvailableDates();
    const briefing = getBriefingByDate(requestedDate);
    res.json({
      todayKst: getKstDateString(),
      availableDates,
      briefing,
      scheduler: dailyScheduler.getStatus(),
    });
  });

  app.get('/api/articles/:id', (req, res) => {
    const article = getArticleById(req.params.id);
    if (!article) {
      res.status(404).json({ error: '요청하신 기사를 찾을 수 없습니다.' });
      return;
    }
    res.json({ article });
  });

  app.get('/api/scrape/status', (_req, res) => {
    res.json({
      scheduler: dailyScheduler.getStatus(),
      availableDates: getAvailableDates(),
      todayKst: getKstDateString(),
    });
  });

  app.post('/api/scrape', (_req, res) => {
    const currentStatus = dailyScheduler.getStatus();
    if (currentStatus.isRunning) {
      res.status(409).json({
        error: '뉴스 스크랩 파이프라인이 이미 실행 중입니다.',
        scheduler: currentStatus,
      });
      return;
    }

    // Run asynchronously so client polls /api/scrape/status smoothly
    dailyScheduler.triggerScrape('manual').catch((err) => {
      console.error('[Manual Scrape Error]', err);
    });

    res.status(202).json({
      started: true,
      scheduler: dailyScheduler.getStatus(),
    });
  });

  // Frontend serving: Vite middleware in development, static dist/ in production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    dailyScheduler.start();
    console.log(
      `[YNCC ChemBrief] Server listening on http://0.0.0.0:${PORT} (KST Date: ${getKstDateString()})`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start YNCC ChemBrief server:', err);
  process.exit(1);
});
