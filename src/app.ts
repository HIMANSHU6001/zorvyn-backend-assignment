import express, { Request, Response } from 'express';
import { disconnectRedis, ensureRedisConnected, redis } from './config/redis';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Finance Dashboard API is up and running',
  });
});

app.get('/health/redis', async (_req: Request, res: Response) => {
  try {
    await redis.ping();
    res.status(200).json({
      success: true,
      message: 'Redis is connected',
    });
  } catch {
    res.status(503).json({
      success: false,
      message: 'Redis is not connected',
    });
  }
});

async function startServer() {
  try {
    await ensureRedisConnected();

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`${signal} received, shutting down gracefully...`);
      server.close(async () => {
        await disconnectRedis();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => {
      void gracefulShutdown('SIGINT');
    });

    process.on('SIGTERM', () => {
      void gracefulShutdown('SIGTERM');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

void startServer();

export default app;