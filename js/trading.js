/**
 * TradeMaster AI Pro - Trading Engine
 * Handles all trading operations and order management
 */

class TradingEngine {
    constructor() {
        this.isInitialized = false;
        this.currentSymbol = initializeSymbol();
        this.defaultVolume = CONFIG.TRADING.DEFAULT_VOLUME;
        this.positions = new Map();
        this.pendingOrders = new Map();
        this.tradingHistory = [];
        this.riskManager = new RiskManager();
        this.performanceTracker = new PerformanceTracker();
        
        this.init();
    }
    
    /**
     * Initialize trading engine
     */
    init() {
        Logger.info('Initializing Trading Engine...');
        
        this.setupEventHandlers();
        this.loadTradingSettings();
        
        // Connect to cTrader SDK
        if (window.ctraderSDK) {
            window.ctraderSDK.onConnection((connected) => {
                if (connected) {
                    this.onSDKConnected();
                }
            });
            
            window.ctraderSDK.onExecution((execution) => {
                this.handleExecutionUpdate(execution);
            });
        }
        
        this.isInitialized = true;
        Logger.info('Trading Engine initialized');
    }
    
    /**
     * Setup event handlers for trading interface
     */
    setupEventHandlers() {
        // Buy/Sell buttons
        const buyButton = document.getElementById('btn-buy');
        const sellButton = document.getElementById('btn-sell');
        
        if (buyButton) {
            buyButton.addEventListener('click', () => {
                this.executeTrade('buy');
            });
        }
        
        if (sellButton) {
            sellButton.addEventListener('click', () => {
                this.executeTrade('sell');
            });
        }
        
        // Volume input validation
        const volumeInput = document.getElementById('volume-input');
        if (volumeInput) {
            volumeInput.addEventListener('input', (e) => {
                this.validateVolumeInput(e.target);
            });
            
            volumeInput.addEventListener('blur', (e) => {
                this.normalizeVolumeInput(e.target);
            });
        }
        
        // Stop Loss and Take Profit validation
        const slInput = document.getElementById('sl-input');
        const tpInput = document.getElementById('tp-input');
        
        if (slInput) {
            slInput.addEventListener('input', (e) => {
                this.validatePriceInput(e.target, 'sl');
            });
        }
        
        if (tpInput) {
            tpInput.addEventListener('input', (e) => {
                this.validatePriceInput(e.target, 'tp');
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // Symbol changes
        document.addEventListener('symbolChanged', (e) => {
            this.currentSymbol = e.detail.symbol;
            this.updateTradingInterface();
        });
    }
    
    /**
     * Handle SDK connection
     */
    async onSDKConnected() {
        try {
            Logger.info('Trading Engine connected to cTrader SDK');
            
            // Load existing positions
            await this.loadPositions();
            
            // Update trading interface
            this.updateTradingInterface();
            
        } catch (error) {
            Logger.error('SDK connection handling failed:', error);
        }
    }
    
    /**
     * Execute trade (market order)
     */
    async executeTrade(side, customParams = {}) {
        try {
            Logger.info(`Executing ${side} trade for ${this.currentSymbol}`);
            
            // Get trade parameters
            const params = this.getTradeParameters(side, customParams);
            
            // Validate trade
            const validation = this.validateTrade(params);
            if (!validation.isValid) {
                this.showTradeError(validation.errors.join(', '));
                return { success: false, error: validation.errors.join(', ') };
            }
            
            // Risk management check
            const riskCheck = await this.riskManager.checkTrade(params);
            if (!riskCheck.allowed) {
                this.showTradeError(riskCheck.reason);
                return { success: false, error: riskCheck.reason };
            }
            
            // Show confirmation dialog for large trades
            if (params.volume > 1.0) {
                const confirmed = await this.showTradeConfirmation(params);
                if (!confirmed) {
                    return { success: false, error: 'Trade cancelled by user' };
                }
            }
            
            // Disable trading buttons during execution
            this.setTradingButtonsEnabled(false);
            
            // Execute trade via cTrader SDK
            const result = await this.executeMarketOrder(params);
            
            if (result.success) {
                this.handleTradeSuccess(result, params);
                this.performanceTracker.recordTrade(params, result);
                
                // Show success notification
                this.showTradeSuccess(`${side.toUpperCase()} order executed successfully`);
                
                // Clear form inputs
                this.clearTradeForm();
                
            } else {
                this.handleTradeError(result.error);
                this.showTradeError(result.error);
            }
            
            return result;
            
        } catch (error) {
            Logger.error('Trade execution failed:', error);
            this.handleTradeError(error.message);
            this.showTradeError('Trade execution failed');
            return { success: false, error: error.message };
            
        } finally {
            // Re-enable trading buttons
            this.setTradingButtonsEnabled(true);
        }
    }
    
    /**
     * Get trade parameters from form
     */
    getTradeParameters(side, customParams = {}) {
        const volumeInput = document.getElementById('volume-input');
        const slInput = document.getElementById('sl-input');
        const tpInput = document.getElementById('tp-input');
        
        const quote = window.ctraderSDK?.getCurrentQuote(this.currentSymbol);
        const currentPrice = quote ? (side === 'buy' ? quote.ask : quote.bid) : null;
        
        return {
            symbol: this.currentSymbol,
            side: side.toLowerCase(),
            volume: customParams.volume || parseFloat(volumeInput?.value || this.defaultVolume),
            stopLoss: customParams.stopLoss || (slInput?.value ? parseFloat(slInput.value) : null),
            takeProfit: customParams.takeProfit || (tpInput?.value ? parseFloat(tpInput.value) : null),
            orderType: 'market',
            currentPrice: currentPrice,
            timestamp: Date.now()
        };
    }
    
    /**
     * Validate trade parameters
     */
    validateTrade(params) {
        const errors = [];
        
        // Volume validation
        if (!params.volume || params.volume <= 0) {
            errors.push('Invalid volume');
        }
        
        if (params.volume < CONFIG.TRADING.MIN_VOLUME) {
            errors.push(`Volume below minimum (${CONFIG.TRADING.MIN_VOLUME})`);
        }
        
        if (params.volume > CONFIG.TRADING.MAX_VOLUME) {
            errors.push(`Volume above maximum (${CONFIG.TRADING.MAX_VOLUME})`);
        }
        
        // Price validation
        if (params.stopLoss && params.currentPrice) {
            const isValidSL = params.side === 'buy' ? 
                params.stopLoss < params.currentPrice : 
                params.stopLoss > params.currentPrice;
                
            if (!isValidSL) {
                errors.push('Invalid stop loss level');
            }
        }
        
        if (params.takeProfit && params.currentPrice) {
            const isValidTP = params.side === 'buy' ? 
                params.takeProfit > params.currentPrice : 
                params.takeProfit < params.currentPrice;
                
            if (!isValidTP) {
                errors.push('Invalid take profit level');
            }
        }
        
        // Symbol validation
        if (!params.symbol || params.symbol.length < 6) {
            errors.push('Invalid symbol');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Execute market order via cTrader SDK
     */
    async executeMarketOrder(params) {
        try {
            if (!window.ctraderSDK || !window.ctraderSDK.isReady()) {
                // Mock execution for development
                return this.mockTradeExecution(params);
            }
            
            const result = await window.ctraderSDK.createMarketOrder(
                params.symbol,
                params.side,
                params.volume,
                params.stopLoss,
                params.takeProfit
            );
            
            return result;
            
        } catch (error) {
            Logger.error('Market order execution failed:', error);
            return {
                success: false,
                error: error.message || 'Order execution failed'
            };
        }
    }
    
    /**
     * Mock trade execution for development
     */
    mockTradeExecution(params) {
        Logger.info('Executing mock trade:', params);
        
        // Simulate random success/failure
        const success = Math.random() > 0.1; // 90% success rate
        
        if (success) {
            const orderId = 'MOCK_' + Date.now();
            return {
                success: true,
                orderId: orderId,
                message: 'Mock trade executed successfully',
                executionPrice: params.currentPrice + (Math.random() - 0.5) * 0.0001
            };
        } else {
            return {
                success: false,
                error: 'Mock execution failed - insufficient margin'
            };
        }
    }
    
    /**
     * Handle successful trade execution
     */
    handleTradeSuccess(result, params) {
        Logger.info('Trade executed successfully:', result);
        
        // Add to trading history
        this.tradingHistory.push({
            ...params,
            orderId: result.orderId,
            executionPrice: result.executionPrice || params.currentPrice,
            executionTime: Date.now(),
            status: 'executed'
        });
        
        // Update performance metrics
        this.performanceTracker.recordTrade(params, result);
        
        // Trigger UI updates
        this.updateTradingInterface();
        this.refreshPortfolio();
    }
    
    /**
     * Handle trade execution error
     */
    handleTradeError(error) {
        Logger.error('Trade execution error:', error);
        
        // Record failed trade for analysis
        this.tradingHistory.push({
            symbol: this.currentSymbol,
            side: 'unknown',
            volume: 0,
            status: 'failed',
            error: error,
            timestamp: Date.now()
        });
    }
    
    /**
     * Close position
     */
    async closePosition(positionId, volume = null) {
        try {
            Logger.info(`Closing position ${positionId}${volume ? ` (${volume} lots)` : ''}`);
            
            const position = this.positions.get(positionId);
            if (!position) {
                throw new Error('Position not found');
            }
            
            // Disable position actions during close
            this.setPositionActionsEnabled(positionId, false);
            
            let result;
            if (window.ctraderSDK && window.ctraderSDK.isReady()) {
                result = await window.ctraderSDK.closePosition(positionId, volume);
            } else {
                // Mock close for development
                result = {
                    success: true,
                    message: 'Mock position closed successfully'
                };
            }
            
            if (result.success) {
                this.showTradeSuccess('Position closed successfully');
                
                if (!volume) {
                    // Full close - remove position
                    this.positions.delete(positionId);
                } else {
                    // Partial close - update position volume
                    position.volume -= volume;
                    if (position.volume <= 0) {
                        this.positions.delete(positionId);
                    }
                }
                
                this.updatePositionsDisplay();
                this.refreshPortfolio();
                
            } else {
                this.showTradeError(result.error || 'Failed to close position');
            }
            
            return result;
            
        } catch (error) {
            Logger.error('Position close failed:', error);
            this.showTradeError('Failed to close position');
            return { success: false, error: error.message };
            
        } finally {
            this.setPositionActionsEnabled(positionId, true);
        }
    }
    
    /**
     * Modify position (change SL/TP)
     */
    async modifyPosition(positionId, stopLoss = null, takeProfit = null) {
        try {
            Logger.info(`Modifying position ${positionId}`);
            
            const position = this.positions.get(positionId);
            if (!position) {
                throw new Error('Position not found');
            }
            
            let result;
            if (window.ctraderSDK && window.ctraderSDK.isReady()) {
                result = await window.ctraderSDK.modifyPosition(positionId, stopLoss, takeProfit);
            } else {
                // Mock modification for development
                result = {
                    success: true,
                    message: 'Mock position modified successfully'
                };
            }
            
            if (result.success) {
                // Update local position data
                if (stopLoss !== null) position.stopLoss = stopLoss;
                if (takeProfit !== null) position.takeProfit = takeProfit;
                
                this.showTradeSuccess('Position modified successfully');
                this.updatePositionsDisplay();
                
            } else {
                this.showTradeError(result.error || 'Failed to modify position');
            }
            
            return result;
            
        } catch (error) {
            Logger.error('Position modification failed:', error);
            this.showTradeError('Failed to modify position');
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Close all profitable positions
     */
    async closeAllProfitable() {
        const profitablePositions = Array.from(this.positions.values())
            .filter(pos => pos.profit > 0);
        
        if (profitablePositions.length === 0) {
            this.showTradeError('No profitable positions found');
            return;
        }
        
        const confirmed = confirm(`Close ${profitablePositions.length} profitable positions?`);
        if (!confirmed) return;
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const position of profitablePositions) {
            const result = await this.closePosition(position.id);
            if (result.success) {
                successCount++;
            } else {
                errorCount++;
            }
        }
        
        const message = `Closed ${successCount} positions${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
        if (errorCount > 0) {
            this.showTradeError(message);
        } else {
            this.showTradeSuccess(message);
        }
    }
    
    /**
     * Load existing positions from cTrader
     */
    async loadPositions() {
        try {
            if (!window.ctraderSDK || !window.ctraderSDK.isReady()) {
                // Load mock positions for development
                this.loadMockPositions();
                return;
            }
            
            const positions = await window.ctraderSDK.getPositions();
            
            this.positions.clear();
            positions.forEach(position => {
                this.positions.set(position.id, position);
            });
            
            Logger.info(`Loaded ${positions.length} positions`);
            this.updatePositionsDisplay();
            
        } catch (error) {
            Logger.error('Failed to load positions:', error);
        }
    }
    
    /**
     * Load mock positions for development
     */
    loadMockPositions() {
        const mockPositions = [
            {
                id: 'MOCK_POS_1',
                symbol: 'EURUSD',
                side: 'buy',
                volume: 0.1,
                entryPrice: 1.0845,
                currentPrice: 1.0850,
                profit: 5.0,
                swap: -0.5,
                commission: -2.0,
                stopLoss: 1.0820,
                takeProfit: 1.0880,
                openTime: Date.now() - 3600000 // 1 hour ago
            },
            {
                id: 'MOCK_POS_2',
                symbol: 'GBPUSD',
                side: 'sell',
                volume: 0.05,
                entryPrice: 1.2650,
                currentPrice: 1.2645,
                profit: 2.5,
                swap: -0.2,
                commission: -1.0,
                stopLoss: 1.2680,
                takeProfit: 1.2620,
                openTime: Date.now() - 1800000 // 30 minutes ago
            }
        ];
        
        this.positions.clear();
        mockPositions.forEach(position => {
            this.positions.set(position.id, position);
        });
        
        this.updatePositionsDisplay();
    }
    
    /**
     * Handle execution updates from cTrader
     */
    handleExecutionUpdate(execution) {
        Logger.info('Execution update received:', execution);
        
        // Update positions
        this.loadPositions();
        
        // Update portfolio
        this.refreshPortfolio();
        
        // Show notification
        if (execution.type === 'ORDER_FILLED') {
            this.showTradeSuccess(`Order ${execution.orderId} filled`);
        }
    }
    
    /**
     * Update positions display in UI
     */
    updatePositionsDisplay() {
        const positionsContainer = document.getElementById('positions-list');
        if (!positionsContainer) return;
        
        const positions = Array.from(this.positions.values());
        
        if (positions.length === 0) {
            positionsContainer.innerHTML = '<div class="no-positions">No open positions</div>';
            return;
        }
        
        positionsContainer.innerHTML = positions.map(position => `
            <div class="position-item" data-position-id="${position.id}">
                <div class="position-header">
                    <span class="position-symbol">${position.symbol}</span>
                    <span class="position-side ${position.side}">${position.side.toUpperCase()}</span>
                    <span class="position-volume">${position.volume}</span>
                </div>
                <div class="position-details">
                    <div class="position-prices">
                        <span>Entry: ${NumberUtils.formatNumber(position.entryPrice, 5)}</span>
                        <span>Current: ${NumberUtils.formatNumber(position.currentPrice, 5)}</span>
                    </div>
                    <div class="position-pnl ${position.profit >= 0 ? 'positive' : 'negative'}">
                        ${NumberUtils.formatCurrency(position.profit)}
                    </div>
                </div>
                <div class="position-actions">
                    <button class="btn-small btn-danger" onclick="tradingEngine.closePosition('${position.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="btn-small btn-secondary" onclick="tradingEngine.showModifyDialog('${position.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Update trading interface elements
     */
    updateTradingInterface() {
        // Update symbol in trading panel
        const currentQuote = window.ctraderSDK?.getCurrentQuote(this.currentSymbol);
        
        if (currentQuote) {
            // Update buy/sell button prices
            const buyButton = document.getElementById('btn-buy');
            const sellButton = document.getElementById('btn-sell');
            
            if (buyButton) {
                buyButton.innerHTML = `<i class="fas fa-arrow-up"></i> BUY ${NumberUtils.formatNumber(currentQuote.ask, 5)}`;
            }
            
            if (sellButton) {
                sellButton.innerHTML = `<i class="fas fa-arrow-down"></i> SELL ${NumberUtils.formatNumber(currentQuote.bid, 5)}`;
            }
        }
        
        // Update risk calculations
        this.updateRiskDisplay();
    }
    
    /**
     * Update risk display
     */
    updateRiskDisplay() {
        const volumeInput = document.getElementById('volume-input');
        const slInput = document.getElementById('sl-input');
        
        if (!volumeInput || !slInput || !slInput.value) return;
        
        const volume = parseFloat(volumeInput.value || 0);
        const stopLoss = parseFloat(slInput.value);
        const quote = window.ctraderSDK?.getCurrentQuote(this.currentSymbol);
        
        if (volume && stopLoss && quote) {
            const entryPrice = quote.ask; // Assume buy order
            const riskAmount = TradingUtils.calculatePositionSize(
                window.ctraderSDK?.accountInfo?.balance || 10000,
                1, // 1% risk
                entryPrice,
                stopLoss
            );
            
            // Could add risk display element to UI
            Logger.debug(`Risk calculation: Volume=${volume}, Risk=${riskAmount}`);
        }
    }
    
    /**
     * Show trade confirmation dialog
     */
    async showTradeConfirmation(params) {
        return new Promise((resolve) => {
            const message = `Execute ${params.side.toUpperCase()} ${params.volume} lots of ${params.symbol}?`;
            const riskAmount = params.volume * 10000; // Simplified risk calculation
            const fullMessage = `${message}\n\nEstimated risk: $${riskAmount.toFixed(2)}`;
            
            resolve(confirm(fullMessage));
        });
    }
    
    /**
     * Show modify position dialog
     */
    showModifyDialog(positionId) {
        const position = this.positions.get(positionId);
        if (!position) return;
        
        const newSL = prompt('Enter new Stop Loss (leave empty to remove):', position.stopLoss || '');
        const newTP = prompt('Enter new Take Profit (leave empty to remove):', position.takeProfit || '');
        
        if (newSL !== null || newTP !== null) {
            this.modifyPosition(
                positionId,
                newSL ? parseFloat(newSL) : null,
                newTP ? parseFloat(newTP) : null
            );
        }
    }
    
    /**
     * Validate volume input
     */
    validateVolumeInput(input) {
        const value = parseFloat(input.value);
        
        if (isNaN(value) || value < CONFIG.TRADING.MIN_VOLUME) {
            input.style.borderColor = 'var(--danger-color)';
            return false;
        } else if (value > CONFIG.TRADING.MAX_VOLUME) {
            input.style.borderColor = 'var(--warning-color)';
            return false;
        } else {
            input.style.borderColor = 'var(--border-color)';
            return true;
        }
    }
    
    /**
     * Normalize volume input to valid step
     */
    normalizeVolumeInput(input) {
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
            const normalized = Math.round(value / CONFIG.TRADING.VOLUME_STEP) * CONFIG.TRADING.VOLUME_STEP;
            input.value = normalized.toFixed(2);
        }
    }
    
    /**
     * Validate price input (SL/TP)
     */
    validatePriceInput(input, type) {
        const value = parseFloat(input.value);
        const quote = window.ctraderSDK?.getCurrentQuote(this.currentSymbol);
        
        if (!quote || isNaN(value)) {
            input.style.borderColor = 'var(--border-color)';
            return true; // Allow empty or invalid for optional fields
        }
        
        // Basic validation - more sophisticated logic could be added
        const currentPrice = quote.ask;
        const isReasonable = Math.abs(value - currentPrice) / currentPrice < 0.1; // Within 10%
        
        if (isReasonable) {
            input.style.borderColor = 'var(--success-color)';
            return true;
        } else {
            input.style.borderColor = 'var(--warning-color)';
            return false;
        }
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
            return; // Don't handle shortcuts when typing in input fields
        }
        
        switch (e.key.toLowerCase()) {
            case 'b':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.executeTrade('buy');
                }
                break;
            case 's':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.executeTrade('sell');
                }
                break;
            case 'c':
                if (e.ctrlKey || e.metaKey && e.shiftKey) {
                    e.preventDefault();
                    this.closeAllProfitable();
                }
                break;
        }
    }
    
    /**
     * Enable/disable trading buttons
     */
    setTradingButtonsEnabled(enabled) {
        const buyButton = document.getElementById('btn-buy');
        const sellButton = document.getElementById('btn-sell');
        
        if (buyButton) {
            buyButton.disabled = !enabled;
            buyButton.style.opacity = enabled ? '1' : '0.6';
        }
        
        if (sellButton) {
            sellButton.disabled = !enabled;
            sellButton.style.opacity = enabled ? '1' : '0.6';
        }
    }
    
    /**
     * Enable/disable position actions
     */
    setPositionActionsEnabled(positionId, enabled) {
        const positionElement = document.querySelector(`[data-position-id="${positionId}"]`);
        if (positionElement) {
            const buttons = positionElement.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.disabled = !enabled;
                btn.style.opacity = enabled ? '1' : '0.6';
            });
        }
    }
    
    /**
     * Clear trade form
     */
    clearTradeForm() {
        const slInput = document.getElementById('sl-input');
        const tpInput = document.getElementById('tp-input');
        
        if (slInput) slInput.value = '';
        if (tpInput) tpInput.value = '';
    }
    
    /**
     * Show success notification
     */
    showTradeSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    /**
     * Show error notification
     */
    showTradeError(message) {
        this.showNotification(message, 'error');
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = DOMUtils.createElement('div', {
            className: `notification notification-${type}`,
            style: `
                position: fixed;
                top: 80px;
                right: 20px;
                padding: 12px 16px;
                background: var(--${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}-color);
                color: white;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                max-width: 300px;
                animation: slideIn 0.3s ease-out;
            `
        }, message);
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, CONFIG.UI.NOTIFICATION_DURATION);
    }
    
    /**
     * Refresh portfolio display
     */
    refreshPortfolio() {
        if (window.app && window.app.updatePortfolio) {
            window.app.updatePortfolio(window.ctraderSDK?.accountInfo);
        }
    }
    
    /**
     * Load trading settings
     */
    loadTradingSettings() {
        const savedVolume = StorageUtils.getItem('default_volume');
        if (savedVolume) {
            this.defaultVolume = savedVolume;
            const volumeInput = document.getElementById('volume-input');
            if (volumeInput) {
                volumeInput.value = savedVolume;
            }
        }
    }
    
    /**
     * Save trading settings
     */
    saveTradingSettings() {
        const volumeInput = document.getElementById('volume-input');
        if (volumeInput && volumeInput.value) {
            StorageUtils.setItem('default_volume', parseFloat(volumeInput.value));
        }
    }
    
    /**
     * Get trading statistics
     */
    getTradingStats() {
        return this.performanceTracker.getStats();
    }
    
    /**
     * Get current positions
     */
    getPositions() {
        return Array.from(this.positions.values());
    }
    
    /**
     * Get trading history
     */
    getTradingHistory() {
        return [...this.tradingHistory];
    }
}

/**
 * Risk Manager - handles risk assessment and position sizing
 */
class RiskManager {
    constructor() {
        this.maxRiskPercent = CONFIG.TRADING.MAX_RISK_PERCENT;
        this.maxPositions = CONFIG.TRADING.MAX_POSITIONS;
    }
    
    async checkTrade(params) {
        // Check maximum positions
        if (window.tradingEngine.positions.size >= this.maxPositions) {
            return {
                allowed: false,
                reason: `Maximum positions limit reached (${this.maxPositions})`
            };
        }
        
        // Check account balance
        const account = window.ctraderSDK?.accountInfo;
        if (account) {
            const requiredMargin = TradingUtils.calculateMargin(params.volume, params.currentPrice);
            
            if (requiredMargin > account.freeMargin) {
                return {
                    allowed: false,
                    reason: 'Insufficient margin'
                };
            }
        }
        
        // Check risk per trade
        if (params.stopLoss && params.currentPrice && account) {
            const riskAmount = Math.abs(params.currentPrice - params.stopLoss) * params.volume * 100000;
            const riskPercent = (riskAmount / account.balance) * 100;
            
            if (riskPercent > this.maxRiskPercent) {
                return {
                    allowed: false,
                    reason: `Risk too high (${riskPercent.toFixed(2)}% > ${this.maxRiskPercent}%)`
                };
            }
        }
        
        return { allowed: true };
    }
}

/**
 * Performance Tracker - tracks trading performance metrics
 */
class PerformanceTracker {
    constructor() {
        this.trades = [];
        this.stats = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalProfit: 0,
            totalLoss: 0,
            largestWin: 0,
            largestLoss: 0,
            consecutiveWins: 0,
            consecutiveLosses: 0,
            maxConsecutiveWins: 0,
            maxConsecutiveLosses: 0
        };
    }
    
    recordTrade(params, result) {
        const trade = {
            ...params,
            result: result,
            timestamp: Date.now()
        };
        
        this.trades.push(trade);
        this.updateStats();
        
        // Save to storage
        StorageUtils.setItem('trading_history', this.trades);
    }
    
    updateStats() {
        // Reset stats
        Object.keys(this.stats).forEach(key => {
            if (typeof this.stats[key] === 'number') {
                this.stats[key] = 0;
            }
        });
        
        let consecutiveWins = 0;
        let consecutiveLosses = 0;
        
        this.trades.forEach(trade => {
            this.stats.totalTrades++;
            
            // This would need actual P&L data from closed positions
            // For now, just track trade counts
            if (trade.result && trade.result.success) {
                this.stats.winningTrades++;
                consecutiveWins++;
                consecutiveLosses = 0;
                
                this.stats.maxConsecutiveWins = Math.max(this.stats.maxConsecutiveWins, consecutiveWins);
            } else {
                this.stats.losingTrades++;
                consecutiveLosses++;
                consecutiveWins = 0;
                
                this.stats.maxConsecutiveLosses = Math.max(this.stats.maxConsecutiveLosses, consecutiveLosses);
            }
        });
        
        this.stats.consecutiveWins = consecutiveWins;
        this.stats.consecutiveLosses = consecutiveLosses;
    }
    
    getStats() {
        const winRate = this.stats.totalTrades > 0 ? 
            (this.stats.winningTrades / this.stats.totalTrades) * 100 : 0;
        
        return {
            ...this.stats,
            winRate: winRate.toFixed(2)
        };
    }
}

// Initialize trading engine
const tradingEngine = new TradingEngine();