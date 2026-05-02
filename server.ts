import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";

const { Pool } = pg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_dont_use_in_prod";
const ADMIN_USER = process.env.ADMIN_USER || "1100admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1100admin11001111";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
}

interface Order {
  id: string;
  items: { id: string; name: string; quantity: number; price: number }[];
  total: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerTelegramId?: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
}

// Database Initialization
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Create Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price DOUBLE PRECISION NOT NULL,
        description TEXT,
        image TEXT,
        category_id TEXT REFERENCES categories(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        items JSONB NOT NULL,
        total DOUBLE PRECISION NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_address TEXT NOT NULL,
        customer_telegram_id TEXT,
        status TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS telegram_users (
        username TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // End of table creation

    // Check if categories exist
    const { rowCount } = await client.query("SELECT 1 FROM categories LIMIT 1");
    if (rowCount === 0) {
      console.log("Seeding database with default products and categories...");
      
      const categories = [
        { id: "cat_1", name: "إلكترونيات" },
        { id: "cat_2", name: "ملابس وموضة" },
        { id: "cat_3", name: "المنزل والمطبخ" },
        { id: "cat_4", name: "الجمال والعناية" },
        { id: "cat_5", name: "رياضة ولياقة" },
        { id: "cat_6", name: "كتب وألعاب" },
        { id: "cat_7", name: "مستلزمات الحيوانات" }
      ];

      for (const cat of categories) {
        await client.query("INSERT INTO categories (id, name) VALUES ($1, $2)", [cat.id, cat.name]);
      }

      const products = [
        // Electronics
        { id: "p1_1", name: "ساعة ذكية الترا", price: 299, description: "شاشة أموليد متطورة مع نظام تتبع الصحة العالمي.", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80", categoryId: "cat_1" },
        { id: "p1_2", name: "سماعات عازلة للضوضاء", price: 150, description: "تجربة صوتية نقية مع تقنية إلغاء الضوضاء النشطة.", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80", categoryId: "cat_1" },
        // Fashion
        { id: "p2_1", name: "قميص صيفي كاجوال", price: 35, description: "قطن 100%، مريح وجيد التهوية.", image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&q=80", categoryId: "cat_2" },
        // Home
        { id: "p3_1", name: "طقم تقديم قهوة", price: 45, description: "سيراميك عالي الجودة بتصميم عربي أصيل.", image: "https://images.unsplash.com/photo-1544787210-282744a69f3a?w=500&q=80", categoryId: "cat_3" },
        // Books & Games
        { id: "p6_1", name: "كتاب أسرار النجاح", price: 20, description: "دليل شامل لتحقيق أهدافك وتطوير ذاتك.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&q=80", categoryId: "cat_6" },
        { id: "p6_2", name: "لعبة الشطرنج الخشبية", price: 45, description: "شطرنج مصنوع يدوياً من خشب الزان الفاخر.", image: "https://images.unsplash.com/photo-1529692236671-f1f6e9460272?w=500&q=80", categoryId: "cat_6" },
        { id: "p6_3", name: "رواية عالم جديد", price: 15, description: "رواية خيال علمي تأخذك في رحلة عبر المجرات.", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&q=80", categoryId: "cat_6" },
        // Pets
        { id: "p7_1", name: "طوق للقطط ذكي", price: 30, description: "طوق مزود بنظام تتبع GPS وإضاءة ليلية.", image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&q=80", categoryId: "cat_7" },
        { id: "p7_2", name: "طعام كلاب فاخر", price: 60, description: "وجبة متكاملة غنية بالفيتامينات والمعادن.", image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&q=80", categoryId: "cat_7" },
        { id: "p7_3", name: "سرير حيوانات ناعم", price: 40, description: "سرير مريح جداً يوفر دفء مثالي لحيوانك الأليف.", image: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&q=80", categoryId: "cat_7" }
      ];

      for (const prod of products) {
        await client.query(
          "INSERT INTO products (id, name, price, description, image, category_id) VALUES ($1, $2, $3, $4, $5, $6)",
          [prod.id, prod.name, prod.price, prod.description, prod.image, prod.categoryId]
        );
      }
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error initializing database:", e);
  } finally {
    client.release();
  }
}

async function startServer() {
  await initDb();

  const app = express();
  const PORT = process.env.PORT || 3000;

  // 1. Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, // Vite needs this for dev
  }));

  // 2. Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/", limiter);

  // Stricter limit for login and orders
  const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 requests per hour
    message: "Security limit reached. Please try again later.",
  });
  app.use("/api/admin/login", strictLimiter);
  app.use("/api/orders", strictLimiter);

  app.use(express.json());

  // API Routes
  app.get("/api/products", async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT p.id, p.name, p.price, p.description, p.image, p.category_id as "categoryId"
        FROM products p
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM categories");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Login Endpoint (JWT based)
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: "24h" });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, error: "Invalid credentials" });
    }
  });

  // Telegram Webhook Handler
  app.post("/api/telegram/webhook", async (req, res) => {
    const { message, callback_query } = req.body;
    
    // 1. Capture User ID from Message
    if (message && message.from && message.from.username) {
      const username = '@' + message.from.username;
      const chatId = message.chat.id.toString();
      try {
        await pool.query(
          "INSERT INTO telegram_users (username, chat_id) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET chat_id = $2, updated_at = CURRENT_TIMESTAMP",
          [username, chatId]
        );
      } catch (err) {
        console.error("Failed to save telegram user:", err);
      }
    }

    if (!callback_query) return res.sendStatus(200);

    const data = callback_query.data; 
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (data.startsWith("status_") && botToken) {
      const parts = data.split("_");
      const status = parts[1] as any;
      const orderId = parts[2];

      try {
        const { rows } = await pool.query("SELECT * FROM orders WHERE id = $1", [orderId]);
        const order = rows[0];

      if (order) {
        const oldStatus = order.status;
        await pool.query("UPDATE orders SET status = $1 WHERE id = $2", [status, orderId]);

        let statusAr = "";
        switch(status) {
          case 'processing': statusAr = "قيد التنفيذ \u{1F6E0}"; break;
          case 'shipped': statusAr = "تم الشحن \u{1F69A}"; break;
          case 'delivered': statusAr = "تم التوصيل \u{2705}"; break;
          case 'cancelled': statusAr = "تم الإلغاء \u{274C}"; break;
          default: statusAr = "قيد الانتظار \u{23F3}";
        }

        // Acknowledge callback
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callback_query.id,
            text: `تم تغيير الحالة إلى: ${statusAr}`,
          }),
        }).catch(console.error);

        // Update Admin Message
        const updatedText = callback_query.message.text + `\n\n\u{26A0} *تحديث الحالية:* ${statusAr}`;
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: callback_query.message.chat.id,
            message_id: callback_query.message.message_id,
            text: updatedText,
            parse_mode: "Markdown",
            reply_markup: callback_query.message.reply_markup
          }),
        }).catch(console.error);

        // Notify Customer
        let targetChatId = order.customer_telegram_id;
        if (targetChatId && targetChatId.startsWith('@')) {
          const { rows: userRows } = await pool.query("SELECT chat_id FROM telegram_users WHERE username = $1", [targetChatId]);
          if (userRows.length > 0) targetChatId = userRows[0].chat_id;
        }

        if (targetChatId && status !== oldStatus) {
          const customerMsg = `\u{1F514} *تحديث لطلبك #${orderId.slice(-6)}*\nحالة الطلب الآن هي: *${statusAr}*`;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: targetChatId,
              text: customerMsg,
              parse_mode: "Markdown",
            }),
          }).catch(console.error);
        }
      }
      } catch (err) {
        console.error("Webhook error:", err);
      }
    }
    res.sendStatus(200);
  });

  const adminAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      (req as any).admin = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // Admin Protected Routes
  app.post("/api/admin/products", adminAuth, async (req, res) => {
    try {
      const { name, price, description, image, categoryId } = req.body;
      const id = Date.now().toString();
      const { rows } = await pool.query(
        "INSERT INTO products (id, name, price, description, image, category_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [id, name, price, description, image, categoryId]
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.delete("/api/admin/products/:id", adminAuth, async (req, res) => {
    try {
      await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/admin/categories", adminAuth, async (req, res) => {
    try {
      const { name } = req.body;
      const id = Date.now().toString();
      const { rows } = await pool.query(
        "INSERT INTO categories (id, name) VALUES ($1, $2) RETURNING *",
        [id, name]
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.delete("/api/admin/categories/:id", adminAuth, async (req, res) => {
    try {
      await pool.query("DELETE FROM categories WHERE id = $1", [req.params.id]);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/admin/orders", adminAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT id, items, total, customer_name as "customerName", 
               customer_phone as "customerPhone", customer_address as "customerAddress", 
               customer_telegram_id as "customerTelegramId", status, created_at as "createdAt"
        FROM orders ORDER BY created_at DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.patch("/api/admin/orders/:id/status", adminAuth, async (req, res) => {
    try {
      const { status } = req.body;
      const { rows } = await pool.query("UPDATE orders SET status = $1 WHERE id = $2 RETURNING *", [status, req.params.id]);
      const order = rows[0];
      
      if (order) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        let targetChatId = order.customer_telegram_id;
        
        if (targetChatId && targetChatId.startsWith('@')) {
          const { rows: userRows } = await pool.query("SELECT chat_id FROM telegram_users WHERE username = $1", [targetChatId]);
          if (userRows.length > 0) targetChatId = userRows[0].chat_id;
        }

        if (botToken && targetChatId) {
          let statusAr = "";
          switch(status) {
            case 'processing': statusAr = "قيد التنفيذ \u{1F6E0}"; break;
            case 'shipped': statusAr = "تم الشحن \u{1F69A}"; break;
            case 'delivered': statusAr = "تم التوصيل \u{2705}"; break;
            case 'cancelled': statusAr = "تم الإلغاء \u{274C}"; break;
            default: statusAr = "قيد الانتظار \u{23F3}";
          }

          const message = `
\u{1F514} *تحديث لطلبك #${order.id.slice(-6)}*
-----------------
حالة الطلب الآن: *${statusAr}*

شكراً لتسوقك معنا!
          `;

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: targetChatId,
              text: message,
              parse_mode: "Markdown",
            }),
          }).catch(console.error);
        }
        res.json(order);
      } else {
        res.status(404).json({ error: "Order not found" });
      }
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/admin/setup-webhook", adminAuth, async (req, res) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const appUrl = req.body.url;

    if (!botToken) {
      return res.status(400).json({ success: false, error: "Bot Token is missing" });
    }

    try {
      const webhookUrl = `${appUrl}/api/telegram/webhook`;
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { items, total, customerName, customerPhone, customerAddress, customerTelegramId } = req.body;
      const id = Date.now().toString();
      const status = "pending";
      
      const { rows } = await pool.query(
        `INSERT INTO orders (id, items, total, customer_name, customer_phone, customer_address, customer_telegram_id, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [id, JSON.stringify(items), total, customerName, customerPhone, customerAddress, customerTelegramId, status]
      );
      const order = rows[0];

      // Telegram Notifications
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

      if (botToken && adminChatId) {
        const message = `
\u{1F4E6} *طلب جديد (#${id.slice(-6)})*
-----------------
\u{1F464} العميل: ${customerName}
\u{1F4DE} الهاتف: ${customerPhone}
\u{1F4CC} العنوان: ${customerAddress}

\u{1F6D2} المنتجات:
${items.map((item: any) => `- ${item.name} (x${item.quantity})`).join("\n")}

\u{1F4B0} المجموع: ${total} $
        `;

        const inlineKeyboard = {
          inline_keyboard: [
            [
              { text: "\u{1F6E0} تجهيز", callback_data: `status_processing_${id}` },
              { text: "\u{1F69A} شحن", callback_data: `status_shipped_${id}` }
            ],
            [
              { text: "\u{2705} توصيل", callback_data: `status_delivered_${id}` },
              { text: "\u{274C} إلغاء", callback_data: `status_cancelled_${id}` }
            ]
          ]
        };

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: adminChatId,
            text: message,
            reply_markup: inlineKeyboard,
            parse_mode: "Markdown",
          }),
        }).catch(console.error);
      }

      // 2. Notify Customer (Initial Confirmation)
      let targetChatId = customerTelegramId;
      if (targetChatId && targetChatId.startsWith('@')) {
        const { rows: userRows } = await pool.query("SELECT chat_id FROM telegram_users WHERE username = $1", [targetChatId]);
        if (userRows.length > 0) targetChatId = userRows[0].chat_id;
      }

      if (botToken && targetChatId) {
         const welcomeMsg = `
\u{2705} *أهلاً بك! تم استلام طلبك بنجاح*
-----------------
رقم الطلب: #${id.slice(-6)}
حالة الطلب: *قيد التنفيذ \u{1F6E0}*
المجموع: ${total} $

شكراً لثقتك بنا، سنقوم بإرسال تنبيه لك عند شحن الطلب أو تحديث حالته.
         `;
         await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             chat_id: targetChatId,
             text: welcomeMsg,
             parse_mode: "Markdown",
           }),
         }).catch(console.error);
      }

      res.json(order);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
