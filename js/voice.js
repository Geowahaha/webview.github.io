/**
 * TradeMaster AI Pro - Voice Recognition
 * Handles voice commands and speech-to-text functionality
 */

class VoiceManager {
    constructor() {
        this.recognition = null;
        this.synthesis = null;
        this.isListening = false;
        this.isSupported = false;
        this.currentLanguage = 'en-US';
        this.voiceModal = null;
        this.voiceButton = null;
        this.commandHistory = [];
        this.isProcessing = false;
        
        this.init();
    }
    
    /**
     * Initialize voice recognition system
     */
    init() {
        Logger.info('Initializing Voice Manager...');
        
        this.checkBrowserSupport();
        this.setupVoiceRecognition();
        this.setupSpeechSynthesis();
        this.setupEventHandlers();
        
        if (this.isSupported) {
            Logger.info('Voice recognition is supported and ready');
        } else {
            Logger.warn('Voice recognition not supported in this browser');
        }
    }
    
    /**
     * Check browser support for speech recognition
     */
    checkBrowserSupport() {
        // Check for Speech Recognition API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const SpeechSynthesis = window.speechSynthesis;
        
        this.isSupported = !!(SpeechRecognition && SpeechSynthesis);
        
        if (this.isSupported) {
            this.recognition = new SpeechRecognition();
            this.synthesis = SpeechSynthesis;
        }
    }
    
    /**
     * Setup speech recognition configuration
     */
    setupVoiceRecognition() {
        if (!this.recognition) return;
        
        // Configure recognition settings
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.currentLanguage;
        this.recognition.maxAlternatives = 1;
        
        // Recognition event handlers
        this.recognition.onstart = () => {
            Logger.info('Voice recognition started');
            this.isListening = true;
            this.updateVoiceUI(true);
        };
        
        this.recognition.onend = () => {
            Logger.info('Voice recognition ended');
            this.isListening = false;
            this.updateVoiceUI(false);
        };
        
        this.recognition.onresult = (event) => {
            this.handleVoiceResult(event);
        };
        
        this.recognition.onerror = (event) => {
            this.handleVoiceError(event);
        };
        
        this.recognition.onnomatch = () => {
            Logger.warn('No voice match found');
            this.showVoiceMessage('No command recognized. Please try again.');
        };
    }
    
    /**
     * Setup speech synthesis
     */
    setupSpeechSynthesis() {
        if (!this.synthesis) return;
        
        // Load available voices
        this.loadVoices();
        
        // Handle voice list changes
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => {
                this.loadVoices();
            };
        }
    }
    
    /**
     * Load available voices for speech synthesis
     */
    loadVoices() {
        const voices = this.synthesis.getVoices();
        this.availableVoices = voices.filter(voice => 
            voice.lang.startsWith(this.currentLanguage.substr(0, 2))
        );
        
        Logger.info(`Loaded ${this.availableVoices.length} voices for ${this.currentLanguage}`);
    }
    
    /**
     * Setup event handlers for voice controls
     */
    setupEventHandlers() {
        // Voice toggle button
        this.voiceButton = document.getElementById('voice-toggle');
        if (this.voiceButton) {
            this.voiceButton.addEventListener('click', () => {
                this.toggleVoiceRecognition();
            });
            
            // Update button state based on support
            if (!this.isSupported) {
                this.voiceButton.disabled = true;
                this.voiceButton.title = 'Voice recognition not supported';
                this.voiceButton.style.opacity = '0.5';
            }
        }
        
        // Voice modal elements
        this.voiceModal = document.getElementById('voice-modal');
        const closeButton = document.getElementById('close-voice-modal');
        
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closeVoiceModal();
            });
        }
        
        // Close modal on outside click
        if (this.voiceModal) {
            this.voiceModal.addEventListener('click', (e) => {
                if (e.target === this.voiceModal) {
                    this.closeVoiceModal();
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && e.ctrlKey) { // Ctrl + Space
                e.preventDefault();
                this.toggleVoiceRecognition();
            } else if (e.key === 'Escape' && this.isListening) {
                this.stopListening();
            }
        });
    }
    
    /**
     * Toggle voice recognition on/off
     */
    toggleVoiceRecognition() {
        if (!this.isSupported) {
            this.showVoiceError('Voice recognition not supported in this browser');
            return;
        }
        
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }
    
    /**
     * Start voice recognition
     */
    async startListening() {
        if (!this.isSupported || this.isListening || this.isProcessing) return;
        
        try {
            Logger.info('Starting voice recognition...');
            
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop immediately after permission
            
            // Show voice modal
            this.showVoiceModal();
            
            // Start recognition
            this.recognition.start();
            
        } catch (error) {
            Logger.error('Failed to start voice recognition:', error);
            this.showVoiceError('Microphone access denied or not available');
        }
    }
    
    /**
     * Stop voice recognition
     */
    stopListening() {
        if (!this.isListening) return;
        
        Logger.info('Stopping voice recognition...');
        
        if (this.recognition) {
            this.recognition.stop();
        }
        
        this.closeVoiceModal();
    }
    
    /**
     * Handle voice recognition results
     */
    handleVoiceResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Process recognition results
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Update UI with interim results
        if (interimTranscript) {
            this.updateVoiceModalTranscript(interimTranscript, false);
        }
        
        // Process final transcript
        if (finalTranscript) {
            Logger.info('Voice command received:', finalTranscript);
            this.updateVoiceModalTranscript(finalTranscript, true);
            this.processVoiceCommand(finalTranscript.trim());
        }
    }
    
    /**
     * Handle voice recognition errors
     */
    handleVoiceError(event) {
        Logger.error('Voice recognition error:', event.error);
        
        let errorMessage = 'Voice recognition error';
        
        switch (event.error) {
            case 'no-speech':
                errorMessage = 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage = 'Microphone not available. Please check permissions.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow microphone access.';
                break;
            case 'network':
                errorMessage = 'Network error during voice recognition.';
                break;
            case 'service-not-allowed':
                errorMessage = 'Voice recognition service not allowed.';
                break;
            default:
                errorMessage = `Voice recognition error: ${event.error}`;
        }
        
        this.showVoiceError(errorMessage);
        this.closeVoiceModal();
    }
    
    /**
     * Process voice command using AI and trading logic
     */
    async processVoiceCommand(command) {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            Logger.info('Processing voice command:', command);
            
            // Add to command history
            this.commandHistory.push({
                command: command,
                timestamp: Date.now()
            });
            
            // Close voice modal
            this.closeVoiceModal();
            
            // Analyze command and extract intent
            const intent = this.analyzeVoiceCommand(command);
            
            if (intent.type === 'unknown') {
                // Send to AI assistant for processing
                if (window.aiAssistant) {
                    await window.aiAssistant.sendMessage(command);
                } else {
                    this.showVoiceError('AI assistant not available');
                }
                return;
            }
            
            // Execute specific trading commands
            await this.executeVoiceIntent(intent);
            
        } catch (error) {
            Logger.error('Voice command processing failed:', error);
            this.showVoiceError('Failed to process voice command');
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Analyze voice command to extract trading intent
     */
    analyzeVoiceCommand(command) {
        const cmd = command.toLowerCase();
        
        // Trading commands
        if (this.matchesPattern(cmd, CONFIG.AI.VOICE_COMMANDS.BUY)) {
            return {
                type: 'trade',
                action: 'buy',
                symbol: this.extractSymbol(cmd),
                volume: this.extractVolume(cmd),
                risk: this.extractRisk(cmd)
            };
        }
        
        if (this.matchesPattern(cmd, CONFIG.AI.VOICE_COMMANDS.SELL)) {
            return {
                type: 'trade',
                action: 'sell',
                symbol: this.extractSymbol(cmd),
                volume: this.extractVolume(cmd),
                risk: this.extractRisk(cmd)
            };
        }
        
        if (this.matchesPattern(cmd, CONFIG.AI.VOICE_COMMANDS.CLOSE)) {
            return {
                type: 'close',
                target: this.extractCloseTarget(cmd)
            };
        }
        
        if (this.matchesPattern(cmd, CONFIG.AI.VOICE_COMMANDS.ANALYZE)) {
            return {
                type: 'analyze',
                symbol: this.extractSymbol(cmd) || window.chartManager?.currentSymbol
            };
        }
        
        if (this.matchesPattern(cmd, CONFIG.AI.VOICE_COMMANDS.RISK)) {
            return {
                type: 'risk',
                symbol: this.extractSymbol(cmd),
                risk: this.extractRisk(cmd)
            };
        }
        
        // Symbol change commands
        const symbolMatch = cmd.match(/(?:switch to|change to|show me) ([a-z]{6})/i);
        if (symbolMatch) {
            return {
                type: 'symbol',
                symbol: symbolMatch[1].toUpperCase()
            };
        }
        
        // Portfolio commands
        if (cmd.includes('portfolio') || cmd.includes('account') || cmd.includes('balance')) {
            return { type: 'portfolio' };
        }
        
        // Help commands
        if (cmd.includes('help') || cmd.includes('what can you do')) {
            return { type: 'help' };
        }
        
        return { type: 'unknown', command: command };
    }
    
    /**
     * Execute voice command intent
     */
    async executeVoiceIntent(intent) {
        switch (intent.type) {
            case 'trade':
                await this.executeVoiceTrade(intent);
                break;
                
            case 'close':
                await this.executeVoiceClose(intent);
                break;
                
            case 'analyze':
                await this.executeVoiceAnalyze(intent);
                break;
                
            case 'risk':
                await this.executeVoiceRisk(intent);
                break;
                
            case 'symbol':
                await this.executeVoiceSymbol(intent);
                break;
                
            case 'portfolio':
                await this.executeVoicePortfolio();
                break;
                
            case 'help':
                await this.executeVoiceHelp();
                break;
                
            default:
                this.showVoiceError('Command not recognized');
        }
    }
    
    /**
     * Execute voice trading command
     */
    async executeVoiceTrade(intent) {
        if (!window.tradingEngine) {
            this.showVoiceError('Trading engine not available');
            return;
        }
        
        const params = {
            volume: intent.volume || CONFIG.TRADING.DEFAULT_VOLUME,
            symbol: intent.symbol || window.chartManager?.currentSymbol
        };
        
        // Calculate stop loss based on risk if provided
        if (intent.risk && window.ctraderSDK) {
            const quote = window.ctraderSDK.getCurrentQuote(params.symbol);
            if (quote) {
                const account = window.ctraderSDK.accountInfo;
                if (account) {
                    const riskAmount = (account.balance * intent.risk) / 100;
                    const price = intent.action === 'buy' ? quote.ask : quote.bid;
                    
                    // Calculate stop loss for specified risk
                    const stopDistance = riskAmount / (params.volume * 100000);
                    params.stopLoss = intent.action === 'buy' ? 
                        price - stopDistance : 
                        price + stopDistance;
                }
            }
        }
        
        this.speak(`Executing ${intent.action} order for ${params.symbol}`);
        
        const result = await window.tradingEngine.executeTrade(intent.action, params);
        
        if (result.success) {
            this.speak(`${intent.action} order executed successfully`);
        } else {
            this.speak(`Trade execution failed: ${result.error}`);
        }
    }
    
    /**
     * Execute voice close command
     */
    async executeVoiceClose(intent) {
        if (!window.tradingEngine) {
            this.showVoiceError('Trading engine not available');
            return;
        }
        
        if (intent.target === 'all' || intent.target === 'profitable') {
            this.speak('Closing all profitable positions');
            await window.tradingEngine.closeAllProfitable();
        } else {
            this.speak('Please specify which positions to close');
        }
    }
    
    /**
     * Execute voice analyze command
     */
    async executeVoiceAnalyze(intent) {
        if (window.aiAssistant) {
            const symbol = intent.symbol || window.chartManager?.currentSymbol;
            const message = `Analyze the current market conditions for ${symbol}`;
            
            this.speak(`Analyzing ${symbol}`);
            await window.aiAssistant.sendMessage(message);
        }
    }
    
    /**
     * Execute voice risk command
     */
    async executeVoiceRisk(intent) {
        if (window.aiAssistant) {
            const symbol = intent.symbol || window.chartManager?.currentSymbol;
            const risk = intent.risk || CONFIG.TRADING.DEFAULT_RISK_PERCENT;
            const message = `Calculate position size for ${symbol} with ${risk}% risk`;
            
            this.speak('Calculating position size');
            await window.aiAssistant.sendMessage(message);
        }
    }
    
    /**
     * Execute voice symbol change
     */
    async executeVoiceSymbol(intent) {
        if (window.chartManager) {
            this.speak(`Switching to ${intent.symbol}`);
            await window.chartManager.changeSymbol(intent.symbol);
        }
    }
    
    /**
     * Execute voice portfolio command
     */
    async executeVoicePortfolio() {
        if (window.aiAssistant) {
            this.speak('Showing portfolio overview');
            await window.aiAssistant.sendMessage('Show me my portfolio status');
        }
    }
    
    /**
     * Execute voice help command
     */
    async executeVoiceHelp() {
        if (window.aiAssistant) {
            this.speak('Showing help information');
            await window.aiAssistant.sendMessage('What can you help me with?');
        }
    }
    
    /**
     * Speak text using speech synthesis
     */
    speak(text, options = {}) {
        if (!this.synthesis || !this.availableVoices) return;
        
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure utterance
        utterance.lang = this.currentLanguage;
        utterance.rate = options.rate || 0.9;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 0.8;
        
        // Select appropriate voice
        if (this.availableVoices.length > 0) {
            utterance.voice = this.availableVoices[0];
        }
        
        // Error handling
        utterance.onerror = (event) => {
            Logger.error('Speech synthesis error:', event.error);
        };
        
        // Speak
        this.synthesis.speak(utterance);
        
        Logger.info('Speaking:', text);
    }
    
    /**
     * Show voice modal
     */
    showVoiceModal() {
        if (!this.voiceModal) return;
        
        this.voiceModal.classList.remove('hidden');
        this.updateVoiceModalTranscript('Listening...', false);
        
        // Focus modal for better UX
        const indicator = this.voiceModal.querySelector('.voice-indicator');
        if (indicator) {
            indicator.style.animation = 'pulse-voice 2s infinite';
        }
    }
    
    /**
     * Close voice modal
     */
    closeVoiceModal() {
        if (!this.voiceModal) return;
        
        this.voiceModal.classList.add('hidden');
        
        const indicator = this.voiceModal.querySelector('.voice-indicator');
        if (indicator) {
            indicator.style.animation = '';
        }
    }
    
    /**
     * Update voice modal transcript
     */
    updateVoiceModalTranscript(text, isFinal = false) {
        const statusElement = this.voiceModal?.querySelector('.voice-status p');
        if (statusElement) {
            statusElement.textContent = isFinal ? `Command: "${text}"` : text;
            statusElement.style.fontWeight = isFinal ? 'bold' : 'normal';
            statusElement.style.color = isFinal ? 'var(--success-color)' : 'var(--text-primary)';
        }
    }
    
    /**
     * Update voice UI elements
     */
    updateVoiceUI(isListening) {
        if (this.voiceButton) {
            this.voiceButton.classList.toggle('active', isListening);
            this.voiceButton.title = isListening ? 
                'Stop voice recognition (Ctrl+Space)' : 
                'Start voice recognition (Ctrl+Space)';
        }
    }
    
    /**
     * Show voice error message
     */
    showVoiceError(message) {
        Logger.error('Voice error:', message);
        
        // Show notification
        if (window.tradingEngine) {
            window.tradingEngine.showTradeError(message);
        } else {
            alert(message);
        }
        
        // Speak error if synthesis is available
        this.speak(`Error: ${message}`);
    }
    
    /**
     * Show voice success message
     */
    showVoiceSuccess(message) {
        Logger.info('Voice success:', message);
        
        if (window.tradingEngine) {
            window.tradingEngine.showTradeSuccess(message);
        }
    }
    
    // Utility methods for command parsing
    matchesPattern(command, patterns) {
        return patterns.some(pattern => 
            command.includes(pattern.toLowerCase())
        );
    }
    
    extractSymbol(command) {
        // Common forex pairs
        const symbols = ['eurusd', 'gbpusd', 'usdjpy', 'usdchf', 'audusd', 'usdcad', 'nzdusd', 'eurgbp', 'eurjpy', 'gbpjpy'];
        const found = symbols.find(symbol => command.includes(symbol));
        return found ? found.toUpperCase() : null;
    }
    
    extractVolume(command) {
        // Extract volume patterns like "0.1 lots", "point one lots", "one lot"
        let volumeMatch = command.match(/(\d+(?:\.\d+)?)\s*(?:lot|lots)/i);
        
        if (volumeMatch) {
            return parseFloat(volumeMatch[1]);
        }
        
        // Text patterns
        if (command.includes('point one') || command.includes('0.1')) return 0.1;
        if (command.includes('point zero one') || command.includes('0.01')) return 0.01;
        if (command.includes('one lot') || command.includes('1 lot')) return 1.0;
        if (command.includes('half lot') || command.includes('0.5')) return 0.5;
        
        return null;
    }
    
    extractRisk(command) {
        // Extract risk patterns like "1%", "2 percent", "one percent"
        const riskMatch = command.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/i);
        
        if (riskMatch) {
            return parseFloat(riskMatch[1]);
        }
        
        // Text patterns
        if (command.includes('one percent')) return 1.0;
        if (command.includes('two percent')) return 2.0;
        if (command.includes('half percent')) return 0.5;
        
        return null;
    }
    
    extractCloseTarget(command) {
        if (command.includes('all')) return 'all';
        if (command.includes('profitable') || command.includes('winning')) return 'profitable';
        if (command.includes('losing') || command.includes('negative')) return 'losing';
        return 'all';
    }
    
    /**
     * Get voice command history
     */
    getCommandHistory() {
        return [...this.commandHistory];
    }
    
    /**
     * Clear voice command history
     */
    clearCommandHistory() {
        this.commandHistory = [];
        StorageUtils.removeItem('voice_command_history');
    }
    
    /**
     * Change voice recognition language
     */
    setLanguage(language) {
        this.currentLanguage = language;
        if (this.recognition) {
            this.recognition.lang = language;
        }
        this.loadVoices();
        
        Logger.info(`Voice language changed to: ${language}`);
    }
    
    /**
     * Get available languages
     */
    getAvailableLanguages() {
        return [
            { code: 'en-US', name: 'English (US)' },
            { code: 'en-GB', name: 'English (UK)' },
            { code: 'es-ES', name: 'Spanish' },
            { code: 'fr-FR', name: 'French' },
            { code: 'de-DE', name: 'German' },
            { code: 'it-IT', name: 'Italian' },
            { code: 'ja-JP', name: 'Japanese' },
            { code: 'ko-KR', name: 'Korean' },
            { code: 'zh-CN', name: 'Chinese (Simplified)' }
        ];
    }
    
    /**
     * Test voice functionality
     */
    testVoice() {
        if (!this.isSupported) {
            alert('Voice recognition not supported in this browser');
            return;
        }
        
        this.speak('Voice recognition test successful. TradeMaster AI Pro is ready for voice commands.');
    }
    
    /**
     * Cleanup voice resources
     */
    destroy() {
        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }
        
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        
        this.isListening = false;
        this.isProcessing = false;
        
        Logger.info('Voice Manager destroyed');
    }
}

// Initialize voice manager
const voiceManager = new VoiceManager();