import { supabase } from '@/lib/supabase';
import type { Listing } from '@/data/market-data';

export type MarketUser = {
  id: string;
  username: string;
  fullName: string;
  surname: string | null;
  phone: string;
  secondaryPhone: string | null;
  province: string;
  city: string;
  approximateLocation: string;
  role: string;
  createdAt: string | Date;
};

export type ApiAd = {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  condition: Listing['condition'];
  price: number;
  images: string[];
  contactPhone: string;
  province: string;
  city: string;
  approximateLocation: string;
  status: string;
  jobStatus?: string | null;
  createdAt: string;
  expiresAt: string;
  views: number;
  seller: {
    id: string;
    username: string;
    fullName: string;
    surname: string | null;
    province: string;
    city: string;
    approximateLocation: string;
    createdAt: string;
  };
};

export type AdminReport = {
  id: string;
  reason: string;
  description: string | null;
  status: string;
};

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error('تعذر استعادة جلسة تسجيل الدخول');
    if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const result = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(result.error || 'تعذر تنفيذ الطلب');
  return result;
}

async function setSession(result: { session?: { access_token: string; refresh_token: string } }) {
  if (!result.session) throw new Error('لم يتم إنشاء جلسة تسجيل الدخول');
  const { error } = await supabase.auth.setSession({
    access_token: result.session.access_token,
    refresh_token: result.session.refresh_token,
  });
  if (error) {
    console.error('[marketApi.setSession] Supabase setSession failed', {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    throw new Error('تعذر حفظ جلسة تسجيل الدخول');
  }
}

export function mapAd(ad: ApiAd): Listing {
  const sellerName = ad.seller.fullName + (ad.seller.surname ? ` ${ad.seller.surname}` : '');
  return {
    id: ad.id,
    title: ad.title,
    category: ad.category as Listing['category'],
    subcategory: ad.subcategory || 'متنوع',
    price: ad.price,
    city: ad.city,
    province: ad.province,
    condition: ad.condition,
    date: new Intl.DateTimeFormat('ar-SY', { day: 'numeric', month: 'short' }).format(new Date(ad.createdAt)),
    description: ad.description,
    image: ad.images[0] || '',
    images: ad.images,
    sellerId: ad.seller.id,
    sellerName,
    sellerInitials: sellerName.slice(0, 2),
    phone: ad.contactPhone,
    contact: 'واتساب',
    featured: false,
    approximateLocation: ad.approximateLocation,
    createdAt: ad.createdAt,
    expiresAt: ad.expiresAt,
    status: ad.status as Listing['status'],
    views: ad.views,
    sellerMemberSince: ad.seller.createdAt,
  };
}

export async function uploadImages(files: File[], _userId: string): Promise<string[]> {
  const form = new FormData();
  files.forEach((file) => form.append('images', file));
  const result = await apiRequest<{ urls: string[] }>('/uploads', { method: 'POST', body: form });
  return result.urls;
}

export const marketApi = {
  async me(): Promise<{ user: MarketUser | null }> {
    return apiRequest('/auth/me');
  },

  async login(data: { username: string; password: string }): Promise<{ user: MarketUser }> {
    const result = await apiRequest<{ user: MarketUser; session: { access_token: string; refresh_token: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(data) },
      false,
    );
    await setSession(result);
    return { user: result.user };
  },

  async register(data: {
    username: string;
    password: string;
    fullName: string;
    surname?: string;
    phone: string;
    secondaryPhone?: string;
    province: string;
    city: string;
    approximateLocation: string;
  }): Promise<{ user: MarketUser }> {
    const result = await apiRequest<{ user: MarketUser; session: { access_token: string; refresh_token: string } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(data) },
      false,
    );
    await setSession(result);
    return { user: result.user };
  },

  async logout(): Promise<{ ok: true }> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('تعذر تسجيل الخروج');
    return { ok: true };
  },

  async listAds(query = ''): Promise<{ ads: ApiAd[] }> {
    const suffix = query ? (query.startsWith('?') ? query : `?${query}`) : '';
    return apiRequest(`/ads${suffix}`, {}, false);
  },

  async getAd(id: string): Promise<{ ad: ApiAd }> {
    return apiRequest(`/ads/${encodeURIComponent(id)}`);
  },

  async incrementViews(id: string): Promise<void> {
    await apiRequest(`/ads/${encodeURIComponent(id)}/views`, { method: 'POST' }, false);
  },

  async getMyAds(): Promise<{ active: ApiAd[]; expired: ApiAd[] }> {
    return apiRequest('/account/ads');
  },

  async createAd(data: {
    title: string;
    description: string;
    category: string;
    subcategory?: string;
    condition: string;
    price: number;
    images: string[];
    contactPhone: string;
    jobStatus?: string;
  }): Promise<{ ad: ApiAd }> {
    return apiRequest('/ads', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteAd(id: string): Promise<{ ok: true }> {
    return apiRequest(`/ads/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async renewAd(id: string): Promise<{ ad: ApiAd }> {
    return apiRequest(`/ads/${encodeURIComponent(id)}/renew`, { method: 'POST' });
  },

  async updateAd(id: string, data: Partial<{
    title: string;
    description: string;
    category: string;
    subcategory: string;
    condition: string;
    price: number;
    jobStatus: string;
  }>): Promise<{ ad: ApiAd }> {
    return apiRequest(`/ads/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  async saveFavorite(id: string): Promise<{ saved: boolean }> {
    return apiRequest(`/account/favorites/${encodeURIComponent(id)}`, { method: 'POST' });
  },

  async removeFavorite(id: string): Promise<{ saved: boolean }> {
    return apiRequest(`/account/favorites/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async getFavorites(): Promise<{ adIds: string[]; ads: ApiAd[] }> {
    return apiRequest('/account/favorites');
  },

  async report(data: { adId: string; reason: string; description?: string }): Promise<void> {
    await apiRequest('/reports', { method: 'POST', body: JSON.stringify(data) });
  },

  async feedback(data: { type: string; description: string }): Promise<void> {
    await apiRequest('/feedback', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateProfile(data: Partial<Pick<MarketUser, 'fullName' | 'surname' | 'phone' | 'secondaryPhone' | 'province' | 'city' | 'approximateLocation'>>): Promise<{ user: MarketUser }> {
    return apiRequest('/account/profile', { method: 'PATCH', body: JSON.stringify(data) });
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ ok: true }> {
    return apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(data) });
  },

  async adminStats(): Promise<{ totalAds: number; activeAds: number; totalUsers: number; openReports: number }> {
    return apiRequest('/admin/stats');
  },

  async adminListings(): Promise<{ listings: Record<string, unknown>[] }> {
    return apiRequest('/admin/listings');
  },

  async adminReports(): Promise<{ reports: AdminReport[] }> {
    return apiRequest('/admin/reports');
  },

  async adminDeleteAd(id: string): Promise<{ ok: true }> {
    return apiRequest(`/admin/listings/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
