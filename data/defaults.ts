

import { AppSettings, Theme } from '../types';

export const ALL_THEMES: Theme[] = [
  { id: 'base', name: 'پیش‌فرض (اقیانوس)', className: 'theme-base' },
  { id: 'neon-dreams', name: 'رویای نئونی', className: 'theme-neon-dreams' },
  { id: 'solar-flare', name: 'شراره خورشیدی', className: 'theme-solar-flare' },
];

export const INITIAL_SETTINGS: AppSettings = {
  theme: ALL_THEMES[0],
  sources: {
    'fact-check': [
      { id: self.crypto.randomUUID(), name: 'دوجداره', field: 'سیاسی، اجتماعی، فکت چک', url: 'http://www.dorjeh.com', activity: 'بررسی اخبار و شایعات، تحلیل منتقد', credibility: 'بالا (شفاف و مستقل)', region: 'خارج از ایران' },
      { id: self.crypto.randomUUID(), name: 'ویس چک', field: 'فکت چک، شبکه‌های اجتماعی', url: 'http://www.vicecheck.ir', activity: 'بررسی شایعات و اخبار جعلی', credibility: 'بالا (مستقل، تخصصی)', region: 'ایران (فعالیت از خارج)' }
    ],
    'news-agencies': [
      { id: self.crypto.randomUUID(), name: 'خبرگزاری ایسنا', field: 'سیاسی، اجتماعی، علمی', url: 'https://www.isna.ir', activity: 'گزارش‌های نسبتاً بی‌طرف از رویدادهای کشور', credibility: 'بالا (نسبت به داخلی‌ها)', region: 'ایران' },
      { id: self.crypto.randomUUID(), name: 'بی‌بی‌سی فارسی', field: 'سیاسی، اجتماعی، بین‌المللی', url: 'https://www.bbc.com/persian', activity: 'گزارش‌های تحقیقی، تحلیل بی‌طرف، فکت چک', credibility: 'بسیار بالا (مستقل، بین‌المللی)', region: 'بریتانیا' },
      { id: self.crypto.randomUUID(), name: 'The New York Times (NYT)', field: 'سیاسی، بین‌المللی، فرهنگی', url: 'https://www.nytimes.com', activity: 'خبر و تحلیل عمیق', credibility: 'بسیار بالا', region: 'ایالات متحده' },
      { id: self.crypto.randomUUID(), name: 'Reuters', field: 'اقتصاد، بین‌المللی، تجارت', url: 'https://www.reuters.com', activity: 'خبرگزاری بین‌المللی، سریع و دقیق', credibility: 'بسیار بالا', region: 'بریتانیا' },
    ],
    'social-media': [],
    'financial': [
      { id: self.crypto.randomUUID(), name: 'Bloomberg', field: 'اقتصاد، مالی، بازارهای جهانی', url: 'https://www.bloomberg.com', activity: 'تخصصی در اخبار مالی و تحلیل داده', credibility: 'بسیار بالا', region: 'ایالات متحده' },
    ],
    'analytical': [
      { id: self.crypto.randomUUID(), name: 'The Economist', field: 'سیاست، اقتصاد، تحلیل', url: 'https://www.economist.com', activity: 'تحلیل‌های استراتژیک', credibility: 'بسیار بالا (تحلیلی)', region: 'بریتانیا' },
    ],
  },
  aiInstructions: {
    'fact-check': 'You are an expert fact-checker. Your analysis must be neutral, objective, and based on verifiable evidence from reputable sources.',
    'news-search': 'You are a news aggregator AI. Prioritize recent, relevant, and diverse news from reliable sources. Avoid sensationalism and clickbait.',
    'news-display': 'You are an AI news curator. Provide the most significant and timely news headlines. Ensure the summaries are concise and accurately reflect the article content.',
    'news-ticker': 'You are an AI assistant for a news ticker. Provide very short, breaking news headlines. The headlines must be in Persian and link to a reputable source.',
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
      speed: 30,
      direction: 'left',
      textColor: '#67e8f9',
      hoverColor: '#ffffff',
  },
  integrations: {
      telegram: {
          botToken: '',
          chatId: ''
      },
      discord: {
          webhookUrl: ''
      }
  },
  database: {
    name: '',
    host: '',
    password: ''
  },
  aiModelSettings: {
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
  allTickerCategories: ['ایران', 'جهان', 'سیاسی', 'اقتصادی', 'ورزشی', 'فناوری'],
};