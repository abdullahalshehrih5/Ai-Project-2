export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ✅ ترويسات CORS العامة
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    };

    // ✅ معالجة OPTIONS (مطلوبة لـ CORS)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ✅ نقطة اختبار
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        JSON.stringify({ status: "✅ السيرفر جاهز للعمل" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ إضافة مصطلح جديد
    if (url.pathname === "/add" && request.method === "POST") {
      try {
        const data = await request.json();
        const { id, term, meaning, dialect, category, response, understanding, timestamp } = data;

        if (!term || !meaning) {
          return new Response(
            JSON.stringify({ success: false, error: "الحقول term و meaning مطلوبة" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "❌ لم يتم العثور على قاعدة بيانات D1" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await env.DB.prepare(
          `INSERT INTO terms (id, term, meaning, dialect, category, response, understanding, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id || crypto.randomUUID(),
          term,
          meaning,
          dialect || "",
          category || "",
          response || "",
          understanding || "",
          timestamp || new Date().toISOString()
        ).run();

        return new Response(
          JSON.stringify({ success: true, message: "✅ تم حفظ المصطلح في قاعدة البيانات" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ✅ حذف مصطلح من قاعدة D1
    if (url.pathname === "/delete" && request.method === "DELETE") {
      try {
        const { id } = await request.json();

        if (!id) {
          return new Response(
            JSON.stringify({ success: false, error: "المعرف مفقود" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const result = await env.DB.prepare("DELETE FROM terms WHERE id = ?")
          .bind(id)
          .run();

        return new Response(
          JSON.stringify({
            success: true,
            id,
            message: "✅ تم حذف المصطلح بنجاح من قاعدة البيانات",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ✅ نقطة الدردشة (chat)
    if (url.pathname === "/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const userMessage = body.message || "";

        return new Response(
          JSON.stringify({
            success: true,
            reply: `📩 تم استقبال رسالتك: "${userMessage}" (الذكاء الاصطناعي غير مفعل حالياً)`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: "فشل تحليل بيانات الرسالة" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ✅ رد افتراضي لأي مسار آخر
    return new Response(
      JSON.stringify({ error: "❌ المسار غير معروف", path: url.pathname }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  },
};
