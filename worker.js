// worker.js - Saudi Dialects Analysis Server (Full CRUD + AI)
export default {
  async fetch(request, env) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    const url = new URL(request.url);

    try {
      // 🧠 AI Chat
      if (url.pathname === "/chat" && request.method === "POST") {
        return await handleChat(request, env, headers);
      }

      // 📥 Get all terms
      if (url.pathname === "/terms" && request.method === "GET") {
        return await handleGetTerms(env, headers);
      }

      // ➕ Add new term
      if (url.pathname === "/terms" && request.method === "POST") {
        return await handleAddTerm(request, env, headers);
      }

      // 🗑️ Delete term by ID
      if (url.pathname.startsWith("/terms/") && request.method === "DELETE") {
        const id = url.pathname.split("/")[2];
        return await handleDeleteTerm(id, env, headers);
      }

      // 🩺 Health check
      if (url.pathname === "/health" && request.method === "GET") {
        return new Response(JSON.stringify({ status: "OK", timestamp: new Date().toISOString() }), { headers });
      }

      // Default response
      return new Response(JSON.stringify({
        status: "✅ سيرفر تحليل اللهجات السعودية يعمل",
        endpoints: ["GET /terms", "POST /terms", "DELETE /terms/:id", "POST /chat", "GET /health"]
      }), { headers });

    } catch (error) {
      console.error("🔥 خطأ عام:", error);
      return new Response(JSON.stringify({ error: "حدث خطأ داخلي", details: error.message }), { status: 500, headers });
    }
  },
};

// 🧠 AI Chat
async function handleChat(request, env, headers) {
  try {
    const text = await request.text();
    if (!text) throw new Error("الطلب لا يحتوي على بيانات");

    const data = JSON.parse(text);
    const { message, provider = "openai" } = data;

    if (!message) {
      return new Response(JSON.stringify({ error: "الرسالة مطلوبة" }), { status: 400, headers });
    }

    let reply;
    let aiProvider = provider;

    // 🔹 OpenAI Provider
    if (provider === "openai") {
      if (!env.OPENAI_API_KEY) throw new Error("مفتاح OpenAI غير متوفر");

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "أنت خبير في اللهجات السعودية. قدم تحليلاً دقيقاً للمصطلحات." },
            { role: "user", content: message },
          ],
        }),
      });

      const data = await aiResponse.json();
      if (!aiResponse.ok) throw new Error(data.error?.message || "فشل الاتصال بـ OpenAI");
      reply = data.choices?.[0]?.message?.content || "⚠️ لم يتم استلام رد.";
    }

    // 🔹 Gemini Provider (Google)
    else if (provider === "gemini") {
      if (!env.GEMINI_API_KEY) throw new Error("مفتاح Gemini غير متوفر");

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `أنت خبير في اللهجات السعودية. حلّل المصطلح التالي: ${message}` }],
              },
            ],
          }),
        }
      );

      const data = await geminiResponse.json();
      if (!geminiResponse.ok) throw new Error(data.error?.message || "فشل الاتصال بـ Gemini");

      reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "⚠️ لم يتم استلام رد من Gemini.";
    }

    // 🗄️ حفظ المحادثة في قاعدة البيانات
    try {
      await env.DB.prepare(
        "INSERT INTO messages (user_msg, ai_reply, ai_provider, created_at) VALUES (?, ?, ?, datetime('now'))"
      ).bind(message, reply, aiProvider).run();
    } catch (dbError) {
      console.warn("⚠️ فشل حفظ المحادثة:", dbError);
    }

    return new Response(JSON.stringify({ reply, provider: aiProvider, success: true }), { headers });

  } catch (error) {
    console.error("🔥 خطأ في المحادثة:", error);
    return new Response(JSON.stringify({ error: "فشل في معالجة المحادثة", details: error.message }), { status: 500, headers });
  }
}

// 📥 جلب جميع المصطلحات
async function handleGetTerms(env, headers) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM dialect_terms ORDER BY created_at DESC"
    ).all();
    return new Response(JSON.stringify({ terms: results, count: results.length }), { headers });
  } catch (err) {
    console.error("❌ خطأ في جلب المصطلحات:", err);
    return new Response(JSON.stringify({ terms: [], count: 0 }), { headers });
  }
}

// ➕ إضافة مصطلح جديد
async function handleAddTerm(request, env, headers) {
  try {
    const data = await request.json();
    const { term, meaning, dialect, understanding, response, ai_provider = "openai" } = data;

    const result = await env.DB.prepare(
      `INSERT INTO dialect_terms (term, meaning, dialect, understanding, response, ai_provider, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(term, meaning, dialect, understanding, response || "", ai_provider).run();

    return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), { headers });
  } catch (err) {
    console.error("❌ خطأ في الإضافة:", err);
    return new Response(JSON.stringify({ error: "فشل في إضافة المصطلح", details: err.message }), { status: 500, headers });
  }
}

// 🗑️ حذف مصطلح من قاعدة البيانات
async function handleDeleteTerm(id, env, headers) {
  try {
    if (!id) {
      return new Response(JSON.stringify({ error: "معرّف المصطلح مفقود" }), { status: 400, headers });
    }

    const idStr = String(id); // ✅ تأكد أن المعرف نص وليس رقم

    const result = await env.DB.prepare(
      "DELETE FROM dialect_terms WHERE id = ?"
    ).bind(idStr).run();

    console.log("🧹 نتيجة الحذف:", result);

    if (!result || result.meta.changes === 0) {
      return new Response(JSON.stringify({ success: false, message: "لم يتم العثور على المصطلح أو لم يحذف" }), { status: 404, headers });
    }

    return new Response(JSON.stringify({ success: true, deleted_id: idStr }), { headers });

  } catch (err) {
    console.error("❌ خطأ في الحذف:", err);
    return new Response(JSON.stringify({ error: "فشل في حذف المصطلح", details: err.message }), { status: 500, headers });
  }
}
