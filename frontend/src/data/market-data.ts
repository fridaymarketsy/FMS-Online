export type Category =
  | 'سيارات'
  | 'عقارات'
  | 'موبايلات وأجهزة لوحية'
  | 'كمبيوترات'
  | 'إلكترونيات'
  | 'أثاث ومنزل'
  | 'ملابس'
  | 'وظائف'
  | 'خدمات'
  | 'ألعاب'
  | 'حيوانات'
  | 'أخرى';

export type Listing = {
  id: string;
  title: string;
  category: Category;
  subcategory: string;
  price: number;
  city: string;
  province?: string;
  condition: 'جديد' | 'مستعمل - ممتاز' | 'مستعمل - جيد' | 'غير محدد';
  date: string;
  description: string;
  image: string;
  sellerId: string;
  sellerName: string;
  sellerInitials: string;
  phone: string;
  contact: 'اتصال' | 'واتساب' | 'رسائل';
  featured?: boolean;
  images?: string[];
  approximateLocation?: string;
  createdAt?: string;
  expiresAt?: string;
  status?: 'active' | 'expired' | 'removed';
  views?: number;
  sellerMemberSince?: string;
};

export const governorates = ['دمشق', 'ريف دمشق', 'حمص', 'حلب', 'حماة', 'اللاذقية', 'طرطوس', 'إدلب', 'درعا', 'السويداء', 'دير الزور', 'الرقة', 'الحسكة'];

export const categories: { name: Category; icon: string; count: string; subcategories: string[] }[] = [
  { name: 'سيارات', icon: 'car', count: '١٬٢٤٠', subcategories: ['سيارات خاصة', 'دراجات نارية', 'قطع تبديل', 'شاحنات'] },
  { name: 'عقارات', icon: 'home', count: '٨٧٥', subcategories: ['للبيع', 'للإيجار', 'مكاتب', 'أراضٍ'] },
  { name: 'موبايلات وأجهزة لوحية', icon: 'smartphone', count: '٢٬١١٠', subcategories: ['آيفون', 'سامسونج', 'أجهزة لوحية', 'إكسسوارات'] },
  { name: 'كمبيوترات', icon: 'laptop', count: '٦٣٠', subcategories: ['لابتوب', 'كمبيوتر مكتبي', 'شاشات', 'قطع كمبيوتر'] },
  { name: 'إلكترونيات', icon: 'tv', count: '٩٤٠', subcategories: ['تلفزيونات', 'كاميرات', 'صوتيات', 'أجهزة منزلية'] },
  { name: 'أثاث ومنزل', icon: 'sofa', count: '١٬٥٨٠', subcategories: ['غرف نوم', 'صالونات', 'مطابخ', 'أدوات منزلية'] },
  { name: 'ملابس', icon: 'shirt', count: '٧٨٠', subcategories: ['نسائي', 'رجالي', 'أطفال', 'أحذية'] },
  { name: 'وظائف', icon: 'briefcase', count: '٣١٥', subcategories: ['دوام كامل', 'دوام جزئي', 'عن بعد', 'تدريب'] },
  { name: 'خدمات', icon: 'wrench', count: '٥٤٠', subcategories: ['صيانة', 'نقل', 'تصميم', 'دروس'] },
  { name: 'ألعاب', icon: 'gamepad', count: '٢٦٠', subcategories: ['بلايستيشن', 'إكس بوكس', 'ألعاب أطفال', 'بطاقات'] },
  { name: 'حيوانات', icon: 'paw', count: '١٩٠', subcategories: ['قطط', 'كلاب', 'طيور', 'مستلزمات'] },
  { name: 'أخرى', icon: 'more', count: '٩٨٠', subcategories: ['متنوع', 'كتب', 'هدايا', 'مفقودات'] },
];

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`;

export const initialListings: Listing[] = [
  { id: 'car-mazda-01', title: 'مازدا 3 موديل 2016 بحالة ممتازة', category: 'سيارات', subcategory: 'سيارات خاصة', price: 148000000, city: 'دمشق', condition: 'مستعمل - ممتاز', date: 'منذ ساعتين', description: 'سيارة مازدا 3 وارد ياباني، فحص كامل جاهزة للاستخدام. دهان وكالة ما عدا قطعة صغيرة، مكيف ممتاز وإطارات جديدة.', image: img('photo-1549317661-bd32c8ce0db2'), sellerId: 'samir-h', sellerName: 'سمير الحمصي', sellerInitials: 'سح', phone: '0944 218 730', contact: 'واتساب', featured: true },
  { id: 'phone-iphone-02', title: 'iPhone 13 Pro 256GB مع العلبة', category: 'موبايلات وأجهزة لوحية', subcategory: 'آيفون', price: 17500000, city: 'حلب', condition: 'مستعمل - ممتاز', date: 'منذ ٤ ساعات', description: 'آيفون 13 برو ذاكرة 256، صحة البطارية 89%، الجهاز نظيف جداً مع كامل أغراضه وشاحن أصلي.', image: img('photo-1592899677977-9c10ca588bbd'), sellerId: 'lina-a', sellerName: 'لينا أحمد', sellerInitials: 'لأ', phone: '0933 882 116', contact: 'اتصال' },
  { id: 'apt-damascus-03', title: 'شقة مفروشة للإيجار في المزة', category: 'عقارات', subcategory: 'للإيجار', price: 2200000, city: 'دمشق', condition: 'مستعمل - ممتاز', date: 'أمس', description: 'شقة طابق ثالث، غرفتان وصالون، فرش مرتب وتدفئة مازوت، قريبة من اتوستراد المزة والجامعة.', image: img('photo-1600607687939-ce8a6c25118c'), sellerId: 'nour-r', sellerName: 'نور العقارية', sellerInitials: 'نع', phone: '0951 600 443', contact: 'رسائل', featured: true },
  { id: 'laptop-lenovo-04', title: 'لابتوب Lenovo ThinkPad T14 للجامعة والعمل', category: 'كمبيوترات', subcategory: 'لابتوب', price: 8900000, city: 'حمص', condition: 'مستعمل - جيد', date: 'منذ أمس', description: 'معالج i5 جيل عاشر، رام 16GB، SSD 512GB، شاشة 14 إنش. بطارية جيدة ومناسب للبرمجة والدراسة.', image: img('photo-1496181133206-80ce9b88a853'), sellerId: 'maher-k', sellerName: 'ماهر كنعان', sellerInitials: 'مكن', phone: '0988 120 521', contact: 'واتساب' },
  { id: 'sofa-home-05', title: 'غرفة قعدة عربية مع طاولة خشب زان', category: 'أثاث ومنزل', subcategory: 'صالونات', price: 6500000, city: 'ريف دمشق', condition: 'مستعمل - ممتاز', date: 'منذ يومين', description: 'قعدة عربية تفصيل، قماش نظيف جداً، 6 مخدات وطاولة زان. البيع بسبب الانتقال.', image: img('photo-1555041469-a586c61ea9bc'), sellerId: 'rima-m', sellerName: 'ريما محمود', sellerInitials: 'رم', phone: '0991 340 222', contact: 'واتساب' },
  { id: 'camera-sony-06', title: 'كاميرا Sony A6400 مع عدسة 35mm', category: 'إلكترونيات', subcategory: 'كاميرات', price: 12000000, city: 'اللاذقية', condition: 'مستعمل - ممتاز', date: 'منذ ٣ أيام', description: 'كاميرا سوني A6400 قليلة الاستخدام، مع عدسة 35mm وبطاريتين وشنطة. مناسبة للتصوير وصناعة المحتوى.', image: img('photo-1516035069371-29a1b244cc32'), sellerId: 'tarek-s', sellerName: 'طارق صباغ', sellerInitials: 'طص', phone: '0942 445 090', contact: 'اتصال' },
  { id: 'job-designer-07', title: 'مطلوب مصمم سوشال ميديا بخبرة جيدة', category: 'وظائف', subcategory: 'دوام جزئي', price: 0, city: 'دمشق', condition: 'غير محدد', date: 'منذ ٣ أيام', description: 'مكتب دعاية وإعلان يطلب مصمم/ة للعمل بدوام جزئي. خبرة Photoshop وIllustrator، العمل من المكتب في البرامكة.', image: img('photo-1556761175-b413da4baf72'), sellerId: 'studio-n', sellerName: 'استوديو نقطة', sellerInitials: 'ان', phone: '0936 700 884', contact: 'رسائل' },
  { id: 'ps5-games-08', title: 'جهاز PlayStation 5 إصدار الديجيتال مع يدين', category: 'ألعاب', subcategory: 'بلايستيشن', price: 16500000, city: 'طرطوس', condition: 'مستعمل - ممتاز', date: 'منذ ٤ أيام', description: 'PS5 ديجيتال نظيف جداً مع يدين أصليتين وقاعدة عمودية. استخدام منزلي خفيف.', image: img('photo-1606144042614-b2417e99c4e3'), sellerId: 'yazan-d', sellerName: 'يزن ديب', sellerInitials: 'يد', phone: '0993 114 678', contact: 'واتساب' },
  { id: 'cat-persian-09', title: 'قط شيرازي لعوب مع مستلزماته', category: 'حيوانات', subcategory: 'قطط', price: 850000, city: 'حماة', condition: 'مستعمل - ممتاز', date: 'منذ ٥ أيام', description: 'قط شيرازي عمره سنة، مطعّم وهادئ ومتعود على المنزل. معه صندوق الرمل وبعض الطعام.', image: img('photo-1514888286974-6c03e2ca1dba'), sellerId: 'hala-j', sellerName: 'هلا جابر', sellerInitials: 'هج', phone: '0965 222 814', contact: 'اتصال' },
  { id: 'dress-10', title: 'فستان سهرة تركي جديد قياس 38', category: 'ملابس', subcategory: 'نسائي', price: 1100000, city: 'السويداء', condition: 'جديد', date: 'منذ أسبوع', description: 'فستان سهرة أنيق، لبسة واحدة فقط، اللون خمري والقياس 38. يمكن التوصيل ضمن المدينة.', image: img('photo-1566174053879-31528523f8ae'), sellerId: 'maya-q', sellerName: 'مايا قاسم', sellerInitials: 'مق', phone: '0944 810 503', contact: 'رسائل' },
  { id: 'service-ac-11', title: 'صيانة مكيفات وبرادات منزلية - خبرة 15 سنة', category: 'خدمات', subcategory: 'صيانة', price: 0, city: 'درعا', condition: 'غير محدد', date: 'منذ أسبوع', description: 'فك وتركيب وتنظيف وشحن فريون لجميع أنواع المكيفات والبرادات. التزام بالمواعيد وضمان على القطعة.', image: img('photo-1621905251189-08b45d6a269e'), sellerId: 'fadi-t', sellerName: 'فادي للصيانة', sellerInitials: 'فل', phone: '0948 550 099', contact: 'واتساب' },
  { id: 'plot-idlib-12', title: 'أرض زراعية 2 دونم قرب معرة النعمان', category: 'عقارات', subcategory: 'أراضٍ', price: 90000000, city: 'إدلب', condition: 'غير محدد', date: 'منذ أسبوعين', description: 'أرض زراعية مستوية، طريق واصل ومصدر مياه قريب، مناسبة للزراعة أو الاستثمار.', image: img('photo-1500382017468-9049fed747ef'), sellerId: 'adel-n', sellerName: 'عادل النجار', sellerInitials: 'عن', phone: '0982 313 640', contact: 'اتصال' },
];

export const sellerProfiles = {
  'samir-h': { name: 'سمير الحمصي', initials: 'سح', city: 'دمشق', memberSince: 'آذار 2022', rating: '4.8', listings: 12 },
  'lina-a': { name: 'لينا أحمد', initials: 'لأ', city: 'حلب', memberSince: 'أيلول 2023', rating: '4.9', listings: 6 },
  'nour-r': { name: 'نور العقارية', initials: 'نع', city: 'دمشق', memberSince: 'كانون الثاني 2021', rating: '4.7', listings: 28 },
  'maher-k': { name: 'ماهر كنعان', initials: 'مكن', city: 'حمص', memberSince: 'تموز 2022', rating: '4.6', listings: 8 },
};

export const formatPrice = (value: number) => value === 0 ? 'للتواصل' : `${new Intl.NumberFormat('ar-SY').format(value)} ل.س`;