

/**
 * Generates a universally unique identifier (UUID).
 * Uses the standard `crypto.randomUUID` if available in a secure context,
 * otherwise falls back to a simple pseudo-random string to ensure
 * functionality in non-secure contexts (like HTTP) or older browsers.
 */
export function generateUUID(): string {
  if (self.crypto && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  // Basic fallback for insecure contexts (http) or older browsers
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}


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

export interface ChartData {
    type: 'bar' | 'pie' | 'line' | 'table';
    title: string;
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        color?: string; // Optional: for multi-color charts
    }[];
}

export interface StructuredSource {
    name: string;
    link: string;
    publicationDate: string;
    author: string;
    credibility: string;
}

export interface StructuredAnalysis {
    proponents: StanceHolder[];
    opponents: StanceHolder[];
    acceptancePercentage: number;
    currentValidity: string;
    alternativeResults?: string;
}

export interface StatisticsResult {
    title: string;
    summary: string;
    keywords: string[];
    chart: ChartData;
    sourceDetails: StructuredSource & {
        methodology: string;
        sampleSize: string;
    };
    analysis: StructuredAnalysis;
    relatedSuggestions: string[];
    references: FactCheckSource[];
}

export interface ScientificArticleResult {
    title: string;
    summary: string;
    keywords: string[];
    sourceDetails: StructuredSource & {
        researchType: string;
        targetAudience: string;
    };
    analysis: StructuredAnalysis;
    relatedSuggestions: string[];
    references: FactCheckSource[];
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

export type AIInstructionType = 'fact-check' | 'news-search' | 'news-display' | 'news-ticker' | 'statistics-search' | 'science-search' | 'religion-search' | 'telegram-bot' | 'discord-bot' | 'website-bot' | 'twitter-bot';

export const aiInstructionLabels: Record<AIInstructionType, string> = {
  'fact-check': 'دستورالعمل فکت چک و ردیابی شایعه',
  'news-search': 'دستورالعمل جستجوی خبر',
  'news-display': 'دستورالعمل نمایش اخبار زنده',
  'news-ticker': 'دستورالعمل نوار اخبار متحرک',
  'statistics-search': 'دستورالعمل جستجوی آمار',
  'science-search': 'دستورالعمل جستجوی علمی',
  'religion-search': 'دستورالعمل جستجوی دینی',
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
    linkColor: string;
    borderColor: string;
    pauseOnHover: boolean;
    effect: 'none' | 'glow';
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
    // New settings for Cloudflare D1 backend
    cloudflareWorkerUrl: string;
    cloudflareWorkerToken: string;
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
    gemini: AIProviderSettings;
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
    searchSources: string[];
    allTickerCategories: string[];
    password?: string;
    structuredSearchDomains: string[];
    structuredSearchRegions: string[];
    structuredSearchSources: string[];
}


// --- CHAT ---
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
