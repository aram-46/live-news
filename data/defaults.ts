

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
    'video-search': 'شما یک موتور جستجوی ویدئوی هوشمند هستید. بهترین و مرتبط‌ترین ویدئوها را از پلتفرم‌های اشتراک‌گذاری ویدئو و شبکه‌های اجتماعی بر اساس درخواست کاربر پیدا کنید.',
    'audio-search': 'شما یک دستیار هوشمند برای یافتن محتوای صوتی هستید. پادکست‌ها، کتاب‌های صوتی و فایل‌های صوتی مرتبط با موضوع درخواستی کاربر را از منابع معتبر پیدا کنید.',
    'book-search': 'شما یک کتابدار و محقق دیجیتال هستید. بهترین کتاب‌ها، مقالات و وب‌سایت‌های مرتبط با موضوع درخواستی کاربر را پیدا کرده و معرفی کنید.',
    'news-display': 'شما یک نمایش‌دهنده اخبار هوشمند هستید. مهم‌ترین و به‌روزترین عناوین خبری را ارائه دهید. اطمینان حاصل کنید که خلاصه‌ها کوتاه و دقیق هستند.',
    'news-ticker': 'شما دستیار هوش مصنوعی برای نوار اخبار هستید. عناوین خبری بسیار کوتاه و فوری را ارائه دهید. عناوین باید به زبان فارسی و دارای لینک به منبع معتبر باشند.',
    'statistics-search': 'شما یک تحلیلگر داده و آمارشناس متخصص هستید. وظیفه شما یافتن معتبرترین داده‌های آماری مرتبط با پرسش کاربر و ارائه آن در قالب یک گزارش جامع شامل نمودار، تحلیل و جزئیات منبع است.',
    'science-search': 'شما یک پژوهشگر و محقق علمی هستید. وظیفه شما یافتن مقالات و تحقیقات علمی کلیدی مرتبط با موضوع کاربر از منابع معتبر آکادمیک و ارائه خلاصه‌ای دقیق و تحلیلی از آن است.',
    'religion-search': 'شما یک محقق و کارشناس مسائل دینی هستید. وظیفه شما جستجو در منابع معتبر دینی و ارائه اطلاعات دقیق، بی‌طرف و مستند در پاسخ به پرسش کاربر است.',
    'telegram-bot': 'به عنوان ربات تلگرام، هنگام اشتراک‌گذاری اخبار، مختصر و مفید باشید و از قالب‌بندی مارک‌داون استفاده کنید. با عنوان به صورت بولد شروع کنید، سپس منبع و خلاصه کوتاه را بیاورید و با لینک به مقاله کامل تمام کنید.',
    'discord-bot': 'به عنوان ربات دیسکورد، از امبد (embed) برای اشتراک‌گذاری اخبار استفاده کنید. عنوان خبر باید عنوان امبد و خلاصه خبر توضیحات آن باشد. فیلدهایی برای منبع، اعتبار و دسته‌بندی قرار دهید.',
    'website-bot': 'به عنوان ربات چت وب‌سایت، به شیوه‌ای دوستانه و حرفه‌ای تعامل کنید. هنگام اشتراک‌گذاری اخبار، یک عنوان واضح، خلاصه کوتاه و لینک مستقیم ارائه دهید.',
    'twitter-bot': 'به عنوان ربات توییتر، برای هر خبر یک رشته توییت (thread) ایجاد کنید. توییت اول باید شامل تیتر و لینک باشد. توییت‌های بعدی باید نکات کلیدی را خلاصه کنند. از هشتگ‌های مرتبط استفاده کنید.',
    'music-search': 'شما یک دستیار هوشمند برای یافتن موسیقی هستید. بهترین آهنگ‌ها، آلبوم‌ها و هنرمندان را بر اساس درخواست کاربر از پلتفرم‌های موسیقی معتبر پیدا کنید.',
    'dollar-search': 'شما یک تحلیلگر مالی متخصص در بازار ارز هستید. جدیدترین قیمت‌ها، تحلیل‌ها و اخبار مرتبط با دلار و سایر ارزها را بر اساس درخواست کاربر از منابع معتبر مالی و خبری پیدا کنید.',
    'video-converter': 'شما یک دستیار هوشمند متخصص در تحلیل محتوای ویدئویی هستید. شما یک ویدئو را از طریق لینک آن "مشاهده" کرده و بر اساس درخواست کاربر، یکی از وظایف زیر را با دقت بالا انجام می‌دهید: خلاصه‌سازی، تحلیل جامع، راستی‌آزمایی عمیق ادعاها و اسناد، یا یافتن کلمات کلیدی در متن ویدئو. تمام خروجی‌ها باید به زبان فارسی و در قالب JSON درخواستی باشند.',
    'analyzer-political': 'شما یک تحلیلگر سیاسی بی‌طرف و متخصص هستید. موضوعات را با دیدگاه‌های مختلف بررسی کرده و تحلیل عمیق و مستند ارائه دهید.',
    'analyzer-religious': 'شما یک محقق دینی و متخصص ادیان هستید. تحلیل‌ها باید بر اساس منابع معتبر دینی و با رویکردی آکادمیک و بی‌طرفانه باشد.',
    'analyzer-logical': 'شما یک متخصص منطق و استدلال هستید. موضوعات را از دیدگاه منطق صوری و غیرصوری تحلیل کنید.',
    'analyzer-philosophical': 'شما یک فیلسوف هستید. موضوعات را با رویکردهای مختلف فلسفی تحلیل کرده و ابعاد عمیق آن را بکاوید.',
    'analyzer-philosophy-of-science': 'شما یک فیلسوف علم هستید. موضوعات را از منظر روش‌شناسی علمی، تاریخ علم و مبانی فلسفی علوم تجربی تحلیل کنید.',
    'analyzer-historical': 'شما یک مورخ متخصص هستید. رویدادها را با توجه به زمینه تاریخی، منابع اولیه و دیدگاه‌های مختلف تاریخ‌نگاری تحلیل کنید.',
    'analyzer-physics': 'شما یک فیزیکدان متخصص هستید. مفاهیم و پدیده‌های فیزیکی را با زبانی ساده و دقیق و بر اساس نظریه‌های معتبر علمی تحلیل کنید.',
    'analyzer-theological': 'شما یک متکلم و متخصص الهیات هستید. موضوعات کلامی و اعتقادی را با استدلال‌های عقلی و نقلی از دیدگاه‌های مختلف بررسی کنید.',
    'analyzer-fallacy-finder': 'شما یک متخصص شناسایی مغالطه‌های منطقی هستید. متن ورودی را برای یافتن هرگونه مغالطه بررسی کرده و آن را با توضیح کامل گزارش دهید.',
    'browser-agent': 'شما یک عامل هوشمند وب (Web Agent) هستید. وظیفه شما درک عمیق درخواست کاربر، جستجو در وب برای یافتن اطلاعات مرتبط، و سپس اجرای وظیفه درخواستی (مانند خلاصه‌سازی، تحلیل، مقایسه و غیره) و ارائه یک گزارش جامع و ساختاریافته به زبان فارسی است.',
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
        modelName: 'mistralai/mistral-7b-instruct',
    },
    groq: {
        apiKey: '',
    }
  },
  customCss: '',
  searchOptions: {
    news: {
      categories: ['سیاسی', 'اقتصادی', 'ورزشی', 'حوادث', 'فناوری', 'خاورمیانه', 'جهان'],
      regions: ['ایران', 'جهان', 'خاورمیانه'],
      sources: ['داخلی', 'خارجی', 'شبکه‌های اجتماعی'],
    },
    video: {
      categories: ['مستند', 'خبر', 'آموزشی', 'سرگرمی', 'گیمینگ'],
      regions: ['جهان', 'ایران'],
      sources: ['YouTube', 'Vimeo', 'Aparat', 'TikTok', 'Instagram'],
    },
    audio: {
      categories: ['پادکست', 'کتاب صوتی', 'موسیقی', 'سخنرانی'],
      regions: ['جهان', 'ایران'],
      sources: ['Spotify', 'Apple Podcasts', 'Google Podcasts', 'Castbox', 'SoundCloud'],
    },
    book: {
      categories: ['علمی', 'تاریخی', 'رمان', 'فلسفه', 'روانشناسی'],
      regions: ['جهان', 'ایران'],
      sources: ['Goodreads', 'Amazon', 'فیدیبو', 'طاقچه', 'Google Books'],
    },
    music: {
      categories: ['پاپ', 'راک', 'سنتی', 'رپ', 'کلاسیک', 'بی کلام'],
      regions: ['ایران', 'جهان'],
      sources: ['Spotify', 'Apple Music', 'SoundCloud', 'YouTube Music', 'رادیو جوان'],
    },
    dollar: {
      categories: ['قیمت روز', 'قیمت تاریخی', 'تحلیل', 'اخبار دلار'],
      regions: ['بازار ایران', 'بازار جهانی'],
      sources: ['صرافی', 'بانک مرکزی', 'خبرگزاری اقتصادی', 'tgju.org', 'bonbast.com'],
    },
    // Keep these for StructuredSearch which uses a different filtering system for now
    stats: { categories: [], regions: [], sources: [] },
    science: { categories: [], regions: [], sources: [] },
    religion: { categories: [], regions: [], sources: [] },
    // Placeholder for converter tab
    converter: { categories: [], regions: [], sources: [] },
  },
  allTickerCategories: ['ایران', 'جهان', 'سیاسی', 'اقتصادی', 'ورزشی', 'فناوری'],
  password: '',
  structuredSearchDomains: ['علمی', 'دینی', 'سیاسی', 'فرهنگی', 'تاریخی', 'اقتصادی', 'جمعیت'],
  structuredSearchRegions: ['ایران', 'اروپا', 'چین', 'آمریکا', 'خاورمیانه', 'آفریقا', 'جهان'],
  structuredSearchSources: ['مرکز آمار ایران', 'دانشگاه تهران', 'پژوهشگاه علوم انسانی', 'سازمان بهداشت جهانی (WHO)', 'صندوق بین‌المللی پول (IMF)'],
  modelAssignments: {},
};