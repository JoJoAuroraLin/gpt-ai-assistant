import { Pool } from 'pg';

class Storage {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, 
      },
    });
  }

  async initialize() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          user_message TEXT NOT NULL,
          ai_reply TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Database initialized successfully.');
    } catch (err) {
      console.error('Error initializing database:', err.message);
    }
  }

  /**
   * 儲存對話
   * @param {string} userId 使用者 ID
   * @param {string} userMessage 使用者訊息
   * @param {string} aiReply AI 的回應
   */
  async saveConversation(userId, userMessage, aiReply) {
    try {
      const query = `
        INSERT INTO conversations (user_id, user_message, ai_reply)
        VALUES ($1, $2, $3)
      `;
      await this.pool.query(query, [userId, userMessage, aiReply]);
      console.log('Conversation saved successfully.');
    } catch (err) {
      console.error('Error saving conversation:', err.message);
    }
  }

  /**
   * 獲取最近的對話
   * @param {number} limit 限制返回的記錄數量
   * @returns {Promise<Array>}
   */
  async getRecentConversations(limit = 10) {
    try {
      const result = await this.pool.query(`
        SELECT * FROM conversations
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);
      return result.rows;
    } catch (err) {
      console.error('Error fetching conversations:', err.message);
      return [];
    }
  }
}

const storage = new Storage();

export default storage;
