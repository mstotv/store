import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "db.json");

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

interface Database {
  products: Product[];
  categories: Category[];
  orders: Order[];
}

const DEFAULT_DB: Database = {
  products: [],
  categories: [],
  orders: [],
};

async function getDb(): Promise<Database> {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
    return DEFAULT_DB;
  }
}

async function saveDb(db: Database) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ADMIN_USER = process.env.ADMIN_USER || "1100admin";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1100admin11001111";

  // API Routes
  app.get("/api/products", async (req, res) => {
    const db = await getDb();
    res.json(db.products);
  });

  app.get("/api/categories", async (req, res) => {
    const db = await getDb();
    res.json(db.categories);
  });

  // Login Endpoint
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      res.json({ success: true, token: ADMIN_PASSWORD }); // Simple token for this demo
    } else {
      res.status(401).json({ success: false, error: "Invalid credentials" });
    }
  });

  // Middleware to check admin password
  // Telegram Webhook Handler
  app.post("/api/telegram/webhook", async (req, res) => {
    console.log("Telegram Webhook received:", JSON.stringify(req.body));
    const { callback_query } = req.body;
    if (!callback_query) return res.sendStatus(200);

    const data = callback_query.data; 
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (data.startsWith("status_") && botToken) {
      const parts = data.split("_");
      const status = parts[1] as any;
      const orderId = parts[2];

      const db = await getDb();
      const order = db.orders.find(o => o.id === orderId);

      if (order) {
        const oldStatus = order.status;
        order.status = status;
        await saveDb(db);

        let statusAr = "";
        switch(status) {
          case 'processing': statusAr = "قيد التنفيذ 🛠"; break;
          case 'shipped': statusAr = "تم الشحن 🚚"; break;
          case 'delivered': statusAr = "تم التوصيل ✅"; break;
          case 'cancelled': statusAr = "تم الإلغاء ❌"; break;
          default: statusAr = "قيد الانتظار ⏳";
        }

        // 1. Acknowledge callback (Alert in Telegram)
        try {
          await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: callback_query.id,
              text: `تم تغيير الحالة إلى: ${statusAr}`,
            }),
          });
        } catch (err) {
          console.error("Failed to answer callback", err);
        }

        // 2. Update Admin Message (Optional but good: remove buttons or change text)
        try {
          const updatedText = callback_query.message.text + `\n\n⚠️ *تحديث الحالية:* ${statusAr}`;
          await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: callback_query.message.chat.id,
              message_id: callback_query.message.message_id,
              text: updatedText,
              parse_mode: "Markdown",
              reply_markup: callback_query.message.reply_markup // Keep buttons
            }),
          });
        } catch (err) {
          console.error("Failed to update admin message text", err);
        }

        // 3. Notify Customer
        if (order.customerTelegramId && status !== oldStatus) {
          const customerMsg = `🔔 *تحديث لطلبك #${order.id.slice(-6)}*\nحالة الطلب الآن هي: *${statusAr}*`;
          try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: order.customerTelegramId,
                text: customerMsg,
                parse_mode: "Markdown",
              }),
            });
          } catch (err) {
            console.error("Failed to notify customer from webhook", err);
          }
        }
      }
    }

    res.sendStatus(200);
  });

  const adminAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers["x-admin-password"];
    if (authHeader === ADMIN_PASSWORD) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // Admin Protected Routes
  app.post("/api/admin/products", adminAuth, async (req, res) => {
    const db = await getDb();
    const newProduct = { ...req.body, id: Date.now().toString() };
    db.products.push(newProduct);
    await saveDb(db);
    res.json(newProduct);
  });

  app.delete("/api/admin/products/:id", adminAuth, async (req, res) => {
    const db = await getDb();
    db.products = db.products.filter((p) => p.id !== req.params.id);
    await saveDb(db);
    res.sendStatus(200);
  });

  app.post("/api/admin/categories", adminAuth, async (req, res) => {
    const db = await getDb();
    const newCategory = { ...req.body, id: Date.now().toString() };
    db.categories.push(newCategory);
    await saveDb(db);
    res.json(newCategory);
  });

  app.delete("/api/admin/categories/:id", adminAuth, async (req, res) => {
    const db = await getDb();
    db.categories = db.categories.filter((c) => c.id !== req.params.id);
    await saveDb(db);
    res.sendStatus(200);
  });

  app.get("/api/admin/orders", adminAuth, async (req, res) => {
    const db = await getDb();
    res.json(db.orders);
  });

  app.patch("/api/admin/orders/:id/status", adminAuth, async (req, res) => {
    const db = await getDb();
    const { status } = req.body;
    const order = db.orders.find((o) => o.id === req.params.id);
    
    if (order) {
      order.status = status;
      await saveDb(db);

      // Notify Customer via Telegram IF they provided a Chat ID
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken && order.customerTelegramId) {
        let statusAr = "";
        switch(status) {
          case 'processing': statusAr = "قيد التنفيذ 🛠"; break;
          case 'shipped': statusAr = "تم الشحن 🚚"; break;
          case 'delivered': statusAr = "تم التوصيل ✅"; break;
          case 'cancelled': statusAr = "تم الإلغاء ❌"; break;
          default: statusAr = "قيد الانتظار ⏳";
        }

        const message = `
🔔 *تحديث لطلبك #${order.id.slice(-6)}*
-----------------
حالة الطلب الآن: *${statusAr}*

شكراً لتسوقك معنا!
        `;

        try {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: order.customerTelegramId,
              text: message,
              parse_mode: "Markdown",
            }),
          });
        } catch (err) {
          console.error("Failed to notify customer", err);
        }
      }

      res.json(order);
    } else {
      res.status(404).json({ error: "Order not found" });
    }
  });

  // Setup Webhook Endpoint
  app.post("/api/admin/setup-webhook", adminAuth, async (req, res) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const appUrl = req.body.url; // We'll send this from the frontend

    if (!botToken) {
      return res.status(400).json({ success: false, error: "Bot Token is missing in environment variables" });
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

  // Order Placement & Telegram Notification
  app.post("/api/orders", async (req, res) => {
    const db = await getDb();
    const order: Order = {
      ...req.body,
      id: Date.now().toString(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    db.orders.push(order);
    await saveDb(db);

    // Send to Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    // 1. Notify Admin
    if (botToken && adminChatId) {
      const message = `
📦 *طلب جديد (#${order.id.slice(-6)})*
-----------------
👤 العميل: ${order.customerName}
📞 الهاتف: ${order.customerPhone}
📍 العنوان: ${order.customerAddress}

🛒 المنتجات:
${order.items.map((item) => `- ${item.name} (x${item.quantity})`).join("\n")}

💰 المجموع: ${order.total} $
      `;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "🛠 تجهيز", callback_data: `status_processing_${order.id}` },
            { text: "🚚 شحن", callback_data: `status_shipped_${order.id}` }
          ],
          [
            { text: "✅ توصيل", callback_data: `status_delivered_${order.id}` },
            { text: "❌ إلغاء", callback_data: `status_cancelled_${order.id}` }
          ]
        ]
      };

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: adminChatId,
            text: message,
            reply_markup: inlineKeyboard,
            parse_mode: "Markdown",
          }),
        });
      } catch (err) {
        console.error("Failed to send admin telegram message", err);
      }
    }

    // 2. Notify Customer (Initial Confirmation)
    if (botToken && order.customerTelegramId) {
       const welcomeMsg = `
✅ *أهلاً بك! تم استلام طلبك بنجاح*
-----------------
رقم الطلب: #${order.id.slice(-6)}
حالة الطلب: *قيد التنفيذ 🛠*
المجموع: ${order.total} $

شكراً لثقتك بنا، سنقوم بإرسال تنبيه لك عند شحن الطلب أو تحديث حالته.
       `;
       try {
         await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             chat_id: order.customerTelegramId,
             text: welcomeMsg,
             parse_mode: "Markdown",
           }),
         });
       } catch (err) {
         console.error("Failed to send customer confirmation", err);
       }
    }

    res.json(order);
  });

  // Vite middleware for development
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
