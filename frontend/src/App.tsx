import { createContext, useContext, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import {
  AlertTriangle, ArrowRight, BadgeCheck, Check, ChevronLeft, CircleCheck, Clock3,
  Edit3, Eye, Heart, Info, ListFilter, LockKeyhole, MapPin, MessageCircle,
  Phone, Plus, Search, ShieldCheck, SlidersHorizontal, Star, Trash2, Users,
  X,
} from 'lucide-react';
import { categories, formatPrice, governorates, initialListings, sellerProfiles, type Category, type Listing } from '@/data/market-data';
import { CategoryGrid, CategoryIcon, Footer, Header, ListingCard, Logo, MobileNav, Toast } from '@/components/market-ui';
import { mapAd, marketApi, uploadImages, type AdminReport, type ApiAd, type MarketUser } from '@/lib/market-api';
import { supabase } from '@/lib/supabase';
import '@/index.css';

const queryClient = new QueryClient();

function useMarketState() {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [user, setUser] = useState<MarketUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('friday-favorites') || '[]'); } catch { return []; }
  });
  const [toast, setToast] = useState('');

  // Load ads from database on mount
  useEffect(() => {
    let alive = true;
    marketApi.listAds().then(response => {
      if (!alive) return;
      setListings(response.ads.map(mapAd));
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  // Restore session on page refresh
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      if (session) {
        const meResponse = await marketApi.me();
        if (!alive) return;
        if (meResponse.user) {
          setUser(meResponse.user);
          const favResponse = await marketApi.getFavorites();
          if (!alive) return;
          setFavorites(favResponse.adIds);
        }
      }
      setAuthLoading(false);
    })();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session) {
          setUser(null);
          setFavorites([]);
          return;
        }
        const meResponse = await marketApi.me();
        if (meResponse.user) {
          setUser(meResponse.user);
          const favResponse = await marketApi.getFavorites();
          setFavorites(favResponse.adIds);
        }
      })();
    });

    return () => {
      alive = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  // Keep localStorage fallback for logged-out users
  useEffect(() => {
    if (!user) {
      localStorage.setItem('friday-favorites', JSON.stringify(favorites));
    }
  }, [favorites, user]);

  const toggleFavorite = (id: string) => {
    const isFav = favorites.includes(id);
    setFavorites(current => isFav ? current.filter(item => item !== id) : [...current, id]);
    setToast(isFav ? 'تمت إزالة الإعلان من المفضلة' : 'تم حفظ الإعلان في المفضلة');
    if (user) {
      (isFav ? marketApi.removeFavorite(id) : marketApi.saveFavorite(id)).catch(() => {
        setFavorites(current => isFav ? [...current, id] : current.filter(item => item !== id));
        setToast('تعذر حفظ المفضلة');
      });
    }
  };
  const login = async (data: { username: string; password: string }) => {
    const response = await marketApi.login(data);
    setUser(response.user);
    const favResponse = await marketApi.getFavorites();
    setFavorites(favResponse.adIds);
    return response.user;
  };
  const register = async (data: Parameters<typeof marketApi.register>[0]) => {
    const response = await marketApi.register(data);
    setUser(response.user);
    return response.user;
  };
  const logout = async () => {
    await marketApi.logout();
    setUser(null);
    setFavorites([]);
    setToast('تم تسجيل الخروج');
  };
  const publishAd = async (data: Parameters<typeof marketApi.createAd>[0]) => {
    if (!user) throw new Error('سجّل الدخول أولاً لنشر إعلان');
    const response = await marketApi.createAd(data);
    const created = mapAd(response.ad);
    setListings(items => [created, ...items]);
    return created;
  };
  return { listings, setListings, favorites, toggleFavorite, toast, setToast, user, setUser, authLoading, login, register, logout, publishAd };
}

type MarketState = ReturnType<typeof useMarketState>;
const MarketContext = createContext<MarketState | null>(null);
function useMarketContext() {
  const value = useContext(MarketContext);
  if (!value) throw new Error('Market context is missing');
  return value;
}

function Shell({ children, onToast }: { children: ReactNode; onToast: (message: string) => void }) {
  const { user, logout } = useMarketContext();
  return <div className="site-shell"><Header onToast={onToast} user={user} onLogout={logout} /><main className="page-enter">{children}</main><Footer /><MobileNav /></div>;
}

function isActiveListing(item: Listing) {
  return item.status !== 'expired' && (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now());
}

function HomePage({ listings, favorites, onFavorite, onToast }: { listings: Listing[]; favorites: string[]; onFavorite: (id: string) => void; onToast: (message: string) => void }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (city) params.set('city', city);
    if (category) params.set('category', category);
    setLocation(`/search?${params.toString()}`);
  };
  return <Shell onToast={onToast}>
    <section className="container-market pt-8 md:pt-12">
      <div className="hero-panel p-6 sm:p-10 md:p-14">
        <div className="hero-pattern" />
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 text-secondary text-xs font-bold mb-5"><span className="w-8 h-px bg-secondary" /> السوق القريب منك</div>
          <h1 className="text-4xl sm:text-5xl md:text-[58px] leading-[1.15] font-extrabold tracking-[-.07em]">دوّر. لاقي.<br /><span className="text-secondary">وخدها على السريع.</span></h1>
          <p className="mt-5 text-sm sm:text-base leading-7 opacity-80 max-w-lg">كل شيء تحتاجه من سوقك المحلي، من سيارة مستعملة لكرسي مكتب. إعلانات حقيقية من ناس قريبين منك.</p>
          <form onSubmit={submitSearch} className="search-box mt-8 p-2 grid md:grid-cols-[1fr_170px_145px_90px] gap-2 text-foreground" data-testid="form-home-search">
            <div className="flex items-center gap-2 px-3"><Search size={19} className="text-muted-foreground" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="شو عم تدور؟" className="min-w-0 w-full py-2.5 outline-none text-sm" data-testid="input-home-search" /></div>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input-market !py-2.5" data-testid="select-home-category"><option value="">كل الأقسام</option>{categories.map(item => <option key={item.name}>{item.name}</option>)}</select>
            <select value={city} onChange={e => setCity(e.target.value)} className="input-market !py-2.5" data-testid="select-home-city"><option value="">كل المحافظات</option>{governorates.map(item => <option key={item}>{item}</option>)}</select>
            <button className="btn-main flex justify-center items-center gap-2" data-testid="button-home-search">ابحث <ArrowRight size={16} /></button>
          </form>
          <p className="mt-4 text-xs opacity-65">جرّب: لابتوب، سيارة، غرفة للإيجار، آيفون</p>
        </div>
      </div>
    </section>
    <section className="container-market py-12 md:py-16">
      <div className="flex items-end justify-between mb-6"><div><div className="section-kicker">كل ما يخطر ببالك</div><h2 className="section-title mt-1">تصفح حسب القسم</h2></div><Link href="/search" className="hidden sm:flex items-center gap-1 text-sm font-bold text-primary" data-testid="link-all-categories">كل الإعلانات <ChevronLeft size={17} /></Link></div>
      <CategoryGrid onSelect={categoryName => setLocation(`/search?category=${encodeURIComponent(categoryName)}`)} />
    </section>
    <section className="bg-[hsl(36_27%_93%)] py-12 md:py-16">
      <div className="container-market">
        <div className="flex items-end justify-between mb-6"><div><div className="section-kicker">وصل حديثاً</div><h2 className="section-title mt-1">لقطات من السوق</h2></div><Link href="/search?sort=newest" className="flex items-center gap-1 text-sm font-bold text-primary" data-testid="link-latest">شوف الكل <ChevronLeft size={17} /></Link></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">{listings.filter(isActiveListing).slice(0, 8).map(item => <ListingCard key={item.id} listing={item} favorite={favorites.includes(item.id)} onFavorite={onFavorite} />)}</div>
      </div>
    </section>
    <section className="container-market py-14"><div className="soft-card p-6 sm:p-9 grid md:grid-cols-[1fr_auto] items-center gap-8 bg-primary text-primary-foreground overflow-hidden relative"><div className="relative"><div className="section-kicker !text-secondary">عندك شي ما عاد يلزمك؟</div><h2 className="text-2xl sm:text-3xl font-extrabold mt-2">خليه يلاقي صاحبه الجديد.</h2><p className="mt-2 opacity-75 text-sm">أضف إعلانك خلال دقيقتين، وخلي الناس القريبة منك تشوفه.</p></div><Link href="/post-ad" className="btn-main !bg-secondary !text-foreground !shadow-[0_4px_0_hsl(38_76%_38%)] flex items-center justify-center gap-2" data-testid="link-home-post"><Plus size={18} /> أضف إعلاناً مجانياً</Link></div></section>
    <section className="container-market pb-16 grid sm:grid-cols-3 gap-4">
      {[{ icon: ShieldCheck, title: 'إعلانات من ناس حقيقيين', text: 'شوف معلومات البائع وتواصل معه مباشرة.' }, { icon: MapPin, title: 'قريب منك دائماً', text: 'فلتر حسب المحافظة والمدينة لتوفر وقتك.' }, { icon: BadgeCheck, title: 'تصفح بثقة', text: 'نصائح أمان واضحة مع كل خطوة.' }].map(item => <div key={item.title} className="flex gap-3 p-4"><span className="category-icon shrink-0"><item.icon size={20} /></span><div><h3 className="font-bold text-sm">{item.title}</h3><p className="text-xs text-muted-foreground mt-1 leading-5">{item.text}</p></div></div>)}
    </section>
  </Shell>;
}

function SearchPage({ listings, favorites, onFavorite, onToast }: { listings: Listing[]; favorites: string[]; onFavorite: (id: string) => void; onToast: (message: string) => void }) {
  const [location] = useLocation();
  const params = useMemo(() => new URLSearchParams(location.split('?')[1] || ''), [location]);
  const [query, setQuery] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [city, setCity] = useState(params.get('city') || '');
  const [sub, setSub] = useState('');
  const [condition, setCondition] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState('newest');
  const [mobileFilters, setMobileFilters] = useState(false);
  const [dbListings, setDbListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from database with filters
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const queryStr = new URLSearchParams();
    if (query) queryStr.set('q', query);
    if (category) queryStr.set('category', category);
    if (city) queryStr.set('city', city);
    if (sub) queryStr.set('sub', sub);
    if (condition) queryStr.set('condition', condition);
    if (min) queryStr.set('min', min);
    if (max) queryStr.set('max', max);
    if (sort) queryStr.set('sort', sort);
    marketApi.listAds(`?${queryStr.toString()}`).then(response => {
      if (!alive) return;
      setDbListings(response.ads.map(mapAd));
    }).catch(() => {
      if (alive) setDbListings([]);
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [query, category, city, sub, condition, min, max, sort]);

  const subcategories = categories.find(item => item.name === category)?.subcategories || [];
  const result = useMemo(() => {
    let output = dbListings.filter(item => isActiveListing(item));
    if (date === 'today') {
      output = output.filter(item => { const diff = Date.now() - new Date(item.createdAt || 0).getTime(); return diff < 24 * 60 * 60 * 1000; });
    } else if (date === 'week') {
      output = output.filter(item => { const diff = Date.now() - new Date(item.createdAt || 0).getTime(); return diff < 7 * 24 * 60 * 60 * 1000; });
    }
    return output;
  }, [dbListings, date]);
  const clear = () => { setQuery(''); setCategory(''); setCity(''); setSub(''); setCondition(''); setMin(''); setMax(''); setDate(''); };
  const Filters = () => <div className="space-y-4">
    <div className="flex items-center justify-between"><h3 className="font-bold">فلترة النتائج</h3><button onClick={clear} className="text-xs text-accent font-bold" data-testid="button-clear-filters">مسح الكل</button></div>
    <label className="label-market">بحث داخل النتائج<input value={query} onChange={e => setQuery(e.target.value)} className="input-market mt-1" placeholder="كلمة البحث..." data-testid="input-results-search" /></label>
    <label className="label-market">القسم<select value={category} onChange={e => { setCategory(e.target.value); setSub(''); }} className="input-market mt-1" data-testid="select-filter-category"><option value="">كل الأقسام</option>{categories.map(item => <option key={item.name}>{item.name}</option>)}</select></label>
    {subcategories.length > 0 && <label className="label-market">القسم الفرعي<select value={sub} onChange={e => setSub(e.target.value)} className="input-market mt-1" data-testid="select-filter-subcategory"><option value="">كل الأقسام الفرعية</option>{subcategories.map(item => <option key={item}>{item}</option>)}</select></label>}
    <label className="label-market">المحافظة<select value={city} onChange={e => setCity(e.target.value)} className="input-market mt-1" data-testid="select-filter-city"><option value="">كل المحافظات</option>{governorates.map(item => <option key={item}>{item}</option>)}</select></label>
    <div><span className="label-market">السعر (ل.س)</span><div className="grid grid-cols-2 gap-2"><input type="number" value={min} onChange={e => setMin(e.target.value)} className="input-market" placeholder="من" data-testid="input-filter-min" /><input type="number" value={max} onChange={e => setMax(e.target.value)} className="input-market" placeholder="إلى" data-testid="input-filter-max" /></div></div>
    <label className="label-market">الحالة<select value={condition} onChange={e => setCondition(e.target.value)} className="input-market mt-1" data-testid="select-filter-condition"><option value="">كل الحالات</option><option>جديد</option><option>مستعمل - ممتاز</option><option>مستعمل - جيد</option></select></label>
    <label className="label-market">تاريخ الإضافة<select value={date} onChange={e => setDate(e.target.value)} className="input-market mt-1" data-testid="select-filter-date"><option value="">في أي وقت</option><option value="today">آخر 24 ساعة</option><option value="week">هذا الأسبوع</option></select></label>
  </div>;
  return <Shell onToast={onToast}><div className="container-market py-8 md:py-10">
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6"><Link href="/" className="hover:text-primary">الرئيسية</Link><ChevronLeft size={14} /><span>تصفح الإعلانات</span></div>
    <div className="flex items-end justify-between gap-4 mb-6"><div><div className="section-kicker">السوق كله أمامك</div><h1 className="section-title mt-1">{query ? `نتائج البحث عن «${query}»` : category || 'كل الإعلانات'}</h1><p className="text-sm text-muted-foreground mt-1">{loading ? 'جارٍ التحميل...' : `${result.length} إعلان متاح حالياً`}</p></div><button onClick={() => setMobileFilters(true)} className="btn-ghost md:hidden flex items-center gap-2" data-testid="button-mobile-filters"><SlidersHorizontal size={17} /> الفلاتر</button></div>
    <div className="grid md:grid-cols-[250px_1fr] gap-8 items-start">
      <aside className="hidden md:block soft-card p-4 sticky top-24"><Filters /></aside>
      <div><div className="flex justify-between items-center mb-4"><span className="text-sm text-muted-foreground flex items-center gap-2"><ListFilter size={16} /> ترتيب النتائج</span><select value={sort} onChange={e => setSort(e.target.value)} className="input-market !w-auto !py-2 text-sm" data-testid="select-sort"><option value="newest">الأحدث</option><option value="low">السعر: من الأقل للأعلى</option><option value="high">السعر: من الأعلى للأقل</option></select></div>
        {loading ? <div className="soft-card py-16 text-center text-sm text-muted-foreground">جارٍ تحميل الإعلانات...</div> : result.length ? <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">{result.map(item => <ListingCard key={item.id} listing={item} favorite={favorites.includes(item.id)} onFavorite={onFavorite} />)}</div> : <EmptyState title="ما لقينا نتائج بهالشكل" text="جرب توسّع البحث أو امسح بعض الفلاتر وشوف كل الإعلانات." action="مسح الفلاتر" onAction={clear} />}
      </div>
    </div>
  </div>
  {mobileFilters && <div className="modal-backdrop md:hidden" onClick={() => setMobileFilters(false)}><div className="modal-box" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-5"><h2 className="font-bold text-lg">فلترة النتائج</h2><button onClick={() => setMobileFilters(false)} className="btn-icon" data-testid="button-close-filters"><X size={18} /></button></div><Filters /><button onClick={() => setMobileFilters(false)} className="btn-main w-full mt-6" data-testid="button-apply-filters">عرض النتائج</button></div></div>}</Shell>;
}

function EmptyState({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="soft-card py-16 px-6 text-center"><span className="inline-grid place-items-center w-14 h-14 rounded-full bg-muted text-primary"><Search size={23} /></span><h2 className="font-bold text-lg mt-4">{title}</h2><p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-6">{text}</p>{action && <button onClick={onAction} className="btn-main mt-5" data-testid="button-empty-action">{action}</button>}</div>;
}

function ListingDetail({ listings, favorites, onFavorite, onToast }: { listings: Listing[]; favorites: string[]; onFavorite: (id: string) => void; onToast: (message: string) => void }) {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const listing = listings.find(item => item.id === params.id);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState('');

  // Try to fetch from database if not in local state
  useEffect(() => {
    if (listing) return;
    let alive = true;
    marketApi.getAd(params.id).then(response => {
      if (!alive) return;
      const mapped = mapAd(response.ad);
      // Add to listings state via parent — we'll just check if it's there
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [params.id, listing]);

  if (!listing) return <Shell onToast={onToast}><div className="container-market py-24"><EmptyState title="الإعلان غير موجود" text="ربما تم حذف الإعلان أو أن الرابط غير صحيح." action="العودة للسوق" onAction={() => setLocation('/search')} /></div></Shell>;
  const seller = sellerProfiles[listing.sellerId as keyof typeof sellerProfiles] || { name: listing.sellerName, initials: listing.sellerInitials, city: listing.city, memberSince: '2024', rating: '4.8', listings: 1 };
  const similar = listings.filter(item => item.category === listing.category && item.id !== listing.id && isActiveListing(item)).slice(0, 4);
  const contact = () => { setContactOpen(true); onToast(`بيانات التواصل مع ${listing.sellerName} جاهزة`); };
  const shareListing = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: listing.title, text: `إعلان من سوق الجمعة: ${listing.title}`, url }).catch(() => undefined);
    else {
      await navigator.clipboard?.writeText(url);
      onToast('تم نسخ رابط الإعلان');
    }
  };
  const submitReport = async () => {
    setReportError('');
    if (!reportReason || (reportReason === 'مشكلة أخرى' && !reportDetails.trim())) {
      setReportError('اختر سبب البلاغ واكتب التفاصيل عند الحاجة');
      return;
    }
    try {
      await marketApi.report({ adId: listing.id, reason: reportReason, description: reportDetails });
      setReported(true);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'تعذر إرسال البلاغ');
    }
  };
  const reportReasons = ['إعلان كاذب أو مضلل', 'المنتج غير موجود', 'رقم الهاتف غير صالح', 'معاملة سيئة', 'احتيال أو محاولة احتيال', 'الإعلان مخالف للقوانين', 'الإعلان في الفئة الخاطئة', 'إعلان مكرر', 'معلومات غير صحيحة', 'محتوى غير مناسب', 'تم بيع المنتج بالفعل', 'مشكلة أخرى'];
  const reportBody = reported ? (
    <div className="text-center py-6">
      <CircleCheck size={48} className="text-primary mx-auto" />
      <h2 className="font-bold text-xl mt-4">شكراً على تنبيهنا</h2>
      <p className="text-sm text-muted-foreground mt-2">سنراجع البلاغ ونأخذ الإجراء المناسب.</p>
      <button onClick={() => setReportOpen(false)} className="btn-main mt-6" data-testid="button-close-reported">إغلاق</button>
    </div>
  ) : (
    <>
      <h2 className="font-bold text-xl">الإبلاغ عن الإعلان</h2>
      <p className="text-sm text-muted-foreground mt-2">ساعدنا نحافظ على سوق آمن للجميع.</p>
      {reportError && <div className="mt-3 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{reportError}</div>}
      <div className="space-y-2 mt-5">
        {reportReasons.map(reason => <button key={reason} onClick={() => setReportReason(reason)} className={`w-full p-3 text-right rounded-xl border text-sm ${reportReason === reason ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary hover:bg-muted'}`}>{reason}</button>)}
      </div>
      {reportReason === 'مشكلة أخرى' && <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} className="input-market mt-3 min-h-24" placeholder="اكتب تفاصيل المشكلة..." />}
      {reportReason && <button onClick={submitReport} className="btn-main w-full mt-4">إرسال البلاغ</button>}
    </>
  );
  return <Shell onToast={onToast}><div className="container-market py-7 md:py-10">
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6"><Link href="/" className="hover:text-primary">الرئيسية</Link><ChevronLeft size={14} /><Link href={`/search?category=${encodeURIComponent(listing.category)}`} className="hover:text-primary">{listing.category}</Link><ChevronLeft size={14} /><span>تفاصيل الإعلان</span></div>
    <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-8 items-start">
      <div><div className="soft-card overflow-hidden"><div className="aspect-[1.35] sm:aspect-[1.65] bg-muted"><img src={listing.image} alt={listing.title} className="w-full h-full object-cover" /></div></div><div className="soft-card p-5 sm:p-7 mt-5"><div className="flex items-center justify-between gap-3"><div><span className="chip">{listing.category}</span><h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-.05em] mt-3 leading-10">{listing.title}</h1></div><button onClick={() => onFavorite(listing.id)} className={`btn-icon shrink-0 ${favorites.includes(listing.id) ? 'text-accent' : ''}`} aria-label="حفظ الإعلان" data-testid="button-detail-favorite"><Heart size={20} fill={favorites.includes(listing.id) ? 'currentColor' : 'none'} /></button></div><div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-5"><span className="flex items-center gap-1"><MapPin size={15} /> {listing.city}</span><span className="flex items-center gap-1"><Clock3 size={15} /> {listing.date}</span><span className="chip">{listing.condition}</span></div><div className="border-t border-border mt-6 pt-6"><h2 className="font-bold mb-3">عن الإعلان</h2><p className="text-sm leading-8 text-muted-foreground">{listing.description}</p></div></div></div>
       <div className="space-y-4"><div className="soft-card p-5 sm:p-6 sticky top-24"><div className="price text-2xl sm:text-3xl text-primary font-bold">{formatPrice(listing.price)}</div><p className="text-xs text-muted-foreground mt-2">السعر قابل للنقاش مع البائع</p><div className="grid grid-cols-2 gap-2 mt-6"><button onClick={contact} className="btn-main flex items-center justify-center gap-2" data-testid="button-contact"><Phone size={17} /> اتصال</button><button onClick={shareListing} className="btn-ghost flex items-center justify-center gap-2" data-testid="button-share"><MessageCircle size={17} /> مشاركة</button></div><div className="flex items-center gap-3 p-3 rounded-xl bg-muted mt-5"><span className="w-10 h-10 rounded-full bg-primary text-secondary grid place-items-center font-bold">{seller.initials}</span><div className="flex-1"><Link href={`/seller/${listing.sellerId}`} className="font-bold text-sm hover:text-primary" data-testid="link-detail-seller">{seller.name}</Link><p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin size={12} /> {seller.city}</p><p className="text-[11px] text-muted-foreground mt-1">عضو منذ {seller.memberSince}</p></div><ChevronLeft size={17} className="text-muted-foreground" /></div><div className="flex justify-between mt-5 pt-4 border-t border-border text-xs"><button onClick={() => setReportOpen(true)} className="text-muted-foreground hover:text-destructive flex items-center gap-1" data-testid="button-report"><AlertTriangle size={14} /> إبلاغ عن الإعلان</button><span className="flex items-center gap-1 text-primary"><ShieldCheck size={14} /> تعامل بأمان</span></div></div><div className="soft-card p-4 text-xs leading-6 text-muted-foreground flex gap-2"><Info size={16} className="text-primary shrink-0 mt-1" /> لا ترسل أي دفعة قبل رؤية المنتج والتأكد منه. تواصل ضمن التطبيق قدر الإمكان.</div></div>
    </div>
    {similar.length > 0 && <section className="mt-14"><div className="flex justify-between items-end mb-5"><div><div className="section-kicker">قد يعجبك أيضاً</div><h2 className="section-title mt-1">إعلانات مشابهة</h2></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">{similar.map(item => <ListingCard key={item.id} listing={item} favorite={favorites.includes(item.id)} onFavorite={onFavorite} />)}</div></section>}
  </div>
   {contactOpen && <div className="modal-backdrop" onClick={() => setContactOpen(false)}><div className="modal-box" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between"><div><div className="section-kicker">تواصل مباشر</div><h2 className="text-xl font-bold mt-1">تواصل مع {seller.name}</h2></div><button onClick={() => setContactOpen(false)} className="btn-icon" data-testid="button-close-contact"><X size={18} /></button></div><p className="text-sm text-muted-foreground mt-5">اختر الطريقة المناسبة للتواصل مع البائع حول «{listing.title}».</p><div className="grid sm:grid-cols-2 gap-3 mt-6"><a href={`tel:${listing.phone}`} className="btn-main flex items-center justify-center gap-2" data-testid="button-call-seller"><Phone size={17} /> اتصال</a><a href={`https://wa.me/${listing.phone.replace(/\D/g, '').replace(/^0/, '963')}`} target="_blank" rel="noreferrer" className="btn-ghost flex items-center justify-center gap-2" data-testid="button-whatsapp-seller"><MessageCircle size={17} /> WhatsApp</a></div></div></div>}
    {reportOpen && <div className="modal-backdrop" onClick={() => setReportOpen(false)}><div className="modal-box" onClick={e => e.stopPropagation()}>{reportBody}</div></div>}
  </Shell>;
}

function AuthPage({ mode, onToast }: { mode: 'login' | 'register'; onToast: (message: string) => void }) {
  const [, setLocation] = useLocation();
  const { login, register } = useMarketContext();
  const [form, setForm] = useState({ username: '', password: '', fullName: '', surname: '', phone: '', secondaryPhone: '', province: '', city: '', approximateLocation: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.username.trim() || !form.password || form.password.length < 6 || (mode === 'register' && (!form.fullName || !form.phone || !form.province || !form.approximateLocation))) {
      setError('تأكد من تعبئة الحقول المطلوبة، وأن كلمة السر 6 محارف على الأقل');
      return;
    }
    try {
      if (mode === 'login') await login({ username: form.username, password: form.password });
      else await register({ username: form.username, password: form.password, fullName: form.fullName, surname: form.surname, phone: form.phone, secondaryPhone: form.secondaryPhone, province: form.province, city: form.city || form.approximateLocation, approximateLocation: form.approximateLocation });
      setSubmitted(true);
      onToast(mode === 'login' ? 'أهلاً بعودتك' : 'تم إنشاء الحساب وتسجيل الدخول');
      setTimeout(() => setLocation('/dashboard'), 350);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر تنفيذ العملية');
    }
  };
  return <Shell onToast={onToast}><div className="container-market py-12 md:py-20 flex justify-center"><div className="w-full max-w-[560px]"><div className="text-center mb-8"><Logo /><h1 className="text-2xl font-extrabold mt-8">{mode === 'login' ? 'أهلاً بعودتك' : 'خلينا نبلّش'}</h1><p className="text-sm text-muted-foreground mt-2">{mode === 'login' ? 'سجّل دخولك باسم المستخدم وتابع إعلاناتك.' : 'أنشئ حسابك بدون بريد إلكتروني، وخلي بيعك وشرائك أسهل.'}</p></div><form onSubmit={submit} className="soft-card p-6 sm:p-8 space-y-4" data-testid={`form-${mode}`}>{error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}<label className="label-market">اسم المستخدم<input value={form.username} onChange={e => update('username', e.target.value)} className="input-market mt-1" placeholder="مثلاً: ahmad_92" dir="ltr" data-testid={`input-${mode}-username`} /></label>{mode === 'register' && <div className="grid sm:grid-cols-2 gap-4"><label className="label-market">الاسم الكامل<input value={form.fullName} onChange={e => update('fullName', e.target.value)} className="input-market mt-1" placeholder="مثلاً: محمد الخطيب" data-testid="input-register-name" /></label><label className="label-market">اللقب <span className="font-normal text-muted-foreground">(اختياري)</span><input value={form.surname} onChange={e => update('surname', e.target.value)} className="input-market mt-1" placeholder="الخطيب" data-testid="input-register-surname" /></label></div>}<label className="label-market">كلمة المرور<input type="password" value={form.password} onChange={e => update('password', e.target.value)} className="input-market mt-1" placeholder="6 أحرف على الأقل" dir="ltr" data-testid={`input-${mode}-password`} /></label>{mode === 'register' && <><div className="grid sm:grid-cols-2 gap-4"><label className="label-market">رقم الهاتف الأساسي<input value={form.phone} onChange={e => update('phone', e.target.value)} className="input-market mt-1" placeholder="09xxxxxxxx" dir="ltr" data-testid="input-register-phone" /></label><label className="label-market">رقم ثانٍ <span className="font-normal text-muted-foreground">(اختياري)</span><input value={form.secondaryPhone} onChange={e => update('secondaryPhone', e.target.value)} className="input-market mt-1" placeholder="09xxxxxxxx" dir="ltr" data-testid="input-register-secondary-phone" /></label></div><div className="grid sm:grid-cols-2 gap-4"><label className="label-market">المحافظة<select value={form.province} onChange={e => update('province', e.target.value)} className="input-market mt-1" data-testid="select-register-province"><option value="">اختر المحافظة</option>{governorates.map(item => <option key={item}>{item}</option>)}</select></label><label className="label-market">الموقع التقريبي<input value={form.approximateLocation} onChange={e => update('approximateLocation', e.target.value)} className="input-market mt-1" placeholder="المدينة أو الحي فقط" data-testid="input-register-location" /></label></div></>}<button type="submit" className="btn-main w-full mt-2" data-testid={`button-submit-${mode}`}>{submitted ? 'تم بنجاح' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</button></form><div className="flex items-center justify-between text-xs text-muted-foreground pt-4">{mode === 'login' ? <><span>ما عندك حساب؟</span><Link href="/register" className="font-bold text-primary" data-testid="link-register">أنشئ حساباً جديداً</Link></> : <><span>عندك حساب مسبقاً؟</span><Link href="/login" className="font-bold text-primary" data-testid="link-login-from-register">سجّل دخولك</Link></>}</div><div className="flex justify-center items-center gap-2 text-xs text-muted-foreground mt-6"><LockKeyhole size={14} /> معلوماتك محفوظة معنا بدون بريد إلكتروني</div></div></div></Shell>;
}

function AccountPage({ listings, setListings, favorites, onFavorite, onToast }: { listings: Listing[]; setListings: (updater: (items: Listing[]) => Listing[]) => void; favorites: string[]; onFavorite: (id: string) => void; onToast: (message: string) => void }) {
  const [, setLocation] = useLocation();
  const { user, setUser, logout } = useMarketContext();
  const [tab, setTab] = useState<'ads' | 'favorites' | 'profile' | 'security'>('ads');
  const [activeAds, setActiveAds] = useState<Listing[]>([]);
  const [expiredAds, setExpiredAds] = useState<Listing[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [profile, setProfile] = useState({ fullName: '', surname: '', phone: '', secondaryPhone: '', province: '', city: '', approximateLocation: '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [editAd, setEditAd] = useState<Listing | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', description: '', price: '' });

  const refreshAds = async () => {
    if (!user) return;
    setLoadingAds(true);
    try {
      const response = await marketApi.getMyAds();
      const active = response.active.map(mapAd);
      const expired = response.expired.map(mapAd);
      setActiveAds(active);
      setExpiredAds(expired);
      setListings(current => {
        const ids = new Set([...active, ...expired].map(item => item.id));
        return [...current.filter(item => !ids.has(item.id)), ...active, ...expired];
      });
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر تحميل إعلاناتك');
    } finally {
      setLoadingAds(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setProfile({ fullName: user.fullName, surname: user.surname || '', phone: user.phone, secondaryPhone: user.secondaryPhone || '', province: user.province, city: user.city, approximateLocation: user.approximateLocation });
    void refreshAds();
  }, [user?.id]);

  const mergeAd = (updated: Listing) => {
    setListings(current => [...current.filter(item => item.id !== updated.id), updated]);
    setActiveAds(current => [...current.filter(item => item.id !== updated.id), updated]);
    setExpiredAds(current => current.filter(item => item.id !== updated.id));
  };

  const deleteAd = async (id: string) => {
    try {
      await marketApi.deleteAd(id);
      setActiveAds(current => current.filter(item => item.id !== id));
      setExpiredAds(current => current.filter(item => item.id !== id));
      setListings(current => current.filter(item => item.id !== id));
      onToast('تم حذف الإعلان');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر حذف الإعلان');
    }
  };

  const renewAd = async (id: string) => {
    try {
      const response = await marketApi.renewAd(id);
      mergeAd(mapAd(response.ad));
      onToast('تم تجديد الإعلان 7 أيام');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر تجديد الإعلان');
    }
  };

  const saveAd = async (event: FormEvent) => {
    event.preventDefault();
    if (!editAd || !editDraft.title.trim() || editDraft.title.length > 50) {
      onToast('العنوان مطلوب وبحد أقصى 50 حرفاً');
      return;
    }
    try {
      const response = await marketApi.updateAd(editAd.id, { title: editDraft.title.trim(), description: editDraft.description.trim(), price: Math.max(0, Number(editDraft.price) || 0) });
      mergeAd(mapAd(response.ad));
      setEditAd(null);
      onToast('تم حفظ تعديلات الإعلان');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر تعديل الإعلان');
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await marketApi.updateProfile(profile);
      setUser(response.user);
      onToast('تم حفظ بيانات الحساب');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر حفظ بيانات الحساب');
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password.newPassword.length < 6 || password.newPassword !== password.confirmPassword) {
      onToast('تأكد من كلمة السر الجديدة وتطابقها');
      return;
    }
    try {
      await marketApi.changePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword });
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onToast('تم تغيير كلمة السر');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر تغيير كلمة السر');
    }
  };

  if (!user) return <Shell onToast={onToast}><div className="container-market py-20"><EmptyState title="سجّل الدخول لفتح حسابك" text="من هنا تدير إعلاناتك ومفضلاتك وبيانات التواصل." action="تسجيل الدخول" onAction={() => setLocation('/login')} /></div></Shell>;
  const favoriteAds = listings.filter(item => favorites.includes(item.id));
  const profileField = (key: keyof typeof profile, value: string) => setProfile(current => ({ ...current, [key]: value }));
  const adCard = (item: Listing, expired = false) => <div key={item.id} className="relative"><ListingCard listing={item} favorite={favorites.includes(item.id)} onFavorite={onFavorite} />{expired && <span className="absolute top-3 right-3 chip bg-destructive/90 text-destructive-foreground">منتهي</span>}<div className="flex gap-2 mt-2"><button onClick={() => { setEditAd(item); setEditDraft({ title: item.title, description: item.description, price: String(item.price) }); }} className="btn-ghost flex-1 !py-2 text-xs"><Edit3 size={14} /> تعديل</button>{expired ? <button onClick={() => renewAd(item.id)} className="btn-main flex-1 !py-2 text-xs">تجديد 7 أيام</button> : <button onClick={() => deleteAd(item.id)} className="btn-ghost flex-1 !py-2 text-xs text-destructive"><Trash2 size={14} /> حذف</button>}</div></div>;

  return <Shell onToast={onToast}><div className="container-market py-8 md:py-10">
    <div className="soft-card p-5 sm:p-7 bg-primary text-primary-foreground flex items-center gap-4"><span className="w-16 h-16 rounded-2xl bg-secondary text-foreground grid place-items-center text-xl font-extrabold">{user.fullName.slice(0, 2)}</span><div><div className="section-kicker !text-secondary">حسابي</div><h1 className="text-2xl font-extrabold mt-1">{user.fullName}</h1><p className="text-xs opacity-70 mt-1">@{user.username} · {user.province} · {user.city} · {user.approximateLocation}</p></div><button onClick={logout} className="mr-auto btn-ghost !text-primary-foreground border-primary-foreground/30">تسجيل الخروج</button></div>
    <div className="flex gap-2 overflow-auto border-b border-border mt-7"><button onClick={() => setTab('ads')} className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 ${tab === 'ads' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>إعلاناتي ({activeAds.length})</button><button onClick={() => setTab('favorites')} className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 ${tab === 'favorites' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>المفضلة ({favoriteAds.length})</button><button onClick={() => setTab('profile')} className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 ${tab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>بيانات الحساب</button><button onClick={() => setTab('security')} className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 ${tab === 'security' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>الأمان</button></div>
    {tab === 'ads' && <div className="pt-7 space-y-10"><div><div className="flex justify-between items-center mb-5"><h2 className="font-bold text-lg">الإعلانات النشطة</h2><Link href="/post-ad" className="btn-main !py-2 text-xs"><Plus size={15} /> أضف إعلاناً</Link></div>{loadingAds ? <p className="text-sm text-muted-foreground">جارٍ تحميل إعلاناتك...</p> : activeAds.length ? <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">{activeAds.map(item => adCard(item))}</div> : <EmptyState title="ما عندك إعلانات نشطة" text="أضف أول إعلان ليظهر هنا." action="أضف إعلاناً" onAction={() => setLocation('/post-ad')} />}</div><div><h2 className="font-bold text-lg mb-5">الإعلانات المنتهية</h2>{expiredAds.length ? <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">{expiredAds.map(item => adCard(item, true))}</div> : <p className="text-sm text-muted-foreground">لا توجد إعلانات منتهية.</p>}</div></div>}
    {tab === 'favorites' && <div className="pt-7"><h2 className="font-bold text-lg mb-5">الإعلانات المفضلة</h2>{favoriteAds.length ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">{favoriteAds.map(item => <ListingCard key={item.id} listing={item} favorite onFavorite={onFavorite} />)}</div> : <EmptyState title="المفضلة فاضية حالياً" text="اضغط على القلب لحفظ إعلان." action="تصفح الإعلانات" onAction={() => setLocation('/search')} />}</div>}
    {tab === 'profile' && <form onSubmit={saveProfile} className="soft-card p-6 max-w-2xl mt-7 space-y-5"><h2 className="font-bold text-lg">معلومات الحساب</h2><div className="grid sm:grid-cols-2 gap-4"><label className="label-market">اسم المستخدم<input value={user.username} readOnly className="input-market mt-1 bg-muted" /></label><label className="label-market">الاسم الكامل<input value={profile.fullName} onChange={e => profileField('fullName', e.target.value)} className="input-market mt-1" /></label><label className="label-market">اللقب<input value={profile.surname} onChange={e => profileField('surname', e.target.value)} className="input-market mt-1" /></label><label className="label-market">الهاتف الأساسي<input value={profile.phone} onChange={e => profileField('phone', e.target.value)} className="input-market mt-1" dir="ltr" /></label><label className="label-market">الهاتف الثاني<input value={profile.secondaryPhone} onChange={e => profileField('secondaryPhone', e.target.value)} className="input-market mt-1" dir="ltr" /></label><label className="label-market">المحافظة<select value={profile.province} onChange={e => profileField('province', e.target.value)} className="input-market mt-1">{governorates.map(item => <option key={item}>{item}</option>)}</select></label><label className="label-market">المدينة<input value={profile.city} onChange={e => profileField('city', e.target.value)} className="input-market mt-1" /></label><label className="label-market">الموقع التقريبي<input value={profile.approximateLocation} onChange={e => profileField('approximateLocation', e.target.value)} className="input-market mt-1" /></label></div><button className="btn-main">حفظ بيانات الحساب</button></form>}
    {tab === 'security' && <form onSubmit={savePassword} className="soft-card p-6 max-w-2xl mt-7 space-y-5"><h2 className="font-bold text-lg">تغيير كلمة السر</h2><label className="label-market">كلمة السر الحالية<input type="password" value={password.currentPassword} onChange={e => setPassword(current => ({ ...current, currentPassword: e.target.value }))} className="input-market mt-1" dir="ltr" /></label><label className="label-market">كلمة السر الجديدة<input type="password" value={password.newPassword} onChange={e => setPassword(current => ({ ...current, newPassword: e.target.value }))} className="input-market mt-1" dir="ltr" /></label><label className="label-market">تأكيد كلمة السر الجديدة<input type="password" value={password.confirmPassword} onChange={e => setPassword(current => ({ ...current, confirmPassword: e.target.value }))} className="input-market mt-1" dir="ltr" /></label><button className="btn-main">تغيير كلمة السر</button></form>}
  </div>
  {editAd && <div className="modal-backdrop" onClick={() => setEditAd(null)}><form onSubmit={saveAd} className="modal-box space-y-4" onClick={event => event.stopPropagation()}><div className="flex justify-between items-center"><h2 className="font-bold text-lg">تعديل الإعلان</h2><button type="button" onClick={() => setEditAd(null)} className="btn-icon"><X size={18} /></button></div><label className="label-market">العنوان<input maxLength={50} value={editDraft.title} onChange={e => setEditDraft(current => ({ ...current, title: e.target.value }))} className="input-market mt-1" /></label><label className="label-market">الوصف<textarea value={editDraft.description} onChange={e => setEditDraft(current => ({ ...current, description: e.target.value }))} className="input-market mt-1 min-h-28" /></label><label className="label-market">السعر<input type="number" min="0" value={editDraft.price} onChange={e => setEditDraft(current => ({ ...current, price: e.target.value }))} className="input-market mt-1" /></label><button className="btn-main w-full">حفظ التعديل</button></form></div>}
  </Shell>;
}

function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('صيغة الصورة غير مدعومة'));
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('تعذر معالجة الصورة')); return; }
          resolve(new File([blob], 'image.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.82);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function PostAd({ setListings: _setListings, onToast }: { setListings: (updater: (items: Listing[]) => Listing[]) => void; onToast: (message: string) => void }) {
  const [, setLocation] = useLocation();
  const { user, publishAd } = useMarketContext();
  const [form, setForm] = useState({ title: '', category: '', subcategory: '', price: '', description: '', condition: 'مستعمل - ممتاز', contactPhone: user?.phone || '', jobStatus: 'available' });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const chosen = categories.find(item => item.name === form.category);
  const update = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: string[] = [];
    if (!user) { setLocation('/login'); return; }
    if (!form.title.trim() || form.title.trim().length > 50) nextErrors.push('العنوان مطلوب وبحد أقصى 50 حرفاً');
    if (!form.category) nextErrors.push('اختر القسم');
    if (!form.description.trim()) nextErrors.push('أضف وصفاً للإعلان');
    if (!imageFiles.length) nextErrors.push('أضف صورة واحدة على الأقل');
    if (imageFiles.length > 5) nextErrors.push('يمكنك إضافة 5 صور كحد أقصى');
    if (Number(form.price) < 0 || !Number.isFinite(Number(form.price))) nextErrors.push('أدخل سعراً رقمياً صحيحاً');
    if (nextErrors.length) { setErrors(nextErrors); return; }
    try {
      setUploading(true);
      const imageUrls = await uploadImages(imageFiles, user.id);
      const newListing = await publishAd({ title: form.title.trim(), category: form.category, subcategory: form.subcategory || undefined, price: Number(form.price) || 0, description: form.description.trim(), condition: form.condition, images: imageUrls, contactPhone: form.contactPhone, jobStatus: form.category === 'وظائف' ? form.jobStatus : undefined });
      onToast('تم نشر إعلانك بنجاح');
      setLocation(`/listing/${newListing.id}`);
    } catch (caught) {
      setErrors([caught instanceof Error ? caught.message : 'تعذر نشر الإعلان']);
    } finally {
      setUploading(false);
    }
  };
  const fileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 5 - imageFiles.length);
    try {
      const compressed = await Promise.all(files.map(compressImage));
      const previews = await Promise.all(compressed.map(f => URL.createObjectURL(f)));
      setImageFiles(current => [...current, ...compressed].slice(0, 5));
      setImagePreviews(current => [...current, ...previews].slice(0, 5));
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'تعذر تجهيز الصور']);
    }
  };
  const removeImage = (index: number) => {
    setImageFiles(current => current.filter((_, i) => i !== index));
    setImagePreviews(current => {
      URL.revokeObjectURL(current[index]);
      return current.filter((_, i) => i !== index);
    });
  };
  if (!user) return <Shell onToast={onToast}><div className="container-market py-20"><div className="soft-card max-w-xl mx-auto p-8 text-center"><LockKeyhole size={38} className="text-primary mx-auto" /><h1 className="text-2xl font-extrabold mt-4">سجّل دخولك قبل نشر الإعلان</h1><p className="text-sm text-muted-foreground mt-2">حسابك يحفظ بيانات الموقع وأرقام التواصل بشكل آمن.</p><Link href="/login" className="btn-main inline-flex mt-6">تسجيل الدخول</Link></div></div></Shell>;
  return <Shell onToast={onToast}><div className="container-market py-8 md:py-10 max-w-[850px]"><div className="mb-8"><div className="section-kicker">خطوة بسيطة وتكون بالسوق</div><h1 className="section-title mt-1">أضف إعلانك</h1><p className="text-sm text-muted-foreground mt-2">الموقع يؤخذ من حسابك: {user.province} · {user.approximateLocation}</p></div><form onSubmit={submit} className="space-y-5" data-testid="form-post-ad">{errors.length > 0 && <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm"><div className="font-bold flex items-center gap-2"><AlertTriangle size={16} /> راجع الحقول التالية</div><ul className="mt-2 list-disc pr-5 space-y-1">{errors.map(item => <li key={item}>{item}</li>)}</ul></div>}<div className="soft-card p-5 sm:p-7"><h2 className="font-bold text-lg mb-5">معلومات الإعلان</h2><div className="grid sm:grid-cols-2 gap-5"><label className="label-market sm:col-span-2">عنوان الإعلان <span className="font-normal text-muted-foreground">{form.title.length}/50</span><input maxLength={50} value={form.title} onChange={e => update('title', e.target.value)} className="input-market mt-1" placeholder="مثلاً: طاولة سفرة خشب زان بحالة ممتازة" data-testid="input-post-title" /></label><label className="label-market">القسم<select value={form.category} onChange={e => { update('category', e.target.value); update('subcategory', ''); }} className="input-market mt-1" data-testid="select-post-category"><option value="">اختر القسم</option>{categories.map(item => <option key={item.name}>{item.name}</option>)}</select></label><label className="label-market">القسم الفرعي<select value={form.subcategory} onChange={e => update('subcategory', e.target.value)} disabled={!chosen} className="input-market mt-1 disabled:opacity-50"><option value="">اختر القسم الفرعي</option>{chosen?.subcategories.map(item => <option key={item}>{item}</option>)}</select></label><label className="label-market">السعر (ليرة سورية)<input type="number" min="0" value={form.price} onChange={e => update('price', e.target.value)} className="input-market mt-1" placeholder="اتركه 0 إذا كان للتواصل" data-testid="input-post-price" /></label><label className="label-market">الموقع من الحساب<input value={`${user.province} · ${user.approximateLocation}`} readOnly className="input-market mt-1 bg-muted" /></label><label className="label-market">الحالة<select value={form.condition} onChange={e => update('condition', e.target.value)} className="input-market mt-1"><option>جديد</option><option>مستعمل - ممتاز</option><option>مستعمل - جيد</option><option>مستعمل - مقبول</option></select></label><label className="label-market sm:col-span-2">الوصف<textarea value={form.description} onChange={e => update('description', e.target.value)} rows={5} className="input-market mt-1 resize-none" placeholder="اذكر الحالة، القياس، سبب البيع وأي تفاصيل مفيدة..." data-testid="textarea-post-description" /></label></div></div><div className="soft-card p-5 sm:p-7"><h2 className="font-bold text-lg mb-1">صور الإعلان</h2><p className="text-xs text-muted-foreground mb-4">أضف من صورة إلى 5 صور. الصورة الأولى هي الرئيسية.</p><div className="flex flex-wrap gap-3 mb-4">{imagePreviews.map((src, index) => <div key={index} className="relative"><img src={src} alt={`صورة ${index + 1}`} className="w-24 h-20 object-cover rounded-lg" /><button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -left-2 btn-icon !w-6 !h-6 !bg-card" aria-label="حذف الصورة"><X size={12} /></button></div>)}</div><label className="block border-2 border-dashed border-border rounded-xl p-7 text-center cursor-pointer hover:border-primary transition-colors"><Plus size={28} className="mx-auto text-primary" /><p className="font-bold text-sm mt-2">اختر صوراً من جهازك ({imageFiles.length}/5)</p><input type="file" accept="image/*" multiple onChange={fileChange} className="hidden" data-testid="input-post-image" disabled={imageFiles.length >= 5} /></label></div><div className="soft-card p-5 sm:p-7"><h2 className="font-bold text-lg mb-5">رقم التواصل لهذا الإعلان</h2><div className="grid sm:grid-cols-2 gap-3">{[user.phone, user.secondaryPhone].filter(Boolean).map(phone => <button type="button" key={phone} onClick={() => update('contactPhone', phone || '')} className={`p-3 rounded-xl border text-right text-sm ${form.contactPhone === phone ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`} dir="ltr">{phone}</button>)}</div>{form.category === 'وظائف' && <label className="label-market block mt-5">حالة الوظيفة<select value={form.jobStatus} onChange={e => update('jobStatus', e.target.value)} className="input-market mt-1"><option value="available">متاحة</option><option value="closed">مغلقة</option></select></label>}<button className="btn-main w-full mt-7 text-base" disabled={uploading} data-testid="button-publish-ad">{uploading ? 'جارٍ النشر...' : 'نشر الإعلان'}</button><p className="text-[11px] text-muted-foreground text-center mt-3">ينتهي الإعلان تلقائياً بعد 7 أيام.</p></div></form></div></Shell>;
}

function FavoritesPage({ listings, favorites, onFavorite, onToast }: { listings: Listing[]; favorites: string[]; onFavorite: (id: string) => void; onToast: (message: string) => void }) {
  const [, setLocation] = useLocation();
  const saved = listings.filter(item => favorites.includes(item.id));
  return <Shell onToast={onToast}><div className="container-market py-8 md:py-10"><div className="section-kicker">محفوظاتك</div><h1 className="section-title mt-1">الإعلانات المفضلة</h1><p className="text-sm text-muted-foreground mt-2 mb-7">الأشياء اللي لفتت نظرك، كلها بمكان واحد.</p>{saved.length ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">{saved.map(item => <ListingCard key={item.id} listing={item} favorite onFavorite={onFavorite} />)}</div> : <EmptyState title="المفضلة فاضية حالياً" text="لما يعجبك إعلان، اضغط على رمز القلب وخليه هون لوقت ما تقرر." action="ابدأ التصفح" onAction={() => setLocation('/search')} />}</div></Shell>;
}

function SellerPage({ listings, favorites, onFavorite, onToast }: { listings: Listing[]; favorites: string[]; onFavorite: (id: string) => void; onToast: (message: string) => void }) {
  const params = useParams<{ id: string }>();
  const sellerListings = listings.filter(item => item.sellerId === params.id);
  const first = sellerListings[0];
  const profile = sellerProfiles[params.id as keyof typeof sellerProfiles] || { name: first?.sellerName || 'بائع سوق الجمعة', initials: first?.sellerInitials || 'سج', city: first?.city || 'سوريا', memberSince: '2024', rating: '4.8', listings: sellerListings.length };
  return <Shell onToast={onToast}><div className="container-market py-8 md:py-10"><div className="soft-card p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-4"><span className="w-20 h-20 rounded-3xl bg-primary text-secondary grid place-items-center text-2xl font-extrabold">{profile.initials}</span><div className="flex-1"><h1 className="text-2xl font-extrabold">{profile.name}</h1><div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-muted-foreground mt-2"><span className="flex gap-1 items-center"><MapPin size={14} /> {profile.city}</span><span>عضو منذ {profile.memberSince}</span><span className="flex items-center gap-1 text-secondary"><Star size={14} fill="currentColor" /> {profile.rating} تقييم</span></div></div><button onClick={() => onToast('تم فتح محادثة تجريبية مع البائع')} className="btn-main flex items-center gap-2" data-testid="button-contact-seller"><MessageCircle size={17} /> تواصل مع البائع</button></div><div className="flex gap-3 mt-5"><div className="soft-card px-5 py-3 text-center"><strong className="block text-xl text-primary">{sellerListings.length || profile.listings}</strong><span className="text-xs text-muted-foreground">إعلان نشط</span></div><div className="soft-card px-5 py-3 text-center"><strong className="block text-xl text-primary">{profile.rating}</strong><span className="text-xs text-muted-foreground">متوسط التقييم</span></div></div><div className="mt-10"><h2 className="section-title mb-5">إعلانات {profile.name}</h2>{sellerListings.length ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">{sellerListings.map(item => <ListingCard key={item.id} listing={item} favorite={favorites.includes(item.id)} onFavorite={onFavorite} />)}</div> : <EmptyState title="لا توجد إعلانات حالياً" text="تابع هذا البائع لتعرف عندما ينشر شيئاً جديداً." />}</div></div></Shell>;
}

function AdminPage({ listings, setListings, onToast }: { listings: Listing[]; setListings: (updater: (items: Listing[]) => Listing[]) => void; onToast: (message: string) => void }) {
  const { user, authLoading } = useMarketContext();
  const [tab, setTab] = useState('listings');
  const [stats, setStats] = useState({ totalAds: 0, activeAds: 0, totalUsers: 0, openReports: 0 });
  const [adminListings, setAdminListings] = useState<Record<string, unknown>[]>([]);
  const [adminReports, setAdminReports] = useState<AdminReport[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') { setAdminError('غير مصرح'); setAdminLoading(false); return; }
    let alive = true;
    setAdminLoading(true);
    Promise.all([
      marketApi.adminStats().catch(() => ({ totalAds: 0, activeAds: 0, totalUsers: 0, openReports: 0 })),
      marketApi.adminListings().catch(() => ({ listings: [] })),
      marketApi.adminReports().catch(() => ({ reports: [] })),
    ]).then(([statsData, listingsData, reportsData]) => {
      if (!alive) return;
      setStats(statsData);
      setAdminListings(listingsData.listings);
      setAdminReports(reportsData.reports);
    }).finally(() => { if (alive) setAdminLoading(false); });
    return () => { alive = false; };
  }, [user?.id, authLoading]);

  if (authLoading) return <Shell onToast={onToast}><div className="container-market py-20 text-center text-sm text-muted-foreground">جارٍ التحميل...</div></Shell>;
  if (!user || user.role !== 'admin') return <Shell onToast={onToast}><div className="container-market py-20"><EmptyState title="غير مصرح" text="هذه الصفحة مخصصة للمشرفين فقط." action="العودة للرئيسية" onAction={() => window.location.hash = '#/' } /></div></Shell>;

  const tabs = [{ id: 'listings', label: 'الإعلانات', count: stats.totalAds }, { id: 'reports', label: 'البلاغات', count: stats.openReports }, { id: 'categories', label: 'الأقسام', count: categories.length }];
  const removeAd = async (id: string) => {
    try {
      await marketApi.adminDeleteAd(id);
      setAdminListings(current => current.filter(item => item.id !== id));
      setListings(items => items.filter(item => item.id !== id));
      onToast('تم حذف الإعلان');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'تعذر حذف الإعلان');
    }
  };

  return <Shell onToast={onToast}><div className="container-market py-8 md:py-10"><div className="flex items-start justify-between"><div><div className="section-kicker">مساحة الإدارة</div><h1 className="section-title mt-1">لوحة التحكم</h1><p className="text-sm text-muted-foreground mt-2">راجع السوق وخليه مكاناً أفضل للجميع.</p></div><span className="chip bg-primary/10 text-primary"><ShieldCheck size={14} /> وضع المشرف</span></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">{[{label: 'إجمالي الإعلانات', value: stats.totalAds, icon: Eye}, {label: 'الإعلانات النشطة', value: stats.activeAds, icon: BadgeCheck}, {label: 'المستخدمون', value: stats.totalUsers, icon: Users}, {label: 'بلاغات مفتوحة', value: stats.openReports, icon: AlertTriangle}].map(stat => <div key={stat.label} className="soft-card p-4"><stat.icon size={18} className="text-primary mb-3" /><strong className="text-2xl block">{stat.value}</strong><span className="text-xs text-muted-foreground">{stat.label}</span></div>)}</div><div className="flex gap-2 overflow-auto border-b border-border mt-8">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`px-4 py-3 text-sm whitespace-nowrap font-bold border-b-2 ${tab === item.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} data-testid={`tab-admin-${item.id}`}>{item.label} <span className="chip mr-1">{item.count}</span></button>)}</div><div className="soft-card mt-6 overflow-hidden">{adminLoading ? <div className="p-8 text-center text-sm text-muted-foreground">جارٍ التحميل...</div> : <>{tab === 'listings' && <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr><th className="p-4">الإعلان</th><th className="p-4">القسم</th><th className="p-4">المدينة</th><th className="p-4">الحالة</th><th className="p-4">إجراء</th></tr></thead><tbody>{adminListings.map(row => { const id = String(row.id); const title = String(row.title); const status = String(row.status); const isExpired = row.expires_at && new Date(row.expires_at as string) < new Date(); const displayStatus = isExpired ? 'منتهي' : status === 'active' ? 'منشور' : 'محذوف'; return <tr key={id} className="border-t border-border"><td className="p-4 font-bold min-w-[230px]">{title}</td><td className="p-4 text-muted-foreground">{String(row.category)}</td><td className="p-4 text-muted-foreground">{String(row.province)}</td><td className="p-4"><span className={`chip ${displayStatus === 'منشور' ? 'bg-primary/10 text-primary' : displayStatus === 'منتهي' ? 'bg-secondary/20' : 'bg-destructive/10 text-destructive'}`}>{displayStatus}</span></td><td className="p-4"><button onClick={() => removeAd(id)} className="btn-icon !w-8 !h-8 text-destructive" aria-label="حذف" data-testid={`button-remove-${id}`}><Trash2 size={15} /></button></td></tr>; })}</tbody></table></div>}{tab === 'reports' && <div><div className="p-5 border-b border-border"><h2 className="font-bold">بلاغات تحتاج مراجعة</h2></div>{adminReports.map(row => <div key={String(row.id)} className="p-4 border-b border-border last:border-0 flex items-center justify-between gap-3"><div><span className="text-sm font-bold">{String(row.reason)}</span>{row.description && <p className="text-xs text-muted-foreground mt-1">{String(row.description)}</p>}</div><span className={`chip ${row.status === 'open' ? 'bg-secondary/20' : 'bg-primary/10 text-primary'}`}>{String(row.status)}</span></div>)}</div>}{tab === 'categories' && <AdminSimple title="إدارة الأقسام" rows={categories.map(item => `${item.name} · ${item.count} إعلان`)} action="تعديل القسم" onToast={onToast} />}</>}</div></div></Shell>;
}

function AdminSimple({ title, rows, action, onToast }: { title: string; rows: string[]; action: string; onToast: (message: string) => void }) {
  return <div><div className="p-5 border-b border-border"><h2 className="font-bold">{title}</h2></div>{rows.map(row => <div key={row} className="p-4 border-b border-border last:border-0 flex items-center justify-between gap-3"><span className="text-sm">{row}</span><button onClick={() => onToast(`تم فتح: ${row.split('·')[0]}`)} className="btn-ghost !py-2 !px-3 text-xs whitespace-nowrap" data-testid={`button-admin-action-${row}`}>{action}</button></div>)}</div>;
}

function FeedbackPage({ onToast }: { onToast: (message: string) => void }) {
  const [type, setType] = useState('اقتراح');
  const [description, setDescription] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!description.trim()) {
      setError('اكتب ملاحظتك قبل الإرسال');
      return;
    }
    try {
      setSubmitting(true);
      await marketApi.feedback({ type, description });
      setSent(true);
      setDescription('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر إرسال الملاحظة');
    } finally {
      setSubmitting(false);
    }
  };
  return <Shell onToast={onToast}><div className="container-market py-10 md:py-16 max-w-[760px]"><div className="section-kicker">نسمعك</div><h1 className="section-title mt-1">Feedback</h1><p className="text-lg font-bold mt-5">كل ملاحظة منك تصنع فرقًا.</p><p className="text-sm text-muted-foreground mt-2 leading-7">شاركنا اقتراحاً أو مشكلة تقنية أو فكرة جديدة، وسنراجعها ضمن فريق سوق الجمعة.</p>{sent && <div className="mt-6 p-4 rounded-xl bg-primary/10 text-primary text-sm flex items-center gap-2"><CircleCheck size={18} /> وصلت ملاحظتك، شكراً لأنك تساعدنا نتحسن.</div>}{error && <div className="mt-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}<form onSubmit={submit} className="soft-card p-6 sm:p-8 mt-7 space-y-5"><label className="label-market">نوع الملاحظة<select value={type} onChange={e => setType(e.target.value)} className="input-market mt-1"><option>اقتراح</option><option>مشكلة تقنية</option><option>شكوى</option><option>تحسين التصميم</option><option>ميزة جديدة</option><option>أخرى</option></select></label><label className="label-market">ملاحظتك أو وصف المشكلة<textarea value={description} onChange={e => setDescription(e.target.value)} rows={7} className="input-market mt-1 resize-none" placeholder="اكتب لنا بالتفاصيل..." /></label><button className="btn-main" disabled={submitting}>{submitting ? 'جارٍ الإرسال...' : 'إرسال Feedback'}</button></form></div></Shell>;
}

function NotFoundPage({ onToast }: { onToast: (message: string) => void }) {
  const [, setLocation] = useLocation();
  return <Shell onToast={onToast}><div className="container-market py-24 text-center"><span className="text-7xl font-extrabold text-secondary">404</span><h1 className="font-bold text-2xl mt-4">الصفحة مو بالسوق</h1><p className="text-sm text-muted-foreground mt-2">الرابط الذي فتحته غير موجود أو تغيّر.</p><button onClick={() => setLocation('/')} className="btn-main mt-6" data-testid="button-not-found-home">العودة للرئيسية</button></div></Shell>;
}

function Router({ state }: { state: MarketState }) {
  const { setToast } = state;
  return <Switch>
    <Route path="/"><HomePage listings={state.listings} favorites={state.favorites} onFavorite={state.toggleFavorite} onToast={setToast} /></Route>
    <Route path="/search"><SearchPage listings={state.listings} favorites={state.favorites} onFavorite={state.toggleFavorite} onToast={setToast} /></Route>
    <Route path="/listing/:id"><ListingDetail listings={state.listings} favorites={state.favorites} onFavorite={state.toggleFavorite} onToast={setToast} /></Route>
    <Route path="/login"><AuthPage mode="login" onToast={setToast} /></Route>
    <Route path="/register"><AuthPage mode="register" onToast={setToast} /></Route>
    <Route path="/dashboard"><AccountPage listings={state.listings} setListings={state.setListings} favorites={state.favorites} onFavorite={state.toggleFavorite} onToast={setToast} /></Route>
    <Route path="/post-ad"><PostAd setListings={state.setListings} onToast={setToast} /></Route>
    <Route path="/favorites"><FavoritesPage listings={state.listings} favorites={state.favorites} onFavorite={state.toggleFavorite} onToast={setToast} /></Route>
    <Route path="/seller/:id"><SellerPage listings={state.listings} favorites={state.favorites} onFavorite={state.toggleFavorite} onToast={setToast} /></Route>
    <Route path="/admin"><AdminPage listings={state.listings} setListings={state.setListings} onToast={setToast} /></Route>
    <Route path="/feedback"><FeedbackPage onToast={setToast} /></Route>
    <Route><NotFoundPage onToast={setToast} /></Route>
  </Switch>;
}

function App() {
  const state = useMarketState();
  return <QueryClientProvider client={queryClient}><MarketContext.Provider value={state}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router state={state} /></WouterRouter>{state.toast && <Toast message={state.toast} onClose={() => state.setToast('')} />}</MarketContext.Provider></QueryClientProvider>;
}

export default App;
