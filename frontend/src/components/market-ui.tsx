import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Bell, BriefcaseBusiness, Car, ChevronLeft, CircleUserRound, Gamepad2, Heart, Home,
  Laptop, MapPin, Menu, MessageCircle, MoreHorizontal, PawPrint, Plus, Search, Shirt,
  Smartphone, Sofa, Tv, UserRound, Wrench, X, Zap,
} from 'lucide-react';
import { categories, type Category, type Listing, formatPrice } from '@/data/market-data';
import type { MarketUser } from '@/lib/market-api';

const icons = { car: Car, home: Home, smartphone: Smartphone, laptop: Laptop, tv: Tv, sofa: Sofa, shirt: Shirt, briefcase: BriefcaseBusiness, wrench: Wrench, gamepad: Gamepad2, paw: PawPrint, more: MoreHorizontal };

export function Logo() {
  return <Link href="/" className="flex items-center gap-3 shrink-0" data-testid="link-logo">
    <span className="logo-mark"><Zap size={22} strokeWidth={2.7} /></span>
    <span className="logo-type text-xl">سوق الجمعة<small>FRIDAY MARKET SYRIA</small></span>
  </Link>;
}

export function Header({ onToast, user, onLogout }: { onToast: (message: string) => void; user: MarketUser | null; onLogout: () => void }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocation(`/search${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
  };
  return <header className="topbar">
    <div className="container-market h-[72px] flex items-center gap-6">
      <Logo />
      <form onSubmit={submit} className="hidden md:flex flex-1 max-w-[520px] search-box h-11 items-center px-3 gap-2" data-testid="form-header-search">
        <Search size={19} className="text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن سيارة، هاتف، شقة..." className="bg-transparent outline-none flex-1 text-sm" data-testid="input-header-search" />
        <button className="text-primary font-bold text-sm px-2" data-testid="button-header-search">بحث</button>
      </form>
      <div className="hidden md:flex items-center gap-3 mr-auto">
        <button onClick={() => onToast('سيتم تفعيل تنبيهات البحث قريباً')} className="btn-icon" aria-label="التنبيهات" data-testid="button-notifications"><Bell size={18} /></button>
        {user ? <><Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold hover:text-primary transition-colors" data-testid="link-account"><CircleUserRound size={19} /> حسابي</Link><button onClick={onLogout} className="text-sm font-bold text-muted-foreground hover:text-primary" data-testid="button-logout">خروج</button></> : <Link href="/login" className="flex items-center gap-2 text-sm font-bold hover:text-primary transition-colors" data-testid="link-login"><CircleUserRound size={19} /> دخول</Link>}
        <Link href="/post-ad" className="btn-main flex items-center gap-2 text-sm" data-testid="link-post-header"><Plus size={17} /> أضف إعلاناً</Link>
      </div>
      <button onClick={() => setMobileOpen(!mobileOpen)} className="btn-icon md:hidden mr-auto" aria-label="القائمة" data-testid="button-mobile-menu">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </div>
    {mobileOpen && <div className="md:hidden container-market pb-4 page-enter">
      <form onSubmit={submit} className="search-box h-11 flex items-center px-3 gap-2 mb-3"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث في السوق..." className="bg-transparent outline-none flex-1" data-testid="input-mobile-search" /><button className="text-primary font-bold" data-testid="button-mobile-search">بحث</button></form>
       <div className="flex gap-2">{user ? <><Link href="/dashboard" className="btn-ghost flex-1 text-center" data-testid="link-mobile-account">حسابي</Link><button onClick={onLogout} className="btn-ghost flex-1" data-testid="button-mobile-logout">خروج</button></> : <Link href="/login" className="btn-ghost flex-1 text-center" data-testid="link-mobile-login">تسجيل الدخول</Link>}<Link href="/post-ad" className="btn-main flex-1 text-center" data-testid="link-mobile-post">أضف إعلاناً</Link></div>
    </div>}
  </header>;
}

export function MobileNav() {
  const [location] = useLocation();
  return <nav className="mobile-bottom">
    <Link href="/" className={location === '/' ? 'active' : ''} data-testid="link-mobile-home"><Home size={19} /><span>الرئيسية</span></Link>
    <Link href="/search" className={location.startsWith('/search') ? 'active' : ''} data-testid="link-mobile-browse"><Search size={19} /><span>تصفح</span></Link>
    <Link href="/post-ad" className={location === '/post-ad' ? 'active' : ''} data-testid="link-mobile-add"><Plus size={22} /><span>أضف إعلاناً</span></Link>
    <Link href="/favorites" className={location === '/favorites' ? 'active' : ''} data-testid="link-mobile-favorites"><Heart size={19} /><span>المفضلة</span></Link>
    <Link href="/dashboard" className={location === '/dashboard' ? 'active' : ''} data-testid="link-mobile-profile"><UserRound size={19} /><span>حسابي</span></Link>
  </nav>;
}

export function CategoryIcon({ icon, size = 19 }: { icon: string; size?: number }) {
  const Icon = icons[icon as keyof typeof icons] || MoreHorizontal;
  return <Icon size={size} />;
}

export function ListingCard({ listing, favorite, onFavorite }: { listing: Listing; favorite: boolean; onFavorite: (id: string) => void }) {
  return <article className="listing-card" data-testid={`card-listing-${listing.id}`}>
    <Link href={`/listing/${listing.id}`} className="block" data-testid={`link-listing-${listing.id}`}>
      <div className="listing-image relative">
        <img src={listing.image} alt={listing.title} loading="lazy" />
        {listing.featured && <span className="absolute top-3 right-3 chip bg-secondary text-foreground"><Zap size={11} /> مميز</span>}
      </div>
      <div className="p-3.5">
        <div className="flex items-center justify-between gap-2 mb-2"><span className="text-[11px] text-muted-foreground">{listing.category}</span><span className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin size={12} />{listing.city}</span></div>
        <h3 className="font-bold leading-6 line-clamp-2 min-h-12">{listing.title}</h3>
        <div className="mt-3 flex items-end justify-between gap-2"><span className="price text-primary font-bold">{formatPrice(listing.price)}</span><span className="text-[11px] text-muted-foreground">{listing.date}</span></div>
      </div>
    </Link>
    <button className={`heart-btn ${favorite ? 'active' : ''}`} onClick={() => onFavorite(listing.id)} aria-label={favorite ? 'إزالة من المفضلة' : 'حفظ في المفضلة'} data-testid={`button-favorite-${listing.id}`}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></button>
  </article>;
}

export function Footer() {
  return <footer className="mt-20 border-t border-border bg-primary text-primary-foreground">
    <div className="container-market py-12 grid sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr] gap-10">
      <div><Logo /><p className="mt-5 text-sm leading-7 opacity-75 max-w-sm">سوق الجمعة هو مكان السوريين لبيع وشراء الأشياء القريبة منهم، بثقة ووضوح.</p><p className="mt-5 text-xs opacity-60">© 2024 سوق الجمعة. السوق يبدأ من هنا.</p></div>
       <div><h3 className="font-bold mb-4 text-secondary">روابط سريعة</h3><div className="space-y-3 text-sm opacity-80"><Link href="/search" className="block hover:opacity-100" data-testid="link-footer-search">تصفح الإعلانات</Link><Link href="/post-ad" className="block hover:opacity-100" data-testid="link-footer-post">أضف إعلانك</Link><Link href="/favorites" className="block hover:opacity-100" data-testid="link-footer-favorites">إعلاناتي المحفوظة</Link><Link href="/feedback" className="block hover:opacity-100" data-testid="link-footer-feedback">Feedback</Link></div></div>
      <div><h3 className="font-bold mb-4 text-secondary">نحن هنا لمساعدتك</h3><div className="space-y-3 text-sm opacity-80"><p className="flex items-center gap-2"><MessageCircle size={16} /> تواصل معنا عبر الرسائل</p><p className="flex items-center gap-2"><MapPin size={16} /> نصل إلى كل المحافظات</p></div></div>
    </div>
  </footer>;
}

export function CategoryGrid({ onSelect }: { onSelect: (category: Category) => void }) {
  return <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">{categories.map(category => <button key={category.name} onClick={() => onSelect(category.name)} className="category-tile" data-testid={`button-category-${category.name}`}><span className="category-icon"><CategoryIcon icon={category.icon} /></span><span className="text-xs font-bold text-center leading-5">{category.name}</span><span className="text-[10px] text-muted-foreground">{category.count} إعلان</span></button>)}</div>;
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="toast-market flex items-center gap-3" role="status" data-testid="status-toast"><span className="w-2 h-2 rounded-full bg-secondary shrink-0" /><span className="flex-1 text-sm">{message}</span><button onClick={onClose} aria-label="إغلاق" data-testid="button-close-toast"><X size={15} /></button></div>;
}
