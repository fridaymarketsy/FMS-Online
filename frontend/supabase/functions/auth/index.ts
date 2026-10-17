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

interface RegisterBody {
  username: string;
  password: string;
  fullName: string;
  surname?: string;
  phone: string;
  secondaryPhone?: string;
  province: string;
  city: string;
  approximateLocation: string;
}

interface LoginBody {
  username: string;
  password: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").filter(Boolean).pop() || "";
    const body = await req.json().catch(() => ({}));

    if (action === "register") {
      const {
        username, password, fullName, surname, phone,
        secondaryPhone, province, city, approximateLocation,
      } = body as RegisterBody;

      if (!username || !password || !fullName || !phone || !province || !approximateLocation) {
        return json({ error: "جميع الحقول المطلوبة يجب تعبئتها" }, 400);
      }
      if (password.length < 6) {
        return json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, 400);
      }

      const cleanUsername = username.trim().toLowerCase();

      // Check username uniqueness
      const { data: existing } = await adminClient
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .maybeSingle();

      if (existing) {
        return json({ error: "اسم المستخدم محجوز مسبقاً" }, 409);
      }

      // Create auth user with synthetic email
      const syntheticEmail = `${cleanUsername}@friday-market.local`;
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
        user_metadata: { username: cleanUsername },
      });

      if (authError) {
        if (authError.message.includes("already been registered")) {
          return json({ error: "اسم المستخدم محجوز مسبقاً" }, 409);
        }
        return json({ error: "تعذر إنشاء الحساب" }, 500);
      }

      const userId = authData.user.id;

      // Insert profile
      const { error: profileError } = await adminClient.from("profiles").insert({
        id: userId,
        username: cleanUsername,
        full_name: fullName.trim(),
        surname: surname?.trim() || null,
        phone: phone.trim(),
        secondary_phone: secondaryPhone?.trim() || null,
        province: province.trim(),
        city: city?.trim() || approximateLocation.trim(),
        approximate_location: approximateLocation.trim(),
        role: "user",
      });

      if (profileError) {
        // Clean up orphaned auth user
        await adminClient.auth.admin.deleteUser(userId);
        return json({ error: "تعذر إكمال إنشاء الحساب" }, 500);
      }

      // Sign in to get session
      const { data: sessionData, error: sessionError } = await adminClient.auth.signInWithPassword({
        email: syntheticEmail,
        password,
      });

      if (sessionError || !sessionData.session) {
        return json({ error: "تم إنشاء الحساب ولكن تعذر تسجيل الدخول تلقائياً" }, 500);
      }

      return json({
        user: {
          id: userId,
          username: cleanUsername,
          fullName: fullName.trim(),
          surname: surname?.trim() || null,
          phone: phone.trim(),
          secondaryPhone: secondaryPhone?.trim() || null,
          province: province.trim(),
          city: city?.trim() || approximateLocation.trim(),
          approximateLocation: approximateLocation.trim(),
          role: "user",
          createdAt: new Date().toISOString(),
        },
        session: sessionData.session,
      });
    }

    if (action === "login") {
      const { username, password } = body as LoginBody;

      if (!username || !password) {
        return json({ error: "أدخل اسم المستخدم وكلمة المرور" }, 400);
      }

      const cleanUsername = username.trim().toLowerCase();
      const syntheticEmail = `${cleanUsername}@friday-market.local`;

      const { data: sessionData, error: sessionError } = await adminClient.auth.signInWithPassword({
        email: syntheticEmail,
        password,
      });

      if (sessionError || !sessionData.session) {
        return json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, 401);
      }

      const { data: profile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("id", sessionData.user.id)
        .maybeSingle();

      if (!profile) {
        return json({ error: "الملف الشخصي غير موجود" }, 404);
      }

      return json({
        user: {
          id: profile.id,
          username: profile.username,
          fullName: profile.full_name,
          surname: profile.surname,
          phone: profile.phone,
          secondaryPhone: profile.secondary_phone,
          province: profile.province,
          city: profile.city,
          approximateLocation: profile.approximate_location,
          role: profile.role,
          createdAt: profile.created_at,
        },
        session: sessionData.session,
      });
    }

    if (action === "change-password") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "غير مصرح" }, 401);
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await adminClient.auth.getUser(token);
      if (!userData.user) return json({ error: "غير مصرح" }, 401);

      const { currentPassword, newPassword } = body as { currentPassword: string; newPassword: string };
      if (!currentPassword || !newPassword) {
        return json({ error: "أدخل كلمة المرور الحالية والجديدة" }, 400);
      }
      if (newPassword.length < 6) {
        return json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" }, 400);
      }

      // Verify current password by signing in
      const { data: profile } = await adminClient
        .from("profiles")
        .select("username")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (!profile) return json({ error: "الملف غير موجود" }, 404);

      const syntheticEmail = `${profile.username}@friday-market.local`;
      const { error: verifyError } = await adminClient.auth.signInWithPassword({
        email: syntheticEmail,
        password: currentPassword,
      });
      if (verifyError) return json({ error: "كلمة المرور الحالية غير صحيحة" }, 401);

      // Update password
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        userData.user.id,
        { password: newPassword }
      );
      if (updateError) return json({ error: "تعذر تغيير كلمة المرور" }, 500);

      return json({ ok: true });
    }

    return json({ error: "إجراء غير معروف" }, 400);
  } catch (err) {
    return json({ error: "خطأ في الخادم" }, 500);
  }
});
