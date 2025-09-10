// This utility function is used to generate unique IDs for sources, articles, etc.
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface Theme {
  id: string;
  name: string;
  className: string;
}

export enum Credibility {
  High = 'بسیار معتبر',
  Medium = 'معتبر',
  Low = 'نیازمند بررسی',
}

export interface Source {
  id: string;
  name: string;
  field: string;
  url: string;
  activity: string;
  credibility: string;
  region: string;
}

export type SourceCategory = 'fact-check' | 'news-agencies' | 'social-media' | 'financial' | 'analytical';

export const sourceCategoryLabels: Record<SourceCategory, string> = {
  'fact-check': 'فکت-چک و راستی‌آزمایی',
  'news-agencies': 'خبرگزاری‌ها و رسانه‌ها',
  'social-media': 'شبکه‌های اجتماعی و وبلاگ‌ها',
  'financial': 'منابع مالی و اقتصادی',
  'analytical': 'منابع تحلیلی و تحقیقاتی',
};

export type Sources = Record<SourceCategory, Source[]>;

// FIX: Moved FindSourcesOptions from SourcesManager.tsx to here to be globally accessible.
export interface FindSourcesOptions {
  region: 'any' | 'internal' | 'external';
  language: 'any' | 'persian' | 'non-persian';
  count: number;
  credibility: 'any' | 'high' | 'medium';
}

export type AIInstructionType = 
    | 'fact-check' | 'deep-analysis' | 'news-search' | 'video-search' 
    | 'audio-search' | 'book-search' | 'news-display' | 'news-ticker' 
    | 'statistics-search' | 'science-search' | 'religion-search'
    | 'telegram-bot' | 'discord-bot' | 'website-bot' | 'twitter-bot'
    | 'music-search' | 'dollar-search' | 'video-converter'
    | 'analyzer-political' | 'analyzer-religious' | 'analyzer-logical'
    | 'analyzer-philosophical' | 'analyzer-philosophy-of-science' | 'analyzer-historical'
    | 'analyzer-physics' | 'analyzer-theological' | 'analyzer-fallacy-finder'
    | 'analyzer-debate'
    | 'browser-agent' | 'general-topics'
    | 'seo-keywords' | 'website-names' | 'domain-names' | 'article-generation'
    | 'page-builder' | 'podcast-search' | 'crypto-data' | 'crypto-search' | 'crypto-analysis'
    | 'wordpress-theme';


export const aiInstructionLabels: Record<AIInstructionType, string> = {
  'fact-check': 'دستورالعمل‌های فکت-چک',
  'deep-analysis': 'دستورالعمل‌های تحلیل عمیق',
  'news-search': 'دستورالعمل‌های جستجوی اخبار',
  'video-search': 'دستورالعمل‌های جستجوی ویدئو',
  'audio-search': 'دستورالعمل‌های جستجوی صدا',
  'book-search': 'دستورالعمل‌های جستجوی کتاب و سایت',
  'news-display': 'دستورالعمل‌های نمایش اخبار',
  'news-ticker': 'دستورالعمل‌های نوار اخبار',
  'statistics-search': 'دستورالعمل‌های جستجوی آمار',
  'science-search': 'دستورالعمل‌های جستجوی علمی',
  'religion-search': 'دستورالعمل‌های جستجوی دینی',
  'telegram-bot': 'دستورالعمل‌های ربات تلگرام',
  'discord-bot': 'دستورالعمل‌های ربات دیسکورد',
  'website-bot': 'دستورالعمل‌های ربات وب‌سایت',
  'twitter-bot': 'دستورالعمل‌های ربات توییتر',
  'music-search': 'دستورالعمل‌های جستجوی موسیقی',
  'dollar-search': 'دستورالعمل‌های جستجوی ارز',
  'video-converter': 'دستورالعمل‌های تبدیل‌گر ویدئو',
  'analyzer-political': 'تحلیل‌گر سیاسی',
  'analyzer-religious': 'تحلیل‌گر دینی',
  'analyzer-logical': 'تحلیل‌گر منطق',
  'analyzer-philosophical': 'تحلیل‌گر فلسفی',
  'analyzer-philosophy-of-science': 'تحلیل‌گر فلسفه علم',
  'analyzer-historical': 'تحلیل‌گر تاریخی',
  'analyzer-physics': 'تحلیل‌گر فیزیک',
  'analyzer-theological': 'تحلیل‌گر کلامی',
  'analyzer-fallacy-finder': 'مغالطه‌یاب',
  'analyzer-debate': 'شبیه‌ساز مناظره',
  'browser-agent': 'عامل هوشمند وب',
  'general-topics': 'موضوعات عمومی',
  'seo-keywords': 'کلمات کلیدی سئو',
  'website-names': 'نام وب‌سایت',
  'domain-names': 'نام دامنه',
  'article-generation': 'تولید مقاله',
  'page-builder': 'صفحه‌ساز',
  'podcast-search': 'جستجوی پادکست',
  'crypto-data': 'داده‌های ارز دیجیتال',
  'crypto-search': 'جستجوی ارز دیجیتال',
  'crypto-analysis': 'تحلیل ارز دیجیتال',
  'wordpress-theme': 'قالب وردپرس',
};

export type AIInstructions = Record<AIInstructionType, string>;

export interface DisplaySettings {
  columns: number;
  articlesPerColumn: number;
  showImages: boolean;
  slideshow: {
    enabled: boolean;
    delay: number;
  };
  allowedCategories: string[];
}

export interface TickerSettings {
  categories: string[];
  speed: number;
  direction: 'left' | 'right';
  textColor: string;
  hoverColor: string;
  linkColor: string;
  borderColor: string;
  pauseOnHover: boolean;
  effect: 'none' | 'glow';
}

export interface FontSettings {
  family: string;
  size: number;
  color: {
    from: string;
    to: string;
  };
}

export interface LiveNewsSpecificSettings {
  categories: string[];
  newsGroups: string[];
  regions: string[];
  selectedSources: Record<string, string[]>;
  font: FontSettings;
  updates: {
    autoCheck: boolean;
    interval: number; // in minutes
  };
  autoSend: boolean;
}

export interface TelegramSettings {
  botToken: string;
  chatId: string;
}
export interface DiscordSettings {
  webhookUrl: string;
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
    databaseId: string;
    settingsCollectionId: string;
    newsArticlesCollectionId: string;
    chatHistoryCollectionId: string;
    searchHistoryCollectionId: string;
}
export interface SupabaseSettings {
    projectUrl: string;
    anonKey: string;
}

export interface IntegrationSettings {
  telegram: TelegramSettings;
  discord: DiscordSettings;
  website: WebsiteSettings;
  twitter: TwitterSettings;
  appwrite: AppwriteSettings;
  supabase: SupabaseSettings;
  cloudflareWorkerUrl: string;
  cloudflareWorkerToken: string;
}

export type AIModelProvider = 'gemini' | 'openai' | 'openrouter' | 'groq';

export interface AppAIModelSettings {
    gemini: { apiKey: string };
    openai: { apiKey: string };
    openrouter: { apiKey: string; modelName: string; };
    groq: { apiKey: string; };
}

export type SearchTab = 'news' | 'video' | 'audio' | 'book' | 'stats' | 'science' | 'religion' | 'podcast' | 'music' | 'dollar' | 'general_topics';

export interface SearchOptions {
    news: { categories: string[]; regions: string[]; sources: string[]; };
    video: { categories: string[]; regions: string[]; sources: string[]; };
    audio: { categories: string[]; regions: string[]; sources: string[]; };
    book: { categories: string[]; regions: string[]; sources: string[]; };
    podcast: { categories: string[]; regions: string[]; sources: string[]; };
    music: { categories: string[]; regions: string[]; sources: string[]; };
    dollar: { categories: string[]; regions: string[]; sources: string[]; };
    stats: { categories: string[]; regions: string[]; sources: string[]; };
    science: { categories: string[]; regions: string[]; sources: string[]; };
    religion: { categories: string[]; regions: string[]; sources: string[]; };
    general_topics: { categories: string[]; regions: string[]; sources: string[]; };
}


export interface AppSettings {
  theme: Theme;
  sources: Sources;
  aiInstructions: AIInstructions;
  display: DisplaySettings;
  ticker: TickerSettings;
  liveNewsSpecifics: LiveNewsSpecificSettings;
  integrations: IntegrationSettings;
  database: { name: string; host: string; password: string };
  aiModelSettings: AppAIModelSettings;
  customCss: string;
  searchOptions: SearchOptions;
  allTickerCategories: string[];
  password?: string;
  structuredSearchDomains: string[];
  structuredSearchRegions: string[];
  structuredSearchSources: string[];
  generalTopicDomains: string[];
  modelAssignments: Partial<Record<AIInstructionType, AIModelProvider>>;
  defaultProvider: AIModelProvider;
}

export interface NewsArticle {
  title: string;
  summary: string;
  link: string;
  source: string;
  publicationTime: string;
  credibility: Credibility | string;
  category: string;
  imageUrl?: string;
}

export interface TickerArticle {
  title: string;
  link: string;
}

export interface Filters {
  query: string;
  categories: string[];
  regions: string[];
  sources: string[];
}

export interface FactCheckSource {
  name: string;
  link: string;
  publicationDate: string;
  credibility: Credibility | string;
  summary: string;
}

export interface FactCheckResult {
  overallCredibility: Credibility | string;
  summary: string;
  sources: FactCheckSource[];
}

export interface MediaFile {
  name: string;
  type: string;
  data: string; // Base64 encoded
  url: string; // Object URL for preview
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ChatSession {
    id: string;
    name: string;
    timestamp: number;
    messages: ChatMessage[];
}


export interface WebResult {
  title: string;
  link: string;
  description: string;
  source: string;
  imageUrl?: string;
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface StanceHolder {
    name: string;
    argument: string;
}

export interface HostingSite {
    name: string;
    url: string;
}

export interface PodcastResult {
    title: string;
    summary: string;
    publisher: string;
    topic: string;
    publicationYear: string;
    link: string;
    audioUrl: string;
    proponents: StanceHolder[];
    opponents: StanceHolder[];
    hostingSites?: HostingSite[];
}

export interface ChartData {
  type: 'bar' | 'pie' | 'line' | 'table';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface StatisticsResult {
  title: string;
  summary: string;
  keywords: string[];
  chart: ChartData;
  sourceDetails: {
    name: string;
    link: string;
    publicationDate: string;
    author: string;
    credibility: string;
  };
  analysis: {
    acceptancePercentage: number;
    currentValidity: string;
    alternativeResults: string;
  };
  relatedSuggestions: string[];
}
export interface ScientificArticleResult extends Omit<StatisticsResult, 'chart'> {}

export interface AgentClarificationRequest {
  isClear: boolean;
  refinedPrompt?: string;
  questions?: {
    questionText: string;
    questionType: 'multiple-choice' | 'text-input';
    options?: string[];
  }[];
}

export interface AgentExecutionResult {
  summary: string;
  steps: {
    title: string;
    description: string;
  }[];
  sources: GroundingSource[];
}

export type MenuItem = {
  id: string;
  label: string;
  link: string;
  parentId?: string;
  children?: MenuItem[];
};
export type Slide = {
    id: string;
    type: 'upload' | 'url';
    content: string; // base64 data or url
    name: string;
    caption: string;
};
export interface PageConfig {
    template: 'Minimalist Dark' | 'Professional Light' | 'Creative Portfolio';
    layoutColumns: 1 | 2;
    header: boolean;
    footer: boolean;
    menu: {
        enabled: boolean;
        items: MenuItem[];
        fontFamily: string;
        fontSize: number;
        textColor: string;
        bgColor: string;
        borderColor: string;
        borderRadius: number;
        gradientFrom: string;
        gradientTo: string;
        iconColor: string;
    };
    slideshow: {
        enabled: boolean;
        slides: Slide[];
        style: 'Carousel' | 'Grid';
        animation: 'Slide' | 'Fade';
        direction: 'Horizontal' | 'Vertical';
        delay: number;
        speed: number;
        width: string;
        height: string;
        captionFontFamily: string;
        captionFontSize: number;
        captionColor: string;
        captionBgColor: string;
    };
    marquee: {
        enabled: boolean;
        text: string;
        fontFamily: string;
        fontSize: number;
        textColor: string;
        bgColor: string;
        speed: number;
        direction: 'left' | 'right';
        border: string;
        padding: string;
    };
}


export interface WordPressThemePlan {
    understanding: string;
    themeName: string;
    features: string[];
    colorPalette: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    typography: {
        headings: {
            fontFamily: string;
            fontWeight: number;
        };
        body: {
            fontFamily: string;
            fontSize: string;
        };
    };
}
export interface AnalysisStance {
  name: string;
  argument: string;
  scientificLevel: number; // 1-5
}

export interface AnalysisExample {
    title: string;
    content: string;
}

export interface AnalysisResult {
    understanding: string;
    analysis: string;
    proponentPercentage: number;
    proponents: AnalysisStance[];
    opponents: AnalysisStance[];
    examples: AnalysisExample[];
    sources: { title: string; url: string; }[];
    techniques: string[];
    suggestions: { title: string; url: string; }[];
}

export interface FallacyResult {
    identifiedFallacies: {
        type: string;
        quote: string;
        explanation: string;
        correctedStatement: string;
    }[];
}

export type AnalyzerTabId = 'political' | 'religious' | 'logical' | 'philosophical' | 'philosophy-of-science' | 'historical' | 'physics' | 'theological' | 'fallacy-finder';
export const analyzerTabLabels: Record<AnalyzerTabId, string> = {
    'political': 'سیاسی',
    'religious': 'دینی',
    'logical': 'منطقی',
    'philosophical': 'فلسفی',
    'philosophy-of-science': 'فلسفه علم',
    'historical': 'تاریخی',
    'physics': 'فیزیک',
    'theological': 'کلامی',
    'fallacy-finder': 'مغالطه‌یاب'
};
export type Stance = 'proponent' | 'opponent' | 'neutral';

export interface VideoFactCheckClaim {
    claimText: string;
    analysis: string;
    evidence: {
        evidenceText: string;
        isReal: boolean;
        isCredible: boolean;
        isRelevant: boolean;
        sourceLink?: string;
    }[];
}

export interface VideoFactCheckResult {
    overallVerdict: string;
    claims: VideoFactCheckClaim[];
}

export interface VideoTimestampResult {
    found: boolean;
    timestamps: {
        timestamp: string;
        sentence: string;
    }[];
}

export interface TranscriptionResult {
    transcription: string;
}

export interface CryptoCoin {
    id: string;
    symbol: string;
    name: string;
    price_usd: number;
    price_toman: number;
    price_change_percentage_24h: number;
    image?: string;
}

export interface SimpleCoin {
    id: string;
    symbol: string;
    name: string;
}

export interface CryptoSearchResult {
    coin: CryptoCoin;
    summary: string;
    sources: {
        name: string;
        link: string;
        credibility: Credibility | string;
    }[];
}

export interface CryptoAnalysisResult {
    coinName: string;
    symbol: string;
    summary: string;
    technicalAnalysis: {
        title: string;
        content: string;
        keyLevels: {
            support: string[];
            resistance: string[];
        };
    };
    fundamentalAnalysis: {
        title: string;
        content: string;
        keyMetrics: { name: string; value: string }[];
    };
    sentimentAnalysis: {
        title: string;
        content: string;
        score: number;
    };
    futureOutlook: string;
}

export interface GeneralTopicResult {
    title: string;
    summary: string;
    keyPoints: { title: string; description: string; }[];
    comparison?: {
        topicA: string;
        topicB: string;
        points: {
            aspect: string;
            analysisA: string;
            analysisB: string;
        }[];
    };
    sources: GroundingSource[];
}

export interface SearchHistoryItem {
    id: string;
    type: string;
    query: string;
    timestamp: number;
    resultSummary: string;
    isFavorite: boolean;
}

// --- DEBATE SIMULATOR TYPES ---
export type DebateRole = 'moderator' | 'proponent' | 'opponent' | 'neutral';

export const debateRoleLabels: Record<DebateRole, string> = {
    'moderator': 'مدیر جلسه',
    'proponent': 'موافق',
    'opponent': 'مخالف',
    'neutral': 'بی‌طرف'
};

export interface DebateParticipant {
    id: number;
    role: DebateRole;
    name: string;
    avatar?: string; // Base64 data URL
    modelProvider: AIModelProvider;
}

export interface DebateConfig {
    topic: string;
    participants: DebateParticipant[];
    starter: DebateRole;
    turnLimit: number; // Turns per participant
    responseLength: 'short' | 'medium' | 'long';
    tone: 'formal' | 'passionate' | 'academic';
}

export interface TranscriptEntry {
    participant: DebateParticipant;
    text: string;
}