import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import type { CorsOptions } from 'cors';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './utils/errorHandler';

const app = express();

const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (config.cors.origin.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
};

// Middleware
app.use(cors(corsOptions));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🚀 CRM API server running on http://localhost:${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
});

export default app;
