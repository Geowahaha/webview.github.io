/**
 * TradeMaster AI Pro - cTrader SDK Integration
 * Handles all cTrader WebView SDK interactions
 */

class CTraderSDK {
    constructor() {
        this.isConnected = false;
        this.isInitialized = false;
        this.clientAdapter = null;
        this.currentSymbol = initializeSymbol();
        this.accountInfo = null;
        this.positions = new Map();
        this.quotes = new Map();
        this.connectionCallbacks = [];
        this.quoteCallbacks = [];
        this.executionCallbacks = [];
        this.reconnectAttempts = 0;
        this.heartbeatInterval = null;
        
        this.init();
    }
    
    /**
     * Initialize the cTrader SDK connection
     */
    async init() {
        try {
            Logger.info('Initializing cTrader SDK...');
            
            // Check if SDK is available
            if (typeof window.cTraderSDK === 'undefined') {
                Logger.warn('cTrader SDK not found, using mock mode for development');
                this.initMockMode();
                return;
            }
            
            // Create client adapter
            this.clientAdapter = new window.cTraderSDK.ClientAdapter();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start connection process
            await this.connect();
            
        } catch (error) {
            Logger.error('SDK initialization failed:', error);
            this.handleConnectionError(error);
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
     * Subscribe to symbol quotes
     */
    async subscribeToSymbol(symbol) {
        try {
            if (!this.isConnected || !this.clientAdapter) {
                throw new Error('SDK not connected');
            }
            
            Logger.info(`Subscribing to ${symbol} quotes`);
            await this.clientAdapter.subscribeToQuotes([symbol]);
            
            return true;
        } catch (error) {
            Logger.error(`Failed to subscribe to ${symbol}:`, error);
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
     * Execute market order
     */
    async createMarketOrder(symbol, side, volume, stopLoss = null, takeProfit = null) {
        try {
            if (!this.isConnected || !this.clientAdapter) {
                throw new Error('SDK not connected');
            }
            
            Logger.info(`Creating market order: ${side} ${volume} ${symbol}`);
            
            const orderParams = {
                symbol: symbol,
                orderType: 'MARKET',
                tradeSide: side.toLowerCase(),
                volume: volume
            };
            
            if (stopLoss) orderParams.stopLoss = stopLoss;
            if (takeProfit) orderParams.takeProfit = takeProfit;
            
            const result = await this.clientAdapter.createOrder(orderParams);
            Logger.info('Order created successfully:', result);
            
            return {
                success: true,
                orderId: result.id,
                message: 'Order executed successfully'
            };
            
        } catch (error) {
            Logger.error('Order creation failed:', error);
            return {
                success: false,
                error: error.message || 'Order execution failed'
            };
        }
    }
    
    /**
     * Close position
     */
    async closePosition(positionId, volume = null) {
        try {
            if (!this.isConnected || !this.clientAdapter) {
                throw new Error('SDK not connected');
            }
            
            Logger.info(`Closing position: ${positionId}${volume ? ` (${volume})` : ''}`);
            
            const result = await this.clientAdapter.closePosition(positionId, volume);
            Logger.info('Position closed successfully:', result);
            
            return {
                success: true,
                message: 'Position closed successfully'
            };
            
        } catch (error) {
            Logger.error('Position close failed:', error);
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

// Create global SDK instance
const ctraderSDK = new CTraderSDK();