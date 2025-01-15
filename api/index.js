import express from 'express';
import { handleEvents, printPrompts } from '../app/index.js';
import config from '../config/index.js';
import { validateLineSignature } from '../middleware/index.js';
import { db } from '../storage/db.js'; // 匯入資料庫連接
import { conversations } from '../storage/schema.js'; // 匯入資料表結構
import { fetchVersion, getVersion } from '../utils/index.js';

const app = express();

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// 根路徑
app.get('/', async (req, res) => {
  if (config.APP_URL) {
    res.redirect(config.APP_URL);
    return;
  }
  const currentVersion = getVersion();
  const latestVersion = await fetchVersion();
  res.status(200).send({ status: 'OK', currentVersion, latestVersion });
});

// Webhook 路徑，處理 LINE Bot 的請求
app.post(config.APP_WEBHOOK_PATH, validateLineSignature, async (req, res) => {
  try {
    // 初始化資料庫儲存
    await db.schema.createTable(conversations).ifNotExists();

    // 處理 LINE Bot 的事件
    const events = req.body.events;
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const userMessage = event.message.text;

        try {
          // 呼叫 OpenAI API 獲取回應
          const aiReply = await fetchAIReply(userMessage);

          // 儲存對話紀錄到資料庫
          await db.insert(conversations).values({
            user_id: userId,
            user_message: userMessage,
            ai_reply: aiReply,
          });

          // 回應使用者訊息
          await handleEvents([
            {
              replyToken: event.replyToken,
              message: { type: 'text', text: aiReply },
            },
          ]);
        } catch (err) {
          console.error('Error processing event:', err.message);
          res.sendStatus(500);
          return;
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error in Webhook:', err.message);
    res.sendStatus(500);
  }
  if (config.APP_DEBUG) printPrompts();
});

// 啟動伺服器
if (config.APP_PORT) {
  app.listen(config.APP_PORT, () => {
    console.log(`Server is running on port ${config.APP_PORT}`);
  });
}

export default app;

// 呼叫 OpenAI API 的函數
async function fetchAIReply(userMessage) {
  const axios = await import('axios');
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userMessage }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.choices[0].message.content;
}
