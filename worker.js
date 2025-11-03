export default {
  async fetch(request, env) {
    // إعداد CORS للسماح من أي دومين
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // ✅ رد سريع لطلبات التحقق من CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    try {
      // ✅ جلب كل البيانات من قاعدة D1
      if (request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM terms ORDER BY created_at DESC;"
        ).all();

        // لو مافيه بيانات نرجع مصفوفة فاضية
        return new Response(JSON.stringify(results || []), { headers });
      }

      // ✅ إضافة أو تحديث بيانات جديدة
      if (request.method === "POST") {
        const data = await request.json();
        const { term, meaning, dialect, category, response, understanding } = data;

        if (!term || !meaning) {
          return new Response(JSON.stringify({ error: "❌ البيانات غير مكتملة" }), {
            status: 400,
            headers,
          });
        }

        // إدخال في قاعدة D1
        await env.DB.prepare(
          `INSERT INTO terms (term, meaning, dialect, category, response, understanding, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'));`
        )
          .bind(term, meaning, dialect, category, response, understanding)
          .run();

        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // ✅ اختبار جاهزية السيرفر
      return new Response(JSON.stringify({ message: "⚙️ السيرفر يعمل بنجاح" }), {
        headers,
      });
    } catch (err) {
      // ✅ معالجة الأخطاء العامة
      return new Response(
        JSON.stringify({
          error: "حدث خطأ في المعالجة ⚠️",
          details: err.message,
        }),
        { status: 500, headers }
      );
    }
  },
};
