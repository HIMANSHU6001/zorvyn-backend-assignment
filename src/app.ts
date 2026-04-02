import 'dotenv/config';
import express from 'express';
import { errorMiddleware } from './common/middleware/error.middleware';
import { notFoundMiddleware } from './common/middleware/not-found.middleware';
import { disconnectRedis, ensureRedisConnected } from './config/redis';
import apiRouter from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api', apiRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

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