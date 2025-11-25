import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import { Logger } from '../middleware/logging';

class Database {
  private pool: Pool | null = null;
  private retryAttempts = 0;
  private maxRetries = 5;
  private baseDelay = 1000; // 1 second

  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      Logger.error('Unexpected database pool error', err);
    });

    await this.testConnection();
  }

  private async testConnection(): Promise<void> {
    while (this.retryAttempts < this.maxRetries) {
      try {
        if (!this.pool) {
          throw new Error('Pool not initialized');
        }
        
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        Logger.info('Database connection established successfully', {
          host: config.database.host,
          database: config.database.name,
        });
        this.retryAttempts = 0;
        return;
      } catch (error) {
        this.retryAttempts++;
        const delay = this.baseDelay * Math.pow(2, this.retryAttempts - 1);
        
        Logger.error('Database connection attempt failed', error, {
          attempt: this.retryAttempts,
          max_retries: this.maxRetries,
          host: config.database.host,
          database: config.database.name,
        });

        if (this.retryAttempts >= this.maxRetries) {
          throw new Error('Failed to connect to database after maximum retries');
        }

        Logger.info(`Retrying database connection`, {
          delay_ms: delay,
          next_attempt: this.retryAttempts + 1,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      Logger.error('Database query error', error, {
        query: text.substring(0, 100), // Log first 100 chars of query
      });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool.connect();
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool) {
        return false;
      }
      
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      Logger.error('Database health check failed', error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      Logger.info('Database connection closed');
    }
  }
}

export const database = new Database();
