# سوق الجمعة

مشروع سوق إعلانات مبوبة يتكوّن من واجهة React/Vite في `frontend/` وواجهة API
مبنية بـ Express في `backend/`. يستخدم المشروع قاعدة Supabase الحالية للمصادقة
والبيانات، وCloudinary لرفع الصور الجديدة.

## التطوير المحلي

1. جهّز `backend/.env` من `backend/.env.example` وأضف إعدادات Supabase. أضف
   بيانات Cloudinary عند تفعيل رفع الصور.
2. شغّل الـAPI:

   ```sh
   cd backend
   npm ci
   npm run dev
   ```

   يعمل افتراضيًا على `http://localhost:3001`، ويتحقق `GET /health` من جاهزيته.
3. جهّز `frontend/.env` من `frontend/.env.example` باستخدام رابط Supabase
   ومفتاح `anon` العام، ثم شغّل الواجهة:

   ```sh
   cd frontend
   npm ci
   npm run dev
   ```

   يمرّر Vite طلبات `/api` إلى الـAPI المحلي. لا تضع مفتاح Supabase
   `service_role` أو أسرار Cloudinary في الواجهة أو في أي متغير يبدأ بـ`VITE_`.

## النشر

### Render (Backend)

يوجد إعداد Blueprint في `render.yaml`. أنشئ Web Service من هذا الملف؛ مجلد
الخدمة `backend/`، وأوامر البناء والتشغيل وفحص الصحة معرفة فيه. أضف في إعدادات
الخدمة:

- `FRONTEND_ORIGIN`: عنوان موقع Vercel المنشور، مثل `https://example.vercel.app`.
  يمكن فصل أكثر من عنوان بفاصلة. يظل `http://localhost:5173` مسموحًا للتطوير.
- `SUPABASE_URL`: عنوان مشروع Supabase الحالي.
- `SUPABASE_SERVICE_ROLE_KEY`: مفتاح الخدمة السري من Supabase.
- `CLOUDINARY_CLOUD_NAME` و`CLOUDINARY_API_KEY` و`CLOUDINARY_API_SECRET`:
  بيانات Cloudinary اللازمة لرفع الصور.

يعيّن Render متغير `PORT` تلقائيًا. يستخدم الخادم `3001` كقيمة افتراضية محلية.
تحقق من `https://<عنوان-الخدمة>/health` بعد النشر.

### Vercel (Frontend)

أنشئ مشروع Vercel بمجلد `frontend/` كـRoot Directory. يحدد
`frontend/vercel.json` أمر البناء، مجلد المخرجات، وإعادة توجيه مسارات React
Router إلى `index.html`.

أضف متغيرات البيئة التالية في Vercel لكل بيئة نشر:

- `VITE_API_URL`: عنوان Render متبوعًا بـ`/api`، مثل
  `https://example.onrender.com/api`.
- `VITE_SUPABASE_URL`: عنوان مشروع Supabase الحالي.
- `VITE_SUPABASE_ANON_KEY`: مفتاح Supabase العام `anon` فقط.

كل قيمة `VITE_` متاحة في المتصفح؛ لا تضع فيها مفاتيح سرية. بعد ضبط متغيرات
البيئة، أعد النشر لأن Vite يضمّنها أثناء البناء. أبقِ قاعدة Supabase الحالية
وملفات migrations وبياناتها كما هي.
