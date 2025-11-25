import { createApp } from './app';
import { config } from './config';
import { database } from './services/database';
import { Logger } from './middleware/logging';

async function startServer() {
  try {
    Logger.info('Starting server', {
      port: config.port,
      environment: config.nodeEnv,
    });

    // Connect to database
    await database.connect();
    Logger.info('Database connected successfully');
    
    const app = createApp();

    app.listen(config.port, () => {
      Logger.info('Server started successfully', {
        port: config.port,
        environment: config.nodeEnv,
      });
    });
  } catch (error) {
    Logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();
