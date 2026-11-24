import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { dailyScheduler } from './server/scheduler.ts';
import {
  commitTodayDraft,
  getArticleById,
  getAvailableDates,
  getBriefingByDate,
  getWorkflowState,
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
      workflow: getWorkflowState(),
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
      workflow: getWorkflowState(),
    });
  });

  app.post('/api/scrape', (_req, res) => {
    const currentStatus = dailyScheduler.getStatus();
    if (currentStatus.isRunning) {
      res.status(409).json({
        error: '작업수행 파이프라인이 이미 실행 중입니다.',
        scheduler: currentStatus,
        workflow: getWorkflowState(),
      });
      return;
    }

    const workflow = getWorkflowState();
    if (workflow.isSavedToday) {
      res.status(409).json({
        error: `오늘(${workflow.todayKst}) 브리핑은 이미 저장되어 익일(00:00 KST)까지 작업수행을 실행할 수 없습니다.`,
        scheduler: currentStatus,
        workflow,
      });
      return;
    }

    // Run asynchronously so client polls /api/scrape/status smoothly
    dailyScheduler.triggerManualScrape().catch((err) => {
      console.error('[Manual Scrape Error]', err);
    });

    res.status(202).json({
      started: true,
      scheduler: dailyScheduler.getStatus(),
      workflow: getWorkflowState(),
    });
  });

  app.post('/api/briefings/save', (_req, res) => {
    const currentStatus = dailyScheduler.getStatus();
    if (currentStatus.isRunning) {
      res.status(409).json({
        error: '작업수행이 완료된 후 저장할 수 있습니다.',
      });
      return;
    }

    try {
      const committed = commitTodayDraft();
      res.json({
        saved: true,
        todayKst: getKstDateString(),
        availableDates: getAvailableDates(),
        briefing: committed,
        scheduler: dailyScheduler.getStatus(),
        workflow: getWorkflowState(),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '당일 브리핑 저장에 실패했습니다.';
      res.status(400).json({
        error: message,
        workflow: getWorkflowState(),
      });
    }
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
    console.log(
      `[YNCC ChemBrief] Manual-mode server listening on http://0.0.0.0:${PORT} (KST Date: ${getKstDateString()})`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start YNCC ChemBrief server:', err);
  process.exit(1);
});
