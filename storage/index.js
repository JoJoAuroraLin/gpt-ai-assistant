import { Pool } from 'pg';

class Storage {
  constructor() {
    
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL, 
      ssl: {
        rejectUnauthorized: false, 
    });
  }

  async initialize() {
    try {
      
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS app_storage (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      console.log('Database initialized successfully.');
    } catch (err) {
      console.error('Error initializing database:', err.message);
    }
  }

  /**
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async getItem(key) {
    try {
      const result = await this.pool.query('SELECT value FROM app_storage WHERE key = $1', [key]);
      return result.rows[0]?.value || null; 
    } catch (err) {
      console.error(`Error fetching key "${key}":`, err.message);
      return null;
    }
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  async setItem(key, value) {
    try {
      const query = `
        INSERT INTO app_storage (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value;
      `;
      await this.pool.query(query, [key, value]);
      console.log(`Key "${key}" updated successfully.`);
    } catch (err) {
      console.error(`Error setting key "${key}":`, err.message);
    }
  }
}

const storage = new Storage();

export default storage;
