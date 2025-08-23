

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

export interface OriginalSourceInfo {
    name: string;
    credibility: string;
    publicationDate: string;
    author: string;
    evidenceType: string;
    evidenceCredibility: string;
    authorCredibility: string;
    link: string;
}

export interface StanceHolder {
    name: string;
    argument: string;
}

export interface FactCheckResult {
    overallCredibility: Credibility;
    summary: string;
    originalSource: OriginalSourceInfo;
    acceptancePercentage: number;
    proponents: StanceHolder[];
    opponents: StanceHolder[];
    relatedSuggestions: string[];
    relatedSources: FactCheckSource[];
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

export type AIInstructionType = 'fact-check' | 'news-search' | 'news-display' | 'news-ticker' | 'telegram-bot' | 'discord-bot' | 'website-bot' | 'twitter-bot';

export const aiInstructionLabels: Record<AIInstructionType, string> = {
  'fact-check': 'دستورالعمل فکت چک',
  'news-search': 'دستورالعمل جستجوی خبر',
  'news-display': 'دستورالعمل نمایش اخبار زنده',
  'news-ticker': 'دستورالعمل نوار اخبار متحرک',
  'telegram-bot': 'رفتار ربات تلگرام',
  'discord-bot': 'رفتار ربات دیسکورد',
  'website-bot': 'رفتار ربات وب‌سایت',
  'twitter-bot': 'رفتار ربات توییتر',
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

export interface WebsiteSettings {
    apiUrl: string;
    apiKey: string;
    botUserId: string;
    roomIds: string[];
}

export interface TwitterSettings {
    apiKey: string;
    apiSecretKey: string;
    accessToken: string;
    accessTokenSecret: string;
}

export interface AppwriteSettings {
    endpoint: string;
    projectId: string;
    apiKey: string;
}

export interface SupabaseSettings {
    projectUrl: string;
    anonKey: string;
}

export interface IntegrationSettings {
    telegram: {
        botToken: string;
        chatId: string;
    };
    discord: {
        webhookUrl: string;
    };
    website: WebsiteSettings;
    twitter: TwitterSettings;
    appwrite: AppwriteSettings;
    supabase: SupabaseSettings;
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

export interface FontSettings {
  family: string;
  size: number;
  color: {
    from: string;
    to: string;
  };
}

export interface UpdateSettings {
  autoCheck: boolean;
  interval: number; // in minutes
}

export interface LiveNewsSpecificSettings {
  categories: string[];
  newsGroups: string[];
  regions: string[];
  selectedSources: Record<string, string[]>;
  font: FontSettings;
  updates: UpdateSettings;
  autoSend: boolean;
}


export interface AppSettings {
    theme: Theme;
    sources: Sources;
    aiInstructions: AIInstructions;
    display: DisplaySettings;
    ticker: TickerSettings;
    liveNewsSpecifics: LiveNewsSpecificSettings;
    integrations: IntegrationSettings;
    database: DatabaseSettings;
    aiModelSettings: AppAIModelSettings;
    customCss: string;
    searchCategories: string[];
    searchRegions: string[];
    allTickerCategories: string[];
}