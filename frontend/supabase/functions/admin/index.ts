import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyAdmin(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data } = await adminClient.auth.getUser(token);
  if (!data.user) return null;
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") return null;
  return data.user.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const userId = await verifyAdmin(req.headers.get("Authorization"));
    if (!userId) {
      return json({ error: "غير مصرح" }, 403);
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").filter(Boolean).pop() || "";
    const method = req.method;

    // GET /admin -> dashboard stats
    if (action === "admin" && method === "GET") {
      const [adsCount, activeAdsCount, usersCount, reportsCount] = await Promise.all([
        adminClient.from("ads").select("id", { count: "exact", head: true }),
        adminClient.from("ads").select("id", { count: "exact", head: true }).eq("status", "active").gt("expires_at", new Date().toISOString()),
        adminClient.from("profiles").select("id", { count: "exact", head: true }),
        adminClient.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);

      return json({
        totalAds: adsCount.count ?? 0,
        activeAds: activeAdsCount.count ?? 0,
        totalUsers: usersCount.count ?? 0,
        openReports: reportsCount.count ?? 0,
      });
    }

    // GET /admin/listings -> all listings with seller info
    if (action === "listings" && method === "GET") {
      const { data, error } = await adminClient
        .from("ads")
        .select(`
          id, title, category, province, city, status, created_at, expires_at,
          profiles:seller_id (username, full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) return json({ error: "تعذر تحميل الإعلانات" }, 500);
      return json({ listings: data ?? [] });
    }

    // GET /admin/reports -> all reports with ad info
    if (action === "reports" && method === "GET") {
      const { data, error } = await adminClient
        .from("reports")
        .select(`
          id, reason, description, status, created_at,
          ads:ad_id (id, title)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) return json({ error: "تعذر تحميل البلاغات" }, 500);
      return json({ reports: data ?? [] });
    }

    // DELETE /admin/listings/:id -> delete any ad
    if (action === "listings" && method === "DELETE") {
      const body = await req.json().catch(() => ({}));
      const { id } = body as { id: string };
      if (!id) return json({ error: "معرف الإعلان مطلوب" }, 400);
      const { error } = await adminClient.from("ads").delete().eq("id", id);
      if (error) return json({ error: "تعذر حذف الإعلان" }, 500);
      return json({ ok: true });
    }

    // PATCH /admin/reports/:id -> update report status
    if (action === "reports" && method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const { id, status } = body as { id: string; status: string };
      if (!id || !status) return json({ error: "معرف البلاغ والحالة مطلوبان" }, 400);
      const { error } = await adminClient.from("reports").update({ status }).eq("id", id);
      if (error) return json({ error: "تعذر تحديث البلاغ" }, 500);
      return json({ ok: true });
    }

    return json({ error: "إجراء غير معروف" }, 400);
  } catch (err) {
    return json({ error: "خطأ في الخادم" }, 500);
  }
});
