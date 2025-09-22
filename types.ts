import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
// --- Utility ---
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// --- Enums ---
export enum Credibility {
    High = "بسیار معتبر",
    Medium = "معتبر",
    Low = "نیازمند بررسی",
}

// --- API Status ---
export type ApiKeyStatus = 'valid' | 'invalid_key' | 'not_set' | 'quota_exceeded' | 'network_error' | 'checking';


// --- Core Data Structures ---

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface NewsArticle {
    id: string;
    title: string;
    summary: string;
    link: string;
    source: string;
    publicationTime: string;
    credibility: Credibility | string;
    category: string;
    imageUrl?: string;
    groundingSources?: GroundingSource[];
}

export interface TickerArticle {
    title: string;
    link: string;
}

export interface MediaFile {
    name: string;
    type: string;
    data: string; // base64 encoded
    url: string; // Object URL for preview
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export interface SearchHistoryItem {
    id: string;
    type: string;
    query: string;
    timestamp: number;
    resultSummary: string;
    isFavorite: boolean;
    data?: any; // To store the full JSON output
}

// --- Settings-related types ---

export interface FontSettings {
    family: string;
    size: number;
    color: {
        from: string;
        to: string;
    };
}

export interface TickerSettings {
    speed: number;
    direction: 'left' | 'right';
    textColor: string;
    hoverColor: string;
    borderColor: string;
    effect: 'none' | 'glow';
    pauseOnHover: boolean;
}

export interface DisplaySettings {
    columns: number;
    articlesPerColumn: number;
    showImages: boolean;
    allowedCategories: string[];
}

export interface LiveNewsSpecificSettings {
    updates: {
        autoCheck: boolean;
        interval: number; // in minutes
    };
    autoSend: boolean;
    selectedSources: Record<string, string[]>;
    font: FontSettings;
    categories: string[];
    newsGroups: string[];
    regions: string[];
    articlesToDisplay: number;
}

export interface RSSFeedSpecificSettings {
    columns: number;
    articlesToDisplay: number;
    sliderView: boolean;
    font: FontSettings;
}

export type AIInstructionType =
    | 'news-ticker' | 'news-display' | 'rss-feeds' | 'news-search'
    | 'video-search' | 'audio-search' | 'book-search' | 'music-search'
    | 'dollar-search' | 'podcast-search' | 'fact-check' | 'stats-search'
    | 'science-search' | 'religion-search' | 'general-topics'
    | 'video-converter' | 'browser-agent' | 'seo-keywords' | 'website-names'
    | 'domain-names' | 'article-generation' | 'page-builder' | 'wordpress-theme'
    | 'crypto-data' | 'crypto-search' | 'crypto-analysis'
    | 'analyzer-political' | 'analyzer-economic' | 'analyzer-social'
    | 'analyzer-propaganda' | 'analyzer-fallacy-finder' | 'analyzer-debate'
    | 'analyzer-user-debate' | 'research-analysis' | 'analyzer-media'
    | 'statistical-research';

export type AIInstructions = Record<AIInstructionType, string>;

export const aiInstructionLabels: Record<AIInstructionType, string> = {
    'news-ticker': 'نوار اخبار متحرک',
    'news-display': 'نمایش اخبار زنده',
    'rss-feeds': 'جمع‌آوری از خبرخوان',
    'news-search': 'جستجوی پیشرفته اخبار',
    'video-search': 'جستجوی ویدئو',
    'audio-search': 'جستجوی صوت',
    'book-search': 'جستجوی کتاب و سایت',
    'music-search': 'جستجوی موزیک',
    'dollar-search': 'جستجوی قیمت ارز',
    'podcast-search': 'جستجوی پادکست',
    'fact-check': 'فکت چک و راستی‌آزمایی',
    'stats-search': 'جستجوی آمار',
    'science-search': 'جستجوی مقالات علمی',
    'religion-search': 'جستجوی موضوعات دینی',
    'general-topics': 'جستجوی موضوعات عمومی',
    'video-converter': 'تحلیل و تبدیل ویدئو',
    'browser-agent': 'عامل هوشمند وب',
    'seo-keywords': 'تولید کلمات کلیدی سئو',
    'website-names': 'پیشنهاد نام سایت',
    'domain-names': 'پیشنهاد نام دامنه',
    'article-generation': 'تولید مقاله',
    'page-builder': 'ساخت صفحه "درباره من"',
    'wordpress-theme': 'تولید قالب وردپرس',
    'crypto-data': 'دریافت داده کریپتو',
    'crypto-search': 'جستجوی ارز دیجیتال',
    'crypto-analysis': 'تحلیل ارز دیجیتال',
    'analyzer-political': 'تحلیل سیاسی',
    'analyzer-economic': 'تحلیل اقتصادی',
    'analyzer-social': 'تحلیل اجتماعی',
    'analyzer-propaganda': 'ردیابی پروپاگاندا',
    'analyzer-fallacy-finder': 'شناسایی مغالطه‌ها',
    'analyzer-debate': 'شبیه‌ساز مناظره',
    'analyzer-user-debate': 'تحلیلگر مناظره کاربر',
    'research-analysis': 'تحلیلگر تحقیقات',
    'analyzer-media': 'تحلیلگر رسانه (ویدئو/تصویر)',
    'statistical-research': 'تحلیلگر تحقیقات آماری',
};

export type AIModelProvider = 'gemini' | 'openai' | 'openrouter' | 'groq';

export interface AppAIModelSettings {
    gemini: { apiKey: string; };
    openai: { apiKey: string; };
    openrouter: { apiKey: string; modelName: string; };
    groq: { apiKey: string; };
}

export type AIModelAssignments = Partial<Record<AIInstructionType, AIModelProvider>>;


export interface Theme {
    id: string;
    name: string;
    className: string;
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

export type SourceCategory = 'news-agencies' | 'fact-check' | 'social-media' | 'financial' | 'analytical';

export const sourceCategoryLabels: Record<SourceCategory, string> = {
    'news-agencies': 'خبرگزاری‌ها و سایت‌های خبری',
    'fact-check': 'سایت‌های فکت-چک',
    'social-media': 'شبکه‌های اجتماعی و وبلاگ‌ها',
    'financial': 'منابع مالی و اقتصادی',
    'analytical': 'منابع تحلیلی و تحقیقاتی',
};

export type Sources = Record<SourceCategory, Source[]>;

export interface RSSFeed {
    id: string;
    name: string;
    url: string;
    category: SourceCategory;
}

export type RSSFeeds = Record<SourceCategory, RSSFeed[]>;

export type SearchTab = 'news' | 'video' | 'audio' | 'book' | 'music' | 'dollar' | 'stats' | 'science' | 'religion' | 'podcast' | 'general_topics';

export interface SearchOptionsPerTab {
    categories: string[];
    regions: string[];
    sources: string[];
}

export type SearchOptions = Record<SearchTab, SearchOptionsPerTab>;

export interface TelegramSettings { botToken: string; chatId: string; }
export interface DiscordSettings { webhookUrl: string; }
export interface TwitterSettings { apiKey: string; apiSecretKey: string; accessToken: string; accessTokenSecret: string; }
export interface WebsiteSettings { apiUrl: string; apiKey: string; botUserId: string; roomIds: string[]; }
export interface AppwriteSettings { endpoint: string; projectId: string; apiKey: string; databaseId: string; settingsCollectionId: string; newsArticlesCollectionId: string; chatHistoryCollectionId: string; }
export interface SupabaseSettings { projectUrl: string; anonKey: string; }

export interface IntegrationSettings {
    telegram: TelegramSettings;
    discord: DiscordSettings;
    twitter: TwitterSettings;
    website: WebsiteSettings;
    appwrite: AppwriteSettings;
    supabase: SupabaseSettings;
    cloudflareWorkerUrl: string;
    cloudflareWorkerToken: string;
}

export interface AppSettings {
    theme: Theme;
    customCss: string;
    display: DisplaySettings;
    ticker: TickerSettings;
    allTickerCategories: string[];
    sources: Sources;
    rssFeeds: RSSFeeds;
    aiInstructions: AIInstructions;
    aiModelSettings: AppAIModelSettings;
    defaultProvider: AIModelProvider;
    modelAssignments: AIModelAssignments;
    liveNewsSpecifics: LiveNewsSpecificSettings;
    rssFeedSpecifics: RSSFeedSpecificSettings;
    searchOptions: SearchOptions;
    structuredSearchDomains: string[];
    generalTopicDomains: string[];
    integrations: IntegrationSettings;
    password?: string;
}

// --- API & Function Payloads ---

export interface Filters {
    query: string;
    categories: string[];
    regions: string[];
    sources: string[];
}

export interface FactCheckResult {
    overallCredibility: Credibility | string;
    summary: string;
    sources: {
        name: string;
        link: string;
        publicationDate: string;
        credibility: Credibility | string;
        summary: string;
    }[];
    groundingSources?: GroundingSource[];
}

// --- Specialized Search Results ---

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
    topic: string;
    publisher: string;
    publicationYear: string;
    link: string;
    audioUrl: string;
    proponents: StanceHolder[];
    opponents: StanceHolder[];
    hostingSites: HostingSite[];
    groundingSources?: GroundingSource[];
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
        author: string;
        publicationDate: string;
        credibility: Credibility | string;
    };
    analysis: {
        acceptancePercentage: number;
        currentValidity: string;
        alternativeResults?: string;
    };
    relatedSuggestions: string[];
    groundingSources?: GroundingSource[];
}

export type ScientificArticleResult = Omit<StatisticsResult, 'chart'>;
export type WebResult = { title: string; link: string; description: string; source: string; imageUrl?: string; };

export interface GeneralTopicResult {
    title: string;
    summary: string;
    keyPoints: { title: string; description: string; }[];
    comparison?: {
        topicA: string;
        topicB: string;
        points: { aspect: string; analysisA: string; analysisB: string; }[];
    };
    sources: GroundingSource[];
}

// --- Video Converter ---
export interface VideoFactCheckResult {
    overallVerdict: string;
    claims: {
        claimText: string;
        analysis: string;
        evidence: {
            evidenceText: string;
            isReal: boolean;
            isCredible: boolean;
            isRelevant: boolean;
            sourceLink?: string;
        }[];
    }[];
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

// --- Analyzer ---
export interface MentionedSource {
    title: string;
    url: string;
    sourceCredibility: Credibility | string;
    argumentCredibility: Credibility | string;
}
export interface AnalysisStance {
    name: string;
    argument: string;
    scientificLevel: number; // 1 to 5
}
export interface AnalysisExample {
    title: string;
    content: string;
}

export interface AnalysisResult {
    understanding: string;
    analysis: string; // HTML-formatted
    proponentPercentage: number;
    proponents: AnalysisStance[];
    opponents: AnalysisStance[];
    examples: AnalysisExample[];
    mentionedSources: MentionedSource[];
    techniques: string[];
    suggestions: { title: string; url: string }[];
    groundingSources?: GroundingSource[];
}

export interface FallacyResult {
    identifiedFallacies: {
        type: string;
        quote: string;
        explanation: string;
        correctedStatement: string;
    }[];
    groundingSources?: GroundingSource[];
}

export interface AnalyzedClaim {
    claimText: string;
    timestamp: string;
    credibility: number; // 0-100
    analysis: string;
}

export interface Critique {
    logic: string;
    science: string;
    argumentation: string;
    rhetoric: string;
    grammar: string;
    evidence: string;
    philosophy: string;
}

export interface MediaAnalysisResult {
    summary: string;
    transcript: string;
    analyzedClaims: AnalyzedClaim[];
    critique: Critique;
    groundingSources?: GroundingSource[];
}

export type AnalyzerTabId = 'political' | 'economic' | 'social' | 'propaganda' | 'fallacy-finder' | 'media';

export const analyzerTabLabels: Record<AnalyzerTabId, string> = {
    'political': 'تحلیل سیاسی',
    'economic': 'تحلیل اقتصادی',
    'social': 'تحلیل اجتماعی',
    'propaganda': 'ردیابی پروپاگاندا',
    'fallacy-finder': 'شناسایی مغالطه‌ها',
    'media': 'تحلیل رسانه',
};

// --- Web Agent ---
export interface AgentClarificationRequest {
    isClear: boolean;
    questions?: {
        questionText: string;
        questionType: 'text-input' | 'multiple-choice';
        options?: string[];
    }[];
    refinedPrompt?: string;
}
export interface AgentExecutionResult {
    summary: string;
    steps: { title: string; description: string; }[];
    sources: GroundingSource[];
}

// --- Page Builder ---
export interface MenuItem {
    id: string;
    label: string;
    link: string;
    parentId?: string;
    children?: MenuItem[];
}

export interface Slide {
    id: string;
    type: 'upload' | 'url';
    content: string; // base64 data or URL
    name: string;
    caption: string;
}

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
    }
}

export interface WordPressThemePlan {
    themeName: string;
    understanding: string;
    colorPalette: Record<string, string>;
    fontPairings: Record<string, string>;
    layout: string;
    features: string[];
}

// --- Debate ---
export type DebateRole = 'moderator' | 'proponent' | 'opponent' | 'neutral';

export const debateRoleLabels: Record<DebateRole, string> = {
    moderator: "مدیر جلسه",
    proponent: "موافق",
    opponent: "مخالف",
    neutral: "بی‌طرف"
};

// Debate Simulator
export interface DebateParticipant {
    id: number;
    role: DebateRole;
    name: string;
    modelProvider: AIModelProvider;
    avatar?: string;
}

export interface DebateConfig {
    topic: string;
    participants: DebateParticipant[];
    starter: DebateRole;
    turnLimit: number;
    responseLength: 'short' | 'medium' | 'long';
    qualityLevel: 'academic' | 'medium' | 'low';
    tone: 'formal' | 'friendly' | 'witty' | 'polite' | 'aggressive';
}

export interface TranscriptEntry {
    participant: DebateParticipant;
    text: string;
}

// Conduct Debate (User vs AI)
export interface ConductDebateConfig {
    topic: string;
    aiRole: DebateRole;
    aiModel: AIModelProvider;
    analyzePerformance: boolean;
}

export interface ConductDebateMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export interface DebateAnalysisResult {
    summary: string;
    performanceAnalysis: {
        knowledgeLevel: number; // 1-10
        eloquence: number; // 1-10
        argumentStrength: number; // 1-10
        feedback: string;
    };
    fallacyDetection: {
        fallacyType: string;
        userQuote: string;
        explanation: string;
    }[];
    overallScore: number; // 0-100
}


// --- Crypto Tracker ---
export interface CryptoCoin {
    id: string;
    symbol: string;
    name: string;
    image: string;
    price_usd: number;
    price_toman: number;
    price_change_percentage_24h: number;
    market_cap_usd: number;
    market_cap_toman: number;
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
    groundingSources?: GroundingSource[];
}
export interface CryptoAnalysisResult {
    coinName: string;
    symbol: string;
    summary: string;
    technicalAnalysis: {
        title: string;
        content: string;
        keyLevels: { support: string[]; resistance: string[]; };
    };
    fundamentalAnalysis: {
        title: string;
        content: string;
        keyMetrics: { name: string; value: string; }[];
    };
    sentimentAnalysis: {
        title: string;
        content: string;
        score: number; // 0-100
    };
    futureOutlook: string;
}
export interface FindSourcesOptions {
    region: 'any' | 'internal' | 'external';
    language: 'any' | 'persian' | 'non-persian';
    credibility: 'any' | 'high' | 'medium';
    count: number;
}

// --- Research Tab ---
export interface ResearchResult {
    understanding: string;
    comprehensiveSummary: string;
    credibilityScore: number; // 0-100
    viewpointDistribution: {
        proponentPercentage: number;
        opponentPercentage: number;
        neutralPercentage: number;
    };
    proponents: AnalysisStance[];
    opponents: AnalysisStance[];
    academicSources: {
        title: string;
        link: string;
        snippet: string;
    }[];
    webSources?: GroundingSource[];
}

// --- Statistical Research ---
export interface StatisticalValidationMetrics {
    credibilityValidation: string;
    statisticalCredibilityScore: number; // 0-100
    documentCredibility: string;
    typeOfStatistics: string;
    statisticalMethod: string;
    participants: number | string;
    samplingMethod: string;
    methodCredibilityPercentage: number; // 0-100
}

export interface StatisticalResearchResult {
    understanding: string;
    summary: string;
    validationMetrics: StatisticalValidationMetrics;
    charts: ChartData[];
    proponents: AnalysisStance[];
    opponents: AnalysisStance[];
    neutral: AnalysisStance[];
    academicSources: { title: string; link: string; snippet: string; }[];
    relatedTopics: { title: string; link: string; }[];
    groundingSources?: GroundingSource[];
}