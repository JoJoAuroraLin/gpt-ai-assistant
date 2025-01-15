import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // 從環境變數讀取資料庫連接字串
});

export const db = drizzle(pool);
