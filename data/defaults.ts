

import { AppSettings, Theme, generateUUID } from '../types';

export const ALL_THEMES: Theme[] = [
  { id: 'base', name: 'پیش‌فرض (اقیانوس)', className: 'theme-base' },
  { id: 'neon-dreams', name: 'رویای نئونی', className: 'theme-neon-dreams' },
  { id: 'solar-flare', name: 'شراره خورشیدی', className: 'theme-solar-flare' },
  { id: 'sunset-glow', name: 'غروب درخشان (بنفش/صورتی)', className: 'theme-sunset-glow' },
  { id: 'citrus-burst', name: 'انفجار مرکبات (زرد/صورتی)', className: 'theme-citrus-burst' },
  { id: 'ocean-breeze', name: 'نسیم اقیانوس (نیلی/آبی)', className: 'theme-ocean-breeze' },
  { id: 'crimson-fire', name: 'آتش سرخ (قرمز/نارنجی)', className: 'theme-crimson-fire' },
];

export const INITIAL_SETTINGS: AppSettings = {
  theme: ALL_THEMES[0],
  sources: {
    'fact-check': [
      { id: generateUUID(), name: 'دوجداره', field: 'سیاسی، اجتماعی، فکت چک', url: 'http://www.dorjeh.com', activity: 'بررسی اخبار و شایعات، تحلیل منتقد', credibility: 'بالا (شفاف و مستقل)', region: 'خارج از ایران' },
      { id: generateUUID(), name: 'ویس چک', field: 'فکت چک، شبکه‌های اجتماعی', url: 'http://www.vicecheck.ir', activity: 'بررسی شایعات و اخبار جعلی', credibility: 'بالا (مستقل، تخصصی)', region: 'ایران (فعالیت از خارج)' }
    ],
    'news-agencies': [
      { id: generateUUID(), name: 'خبرگزاری ایسنا', field: 'سیاسی، اجتماعی، علمی', url: 'https://www.isna.ir', activity: 'گزارش‌های نسبتاً بی‌طرف از رویدادهای کشور', credibility: 'بالا (نسبت به داخلی‌ها)', region: 'ایران' },
      { id: generateUUID(), name: 'بی‌بی‌سی فارسی', field: 'سیاسی، اجتماعی، بین‌المللی', url: 'https://www.bbc.com/persian', activity: 'گزارش‌های تحقیقی، تحلیل بی‌طرف، فکت چک', credibility: 'بسیار بالا (مستقل، بین‌المللی)', region: 'بریتانیا' },
      { id: generateUUID(), name: 'The New York Times (NYT)', field: 'سیاسی، بین‌المللی، فرهنگی', url: 'https://www.nytimes.com', activity: 'خبر و تحلیل عمیق', credibility: 'بسیار بالا', region: 'ایالات متحده' },
      { id: generateUUID(), name: 'Reuters', field: 'اقتصاد، بین‌المللی، تجارت', url: 'https://www.reuters.com', activity: 'خبرگزاری بین‌المللی، سریع و دقیق', credibility: 'بسیار بالا', region: 'بریتانیا' },
    ],
    'social-media': [],
    'financial': [
      { id: generateUUID(), name: 'Bloomberg', field: 'اقتصاد، مالی، بازارهای جهانی', url: 'https://www.bloomberg.com', activity: 'تخصصی در اخبار مالی و تحلیل داده', credibility: 'بسیار بالا', region: 'ایالات متحده' },
    ],
    'analytical': [
      { id: generateUUID(), name: 'The Economist', field: 'سیاست، اقتصاد، تحلیل', url: 'https://www.economist.com', activity: 'تحلیل‌های استراتژیک', credibility: 'بسیار بالا (تحلیلی)', region: 'بریتانیا' },
    ],
  },
  aiInstructions: {
    'fact-check': 'شما یک روزنامه‌نگار تحقیقی متخصص در ردیابی اطلاعات غلط دیجیتال و شایعات شبکه‌های اجتماعی هستید. تحلیل شما باید بی‌طرف، عینی و بر اساس شواهد قابل راستی‌آزمایی از منابع معتبر باشد. اولویت اصلی شما یافتن منبع اولیه یک ادعا است.',
    'news-search': 'شما یک هوش مصنوعی گردآورنده خبر هستید. اخبار جدید، مرتبط و متنوع از منابع معتبر را در اولویت قرار دهید. از اخبار زرد و جنجالی پرهیز کنید.',
    'news-display': 'شما یک نمایش‌دهنده اخبار هوشمند هستید. مهم‌ترین و به‌روزترین عناوین خبری را ارائه دهید. اطمینان حاصل کنید که خلاصه‌ها کوتاه و دقیق هستند.',
    'news-ticker': 'شما دستیار هوش مصنوعی برای نوار اخبار هستید. عناوین خبری بسیار کوتاه و فوری را ارائه دهید. عناوین باید به زبان فارسی و دارای لینک به منبع معتبر باشند.',
    'statistics-search': 'شما یک تحلیلگر داده و آمارشناس متخصص هستید. وظیفه شما یافتن معتبرترین داده‌های آماری مرتبط با پرسش کاربر و ارائه آن در قالب یک گزارش جامع شامل نمودار، تحلیل و جزئیات منبع است.',
    'science-search': 'شما یک پژوهشگر و محقق علمی هستید. وظیفه شما یافتن مقالات و تحقیقات علمی کلیدی مرتبط با موضوع کاربر از منابع معتبر آکادمیک و ارائه خلاصه‌ای دقیق و تحلیلی از آن است.',
    'religion-search': 'شما یک محقق و کارشناس مسائل دینی هستید. وظیفه شما جستجو در منابع معتبر دینی و ارائه اطلاعات دقیق، بی‌طرف و مستند در پاسخ به پرسش کاربر است.',
    'telegram-bot': 'به عنوان ربات تلگرام، هنگام اشتراک‌گذاری اخبار، مختصر و مفید باشید و از قالب‌بندی مارک‌داون استفاده کنید. با عنوان به صورت بولد شروع کنید، سپس منبع و خلاصه کوتاه را بیاورید و با لینک به مقاله کامل تمام کنید.',
    'discord-bot': 'به عنوان ربات دیسکورد، از امبد (embed) برای اشتراک‌گذاری اخبار استفاده کنید. عنوان خبر باید عنوان امبد و خلاصه خبر توضیحات آن باشد. فیلدهایی برای منبع، اعتبار و دسته‌بندی قرار دهید.',
    'website-bot': 'به عنوان ربات چت وب‌سایت، به شیوه‌ای دوستانه و حرفه‌ای تعامل کنید. هنگام اشتراک‌گذاری اخبار، یک عنوان واضح، خلاصه کوتاه و لینک مستقیم ارائه دهید.',
    'twitter-bot': 'به عنوان ربات توییتر، برای هر خبر یک رشته توییت (thread) ایجاد کنید. توییت اول باید شامل تیتر و لینک باشد. توییت‌های بعدی باید نکات کلیدی را خلاصه کنند. از هشتگ‌های مرتبط استفاده کنید.',
  },
  display: {
    columns: 2,
    articlesPerColumn: 8,
    showImages: true,
    slideshow: {
        enabled: false,
        delay: 5,
    },
    allowedCategories: [],
  },
  ticker: {
      categories: ['ایران', 'جهان', 'فناوری'],
      speed: 40,
      direction: 'right',
      textColor: '#67e8f9',
      hoverColor: '#ffffff',
      linkColor: '#67e8f9',
      borderColor: 'rgba(6, 182, 212, 0.2)',
      pauseOnHover: true,
      effect: 'none',
  },
  liveNewsSpecifics: {
    categories: ['ایران', 'جهان'],
    newsGroups: ['فوری', 'تحلیلی'],
    regions: ['خاورمیانه'],
    selectedSources: {},
    font: {
      family: 'system-ui, sans-serif',
      size: 14,
      color: {
        from: '#e5e7eb',
        to: '#d1d5db'
      }
    },
    updates: {
      autoCheck: true,
      interval: 60, // minutes
    },
    autoSend: false,
  },
  integrations: {
      telegram: {
          botToken: '',
          chatId: ''
      },
      discord: {
          webhookUrl: ''
      },
      website: {
          apiUrl: '',
          apiKey: '',
          botUserId: '',
          roomIds: []
      },
      twitter: {
          apiKey: '',
          apiSecretKey: '',
          accessToken: '',
          accessTokenSecret: ''
      },
      appwrite: {
          endpoint: '',
          projectId: '',
          apiKey: '',
          databaseId: '',
          settingsCollectionId: '',
          newsArticlesCollectionId: '',
          chatHistoryCollectionId: '',
      },
      supabase: {
          projectUrl: '',
          anonKey: ''
      },
      cloudflareWorkerUrl: '',
      cloudflareWorkerToken: '',
  },
  database: {
    name: '',
    host: '',
    password: ''
  },
  aiModelSettings: {
    gemini: {
        apiKey: '',
    },
    openai: {
        apiKey: '',
    },
    openrouter: {
        apiKey: '',
    },
    groq: {
        apiKey: '',
    }
  },
  customCss: '',
  searchCategories: ['سیاسی', 'اقتصادی', 'ورزشی', 'حوادث', 'فناوری', 'خاورمیانه', 'جهان'],
  searchRegions: ['ایران', 'جهان', 'خاورمیانه'],
  searchSources: ['داخلی', 'خارجی', 'شبکه‌های اجتماعی'],
  allTickerCategories: ['ایران', 'جهان', 'سیاسی', 'اقتصادی', 'ورزشی', 'فناوری'],
  password: '',
  structuredSearchDomains: ['علمی', 'دینی', 'سیاسی', 'فرهنگی', 'تاریخی', 'اقتصادی', 'جمعیت'],
  structuredSearchRegions: ['ایران', 'اروپا', 'چین', 'آمریکا', 'خاورمیانه', 'آفریقا', 'جهان'],
  structuredSearchSources: ['مرکز آمار ایران', 'دانشگاه تهران', 'پژوهشگاه علوم انسانی', 'سازمان بهداشت جهانی (WHO)', 'صندوق بین‌المللی پول (IMF)'],
};