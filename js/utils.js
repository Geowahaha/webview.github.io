/**
 * TradeMaster AI Pro - Utility Functions
 * Common utility functions and helpers
 */

// Date and Time Utilities
const DateUtils = {
    /**
     * Format timestamp to readable string
     */
    formatTime: (timestamp, includeDate = false) => {
        const date = new Date(timestamp);
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        if (includeDate) {
            options.year = 'numeric';
            options.month = '2-digit';
            options.day = '2-digit';
        }
        
        return date.toLocaleString('en-US', options);
    },
    
    /**
     * Get time ago string
     */
    timeAgo: (timestamp) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    },
    
    /**
     * Format duration in ms to readable string
     */
    formatDuration: (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
};

// Number Formatting Utilities
const NumberUtils = {
    /**
     * Format number with specified decimal places
     */
    formatNumber: (number, decimals = 2) => {
        return number.toFixed(decimals);
    },
    
    /**
     * Format currency
     */
    formatCurrency: (amount, currency = 'USD', decimals = 2) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(amount);
    },
    
    /**
     * Format percentage
     */
    formatPercent: (value, decimals = 2) => {
        return (value * 100).toFixed(decimals) + '%';
    },
    
    /**
     * Format large numbers with K/M/B suffixes
     */
    formatLargeNumber: (num) => {
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toString();
    },
    
    /**
     * Calculate percentage change
     */
    percentChange: (oldValue, newValue) => {
        if (oldValue === 0) return 0;
        return ((newValue - oldValue) / oldValue) * 100;
    },
    
    /**
     * Calculate pips for forex pairs
     */
    calculatePips: (openPrice, closePrice, digits = 5) => {
        const multiplier = digits === 3 || digits === 5 ? 10000 : 100;
        return Math.abs(closePrice - openPrice) * multiplier;
    }
};

// Trading Utilities
const TradingUtils = {
    /**
     * Calculate position size based on risk
     */
    calculatePositionSize: (accountBalance, riskPercent, entryPrice, stopLoss) => {
        const riskAmount = (accountBalance * riskPercent) / 100;
        const priceDistance = Math.abs(entryPrice - stopLoss);
        const pipValue = 10; // USD per pip for standard lot
        const pips = NumberUtils.calculatePips(entryPrice, stopLoss);
        
        return riskAmount / (pips * pipValue);
    },
    
    /**
     * Calculate profit/loss
     */
    calculatePnL: (openPrice, currentPrice, volume, side, pipValue = 10) => {
        const pips = NumberUtils.calculatePips(openPrice, currentPrice);
        const multiplier = side.toLowerCase() === 'buy' ? 
            (currentPrice > openPrice ? 1 : -1) : 
            (currentPrice < openPrice ? 1 : -1);
        
        return pips * pipValue * volume * multiplier;
    },
    
    /**
     * Calculate required margin
     */
    calculateMargin: (volume, price, leverage = 100) => {
        return (volume * 100000 * price) / leverage;
    },
    
    /**
     * Validate trading parameters
     */
    validateTrade: (symbol, volume, stopLoss, takeProfit) => {
        const errors = [];
        
        if (!symbol || symbol.length < 6) {
            errors.push('Invalid symbol');
        }
        
        if (!volume || volume <= 0) {
            errors.push('Invalid volume');
        }
        
        if (volume < CONFIG.TRADING.MIN_VOLUME) {
            errors.push(`Volume below minimum (${CONFIG.TRADING.MIN_VOLUME})`);
        }
        
        if (volume > CONFIG.TRADING.MAX_VOLUME) {
            errors.push(`Volume above maximum (${CONFIG.TRADING.MAX_VOLUME})`);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
};

// DOM Utilities
const DOMUtils = {
    /**
     * Create element with attributes
     */
    createElement: (tag, attributes = {}, content = '') => {
        const element = document.createElement(tag);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'style') {
                element.style.cssText = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        
        if (content) {
            element.innerHTML = content;
        }
        
        return element;
    },
    
    /**
     * Add event listener with cleanup
     */
    addListener: (element, event, handler, options = {}) => {
        element.addEventListener(event, handler, options);
        
        return () => {
            element.removeEventListener(event, handler, options);
        };
    },
    
    /**
     * Show/hide element with animation
     */
    toggleVisible: (element, show, duration = 300) => {
        if (show) {
            element.style.display = 'block';
            element.style.opacity = '0';
            element.offsetHeight; // Force reflow
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '1';
        } else {
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '0';
            setTimeout(() => {
                element.style.display = 'none';
            }, duration);
        }
    },
    
    /**
     * Scroll element into view smoothly
     */
    scrollIntoView: (element, behavior = 'smooth') => {
        element.scrollIntoView({
            behavior: behavior,
            block: 'center'
        });
    }
};

// Local Storage Utilities
const StorageUtils = {
    /**
     * Set item with expiration
     */
    setItem: (key, value, expirationMs = null) => {
        const item = {
            value: value,
            timestamp: Date.now(),
            expiration: expirationMs ? Date.now() + expirationMs : null
        };
        
        try {
            localStorage.setItem(key, JSON.stringify(item));
            return true;
        } catch (error) {
            Logger.error('Storage set error:', error);
            return false;
        }
    },
    
    /**
     * Get item with expiration check
     */
    getItem: (key) => {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            
            // Check expiration
            if (item.expiration && Date.now() > item.expiration) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        } catch (error) {
            Logger.error('Storage get error:', error);
            return null;
        }
    },
    
    /**
     * Remove item
     */
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            Logger.error('Storage remove error:', error);
            return false;
        }
    },
    
    /**
     * Clear expired items
     */
    clearExpired: () => {
        const now = Date.now();
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            try {
                const itemStr = localStorage.getItem(key);
                if (itemStr) {
                    const item = JSON.parse(itemStr);
                    if (item.expiration && now > item.expiration) {
                        keysToRemove.push(key);
                    }
                }
            } catch (error) {
                // Invalid JSON, remove it
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        Logger.info(`Cleared ${keysToRemove.length} expired items`);
    }
};

// Network Utilities
const NetworkUtils = {
    /**
     * Check if online
     */
    isOnline: () => navigator.onLine,
    
    /**
     * Make HTTP request with timeout
     */
    request: async (url, options = {}) => {
        const timeout = options.timeout || 10000;
        const controller = new AbortController();
        
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },
    
    /**
     * Retry function with exponential backoff
     */
    retry: async (fn, maxAttempts = 3, baseDelay = 1000) => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) throw error;
                
                const delay = baseDelay * Math.pow(2, attempt - 1);
                Logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
};

// Performance Utilities
const PerformanceUtils = {
    /**
     * Debounce function calls
     */
    debounce: (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
    },
    
    /**
     * Throttle function calls
     */
    throttle: (func, delay) => {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(null, args);
            }
        };
    },
    
    /**
     * Measure execution time
     */
    measureTime: async (label, fn) => {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        
        Logger.debug(`${label} took ${(end - start).toFixed(2)}ms`);
        return result;
    },
    
    /**
     * Create performance monitor
     */
    createMonitor: (name) => {
        let samples = [];
        
        return {
            start: () => performance.now(),
            
            end: (startTime) => {
                const duration = performance.now() - startTime;
                samples.push(duration);
                
                // Keep only last 100 samples
                if (samples.length > 100) {
                    samples.shift();
                }
                
                return duration;
            },
            
            getStats: () => {
                if (samples.length === 0) return null;
                
                const sorted = [...samples].sort((a, b) => a - b);
                const avg = samples.reduce((sum, val) => sum + val, 0) / samples.length;
                const min = sorted[0];
                const max = sorted[sorted.length - 1];
                const median = sorted[Math.floor(sorted.length / 2)];
                
                return { name, avg, min, max, median, count: samples.length };
            }
        };
    }
};

// Validation Utilities
const ValidationUtils = {
    /**
     * Validate email
     */
    isValidEmail: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    
    /**
     * Validate number range
     */
    isInRange: (value, min, max) => {
        return value >= min && value <= max;
    },
    
    /**
     * Validate forex symbol format
     */
    isValidSymbol: (symbol) => {
        // Forex pairs are typically 6 characters (EURUSD)
        const regex = /^[A-Z]{6}$/;
        return regex.test(symbol);
    },
    
    /**
     * Sanitize HTML
     */
    sanitizeHtml: (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Color Utilities
const ColorUtils = {
    /**
     * Convert hex to RGB
     */
    hexToRgb: (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    /**
     * Generate color based on value (green for positive, red for negative)
     */
    getValueColor: (value) => {
        if (value > 0) return 'var(--positive-color)';
        if (value < 0) return 'var(--negative-color)';
        return 'var(--text-secondary)';
    },
    
    /**
     * Interpolate between two colors
     */
    interpolateColor: (color1, color2, factor) => {
        const c1 = ColorUtils.hexToRgb(color1);
        const c2 = ColorUtils.hexToRgb(color2);
        
        if (!c1 || !c2) return color1;
        
        const r = Math.round(c1.r + (c2.r - c1.r) * factor);
        const g = Math.round(c1.g + (c2.g - c1.g) * factor);
        const b = Math.round(c1.b + (c2.b - c1.b) * factor);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
};

// Export utilities for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DateUtils,
        NumberUtils,
        TradingUtils,
        DOMUtils,
        StorageUtils,
        NetworkUtils,
        PerformanceUtils,
        ValidationUtils,
        ColorUtils
    };
}