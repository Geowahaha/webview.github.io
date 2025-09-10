/**
 * TradeMaster AI Pro - Main Application Controller
 * Orchestrates all components and manages application lifecycle
 */

// Wait for all modules to load
let ctraderSDK, aiAssistant, chartManager, tradingEngine, voiceManager;

// Initialize modules when available
const initializeModules = async () => {
    // Wait for global instances to be available
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        if (window.ctraderSDK && window.aiAssistant && window.chartManager && 
            window.tradingEngine && window.voiceManager) {
            
            ctraderSDK = window.ctraderSDK;
            aiAssistant = window.aiAssistant;
            chartManager = window.chartManager;
            tradingEngine = window.tradingEngine;
            voiceManager = window.voiceManager;
            
            console.log('✅ All modules loaded successfully');
            break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (attempts >= maxAttempts) {
        console.warn('⚠️ Some modules failed to load, using fallback mode');
    }
};

class TradeMasterApp {
    constructor() {
        this.isInitialized = false;
        this.isConnected = false;
        this.currentSymbol = initializeSymbol();
        this.currentTheme = initializeTheme();
        this.platformInfo = getPlatformInfo();
        this.components = {};
        this.performanceMonitor = PerformanceUtils.createMonitor('AppMain');
        this.loadingScreen = null;
        this.appContainer = null;
        
        this.init();
    }
    
    /**
     * Initialize the application
     */
    async init() {
        const startTime = this.performanceMonitor.start();
        
        try {
            Logger.info('Initializing TradeMaster AI Pro...');
            Logger.info('Platform info:', this.platformInfo);
            Logger.info('Theme:', this.currentTheme);
            Logger.info('Symbol:', this.currentSymbol);
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize core components
            await this.initializeComponents();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Setup periodic tasks
            this.setupPeriodicTasks();
            
            // Load user settings
            this.loadUserSettings();
            
            // Initialize watchlist
            this.initializeWatchlist();
            
            // Connect to cTrader
            await this.connectTocTrader();
            
            // Hide loading screen and show app
            setTimeout(() => {
                this.hideLoadingScreen();
                this.isInitialized = true;
                
                const duration = this.performanceMonitor.end(startTime);
                Logger.info(`Application initialized in ${duration.toFixed(2)}ms`);
                
                // Show welcome message
                this.showWelcomeMessage();
            }, 2000);
            
        } catch (error) {
            Logger.error('Application initialization failed:', error);
            this.showInitializationError(error);
        }
    }
    
    /**
     * Initialize core components
     */
    async initializeComponents() {
        try {
            // Wait for components to load with timeout
            let attempts = 0;
            const maxAttempts = 30; // 3 seconds
            
            while (attempts < maxAttempts) {
                this.components = {
                    ctraderSDK: window.ctraderSDK,
                    aiAssistant: window.aiAssistant,
                    chartManager: window.chartManager,
                    tradingEngine: window.tradingEngine,
                    voiceManager: window.voiceManager
                };
                
                // Check if all components are loaded
                const missingComponents = Object.keys(this.components)
                    .filter(key => !this.components[key]);
                
                if (missingComponents.length === 0) {
                    Logger.info('All components initialized successfully');
                    return;
                }
                
                // Wait 100ms before next attempt
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            // If still missing components, continue with available ones
            const availableComponents = Object.keys(this.components)
                .filter(key => this.components[key]);
            
            Logger.warn('Some components missing, continuing with:', availableComponents);
            
            if (availableComponents.length === 0) {
                throw new Error('No components could be initialized');
            }
            
        } catch (error) {
            Logger.error('Component initialization failed:', error);
            // Don't throw error - continue with demo mode
            this.showInitializationWarning(error);
        }
    }
    
    /**
     * Setup global event handlers
     */
    setupEventHandlers() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // Settings toggle
        const settingsToggle = document.getElementById('settings-toggle');
        if (settingsToggle) {
            settingsToggle.addEventListener('click', () => {
                this.showSettings();
            });
        }
        
        // Help and feedback
        const helpLink = document.getElementById('help-link');
        const feedbackLink = document.getElementById('feedback-link');
        
        if (helpLink) {
            helpLink.addEventListener('click', () => {
                this.showHelp();
            });
        }
        
        if (feedbackLink) {
            feedbackLink.addEventListener('click', () => {
                this.showFeedback();
            });
        }
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeyboardShortcuts(e);
        });
        
        // Window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        window.addEventListener('online', () => {
            Logger.info('Network connection restored');
            this.handleNetworkChange(true);
        });
        
        window.addEventListener('offline', () => {
            Logger.warn('Network connection lost');
            this.handleNetworkChange(false);
        });
        
        // Visibility change (tab focus/blur)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleAppBackground();
            } else {
                this.handleAppForeground();
            }
        });
        
        // Error handling
        window.addEventListener('error', (e) => {
            Logger.error('Global error:', e.error);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            Logger.error('Unhandled promise rejection:', e.reason);
        });
    }
    
    /**
     * Setup periodic maintenance tasks
     */
    setupPeriodicTasks() {
        // Clear expired cache every 5 minutes
        setInterval(() => {
            StorageUtils.clearExpired();
        }, 5 * 60 * 1000);
        
        // Performance monitoring every minute
        setInterval(() => {
            this.logPerformanceStats();
        }, 60 * 1000);
        
        // Heartbeat every 30 seconds
        setInterval(() => {
            this.heartbeat();
        }, 30 * 1000);
        
        // Auto-save settings every 2 minutes
        setInterval(() => {
            this.saveUserSettings();
        }, 2 * 60 * 1000);
    }
    
    /**
     * Connect to cTrader platform
     */
    async connectTocTrader() {
        try {
            if (!this.components.ctraderSDK) {
                throw new Error('cTrader SDK not available');
            }
            
            // SDK connection is handled automatically
            // Just wait for connection status
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, CONFIG.CTRADER.CONNECT_TIMEOUT);
                
                this.components.ctraderSDK.onConnection((connected, error) => {
                    clearTimeout(timeout);
                    
                    if (connected) {
                        this.isConnected = true;
                        Logger.info('Connected to cTrader successfully');
                        resolve();
                    } else {
                        Logger.warn('cTrader connection failed, using mock mode');
                        resolve(); // Don't reject - continue in mock mode
                    }
                });
            });
            
        } catch (error) {
            Logger.warn('cTrader connection failed:', error.message);
            // Continue in mock mode
        }
    }
    
    /**
     * Initialize watchlist with default symbols
     */
    initializeWatchlist() {
        const watchlistContainer = document.getElementById('watchlist');
        if (!watchlistContainer) return;
        
        const defaultSymbols = CONFIG.WATCHLIST.DEFAULT_SYMBOLS;
        
        watchlistContainer.innerHTML = defaultSymbols.map(symbol => `
            <div class="watchlist-item" data-symbol="${symbol}">
                <div class="symbol-info">
                    <span class="symbol-name">${symbol}</span>
                    <span class="symbol-price">Loading...</span>
                </div>
                <div class="symbol-change">--</div>
            </div>
        `).join('');
        
        // Add click handlers
        watchlistContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.watchlist-item');
            if (item) {
                const symbol = item.dataset.symbol;
                this.changeSymbol(symbol);
            }
        });
        
        Logger.info(`Initialized watchlist with ${defaultSymbols.length} symbols`);
    }
    
    /**
     * Change active symbol
     */
    async changeSymbol(symbol) {
        if (symbol === this.currentSymbol) return;
        
        try {
            Logger.info(`Changing symbol to ${symbol}`);
            
            this.currentSymbol = symbol;
            
            // Update chart
            if (this.components.chartManager) {
                await this.components.chartManager.changeSymbol(symbol);
            }
            
            // Update trading engine
            if (this.components.tradingEngine) {
                this.components.tradingEngine.currentSymbol = symbol;
                this.components.tradingEngine.updateTradingInterface();
            }
            
            // Update AI assistant context
            if (this.components.aiAssistant) {
                this.components.aiAssistant.currentContext.symbol = symbol;
            }
            
            // Update watchlist selection
            this.updateWatchlistSelection(symbol);
            
            // Save setting
            StorageUtils.setItem('current_symbol', symbol);
            
        } catch (error) {
            Logger.error('Symbol change failed:', error);
        }
    }
    
    /**
     * Update watchlist item selection
     */
    updateWatchlistSelection(symbol) {
        const watchlistItems = document.querySelectorAll('.watchlist-item');
        watchlistItems.forEach(item => {
            item.classList.toggle('active', item.dataset.symbol === symbol);
        });
    }
    
    /**
     * Update portfolio display
     */
    updatePortfolio(accountInfo) {
        const portfolioContainer = document.getElementById('portfolio-content');
        if (!portfolioContainer || !accountInfo) return;
        
        const summaryElement = portfolioContainer.querySelector('.portfolio-summary');
        if (summaryElement) {
            summaryElement.innerHTML = `
                <div class="summary-item">
                    <span class="label">Balance:</span>
                    <span class="value">${NumberUtils.formatCurrency(accountInfo.balance)}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Equity:</span>
                    <span class="value">${NumberUtils.formatCurrency(accountInfo.equity)}</span>
                </div>
                <div class="summary-item">
                    <span class="label">P&L:</span>
                    <span class="value ${accountInfo.profit >= 0 ? 'positive' : 'negative'}">
                        ${NumberUtils.formatCurrency(accountInfo.profit)}
                    </span>
                </div>
                <div class="summary-item">
                    <span class="label">Free Margin:</span>
                    <span class="value">${NumberUtils.formatCurrency(accountInfo.freeMargin)}</span>
                </div>
            `;
        }
    }
    
    /**
     * Update positions display
     */
    updatePositions(positions) {
        // Delegated to trading engine
        if (this.components.tradingEngine) {
            this.components.tradingEngine.updatePositionsDisplay();
        }
    }
    
    /**
     * Toggle application theme
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        this.currentTheme = newTheme;
        
        // Update theme toggle icon
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Update chart theme
        if (this.components.chartManager) {
            this.components.chartManager.updateChartTheme();
        }
        
        // Save setting
        StorageUtils.setItem('theme', newTheme);
        
        // Emit theme change event
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: newTheme }
        }));
        
        Logger.info(`Theme changed to ${newTheme}`);
    }
    
    /**
     * Show settings dialog
     */
    showSettings() {
        // Create settings modal dynamically
        const modal = this.createSettingsModal();
        document.body.appendChild(modal);
        
        // Show modal
        modal.classList.remove('hidden');
    }
    
    /**
     * Create settings modal
     */
    createSettingsModal() {
        const modal = DOMUtils.createElement('div', {
            className: 'modal',
            id: 'settings-modal'
        }, `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Settings</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="settings-section">
                        <h4>Trading Settings</h4>
                        <div class="form-group">
                            <label>Default Volume</label>
                            <input type="number" id="setting-volume" value="${CONFIG.TRADING.DEFAULT_VOLUME}" step="0.01" min="0.01">
                        </div>
                        <div class="form-group">
                            <label>Default Risk (%)</label>
                            <input type="number" id="setting-risk" value="${CONFIG.TRADING.DEFAULT_RISK_PERCENT}" step="0.1" min="0.1" max="10">
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h4>Display Settings</h4>
                        <div class="form-group">
                            <label>Theme</label>
                            <select id="setting-theme">
                                <option value="light" ${this.currentTheme === 'light' ? 'selected' : ''}>Light</option>
                                <option value="dark" ${this.currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Chart Update Interval (ms)</label>
                            <input type="number" id="setting-chart-interval" value="${CONFIG.PERFORMANCE.CHART_UPDATE_INTERVAL}" step="100" min="100">
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h4>AI Assistant</h4>
                        <div class="form-group">
                            <label>Voice Language</label>
                            <select id="setting-voice-language">
                                ${this.components.voiceManager?.getAvailableLanguages().map(lang => `
                                    <option value="${lang.code}" ${lang.code === 'en-US' ? 'selected' : ''}>${lang.name}</option>
                                `).join('') || '<option value="en-US">English (US)</option>'}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="setting-voice-feedback" checked>
                                Enable voice feedback
                            </label>
                        </div>
                    </div>
                    
                    <div class="settings-actions">
                        <button class="btn-primary" onclick="window.app.saveSettingsFromModal()">Save Settings</button>
                        <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </div>
            </div>
        `);
        
        return modal;
    }
    
    /**
     * Save settings from modal
     */
    saveSettingsFromModal() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;
        
        try {
            // Get values
            const volume = parseFloat(document.getElementById('setting-volume')?.value || CONFIG.TRADING.DEFAULT_VOLUME);
            const risk = parseFloat(document.getElementById('setting-risk')?.value || CONFIG.TRADING.DEFAULT_RISK_PERCENT);
            const theme = document.getElementById('setting-theme')?.value || 'light';
            const chartInterval = parseInt(document.getElementById('setting-chart-interval')?.value || CONFIG.PERFORMANCE.CHART_UPDATE_INTERVAL);
            const voiceLanguage = document.getElementById('setting-voice-language')?.value || 'en-US';
            const voiceFeedback = document.getElementById('setting-voice-feedback')?.checked || true;
            
            // Apply settings
            CONFIG.TRADING.DEFAULT_VOLUME = volume;
            CONFIG.TRADING.DEFAULT_RISK_PERCENT = risk;
            CONFIG.PERFORMANCE.CHART_UPDATE_INTERVAL = chartInterval;
            
            // Update theme if changed
            if (theme !== this.currentTheme) {
                document.documentElement.setAttribute('data-theme', theme);
                this.currentTheme = theme;
            }
            
            // Update voice settings
            if (this.components.voiceManager) {
                this.components.voiceManager.setLanguage(voiceLanguage);
            }
            
            // Save to storage
            this.saveUserSettings();
            
            // Close modal
            modal.remove();
            
            // Show success message
            this.showNotification('Settings saved successfully', 'success');
            
        } catch (error) {
            Logger.error('Settings save failed:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }
    
    /**
     * Show help information
     */
    showHelp() {
        if (this.components.aiAssistant) {
            this.components.aiAssistant.sendMessage('help');
        } else {
            alert('Help: Use the AI assistant for trading help and voice commands with Ctrl+Space');
        }
    }
    
    /**
     * Show feedback form
     */
    showFeedback() {
        const feedback = prompt('Please share your feedback about TradeMaster AI Pro:');
        if (feedback && feedback.trim()) {
            Logger.info('User feedback:', feedback);
            this.showNotification('Thank you for your feedback!', 'success');
            
            // In a real application, this would be sent to a feedback service
            StorageUtils.setItem('user_feedback_' + Date.now(), feedback);
        }
    }
    
    /**
     * Handle global keyboard shortcuts
     */
    handleGlobalKeyboardShortcuts(e) {
        // Don't handle shortcuts when typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (e.key) {
            case 'F1':
                e.preventDefault();
                this.showHelp();
                break;
                
            case 'F2':
                e.preventDefault();
                this.showSettings();
                break;
                
            case 'F11':
                e.preventDefault();
                this.toggleFullscreen();
                break;
                
            case 'Escape':
                // Close any open modals
                const modals = document.querySelectorAll('.modal:not(.hidden)');
                modals.forEach(modal => modal.classList.add('hidden'));
                break;
        }
    }
    
    /**
     * Handle network connection changes
     */
    handleNetworkChange(online) {
        if (online) {
            this.showNotification('Network connection restored', 'success');
            // Attempt to reconnect to cTrader
            if (this.components.ctraderSDK && !this.isConnected) {
                this.connectTocTrader();
            }
        } else {
            this.showNotification('Network connection lost - running in offline mode', 'warning');
        }
    }
    
    /**
     * Handle app going to background (tab blur)
     */
    handleAppBackground() {
        Logger.info('App backgrounded');
        // Reduce update frequency to save resources
        if (this.components.chartManager) {
            this.components.chartManager.stopRealTimeUpdates();
        }
    }
    
    /**
     * Handle app coming to foreground (tab focus)
     */
    handleAppForeground() {
        Logger.info('App foregrounded');
        // Resume normal update frequency
        if (this.components.chartManager) {
            this.components.chartManager.startRealTimeUpdates();
        }
    }
    
    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen().catch(err => {
                Logger.error('Fullscreen request failed:', err);
            });
        }
    }
    
    /**
     * Show loading screen
     */
    showLoadingScreen() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.appContainer = document.getElementById('app');
        
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('hidden');
        }
        
        if (this.appContainer) {
            this.appContainer.classList.add('hidden');
        }
    }
    
    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.classList.add('hidden');
            }, 500);
        }
        
        if (this.appContainer) {
            this.appContainer.classList.remove('hidden');
            this.appContainer.style.opacity = '0';
            setTimeout(() => {
                this.appContainer.style.opacity = '1';
            }, 100);
        }
    }
    
    /**
     * Show initialization warning (non-fatal)
     */
    showInitializationWarning(error) {
        Logger.warn('Initialization warning:', error);
        
        // Show warning but continue loading
        const warningMessage = `
            <div style="
                position: fixed; top: 20px; right: 20px;
                background: var(--warning-color); padding: 1rem; border-radius: 6px;
                color: white; max-width: 300px; z-index: 10000;
                font-size: 0.9rem; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            ">
                <strong>Demo Mode</strong><br>
                Some features may be limited. Running in demonstration mode.
                <button onclick="this.parentElement.remove()" style="
                    float: right; background: none; border: none; color: white; 
                    cursor: pointer; font-size: 1rem; margin-left: 10px;
                ">×</button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', warningMessage);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            const warning = document.querySelector('[style*="warning-color"]');
            if (warning) warning.remove();
        }, 10000);
    }
    
    /**
     * Show initialization error
     */
    showInitializationError(error) {
        const errorMessage = `
            <div style="
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: var(--bg-primary); padding: 2rem; border-radius: 12px;
                border: 1px solid var(--danger-color); max-width: 400px; text-align: center;
                z-index: 10000;
            ">
                <h3 style="color: var(--danger-color); margin-bottom: 1rem;">
                    <i class="fas fa-exclamation-triangle"></i> Initialization Error
                </h3>
                <p style="margin-bottom: 1.5rem;">
                    Failed to initialize TradeMaster AI Pro:<br>
                    <strong>${error.message}</strong>
                </p>
                <button onclick="location.reload()" style="
                    background: var(--accent-primary); color: white; border: none;
                    padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;
                ">
                    Reload Application
                </button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorMessage);
    }
    
    /**
     * Show welcome message
     */
    showWelcomeMessage() {
        if (this.components.aiAssistant) {
            setTimeout(() => {
                const welcomeMessage = `Welcome to TradeMaster AI Pro! 🚀\n\nI'm your AI trading assistant, ready to help you with:\n• Market analysis and insights\n• Risk management and position sizing\n• Trade execution and monitoring\n• Voice commands (press Ctrl+Space)\n\nConnected to ${this.isConnected ? 'cTrader' : 'demo mode'}. Current symbol: ${this.currentSymbol}.\n\nHow can I assist you today?`;
                
                this.components.aiAssistant.addMessage('ai', welcomeMessage);
            }, 500);
        }
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 5000) {
        if (this.components.tradingEngine) {
            this.components.tradingEngine.showNotification(message, type);
        } else {
            // Fallback notification
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    /**
     * Periodic heartbeat for health monitoring
     */
    heartbeat() {
        const stats = this.getSystemStats();
        Logger.debug('Heartbeat:', stats);
        
        // Check for issues
        if (stats.memoryUsage > 100) { // MB
            Logger.warn('High memory usage detected:', stats.memoryUsage, 'MB');
        }
        
        // Update connection status
        if (this.components.ctraderSDK) {
            const isConnected = this.components.ctraderSDK.isConnected;
            if (isConnected !== this.isConnected) {
                this.isConnected = isConnected;
                this.showNotification(
                    isConnected ? 'cTrader connection restored' : 'cTrader connection lost',
                    isConnected ? 'success' : 'warning'
                );
            }
        }
    }
    
    /**
     * Log performance statistics
     */
    logPerformanceStats() {
        const stats = [];
        
        // App performance
        const appStats = this.performanceMonitor.getStats();
        if (appStats) stats.push(appStats);
        
        // Chart performance
        if (this.components.chartManager) {
            const chartStats = this.components.chartManager.getPerformanceStats();
            if (chartStats) stats.push(chartStats);
        }
        
        // Trading performance
        if (this.components.tradingEngine) {
            const tradingStats = this.components.tradingEngine.getTradingStats();
            if (tradingStats) stats.push(tradingStats);
        }
        
        if (stats.length > 0) {
            Logger.info('Performance stats:', stats);
        }
    }
    
    /**
     * Get system statistics
     */
    getSystemStats() {
        const performance = window.performance;
        const memory = performance.memory;
        
        return {
            uptime: performance.now(),
            memoryUsage: memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0,
            totalMemory: memory ? Math.round(memory.totalJSHeapSize / 1024 / 1024) : 0,
            isOnline: navigator.onLine,
            userAgent: navigator.userAgent,
            timestamp: Date.now()
        };
    }
    
    /**
     * Load user settings from storage
     */
    loadUserSettings() {
        try {
            const savedSymbol = StorageUtils.getItem('current_symbol');
            if (savedSymbol && savedSymbol !== this.currentSymbol) {
                this.changeSymbol(savedSymbol);
            }
            
            const savedTheme = StorageUtils.getItem('theme');
            if (savedTheme && savedTheme !== this.currentTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
                this.currentTheme = savedTheme;
            }
            
            // Load component-specific settings
            if (this.components.tradingEngine) {
                this.components.tradingEngine.loadTradingSettings();
            }
            
            Logger.info('User settings loaded');
            
        } catch (error) {
            Logger.error('Failed to load user settings:', error);
        }
    }
    
    /**
     * Save user settings to storage
     */
    saveUserSettings() {
        try {
            StorageUtils.setItem('current_symbol', this.currentSymbol);
            StorageUtils.setItem('theme', this.currentTheme);
            
            // Save component-specific settings
            if (this.components.tradingEngine) {
                this.components.tradingEngine.saveTradingSettings();
            }
            
            Logger.debug('User settings saved');
            
        } catch (error) {
            Logger.error('Failed to save user settings:', error);
        }
    }
    
    /**
     * Cleanup resources before unload
     */
    cleanup() {
        Logger.info('Cleaning up application...');
        
        // Save settings
        this.saveUserSettings();
        
        // Cleanup components
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                try {
                    component.destroy();
                } catch (error) {
                    Logger.error('Component cleanup failed:', error);
                }
            }
        });
        
        Logger.info('Application cleanup completed');
    }
    
    /**
     * Get application status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isConnected: this.isConnected,
            currentSymbol: this.currentSymbol,
            currentTheme: this.currentTheme,
            platformInfo: this.platformInfo,
            componentStatus: Object.keys(this.components).reduce((status, key) => {
                status[key] = !!this.components[key];
                return status;
            }, {}),
            systemStats: this.getSystemStats()
        };
    }
    
    /**
     * Export data for backup/analysis
     */
    exportData() {
        const data = {
            timestamp: new Date().toISOString(),
            version: CONFIG.VERSION,
            settings: {
                currentSymbol: this.currentSymbol,
                currentTheme: this.currentTheme,
                platformInfo: this.platformInfo
            },
            tradingHistory: this.components.tradingEngine?.getTradingHistory() || [],
            chatHistory: this.components.aiAssistant?.chatMessages || [],
            voiceHistory: this.components.voiceManager?.getCommandHistory() || [],
            performanceStats: this.getSystemStats()
        };
        
        return data;
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Global app instance
    window.app = new TradeMasterApp();
});

// Handle CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);