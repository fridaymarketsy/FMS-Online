const { supabase, createIsolatedAuthClient } = require('../config/supabase');
const { toMarketUser } = require('../models/profile.model');
const { toApiAd } = require('../models/ad.model');
const { httpError, logError } = require('../utils/errors');
const { deleteImages } = require('./upload.service');

const AD_SELECT = '*, profiles!ads_seller_id_fkey(*)';
const SYNTHETIC_EMAIL_DOMAIN = '@friday-market.local';

function ensureNoError(error, message) {
  if (error) {
    const wrapped = httpError(500, message);
    wrapped.cause = error;
    throw wrapped;
  }
}

async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  ensureNoError(error, 'تعذر تحميل بيانات الحساب');
  return data;
}

async function getAdRow(id) {
  const { data, error } = await supabase.from('ads').select(AD_SELECT).eq('id', id).maybeSingle();
  ensureNoError(error, 'تعذر تحميل الإعلان');
  return data;
}

async function requireOwnedAd(id, userId) {
  const row = await getAdRow(id);
  if (!row || row.seller_id !== userId) throw httpError(404, 'الإعلان غير موجود');
  return row;
}

async function requireAdmin(userId) {
  const profile = await getProfile(userId);
  if (!profile || profile.role !== 'admin') throw httpError(403, 'غير مصرح');
}

async function login({ username, password }) {
  if (!username?.trim() || !password) throw httpError(400, 'أدخل اسم المستخدم وكلمة المرور');
  const cleanUsername = username.trim().toLowerCase();
  const authClient = createIsolatedAuthClient();
  const { data, error } = await authClient.auth.signInWithPassword({
    email: `${cleanUsername}${SYNTHETIC_EMAIL_DOMAIN}`,
    password,
  });
  if (error) {
    if (error.status === 400 || error.code === 'invalid_credentials') {
      throw httpError(401, 'اسم المستخدم أو كلمة المرور غير صحيحة');
    }
    const authError = httpError(500, 'تعذر تسجيل الدخول');
    authError.cause = error;
    throw authError;
  }
  if (!data.session) throw httpError(401, 'اسم المستخدم أو كلمة المرور غير صحيحة');
  const profile = await getProfile(data.user.id);
  if (!profile) throw httpError(404, 'الملف الشخصي غير موجود');
  return { user: toMarketUser(profile), session: data.session };
}

async function register(body) {
  const username = body.username.trim().toLowerCase();
  const { data: existing, error: lookupError } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
  ensureNoError(lookupError, 'تعذر التحقق من اسم المستخدم');
  if (existing) throw httpError(409, 'اسم المستخدم محجوز مسبقاً');

  const email = `${username}${SYNTHETIC_EMAIL_DOMAIN}`;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (createError || !created.user) {
    if (createError?.message.includes('already been registered')) throw httpError(409, 'اسم المستخدم محجوز مسبقاً');
    const createUserError = httpError(500, 'تعذر إنشاء الحساب');
    if (createError) createUserError.cause = createError;
    throw createUserError;
  }

  const profileData = {
    id: created.user.id,
    username,
    full_name: body.fullName.trim(),
    surname: body.surname?.trim() || null,
    phone: body.phone.trim(),
    secondary_phone: body.secondaryPhone?.trim() || null,
    province: body.province.trim(),
    city: body.city?.trim() || body.approximateLocation.trim(),
    approximate_location: body.approximateLocation.trim(),
    role: 'user',
  };
  const { data: profile, error: profileError } = await supabase.from('profiles').insert(profileData).select('*').single();
  if (profileError) {
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(created.user.id);
    if (cleanupError) {
      logError('auth.register.cleanup', cleanupError);
    }
    const profileCreationError = httpError(500, 'تعذر إكمال إنشاء الحساب');
    profileCreationError.cause = profileError;
    throw profileCreationError;
  }

  const authClient = createIsolatedAuthClient();
  const { data: signedIn, error: signInError } = await authClient.auth.signInWithPassword({ email, password: body.password });
  if (signInError || !signedIn.session) {
    const autoSignInError = httpError(500, 'تم إنشاء الحساب ولكن تعذر تسجيل الدخول تلقائياً');
    if (signInError) autoSignInError.cause = signInError;
    throw autoSignInError;
  }
  return { user: toMarketUser(profile), session: signedIn.session };
}

async function changePassword(userId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) throw httpError(400, 'أدخل كلمة المرور الحالية والجديدة');
  if (newPassword.length < 6) throw httpError(400, 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
  const profile = await getProfile(userId);
  if (!profile) throw httpError(404, 'الملف غير موجود');

  const authClient = createIsolatedAuthClient();
  const { error: verifyError } = await authClient.auth.signInWithPassword({
    email: `${profile.username}${SYNTHETIC_EMAIL_DOMAIN}`,
    password: currentPassword,
  });
  if (verifyError) throw httpError(401, 'كلمة المرور الحالية غير صحيحة');
  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
  ensureNoError(error, 'تعذر تغيير كلمة المرور');
  return { ok: true };
}

async function listAds(query) {
  let request = supabase.from('ads').select(AD_SELECT)
    .eq('status', 'active').gt('expires_at', new Date().toISOString());
  if (query.q) {
    const search = String(query.q).slice(0, 100).replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();
    if (search) request = request.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (query.category) request = request.eq('category', query.category);
  if (query.city) request = request.eq('province', query.city);
  if (query.sub) request = request.eq('subcategory', query.sub);
  if (query.condition) request = request.eq('condition', query.condition);
  if (query.min !== undefined && Number.isFinite(Number(query.min))) request = request.gte('price', Number(query.min));
  if (query.max !== undefined && Number.isFinite(Number(query.max))) request = request.lte('price', Number(query.max));
  if (query.jobStatus) request = request.eq('job_status', query.jobStatus);
  request = query.sort === 'low'
    ? request.order('price', { ascending: true })
    : query.sort === 'high'
      ? request.order('price', { ascending: false })
      : request.order('created_at', { ascending: false });
  const { data, error } = await request.limit(200);
  ensureNoError(error, 'تعذر تحميل الإعلانات');
  return { ads: (data || []).map(toApiAd) };
}

async function getAd(id, user) {
  const row = await getAdRow(id);
  if (!row) throw httpError(404, 'تعذر تحميل الإعلان');
  const isPublic = row.status === 'active' && new Date(row.expires_at) > new Date();
  if (!isPublic && row.seller_id !== user?.id) throw httpError(404, 'تعذر تحميل الإعلان');
  return { ad: toApiAd(row) };
}

async function incrementViews(id) {
  const { error } = await supabase.rpc('increment_views', { ad_id: id });
  ensureNoError(error, 'تعذر تحديث عدد المشاهدات');
}

async function myAds(userId) {
  const { data, error } = await supabase.from('ads').select(AD_SELECT).eq('seller_id', userId).order('created_at', { ascending: false });
  ensureNoError(error, 'تعذر تحميل إعلاناتك');
  const all = (data || []).map(toApiAd);
  const now = Date.now();
  return {
    active: all.filter((ad) => ad.status === 'active' && new Date(ad.expiresAt).getTime() > now),
    expired: all.filter((ad) => !(ad.status === 'active' && new Date(ad.expiresAt).getTime() > now)),
  };
}

async function createAd(userId, body) {
  const profile = await getProfile(userId);
  if (!profile) throw httpError(404, 'الملف الشخصي غير موجود');
  const { data, error } = await supabase.from('ads').insert({
    seller_id: userId,
    title: body.title.trim(),
    description: body.description.trim(),
    category: body.category,
    subcategory: body.subcategory || null,
    condition: body.condition,
    price: Number(body.price),
    images: body.images,
    contact_phone: body.contactPhone,
    province: profile.province,
    city: profile.city,
    approximate_location: profile.approximate_location,
    status: 'active',
    job_status: body.category === 'وظائف' ? (body.jobStatus || 'available') : null,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }).select(AD_SELECT).single();
  ensureNoError(error, 'تعذر نشر الإعلان');
  return { ad: toApiAd(data) };
}

async function deleteAd(id, userId) {
  const ad = await requireOwnedAd(id, userId);
  const { error } = await supabase.from('ads').delete().eq('id', id).eq('seller_id', userId);
  ensureNoError(error, 'تعذر حذف الإعلان');
  await deleteImages(ad.images || [], userId);
  return { ok: true };
}

async function renewAd(id, userId) {
  await requireOwnedAd(id, userId);
  const { data, error } = await supabase.from('ads').update({
    status: 'active',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('seller_id', userId).select(AD_SELECT).single();
  ensureNoError(error, 'تعذر تجديد الإعلان');
  return { ad: toApiAd(data) };
}

async function updateAd(id, userId, body) {
  await requireOwnedAd(id, userId);
  const columns = { title: 'title', description: 'description', category: 'category', subcategory: 'subcategory', condition: 'condition', price: 'price', jobStatus: 'job_status' };
  const changes = { updated_at: new Date().toISOString() };
  for (const [field, column] of Object.entries(columns)) {
    if (body[field] !== undefined) changes[column] = field === 'price' ? Number(body[field]) : body[field] || (field === 'subcategory' || field === 'jobStatus' ? null : body[field]);
  }
  if (changes.title && changes.title.length > 50) throw httpError(400, 'العنوان يجب ألا يتجاوز 50 حرفاً');
  if (changes.price !== undefined && (!Number.isFinite(changes.price) || changes.price < 0)) throw httpError(400, 'السعر غير صالح');
  const { data, error } = await supabase.from('ads').update(changes).eq('id', id).eq('seller_id', userId).select(AD_SELECT).single();
  ensureNoError(error, 'تعذر تعديل الإعلان');
  return { ad: toApiAd(data) };
}

async function favorites(userId) {
  const { data, error } = await supabase.from('favorites').select('ad_id, ads(*, profiles!ads_seller_id_fkey(*))').eq('user_id', userId);
  ensureNoError(error, 'تعذر تحميل المفضلة');
  const rows = data || [];
  return { adIds: rows.map((item) => item.ad_id), ads: rows.filter((item) => item.ads).map((item) => toApiAd(item.ads)) };
}

async function saveFavorite(userId, adId) {
  const { error } = await supabase.from('favorites').insert({ user_id: userId, ad_id: adId });
  if (error && !error.message.toLowerCase().includes('duplicate')) ensureNoError(error, 'تعذر حفظ المفضلة');
  return { saved: true };
}

async function removeFavorite(userId, adId) {
  const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('ad_id', adId);
  ensureNoError(error, 'تعذر إزالة المفضلة');
  return { saved: false };
}

async function report(userId, { adId, reason, description }) {
  const { error } = await supabase.from('reports').insert({
    ad_id: adId,
    reporter_id: userId || null,
    reason,
    description: description || null,
  });
  ensureNoError(error, 'تعذر إرسال البلاغ');
}

async function feedback(userId, { type, description }) {
  const { error } = await supabase.from('feedback').insert({ user_id: userId || null, type, description });
  ensureNoError(error, 'تعذر إرسال الملاحظة');
}

async function updateProfile(userId, body) {
  const columns = { fullName: 'full_name', surname: 'surname', phone: 'phone', secondaryPhone: 'secondary_phone', province: 'province', city: 'city', approximateLocation: 'approximate_location' };
  const changes = { updated_at: new Date().toISOString() };
  for (const [field, column] of Object.entries(columns)) {
    if (body[field] !== undefined) changes[column] = body[field] || null;
  }
  const { data, error } = await supabase.from('profiles').update(changes).eq('id', userId).select('*').single();
  ensureNoError(error, 'تعذر حفظ بيانات الحساب');
  return { user: toMarketUser(data) };
}

async function adminStats(userId) {
  await requireAdmin(userId);
  const [ads, activeAds, users, reports] = await Promise.all([
    supabase.from('ads').select('id', { count: 'exact', head: true }),
    supabase.from('ads').select('id', { count: 'exact', head: true }).eq('status', 'active').gt('expires_at', new Date().toISOString()),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);
  for (const result of [ads, activeAds, users, reports]) ensureNoError(result.error, 'تعذر تحميل إحصاءات الإدارة');
  return { totalAds: ads.count || 0, activeAds: activeAds.count || 0, totalUsers: users.count || 0, openReports: reports.count || 0 };
}

async function adminListings(userId) {
  await requireAdmin(userId);
  const { data, error } = await supabase.from('ads')
    .select('id, title, category, province, city, status, created_at, expires_at, profiles:seller_id (username, full_name)')
    .order('created_at', { ascending: false }).limit(100);
  ensureNoError(error, 'تعذر تحميل الإعلانات');
  return { listings: data || [] };
}

async function adminReports(userId) {
  await requireAdmin(userId);
  const { data, error } = await supabase.from('reports')
    .select('id, reason, description, status, created_at, ads:ad_id (id, title)')
    .order('created_at', { ascending: false }).limit(100);
  ensureNoError(error, 'تعذر تحميل البلاغات');
  return { reports: data || [] };
}

async function adminDeleteAd(userId, id) {
  await requireAdmin(userId);
  const ad = await getAdRow(id);
  const { error } = await supabase.from('ads').delete().eq('id', id);
  ensureNoError(error, 'تعذر حذف الإعلان');
  if (ad) await deleteImages(ad.images || [], ad.seller_id);
  return { ok: true };
}

async function adminUpdateReport(userId, id, status) {
  await requireAdmin(userId);
  if (!['open', 'reviewed', 'resolved'].includes(status)) throw httpError(400, 'حالة البلاغ غير صالحة');
  const { error } = await supabase.from('reports').update({ status }).eq('id', id);
  ensureNoError(error, 'تعذر تحديث البلاغ');
  return { ok: true };
}

module.exports = {
  login, register, changePassword, getProfile, listAds, getAd, incrementViews, myAds,
  createAd, deleteAd, renewAd, updateAd, favorites, saveFavorite, removeFavorite,
  report, feedback, updateProfile, adminStats, adminListings, adminReports,
  adminDeleteAd, adminUpdateReport,
};
