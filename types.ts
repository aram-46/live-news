

export enum Credibility {
  High = 'بسیار معتبر',
  Medium = 'معتبر',
  Low = 'نیازمند بررسی',
}

export interface Filters {
  query: string;
  categories: string[];
  regions: string[];
  sources: string[];
}

export interface NewsArticle {
  title: string;
  summary: string;
  source: string;
  publicationTime: string;
  credibility: Credibility | string;
  link: string;
  category: string;
  imageUrl?: string;
}

export interface TickerArticle {
  title: string;
  link: string;
}

export interface FactCheckSource {
    url: string;
    title: string;
}

export interface FactCheckResult {
    credibility: Credibility;
    justification: string;
    sources: FactCheckSource[];
}

export type MediaFile = {
    name: string;
    type: string; // Mime type
    data: string; // Base64 data
    url: string; // Object URL for preview
};


// --- SETTINGS ---

export type SourceCategory = 'fact-check' | 'news-agencies' | 'social-media' | 'financial' | 'analytical';

export const sourceCategoryLabels: Record<SourceCategory, string> = {
  'fact-check': 'منابع فکت چک',
  'news-agencies': 'خبرگزاری‌ها',
  'social-media': 'شبکه‌های اجتماعی',
  'financial': 'بازار مالی',
  'analytical': 'تحلیلی'
};

export interface Source {
  id: string;
  name: string;
  field: string;
  url: string;
  activity: string;
  credibility: string;
  region: string;
}

export type Sources = Record<SourceCategory, Source[]>;

export type AIInstructionType = 'fact-check' | 'news-search' | 'news-display' | 'news-ticker';

export const aiInstructionLabels: Record<AIInstructionType, string> = {
  'fact-check': 'دستورالعمل فکت چک',
  'news-search': 'دستورالعمل جستجوی خبر',
  'news-display': 'دستورالعمل نمایش اخبار زنده',
  'news-ticker': 'دستورالعمل نوار اخبار متحرک',
};

export type AIInstructions = Record<AIInstructionType, string>;

export interface Theme {
  id: string;
  name: string;
  className: string;
}

export interface DisplaySettings {
    columns: number;
    articlesPerColumn: number;
    showImages: boolean;
    slideshow: {
        enabled: boolean;
        delay: number; // in seconds
    };
    allowedCategories: string[];
}

export interface TickerSettings {
    categories: string[];
    speed: number; // seconds for full marquee
    direction: 'left' | 'right';
    textColor: string;
    hoverColor: string;
}

export interface IntegrationSettings {
    telegram: {
        botToken: string;
        chatId: string;
    };
    discord: {
        webhookUrl: string;
    };
}

export interface DatabaseSettings {
    name: string;
    host: string;
    password: string
}

export interface AIProviderSettings {
    apiKey: string;
}

export interface AppAIModelSettings {
    openai: AIProviderSettings;
    openrouter: AIProviderSettings;
    groq: AIProviderSettings;
}

export interface AppSettings {
    theme: Theme;
    sources: Sources;
    aiInstructions: AIInstructions;
    display: DisplaySettings;
    ticker: TickerSettings;
    integrations: IntegrationSettings;
    database: DatabaseSettings;
    aiModelSettings: AppAIModelSettings;
    customCss: string;
    searchCategories: string[];
    searchRegions: string[];
    allTickerCategories: string[];
}