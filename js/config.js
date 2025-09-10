/**
 * TradeMaster AI Pro - Configuration
 * Professional AI-powered WebView plugin for cTrader
 */

const CONFIG = {
    // App Information
    APP_NAME: 'TradeMaster AI Pro',
    VERSION: '1.0.0',
    AUTHOR: 'TradeMaster AI Pro Team',
    
    // API Endpoints
    AI_API_URL: 'https://api.openai.com/v1/chat/completions',
    NEWS_API_URL: 'https://newsapi.org/v2/everything',
    FOREX_API_URL: 'https://api.exchangerate-api.com/v4/latest',
    
    // WebView Settings
    WEBVIEW: {
        // Theme detection from URL parameters
        THEME_PARAM: 'theme',
        SYMBOL_PARAM: 'symbol',
        LANGUAGE_PARAM: 'lang',
        PLATFORM_PARAM: 'platform',
        PLACEMENT_PARAM: 'placement',
        
        // Default values
        DEFAULT_THEME: 'light',
        DEFAULT_SYMBOL: 'EURUSD',
        DEFAULT_LANGUAGE: 'en',
        DEFAULT_TIMEFRAME: 'M5'
    },
    
    // cTrader SDK Settings
    CTRADER: {
        CONNECT_TIMEOUT: 30000,
        RECONNECT_INTERVAL: 5000,
        MAX_RECONNECT_ATTEMPTS: 5,
        HEARTBEAT_INTERVAL: 30000
    },
    
    // Trading Settings
    TRADING: {
        DEFAULT_VOLUME: 0.01,
        MIN_VOLUME: 0.01,
        MAX_VOLUME: 100.0,
        VOLUME_STEP: 0.01,
        
        // Risk Management
        MAX_RISK_PERCENT: 5.0,
        DEFAULT_RISK_PERCENT: 1.0,
        MAX_POSITIONS: 10,
        
        // Order Types
        MARKET_ORDER: 'MARKET',
        LIMIT_ORDER: 'LIMIT',
        STOP_ORDER: 'STOP',
        STOP_LIMIT_ORDER: 'STOP_LIMIT'
    },
    
    // AI Settings
    AI: {
        MODEL: 'gpt-4',
        MAX_TOKENS: 1000,
        TEMPERATURE: 0.7,
        
        // System Prompts
        SYSTEM_PROMPT: `You are TradeMaster AI Pro, a professional trading assistant integrated with cTrader. 
        You help traders with:
        1. Market analysis and trade ideas
        2. Risk management and position sizing
        3. Strategy optimization
        4. Real-time trade execution
        
        Always provide actionable insights and maintain a professional tone. 
        When suggesting trades, always include risk management advice.
        Keep responses concise and focused on trading value.`,
        
        // Voice Commands
        VOICE_COMMANDS: {
            BUY: ['buy', 'long', 'go long', 'purchase'],
            SELL: ['sell', 'short', 'go short', 'sell short'],
            CLOSE: ['close', 'exit', 'close position', 'close trade'],
            ANALYZE: ['analyze', 'analysis', 'what do you think', 'market view'],
            RISK: ['risk', 'position size', 'how much', 'calculate risk']
        }
    },
    
    // Chart Settings
    CHART: {
        TIMEFRAMES: {
            'M1': { label: '1m', value: 1 },
            'M5': { label: '5m', value: 5 },
            'M15': { label: '15m', value: 15 },
            'M30': { label: '30m', value: 30 },
            'H1': { label: '1h', value: 60 },
            'H4': { label: '4h', value: 240 },
            'D1': { label: '1D', value: 1440 },
            'W1': { label: '1W', value: 10080 }
        },
        
        COLORS: {
            BULLISH: '#10b981',
            BEARISH: '#ef4444',
            NEUTRAL: '#6b7280',
            GRID: '#e5e7eb',
            TEXT: '#374151'
        },
        
        INDICATORS: {
            SMA: 'Simple Moving Average',
            EMA: 'Exponential Moving Average',
            RSI: 'Relative Strength Index',
            MACD: 'MACD',
            BOLLINGER: 'Bollinger Bands'
        }
    },
    
    // News and Data
    NEWS: {
        CATEGORIES: ['forex', 'crypto', 'stocks', 'commodities'],
        REFRESH_INTERVAL: 300000, // 5 minutes
        MAX_ARTICLES: 20,
        SOURCES: [
            'reuters',
            'bloomberg',
            'cnbc',
            'financial-times',
            'the-wall-street-journal'
        ]
    },
    
    // Watchlist
    WATCHLIST: {
        DEFAULT_SYMBOLS: [
            'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
            'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
            'EURJPY', 'GBPJPY'
        ],
        MAX_SYMBOLS: 50,
        UPDATE_INTERVAL: 1000 // 1 second
    },
    
    // Performance Settings
    PERFORMANCE: {
        CHART_UPDATE_INTERVAL: 1000,
        PRICE_UPDATE_INTERVAL: 250,
        POSITION_UPDATE_INTERVAL: 2000,
        
        // Data Limits
        MAX_CHART_POINTS: 1000,
        MAX_CHAT_MESSAGES: 100,
        MAX_NEWS_ITEMS: 50,
        
        // Cache Settings
        CACHE_DURATION: 300000, // 5 minutes
        ENABLE_CACHE: true
    },
    
    // UI Settings
    UI: {
        ANIMATION_DURATION: 300,
        NOTIFICATION_DURATION: 5000,
        CHART_COLORS: [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
            '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
        ],
        
        // Responsive Breakpoints
        BREAKPOINTS: {
            MOBILE: 480,
            TABLET: 768,
            DESKTOP: 1024,
            WIDE: 1200
        }
    },
    
    // Error Messages
    ERRORS: {
        CONNECTION_FAILED: 'Failed to connect to cTrader. Please check your connection.',
        SDK_NOT_LOADED: 'cTrader SDK not available. Please refresh the page.',
        TRADE_FAILED: 'Trade execution failed. Please try again.',
        INVALID_VOLUME: 'Invalid volume. Please check your input.',
        INSUFFICIENT_MARGIN: 'Insufficient margin for this trade.',
        SYMBOL_NOT_FOUND: 'Symbol not found or not tradeable.',
        AI_API_ERROR: 'AI service temporarily unavailable. Please try again.',
        VOICE_NOT_SUPPORTED: 'Voice recognition not supported in this browser.'
    },
    
    // Success Messages
    SUCCESS: {
        TRADE_EXECUTED: 'Trade executed successfully!',
        CONNECTION_ESTABLISHED: 'Connected to cTrader successfully.',
        SETTINGS_SAVED: 'Settings saved successfully.',
        SYMBOL_ADDED: 'Symbol added to watchlist.',
        VOICE_COMMAND_PROCESSED: 'Voice command processed successfully.'
    },
    
    // Development Settings
    DEV: {
        DEBUG_MODE: false,
        MOCK_DATA: false,
        LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
        ENABLE_CONSOLE_LOGS: true
    }
};

// Utility function to get URL parameters
const getUrlParameter = (name) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
};

// Initialize theme from URL parameter
const initializeTheme = () => {
    const theme = getUrlParameter(CONFIG.WEBVIEW.THEME_PARAM) || CONFIG.WEBVIEW.DEFAULT_THEME;
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
};

// Initialize symbol from URL parameter
const initializeSymbol = () => {
    return getUrlParameter(CONFIG.WEBVIEW.SYMBOL_PARAM) || CONFIG.WEBVIEW.DEFAULT_SYMBOL;
};

// Get platform info from URL parameter
const getPlatformInfo = () => {
    return {
        platform: getUrlParameter(CONFIG.WEBVIEW.PLATFORM_PARAM) || 'web',
        placement: getUrlParameter(CONFIG.WEBVIEW.PLACEMENT_PARAM) || 'panel',
        language: getUrlParameter(CONFIG.WEBVIEW.LANGUAGE_PARAM) || CONFIG.WEBVIEW.DEFAULT_LANGUAGE
    };
};

// Logging utility
const Logger = {
    debug: (message, ...args) => {
        if (CONFIG.DEV.DEBUG_MODE && CONFIG.DEV.ENABLE_CONSOLE_LOGS) {
            console.debug(`[${CONFIG.APP_NAME}] ${message}`, ...args);
        }
    },
    
    info: (message, ...args) => {
        if (CONFIG.DEV.ENABLE_CONSOLE_LOGS) {
            console.info(`[${CONFIG.APP_NAME}] ${message}`, ...args);
        }
    },
    
    warn: (message, ...args) => {
        if (CONFIG.DEV.ENABLE_CONSOLE_LOGS) {
            console.warn(`[${CONFIG.APP_NAME}] ${message}`, ...args);
        }
    },
    
    error: (message, ...args) => {
        if (CONFIG.DEV.ENABLE_CONSOLE_LOGS) {
            console.error(`[${CONFIG.APP_NAME}] ${message}`, ...args);
        }
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getUrlParameter, initializeTheme, initializeSymbol, getPlatformInfo, Logger };
}