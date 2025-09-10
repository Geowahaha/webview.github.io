/**
 * TradeMaster AI Pro - AI Assistant
 * Handles AI chat interface and intelligent trading assistance
 */

class AIAssistant {
    constructor() {
        this.chatMessages = [];
        this.isProcessing = false;
        this.apiKey = null; // Will be set from environment or config
        this.conversationHistory = [];
        this.currentContext = {
            symbol: initializeSymbol(),
            account: null,
            positions: [],
            quotes: {}
        };
        
        this.init();
    }
    
    /**
     * Initialize AI Assistant
     */
    init() {
        Logger.info('Initializing AI Assistant...');
        
        // Set up chat interface
        this.setupChatInterface();
        
        // Load conversation history from storage
        this.loadConversationHistory();
        
        // Set up cTrader SDK integration
        if (window.ctraderSDK) {
            window.ctraderSDK.onConnection((connected) => {
                if (connected) {
                    this.updateContext();
                }
            });
            
            window.ctraderSDK.onQuote((quote) => {
                this.currentContext.quotes[quote.symbol] = quote;
            });
        }
        
        Logger.info('AI Assistant initialized');
    }
    
    /**
     * Set up chat interface event handlers
     */
    setupChatInterface() {
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-message');
        const clearButton = document.getElementById('clear-chat');
        const quickActionButtons = document.querySelectorAll('.quick-action-btn');
        
        // Send message on Enter key
        chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Send button click
        sendButton?.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Clear chat button
        clearButton?.addEventListener('click', () => {
            this.clearChat();
        });
        
        // Quick action buttons
        quickActionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }
    
    /**
     * Send message to AI
     */
    async sendMessage(message = null) {
        const chatInput = document.getElementById('chat-input');
        const userMessage = message || chatInput?.value?.trim();
        
        if (!userMessage || this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            this.updateSendButton(false);
            
            // Clear input
            if (chatInput) chatInput.value = '';
            
            // Add user message to chat
            this.addMessage('user', userMessage);
            
            // Update context before processing
            await this.updateContext();
            
            // Process with AI
            const aiResponse = await this.processWithAI(userMessage);
            
            // Add AI response to chat
            this.addMessage('ai', aiResponse.message, aiResponse.actions);
            
            // Execute any suggested actions
            if (aiResponse.actions && aiResponse.actions.length > 0) {
                await this.executeActions(aiResponse.actions);
            }
            
        } catch (error) {
            Logger.error('Message processing failed:', error);
            this.addMessage('ai', 'I apologize, but I encountered an error processing your request. Please try again.', null, true);
        } finally {
            this.isProcessing = false;
            this.updateSendButton(true);
        }
    }
    
    /**
     * Process message with AI
     */
    async processWithAI(userMessage) {
        try {
            // Prepare context for AI
            const contextPrompt = this.buildContextPrompt();
            
            // Build conversation history
            const messages = [
                {
                    role: 'system',
                    content: CONFIG.AI.SYSTEM_PROMPT + '\n\n' + contextPrompt
                },
                ...this.conversationHistory.slice(-10), // Keep last 10 messages for context
                {
                    role: 'user',
                    content: userMessage
                }
            ];
            
            // For now, simulate AI response (replace with actual API call in production)
            const response = await this.simulateAIResponse(userMessage, this.currentContext);
            
            // Add to conversation history
            this.conversationHistory.push(
                { role: 'user', content: userMessage },
                { role: 'assistant', content: response.message }
            );
            
            // Save conversation history
            this.saveConversationHistory();
            
            return response;
            
        } catch (error) {
            Logger.error('AI processing error:', error);
            throw error;
        }
    }
    
    /**
     * Simulate AI response (replace with actual AI API call)
     */
    async simulateAIResponse(userMessage, context) {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        const message = userMessage.toLowerCase();
        let response = {
            message: '',
            actions: []
        };
        
        // Pattern matching for different types of requests
        if (message.includes('buy') || message.includes('long')) {
            response = this.generateBuyResponse(message, context);
        } else if (message.includes('sell') || message.includes('short')) {
            response = this.generateSellResponse(message, context);
        } else if (message.includes('analyze') || message.includes('analysis')) {
            response = this.generateAnalysisResponse(context);
        } else if (message.includes('risk') || message.includes('position size')) {
            response = this.generateRiskResponse(message, context);
        } else if (message.includes('close') || message.includes('exit')) {
            response = this.generateCloseResponse(context);
        } else if (message.includes('portfolio') || message.includes('account')) {
            response = this.generatePortfolioResponse(context);
        } else if (message.includes('help') || message.includes('what can you do')) {
            response = this.generateHelpResponse();
        } else {
            response = this.generateGeneralResponse(message, context);
        }
        
        return response;
    }
    
    /**
     * Generate buy recommendation response
     */
    generateBuyResponse(message, context) {
        const symbol = this.extractSymbol(message) || context.symbol;
        const volume = this.extractVolume(message) || CONFIG.TRADING.DEFAULT_VOLUME;
        const quote = context.quotes[symbol];
        
        let response = {
            message: `I see you're interested in buying ${symbol}. `,
            actions: []
        };
        
        if (quote) {
            const price = quote.ask;
            const suggestedSL = (price * 0.98).toFixed(5); // 2% stop loss
            const suggestedTP = (price * 1.04).toFixed(5); // 4% take profit
            
            response.message += `Current ask price is ${price}. Based on market conditions, I suggest:\n\n`;
            response.message += `📈 **Buy Signal for ${symbol}**\n`;
            response.message += `• Volume: ${volume} lots\n`;
            response.message += `• Entry: Market (${price})\n`;
            response.message += `• Stop Loss: ${suggestedSL}\n`;
            response.message += `• Take Profit: ${suggestedTP}\n`;
            response.message += `• Risk/Reward: 1:2\n\n`;
            response.message += `⚠️ **Risk Warning**: This represents a potential ${(volume * 10000).toFixed(0)} USD risk with current volume.`;
            
            response.actions = [{
                type: 'trade_suggestion',
                symbol: symbol,
                side: 'buy',
                volume: volume,
                stopLoss: suggestedSL,
                takeProfit: suggestedTP
            }];
        } else {
            response.message += `However, I don't have current price data for ${symbol}. Please ensure you're connected to cTrader and the symbol is available.`;
        }
        
        return response;
    }
    
    /**
     * Generate sell recommendation response
     */
    generateSellResponse(message, context) {
        const symbol = this.extractSymbol(message) || context.symbol;
        const volume = this.extractVolume(message) || CONFIG.TRADING.DEFAULT_VOLUME;
        const quote = context.quotes[symbol];
        
        let response = {
            message: `Analyzing sell opportunity for ${symbol}. `,
            actions: []
        };
        
        if (quote) {
            const price = quote.bid;
            const suggestedSL = (price * 1.02).toFixed(5); // 2% stop loss
            const suggestedTP = (price * 0.96).toFixed(5); // 4% take profit
            
            response.message += `Current bid price is ${price}. Here's my analysis:\n\n`;
            response.message += `📉 **Sell Signal for ${symbol}**\n`;
            response.message += `• Volume: ${volume} lots\n`;
            response.message += `• Entry: Market (${price})\n`;
            response.message += `• Stop Loss: ${suggestedSL}\n`;
            response.message += `• Take Profit: ${suggestedTP}\n`;
            response.message += `• Risk/Reward: 1:2\n\n`;
            response.message += `⚠️ **Risk Assessment**: Monitor for reversal signals and consider market volatility.`;
            
            response.actions = [{
                type: 'trade_suggestion',
                symbol: symbol,
                side: 'sell',
                volume: volume,
                stopLoss: suggestedSL,
                takeProfit: suggestedTP
            }];
        } else {
            response.message += `I need current market data to provide accurate sell recommendations. Please check your connection.`;
        }
        
        return response;
    }
    
    /**
     * Generate market analysis response
     */
    generateAnalysisResponse(context) {
        const symbol = context.symbol;
        const quote = context.quotes[symbol];
        
        let response = {
            message: `📊 **Market Analysis for ${symbol}**\n\n`,
            actions: []
        };
        
        if (quote) {
            const spread = quote.spread;
            const spreadPercent = ((spread / quote.ask) * 100).toFixed(4);
            
            response.message += `**Current Market Conditions:**\n`;
            response.message += `• Bid: ${quote.bid}\n`;
            response.message += `• Ask: ${quote.ask}\n`;
            response.message += `• Spread: ${spread.toFixed(5)} (${spreadPercent}%)\n\n`;
            
            // Simple market condition analysis
            if (spread < 0.0002) {
                response.message += `🟢 **Tight Spreads** - Good for scalping and quick entries\n`;
            } else if (spread > 0.0005) {
                response.message += `🟡 **Wide Spreads** - Consider longer-term positions\n`;
            }
            
            response.message += `\n**Technical Outlook:**\n`;
            response.message += `• Short-term: Monitoring for breakout patterns\n`;
            response.message += `• Support levels: Being calculated...\n`;
            response.message += `• Resistance levels: Being analyzed...\n\n`;
            response.message += `💡 **Recommendation**: Wait for clear directional bias before entering new positions.`;
        } else {
            response.message += `Unable to analyze ${symbol} - no current price data available. Please ensure market connection.`;
        }
        
        return response;
    }
    
    /**
     * Generate risk management response
     */
    generateRiskResponse(message, context) {
        const riskPercent = this.extractRiskPercent(message) || CONFIG.TRADING.DEFAULT_RISK_PERCENT;
        const symbol = this.extractSymbol(message) || context.symbol;
        const quote = context.quotes[symbol];
        const account = context.account;
        
        let response = {
            message: `🛡️ **Risk Management Analysis**\n\n`,
            actions: []
        };
        
        if (account && quote) {
            const accountBalance = account.balance || 10000; // Default for demo
            const riskAmount = (accountBalance * riskPercent) / 100;
            const price = quote.ask;
            const suggestedSL = price * 0.98; // 2% stop loss
            const stopDistance = Math.abs(price - suggestedSL);
            const positionSize = riskAmount / (stopDistance * 100000); // For forex
            
            response.message += `**Account Information:**\n`;
            response.message += `• Balance: $${accountBalance.toFixed(2)}\n`;
            response.message += `• Risk per trade: ${riskPercent}% ($${riskAmount.toFixed(2)})\n\n`;
            
            response.message += `**Position Sizing for ${symbol}:**\n`;
            response.message += `• Current price: ${price}\n`;
            response.message += `• Suggested stop loss: ${suggestedSL.toFixed(5)}\n`;
            response.message += `• Stop distance: ${(stopDistance * 100000).toFixed(1)} pips\n`;
            response.message += `• Recommended volume: ${positionSize.toFixed(3)} lots\n\n`;
            
            response.message += `📋 **Risk Rules:**\n`;
            response.message += `• Never risk more than ${riskPercent}% per trade\n`;
            response.message += `• Always use stop losses\n`;
            response.message += `• Consider correlation with existing positions`;
            
            response.actions = [{
                type: 'risk_calculation',
                symbol: symbol,
                riskPercent: riskPercent,
                suggestedVolume: positionSize.toFixed(3),
                stopLoss: suggestedSL.toFixed(5)
            }];
        } else {
            response.message += `I need account and market data to calculate proper position sizing. Please ensure you're connected to cTrader.`;
        }
        
        return response;
    }
    
    /**
     * Generate position close response
     */
    generateCloseResponse(context) {
        const positions = context.positions || [];
        
        let response = {
            message: `🔄 **Position Management**\n\n`,
            actions: []
        };
        
        if (positions.length > 0) {
            response.message += `**Current Positions:**\n`;
            positions.forEach((pos, index) => {
                const profitStatus = pos.profit >= 0 ? '🟢' : '🔴';
                response.message += `${index + 1}. ${pos.symbol} ${pos.side} ${pos.volume} lots ${profitStatus} $${pos.profit.toFixed(2)}\n`;
            });
            
            response.message += `\n**Management Options:**\n`;
            response.message += `• Close profitable positions to lock in gains\n`;
            response.message += `• Hold losing positions if within risk tolerance\n`;
            response.message += `• Consider partial closes on large positions\n\n`;
            response.message += `Would you like me to close specific positions or all profitable ones?`;
            
            response.actions = [{
                type: 'position_management',
                positions: positions
            }];
        } else {
            response.message += `No open positions found. Your account is currently flat.\n\n`;
            response.message += `This is a good time to:\n`;
            response.message += `• Analyze new opportunities\n`;
            response.message += `• Review your trading performance\n`;
            response.message += `• Plan your next trades`;
        }
        
        return response;
    }
    
    /**
     * Generate portfolio overview response
     */
    generatePortfolioResponse(context) {
        const account = context.account;
        const positions = context.positions || [];
        
        let response = {
            message: `💼 **Portfolio Overview**\n\n`,
            actions: []
        };
        
        if (account) {
            const totalProfit = positions.reduce((sum, pos) => sum + (pos.profit || 0), 0);
            const profitPercent = ((totalProfit / account.balance) * 100).toFixed(2);
            
            response.message += `**Account Summary:**\n`;
            response.message += `• Balance: $${account.balance?.toFixed(2) || '0.00'}\n`;
            response.message += `• Equity: $${account.equity?.toFixed(2) || '0.00'}\n`;
            response.message += `• Free Margin: $${account.freeMargin?.toFixed(2) || '0.00'}\n`;
            response.message += `• Total P&L: $${totalProfit.toFixed(2)} (${profitPercent}%)\n\n`;
            
            if (positions.length > 0) {
                response.message += `**Active Positions: ${positions.length}**\n`;
                const profitable = positions.filter(p => p.profit > 0).length;
                const losing = positions.length - profitable;
                
                response.message += `• Profitable: ${profitable}\n`;
                response.message += `• Losing: ${losing}\n`;
                response.message += `• Win Rate: ${((profitable / positions.length) * 100).toFixed(1)}%\n\n`;
            }
            
            response.message += `**Risk Assessment:**\n`;
            const usedMargin = account.margin || 0;
            const marginLevel = account.marginLevel || 0;
            
            if (marginLevel > 500) {
                response.message += `🟢 Low Risk - Margin level: ${marginLevel.toFixed(0)}%`;
            } else if (marginLevel > 200) {
                response.message += `🟡 Medium Risk - Margin level: ${marginLevel.toFixed(0)}%`;
            } else {
                response.message += `🔴 High Risk - Margin level: ${marginLevel.toFixed(0)}%`;
            }
        } else {
            response.message += `Portfolio data unavailable. Please ensure connection to cTrader.`;
        }
        
        return response;
    }
    
    /**
     * Generate help response
     */
    generateHelpResponse() {
        return {
            message: `🤖 **TradeMaster AI Pro - Help Guide**\n\n**I can help you with:**\n\n📈 **Trading:**\n• "Buy EURUSD with 1% risk"\n• "Sell GBPUSD 0.1 lots"\n• "Close all profitable positions"\n\n📊 **Analysis:**\n• "Analyze current market"\n• "What's the trend for EURUSD?"\n• "Market outlook for today"\n\n🛡️ **Risk Management:**\n• "Calculate position size for 2% risk"\n• "What's my portfolio status?"\n• "Risk assessment for this trade"\n\n🎯 **Quick Commands:**\n• Use the buttons below for common actions\n• Speak commands using the microphone icon\n• Type naturally - I understand context\n\n**Tips:**\n• Always specify the symbol when trading\n• I'll suggest stop losses and take profits\n• Ask for explanations if you need more details`,
            actions: []
        };
    }
    
    /**
     * Generate general response
     */
    generateGeneralResponse(message, context) {
        const responses = [
            `I understand you're asking about "${message}". Let me provide some guidance based on current market conditions.`,
            `That's an interesting question about "${message}". Here's my analysis based on your trading context.`,
            `Regarding "${message}" - let me share some insights that might help with your trading decisions.`
        ];
        
        const baseResponse = responses[Math.floor(Math.random() * responses.length)];
        
        return {
            message: `${baseResponse}\n\n💡 For specific trading assistance, try asking about:\n• Market analysis\n• Position sizing\n• Trade ideas\n• Risk management\n\nOr use the quick action buttons below for common requests.`,
            actions: []
        };
    }
    
    /**
     * Handle quick action buttons
     */
    async handleQuickAction(action) {
        const quickMessages = {
            analyze: 'Analyze the current market conditions and provide trading insights',
            risk: 'Calculate optimal position size based on my risk tolerance',
            signals: 'Generate trading signals for the current symbol'
        };
        
        const message = quickMessages[action];
        if (message) {
            await this.sendMessage(message);
        }
    }
    
    /**
     * Add message to chat interface
     */
    addMessage(sender, message, actions = null, isError = false) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message fade-in`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (isError) {
            contentDiv.style.backgroundColor = 'var(--danger-color)';
            contentDiv.style.color = 'white';
        }
        
        // Convert markdown-like formatting to HTML
        const formattedMessage = this.formatMessage(message);
        contentDiv.innerHTML = formattedMessage;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        // Add action buttons if provided
        if (actions && actions.length > 0) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';
            actionsDiv.style.marginTop = '0.5rem';
            
            actions.forEach(action => {
                const actionBtn = this.createActionButton(action);
                if (actionBtn) actionsDiv.appendChild(actionBtn);
            });
            
            if (actionsDiv.children.length > 0) {
                contentDiv.appendChild(actionsDiv);
            }
        }
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Store message
        this.chatMessages.push({
            sender,
            message,
            timestamp: Date.now(),
            actions
        });
        
        // Limit stored messages
        if (this.chatMessages.length > CONFIG.PERFORMANCE.MAX_CHAT_MESSAGES) {
            this.chatMessages.shift();
        }
    }
    
    /**
     * Format message with basic markdown-like support
     */
    formatMessage(message) {
        return message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/•/g, '&bull;')
            .replace(/📈|📉|📊|🛡️|💼|🔄|🤖|💡|⚠️|🟢|🟡|🔴/g, '<span style="font-size: 1.1em;">$&</span>');
    }
    
    /**
     * Create action button for AI suggestions
     */
    createActionButton(action) {
        if (action.type === 'trade_suggestion') {
            const btn = document.createElement('button');
            btn.className = 'btn-action';
            btn.style.cssText = `
                margin: 0.25rem 0.5rem 0.25rem 0;
                padding: 0.5rem 1rem;
                border: 1px solid var(--accent-primary);
                background: var(--accent-primary);
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
            `;
            btn.innerHTML = `<i class="fas fa-${action.side === 'buy' ? 'arrow-up' : 'arrow-down'}"></i> Execute ${action.side.toUpperCase()} ${action.symbol}`;
            
            btn.addEventListener('click', () => {
                this.executeTradeSuggestion(action);
            });
            
            return btn;
        }
        
        return null;
    }
    
    /**
     * Execute trade suggestion
     */
    async executeTradeSuggestion(action) {
        try {
            if (window.ctraderSDK && window.ctraderSDK.isReady()) {
                const result = await window.ctraderSDK.createMarketOrder(
                    action.symbol,
                    action.side,
                    action.volume,
                    action.stopLoss,
                    action.takeProfit
                );
                
                if (result.success) {
                    this.addMessage('ai', `✅ Trade executed successfully! ${action.side.toUpperCase()} ${action.volume} ${action.symbol}`);
                } else {
                    this.addMessage('ai', `❌ Trade execution failed: ${result.error}`, null, true);
                }
            } else {
                this.addMessage('ai', '⚠️ Cannot execute trade - not connected to cTrader. This is a demo environment.', null, true);
            }
        } catch (error) {
            Logger.error('Trade execution error:', error);
            this.addMessage('ai', '❌ Trade execution failed due to technical error.', null, true);
        }
    }
    
    /**
     * Execute actions from AI response
     */
    async executeActions(actions) {
        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'update_watchlist':
                        // Update watchlist with new symbols
                        break;
                    case 'set_alert':
                        // Set price alerts
                        break;
                    case 'update_risk_settings':
                        // Update risk management settings
                        break;
                }
            } catch (error) {
                Logger.error('Action execution error:', error);
            }
        }
    }
    
    /**
     * Update AI context with current market data
     */
    async updateContext() {
        if (window.ctraderSDK && window.ctraderSDK.isReady()) {
            try {
                this.currentContext.account = window.ctraderSDK.accountInfo;
                this.currentContext.positions = Array.from(window.ctraderSDK.positions.values());
                // Quotes are updated in real-time via callbacks
            } catch (error) {
                Logger.error('Context update error:', error);
            }
        }
    }
    
    /**
     * Build context prompt for AI
     */
    buildContextPrompt() {
        const { symbol, account, positions, quotes } = this.currentContext;
        const quote = quotes[symbol];
        
        let context = `Current trading context:\n`;
        context += `- Active symbol: ${symbol}\n`;
        
        if (quote) {
            context += `- Current price: ${quote.ask} (bid: ${quote.bid})\n`;
            context += `- Spread: ${quote.spread.toFixed(5)}\n`;
        }
        
        if (account) {
            context += `- Account balance: $${account.balance}\n`;
            context += `- Account equity: $${account.equity}\n`;
            context += `- Free margin: $${account.freeMargin}\n`;
        }
        
        if (positions.length > 0) {
            context += `- Open positions: ${positions.length}\n`;
            context += `- Total P&L: $${positions.reduce((sum, pos) => sum + pos.profit, 0).toFixed(2)}\n`;
        } else {
            context += `- No open positions\n`;
        }
        
        return context;
    }
    
    /**
     * Clear chat messages
     */
    clearChat() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        this.chatMessages = [];
        this.conversationHistory = [];
        
        // Add welcome message
        setTimeout(() => {
            this.addMessage('ai', `Hello! I'm your AI Trading Assistant. I'm ready to help you with market analysis, trade ideas, and risk management. How can I assist you today?`);
        }, 500);
    }
    
    /**
     * Update send button state
     */
    updateSendButton(enabled) {
        const sendButton = document.getElementById('send-message');
        if (sendButton) {
            sendButton.disabled = !enabled;
            sendButton.innerHTML = enabled ? 
                '<i class="fas fa-paper-plane"></i>' : 
                '<i class="fas fa-spinner fa-spin"></i>';
        }
    }
    
    /**
     * Load conversation history from localStorage
     */
    loadConversationHistory() {
        try {
            const saved = localStorage.getItem('trademaster_conversation');
            if (saved) {
                this.conversationHistory = JSON.parse(saved);
            }
        } catch (error) {
            Logger.error('Failed to load conversation history:', error);
        }
    }
    
    /**
     * Save conversation history to localStorage
     */
    saveConversationHistory() {
        try {
            localStorage.setItem('trademaster_conversation', JSON.stringify(this.conversationHistory));
        } catch (error) {
            Logger.error('Failed to save conversation history:', error);
        }
    }
    
    // Utility methods for parsing user input
    extractSymbol(message) {
        const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
        const found = symbols.find(symbol => 
            message.toUpperCase().includes(symbol)
        );
        return found || null;
    }
    
    extractVolume(message) {
        const volumeMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:lot|lots)/i);
        return volumeMatch ? parseFloat(volumeMatch[1]) : null;
    }
    
    extractRiskPercent(message) {
        const riskMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|pct)/i);
        return riskMatch ? parseFloat(riskMatch[1]) : null;
    }
}

// Initialize AI Assistant
const aiAssistant = new AIAssistant();