/**
 * TradeMaster AI Pro - Real cTrader WebView SDK Integration
 * Official cTrader WebView Plugin SDK Implementation
 */

// Import real cTrader SDK from CDN
import { 
    createClientAdapter, 
    createLogger,
    handleConfirmEvent,
    registerEvent,
    quoteEvent,
    executionEvent,
    getAccountInformation,
    getLightSymbolList,
    createNewOrder,
    subscribeQuotes,
    unsubscribeQuotes,
    modifyOrder,
    closePosition,
    cancelOrder
} from 'https://esm.sh/@ctrader/sdk';

import { take, tap } from 'https://esm.sh/rxjs/operators';

class CTraderSDK {
    constructor() {
        this.isConnected = false;
        this.isInitialized = false;
        this.adapter = null;
        this.logger = null;
        this.currentSymbol = this.getUrlSymbol() || 'EURUSD';
        this.accountInfo = null;
        this.positions = new Map();
        this.quotes = new Map();
        this.connectionCallbacks = [];
        this.quoteCallbacks = [];
        this.executionCallbacks = [];
        
        this.init();
    }
    
    /**
     * Get symbol from URL parameters
     */
    getUrlSymbol() {
        const params = new URLSearchParams(window.location.search);
        return params.get('symbol') || 'EURUSD';
    }

    /**
     * Initialize the real cTrader WebView SDK
     */
    async init() {
        try {
            console.log('🚀 Initializing Real cTrader WebView SDK...');
            
            // Create logger with debugging enabled
            this.logger = createLogger(location.href.includes("showLogs"));
            
            // Create client adapter for WebView plugin
            this.adapter = createClientAdapter({ logger: this.logger });
            
            console.log('📡 SDK Adapter created, starting handshake...');
            
            // Perform SDK handshake and registration
            await this.performHandshake();
            
        } catch (error) {
            console.error('❌ Real SDK initialization failed:', error);
            console.log('🔄 Falling back to mock mode for testing...');
            this.initMockMode();
        }
    }

    /**
     * Perform cTrader WebView SDK handshake
     */
    async performHandshake() {
        try {
            // Step 1: Confirm handshake
            console.log('🤝 Starting handshake confirmation...');
            handleConfirmEvent(this.adapter, {}).pipe(take(1)).subscribe({
                next: () => console.log('✅ Handshake confirmed'),
                error: (error) => console.error('❌ Handshake failed:', error)
            });
            
            // Step 2: Register plugin with cTrader
            console.log('📝 Registering WebView plugin...');
            registerEvent(this.adapter).pipe(
                take(1),
                tap(() => {
                    console.log('✅ Plugin registered successfully!');
                    
                    // Confirm registration
                    handleConfirmEvent(this.adapter, {}).pipe(take(1)).subscribe();
                    
                    // Mark as connected
                    this.isConnected = true;
                    this.updateConnectionStatus('connected');
                    
                    // Start event listeners
                    this.startEventListeners();
                    
                    // Load initial data
                    this.loadInitialData();
                })
            ).subscribe({
                error: (error) => {
                    console.error('❌ Plugin registration failed:', error);
                    throw error;
                }
            });
            
        } catch (error) {
            console.error('❌ Handshake process failed:', error);
            throw error;
        }
    }

    /**
     * Start listening to cTrader events
     */
    startEventListeners() {
        console.log('👂 Starting event listeners...');
        
        // Listen for quote updates
        quoteEvent(this.adapter).pipe(
            tap((quote) => {
                console.log('📈 Quote received:', quote);
                this.handleQuoteUpdate(quote);
            })
        ).subscribe();
        
        // Listen for execution events
        executionEvent(this.adapter).pipe(
            tap((execution) => {
                console.log('⚡ Execution event:', execution);
                this.handleExecutionUpdate(execution);
            })
        ).subscribe();
        
        console.log('✅ Event listeners active');
    }

    /**
     * Load initial account and symbol data
     */
    async loadInitialData() {
        try {
            console.log('📊 Loading initial trading data...');
            
            // Get account information
            getAccountInformation(this.adapter).pipe(
                take(1),
                tap((account) => {
                    console.log('💰 Account info loaded:', account);
                    this.accountInfo = account;
                    this.notifyAccountUpdate(account);
                })
            ).subscribe();
            
            // Get available symbols
            getLightSymbolList(this.adapter).pipe(
                take(1),
                tap((symbols) => {
                    console.log(`📋 Loaded ${symbols.length} trading symbols`);
                    this.availableSymbols = symbols;
                })
            ).subscribe();
            
            // Subscribe to current symbol quotes
            await this.subscribeToSymbol(this.currentSymbol);
            
            // Mark as fully initialized
            this.isInitialized = true;
            console.log('🎉 cTrader SDK fully initialized and ready!');
            
            // Notify connection callbacks
            this.connectionCallbacks.forEach(callback => {
                try {
                    callback(true);
                } catch (error) {
                    console.error('Connection callback error:', error);
                }
            });
            
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
        }
    }
    
    /**
     * Set up SDK event listeners
     */
    setupEventListeners() {
        if (!this.clientAdapter) return;
        
        // Connection events
        this.clientAdapter.on('connect', () => {
            Logger.info('SDK connected successfully');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected');
            this.startHeartbeat();
            this.onConnected();
        });
        
        this.clientAdapter.on('disconnect', () => {
            Logger.warn('SDK disconnected');
            this.isConnected = false;
            this.updateConnectionStatus('disconnected');
            this.stopHeartbeat();
            this.handleReconnection();
        });
        
        this.clientAdapter.on('error', (error) => {
            Logger.error('SDK error:', error);
            this.handleConnectionError(error);
        });
        
        // Quote events
        this.clientAdapter.on('quoteEvent', (quote) => {
            this.handleQuoteUpdate(quote);
        });
        
        // Execution events
        this.clientAdapter.on('executionEvent', (execution) => {
            this.handleExecutionUpdate(execution);
        });
        
        // Account events
        this.clientAdapter.on('accountEvent', (account) => {
            this.handleAccountUpdate(account);
        });
    }
    
    /**
     * Connect to cTrader host
     */
    async connect() {
        try {
            Logger.info('Connecting to cTrader host...');
            this.updateConnectionStatus('connecting');
            
            // Set connection timeout
            const timeout = setTimeout(() => {
                throw new Error('Connection timeout');
            }, CONFIG.CTRADER.CONNECT_TIMEOUT);
            
            // Establish connection
            await this.clientAdapter.connect();
            clearTimeout(timeout);
            
            // Subscribe to current symbol quotes
            await this.subscribeToSymbol(this.currentSymbol);
            
        } catch (error) {
            Logger.error('Connection failed:', error);
            this.handleConnectionError(error);
        }
    }
    
    /**
     * Handle successful connection
     */
    async onConnected() {
        try {
            // Get account information
            this.accountInfo = await this.getAccountInfo();
            Logger.info('Account info loaded:', this.accountInfo);
            
            // Get initial positions
            const positions = await this.getPositions();
            this.updatePositions(positions);
            
            // Get available symbols
            const symbols = await this.getSymbols();
            Logger.info(`Loaded ${symbols.length} symbols`);
            
            // Notify connection callbacks
            this.connectionCallbacks.forEach(callback => {
                try {
                    callback(true);
                } catch (error) {
                    Logger.error('Connection callback error:', error);
                }
            });
            
            this.isInitialized = true;
            Logger.info('SDK fully initialized');
            
        } catch (error) {
            Logger.error('Post-connection setup failed:', error);
        }
    }
    
    /**
     * Subscribe to symbol quotes using real cTrader SDK
     */
    async subscribeToSymbol(symbol) {
        try {
            if (!this.isConnected || !this.adapter) {
                console.warn('⚠️ SDK not connected, cannot subscribe to quotes');
                return false;
            }
            
            console.log(`📊 Subscribing to ${symbol} quotes...`);
            
            subscribeQuotes(this.adapter, { symbolId: symbol }).pipe(
                take(1),
                tap(() => {
                    console.log(`✅ Successfully subscribed to ${symbol} quotes`);
                    this.currentSymbol = symbol;
                })
            ).subscribe({
                error: (error) => {
                    console.error(`❌ Failed to subscribe to ${symbol}:`, error);
                }
            });
            
            return true;
        } catch (error) {
            console.error(`❌ Quote subscription error for ${symbol}:`, error);
            return false;
        }
    }
    
    /**
     * Unsubscribe from symbol quotes
     */
    async unsubscribeFromSymbol(symbol) {
        try {
            if (!this.isConnected || !this.clientAdapter) {
                return false;
            }
            
            Logger.info(`Unsubscribing from ${symbol} quotes`);
            await this.clientAdapter.unsubscribeFromQuotes([symbol]);
            
            return true;
        } catch (error) {
            Logger.error(`Failed to unsubscribe from ${symbol}:`, error);
            return false;
        }
    }
    
    /**
     * Get account information
     */
    async getAccountInfo() {
        try {
            if (!this.isConnected || !this.clientAdapter) {
                throw new Error('SDK not connected');
            }
            
            const account = await this.clientAdapter.getAccount();
            return {
                id: account.id,
                currency: account.currency,
                balance: account.balance,
                equity: account.equity,
                margin: account.margin,
                freeMargin: account.freeMargin,
                marginLevel: account.marginLevel,
                profit: account.profit
            };
        } catch (error) {
            Logger.error('Failed to get account info:', error);
            throw error;
        }
    }
    
    /**
     * Get current positions
     */
    async getPositions() {
        try {
            if (!this.isConnected || !this.clientAdapter) {
                throw new Error('SDK not connected');
            }
            
            const positions = await this.clientAdapter.getPositions();
            return positions.map(pos => ({
                id: pos.id,
                symbol: pos.symbol,
                side: pos.side,
                volume: pos.volume,
                entryPrice: pos.entryPrice,
                currentPrice: pos.currentPrice,
                profit: pos.profit,
                swap: pos.swap,
                commission: pos.commission,
                stopLoss: pos.stopLoss,
                takeProfit: pos.takeProfit,
                openTime: pos.openTime
            }));
        } catch (error) {
            Logger.error('Failed to get positions:', error);
            return [];
        }
    }
    
    /**
     * Get available symbols
     */
    async getSymbols() {
        try {
            if (!this.isConnected || !this.clientAdapter) {
                throw new Error('SDK not connected');
            }
            
            const symbols = await this.clientAdapter.getSymbols();
            return symbols.map(symbol => ({
                name: symbol.name,
                description: symbol.description,
                digits: symbol.digits,
                pipPosition: symbol.pipPosition,
                minVolume: symbol.minVolume,
                maxVolume: symbol.maxVolume,
                volumeStep: symbol.volumeStep
            }));
        } catch (error) {
            Logger.error('Failed to get symbols:', error);
            return [];
        }
    }
    
    /**
     * Execute market order using real cTrader SDK
     */
    async createMarketOrder(symbol, side, volume, stopLoss = null, takeProfit = null) {
        try {
            if (!this.isConnected || !this.adapter) {
                throw new Error('cTrader SDK not connected');
            }
            
            console.log(`💹 Creating ${side} market order: ${volume} ${symbol}`);
            
            const orderRequest = {
                symbolId: symbol,
                orderType: 'MARKET',
                tradeSide: side.toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
                volume: parseFloat(volume) * 100000 // Convert to lots
            };
            
            if (stopLoss) {
                orderRequest.stopLoss = parseFloat(stopLoss);
            }
            
            if (takeProfit) {
                orderRequest.takeProfit = parseFloat(takeProfit);
            }
            
            return new Promise((resolve) => {
                createNewOrder(this.adapter, orderRequest).pipe(
                    take(1),
                    tap((result) => {
                        console.log('✅ Market order created successfully:', result);
                        resolve({
                            success: true,
                            orderId: result.orderId,
                            message: `${side} order for ${volume} ${symbol} executed successfully`
                        });
                    })
                ).subscribe({
                    error: (error) => {
                        console.error('❌ Market order failed:', error);
                        resolve({
                            success: false,
                            error: error.message || 'Order execution failed'
                        });
                    }
                });
            });
            
        } catch (error) {
            console.error('❌ Order creation error:', error);
            return {
                success: false,
                error: error.message || 'Order execution failed'
            };
        }
    }
    
    /**
     * Close position using real cTrader SDK
     */
    async closePosition(positionId, volume = null) {
        try {
            if (!this.isConnected || !this.adapter) {
                throw new Error('cTrader SDK not connected');
            }
            
            console.log(`🔚 Closing position: ${positionId}${volume ? ` (${volume})` : ''}`);
            
            const closeRequest = {
                positionId: positionId
            };
            
            if (volume !== null) {
                closeRequest.volume = parseFloat(volume) * 100000;
            }
            
            return new Promise((resolve) => {
                closePosition(this.adapter, closeRequest).pipe(
                    take(1),
                    tap((result) => {
                        console.log('✅ Position closed successfully:', result);
                        resolve({
                            success: true,
                            message: 'Position closed successfully'
                        });
                    })
                ).subscribe({
                    error: (error) => {
                        console.error('❌ Position close failed:', error);
                        resolve({
                            success: false,
                            error: error.message || 'Failed to close position'
                        });
                    }
                });
            });
            
        } catch (error) {
            console.error('❌ Close position error:', error);
            return {
                success: false,
                error: error.message || 'Failed to close position'
            };
        }
    }
    
    /**
     * Modify position
     */
    async modifyPosition(positionId, stopLoss = null, takeProfit = null) {
        try {
            if (!this.isConnected || !this.clientAdapter) {
                throw new Error('SDK not connected');
            }
            
            Logger.info(`Modifying position: ${positionId}`);
            
            const params = { positionId };
            if (stopLoss !== null) params.stopLoss = stopLoss;
            if (takeProfit !== null) params.takeProfit = takeProfit;
            
            const result = await this.clientAdapter.modifyPosition(params);
            Logger.info('Position modified successfully:', result);
            
            return {
                success: true,
                message: 'Position modified successfully'
            };
            
        } catch (error) {
            Logger.error('Position modification failed:', error);
            return {
                success: false,
                error: error.message || 'Failed to modify position'
            };
        }
    }
    
    /**
     * Handle quote updates
     */
    handleQuoteUpdate(quote) {
        if (quote && quote.symbol) {
            const quoteData = {
                symbol: quote.symbol,
                bid: quote.bid,
                ask: quote.ask,
                spread: quote.ask - quote.bid,
                timestamp: Date.now()
            };
            
            this.quotes.set(quote.symbol, quoteData);
            
            // Update current symbol price display
            if (quote.symbol === this.currentSymbol) {
                this.updateSymbolPrice(quoteData);
            }
            
            // Notify quote callbacks
            this.quoteCallbacks.forEach(callback => {
                try {
                    callback(quoteData);
                } catch (error) {
                    Logger.error('Quote callback error:', error);
                }
            });
        }
    }
    
    /**
     * Handle execution updates
     */
    handleExecutionUpdate(execution) {
        Logger.info('Execution update:', execution);
        
        // Notify execution callbacks
        this.executionCallbacks.forEach(callback => {
            try {
                callback(execution);
            } catch (error) {
                Logger.error('Execution callback error:', error);
            }
        });
        
        // Refresh positions
        this.refreshPositions();
    }
    
    /**
     * Handle account updates
     */
    handleAccountUpdate(account) {
        Logger.info('Account update:', account);
        this.accountInfo = account;
        
        // Update portfolio display
        this.updatePortfolioDisplay(account);
    }
    
    /**
     * Update positions data
     */
    updatePositions(positions) {
        this.positions.clear();
        positions.forEach(position => {
            this.positions.set(position.id, position);
        });
        
        // Update positions display
        this.updatePositionsDisplay(Array.from(this.positions.values()));
    }
    
    /**
     * Refresh positions from server
     */
    async refreshPositions() {
        try {
            const positions = await this.getPositions();
            this.updatePositions(positions);
        } catch (error) {
            Logger.error('Failed to refresh positions:', error);
        }
    }
    
    /**
     * Handle connection errors
     */
    handleConnectionError(error) {
        Logger.error('Connection error:', error);
        this.isConnected = false;
        this.updateConnectionStatus('error');
        
        // Notify connection callbacks
        this.connectionCallbacks.forEach(callback => {
            try {
                callback(false, error);
            } catch (callbackError) {
                Logger.error('Connection callback error:', callbackError);
            }
        });
    }
    
    /**
     * Handle reconnection logic
     */
    handleReconnection() {
        if (this.reconnectAttempts >= CONFIG.CTRADER.MAX_RECONNECT_ATTEMPTS) {
            Logger.error('Max reconnection attempts reached');
            this.updateConnectionStatus('failed');
            return;
        }
        
        this.reconnectAttempts++;
        Logger.info(`Reconnection attempt ${this.reconnectAttempts}/${CONFIG.CTRADER.MAX_RECONNECT_ATTEMPTS}`);
        
        setTimeout(() => {
            this.connect();
        }, CONFIG.CTRADER.RECONNECT_INTERVAL);
    }
    
    /**
     * Start heartbeat to maintain connection
     */
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.clientAdapter) {
                this.clientAdapter.ping().catch(error => {
                    Logger.warn('Heartbeat failed:', error);
                });
            }
        }, CONFIG.CTRADER.HEARTBEAT_INTERVAL);
    }
    
    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    /**
     * Update connection status in UI
     */
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        const indicator = statusElement?.querySelector('.status-indicator');
        const text = statusElement?.querySelector('span:last-child');
        
        if (!statusElement) return;
        
        // Remove all status classes
        indicator?.classList.remove('connected', 'disconnected');
        
        switch (status) {
            case 'connecting':
                text && (text.textContent = 'Connecting...');
                break;
            case 'connected':
                indicator?.classList.add('connected');
                text && (text.textContent = 'Connected');
                break;
            case 'disconnected':
                indicator?.classList.add('disconnected');
                text && (text.textContent = 'Disconnected');
                break;
            case 'error':
                indicator?.classList.add('disconnected');
                text && (text.textContent = 'Connection Error');
                break;
            case 'failed':
                indicator?.classList.add('disconnected');
                text && (text.textContent = 'Connection Failed');
                break;
        }
    }
    
    /**
     * Update symbol price in UI
     */
    updateSymbolPrice(quote) {
        const symbolInfo = document.getElementById('symbol-info');
        if (!symbolInfo) return;
        
        const nameElement = symbolInfo.querySelector('.symbol-name');
        const priceElement = symbolInfo.querySelector('.symbol-price');
        const changeElement = symbolInfo.querySelector('.symbol-change');
        
        if (nameElement) nameElement.textContent = quote.symbol;
        if (priceElement) priceElement.textContent = quote.ask.toFixed(5);
        
        // Calculate change (simplified - would need historical data)
        if (changeElement) {
            changeElement.textContent = `±${quote.spread.toFixed(5)}`;
        }
    }
    
    /**
     * Update portfolio display
     */
    updatePortfolioDisplay(account) {
        // This will be implemented by the main app
        if (window.app && window.app.updatePortfolio) {
            window.app.updatePortfolio(account);
        }
    }
    
    /**
     * Update positions display
     */
    updatePositionsDisplay(positions) {
        // This will be implemented by the main app
        if (window.app && window.app.updatePositions) {
            window.app.updatePositions(positions);
        }
    }
    
    /**
     * Initialize mock mode for development
     */
    initMockMode() {
        Logger.info('Initializing mock mode');
        
        setTimeout(() => {
            this.isConnected = true;
            this.isInitialized = true;
            this.updateConnectionStatus('connected');
            
            // Mock account data
            this.accountInfo = {
                id: 'MOCK_ACCOUNT',
                currency: 'USD',
                balance: 10000.00,
                equity: 10150.00,
                margin: 500.00,
                freeMargin: 9650.00,
                marginLevel: 2030.00,
                profit: 150.00
            };
            
            // Start mock quote updates
            this.startMockQuotes();
            
            // Notify connection
            this.connectionCallbacks.forEach(callback => callback(true));
            
        }, 2000);
    }
    
    /**
     * Start mock quote updates
     */
    startMockQuotes() {
        setInterval(() => {
            const mockQuote = {
                symbol: this.currentSymbol,
                bid: 1.0850 + (Math.random() - 0.5) * 0.001,
                ask: 1.0855 + (Math.random() - 0.5) * 0.001,
                timestamp: Date.now()
            };
            mockQuote.spread = mockQuote.ask - mockQuote.bid;
            
            this.handleQuoteUpdate(mockQuote);
        }, 1000);
    }
    
    /**
     * Notify account update to UI
     */
    notifyAccountUpdate(account) {
        console.log('💰 Account updated:', account);
        
        // Update portfolio display
        if (window.app && window.app.updatePortfolio) {
            window.app.updatePortfolio(account);
        }
    }
    
    // Event subscription methods
    onConnection(callback) {
        this.connectionCallbacks.push(callback);
    }
    
    onQuote(callback) {
        this.quoteCallbacks.push(callback);
    }
    
    onExecution(callback) {
        this.executionCallbacks.push(callback);
    }
    
    // Utility methods
    getCurrentQuote(symbol = null) {
        return this.quotes.get(symbol || this.currentSymbol);
    }
    
    setCurrentSymbol(symbol) {
        this.currentSymbol = symbol;
        this.subscribeToSymbol(symbol);
    }
    
    isReady() {
        return this.isConnected && this.isInitialized;
    }
}

// Create and export SDK instance
const ctraderSDK = new CTraderSDK();

// Make available globally for compatibility
window.ctraderSDK = ctraderSDK;

// Export for ES modules
export default ctraderSDK;