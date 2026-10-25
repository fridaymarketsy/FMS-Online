require('dotenv').config();

const app = require('./src/app');

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`Friday Market API listening on port ${port}`);
});

// ابحث عن مسار الـ /health القديم واستبدله بهذا الكود الذكي:
app.get('/health', async (req, res) => {
  try {
    // محاولة قراءة جدول مستخدمي سوبابيس (أو أي جدول تجريبي لديك) للتأكد من الاتصال
    const { data, error } = await supabase.from('_test').select('*').limit(1);

    // إذا كان الخطأ هو فقط أن الجدول غير موجود، فهذا يعني أن الاتصال نجح والمفاتيح صحيحة!
    if (error && error.code === '42P01') {
      return res.status(200).json({ 
        status: "Healthy", 
        database_connection: "Connected Successfully (Table not created yet)" 
      });
    }

    // إذا وجد خطأ آخر في الاتصال أو المفاتيح
    if (error) throw error;

    // إذا نجح الاتصال بالكامل دون أخطاء
    res.status(200).json({ 
      status: "Healthy", 
      database_connection: "Connected Successfully" 
    });

  } catch (err) {
    // في حال فشل المستضيف في الوصول لقاعدة البيانات
    res.status(500).json({ 
      status: "Unhealthy", 
      error_message: err.message,
      tip: "تأكد من صحة الـ SUPABASE_URL والـ SERVICE_ROLE_KEY في إعدادات Render"
    });
  }
});
