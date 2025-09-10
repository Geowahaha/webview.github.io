/**
 * TradeMaster AI Pro - Chart Management
 * Handles real-time charting and technical analysis visualization
 */

class ChartManager {
    constructor() {
        this.chart = null;
        this.currentSymbol = initializeSymbol();
        this.currentTimeframe = CONFIG.WEBVIEW.DEFAULT_TIMEFRAME;
        this.chartData = {
            labels: [],
            datasets: []
        };
        this.priceData = [];
        this.volumeData = [];
        this.indicators = new Map();
        this.isUpdating = false;
        this.updateInterval = null;
        this.performanceMonitor = PerformanceUtils.createMonitor('ChartUpdate');
        
        this.init();
    }
    
    /**
     * Initialize chart system
     */
    init() {
        Logger.info('Initializing Chart Manager...');
        
        this.setupChart();
        this.setupEventHandlers();
        this.startRealTimeUpdates();
        
        // Connect to cTrader SDK for real-time data
        if (window.ctraderSDK) {
            window.ctraderSDK.onConnection((connected) => {
                if (connected) {
                    this.loadInitialData();
                }
            });
            
            window.ctraderSDK.onQuote((quote) => {
                this.updatePriceData(quote);
            });
        }
        
        Logger.info('Chart Manager initialized');
    }
    
    /**
     * Setup Chart.js instance
     */
    setupChart() {
        const canvas = document.getElementById('price-chart');
        if (!canvas) {
            Logger.error('Chart canvas not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Chart configuration
        const config = {
            type: 'line',
            data: this.chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'var(--accent-primary)',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: true,
                        callbacks: {
                            title: (context) => {
                                return `${this.currentSymbol} - ${this.currentTimeframe}`;
                            },
                            label: (context) => {
                                const label = context.dataset.label;
                                const value = context.parsed.y;
                                
                                if (label === 'Price') {
                                    return `${label}: ${NumberUtils.formatNumber(value, 5)}`;
                                } else if (label === 'Volume') {
                                    return `${label}: ${NumberUtils.formatLargeNumber(value)}`;
                                }
                                
                                return `${label}: ${NumberUtils.formatNumber(value, 4)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            displayFormats: {
                                minute: 'HH:mm',
                                hour: 'HH:mm',
                                day: 'MMM DD'
                            }
                        },
                        grid: {
                            color: 'var(--border-color)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: 'var(--text-secondary)',
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        position: 'right',
                        grid: {
                            color: 'var(--border-color)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: 'var(--text-secondary)',
                            font: {
                                size: 11
                            },
                            callback: (value) => {
                                return NumberUtils.formatNumber(value, 5);
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 0,
                        hitRadius: 5,
                        hoverRadius: 4
                    },
                    line: {
                        borderWidth: 2,
                        tension: 0.1
                    }
                },
                animation: {
                    duration: 0 // Disable animations for real-time updates
                }
            }
        };
        
        try {
            this.chart = new Chart(ctx, config);
            Logger.info('Chart created successfully');
        } catch (error) {
            Logger.error('Chart creation failed:', error);
        }
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Timeframe selector
        const timeframeSelect = document.getElementById('timeframe-select');
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                this.changeTimeframe(e.target.value);
            });
        }
        
        // Symbol changes from other components
        document.addEventListener('symbolChanged', (e) => {
            this.changeSymbol(e.detail.symbol);
        });
        
        // Theme changes
        document.addEventListener('themeChanged', () => {
            this.updateChartTheme();
        });
        
        // Window resize
        window.addEventListener('resize', PerformanceUtils.debounce(() => {
            if (this.chart) {
                this.chart.resize();
            }
        }, 250));
    }
    
    /**
     * Load initial chart data
     */
    async loadInitialData() {
        try {
            Logger.info(`Loading initial data for ${this.currentSymbol}`);
            
            // Generate mock historical data for demo
            const mockData = this.generateMockHistoricalData();
            
            this.priceData = mockData.prices;
            this.volumeData = mockData.volumes;
            
            this.updateChartData();
            this.addTechnicalIndicators();
            
        } catch (error) {
            Logger.error('Failed to load initial data:', error);
        }
    }
    
    /**
     * Generate mock historical data for demonstration
     */
    generateMockHistoricalData() {
        const points = 100;
        const basePrice = 1.0850;
        const now = Date.now();
        const interval = this.getTimeframeInterval();
        
        const prices = [];
        const volumes = [];
        let currentPrice = basePrice;
        
        for (let i = points; i >= 0; i--) {
            const timestamp = now - (i * interval);
            
            // Random walk with slight upward bias
            const change = (Math.random() - 0.48) * 0.002;
            currentPrice += change;
            
            // Ensure price stays in reasonable range
            currentPrice = Math.max(1.06, Math.min(1.11, currentPrice));
            
            prices.push({
                x: timestamp,
                y: currentPrice
            });
            
            // Random volume
            volumes.push({
                x: timestamp,
                y: Math.random() * 1000 + 500
            });
        }
        
        return { prices, volumes };
    }
    
    /**
     * Get interval in milliseconds for current timeframe
     */
    getTimeframeInterval() {
        const timeframe = CONFIG.CHART.TIMEFRAMES[this.currentTimeframe];
        return timeframe ? timeframe.value * 60 * 1000 : 5 * 60 * 1000;
    }
    
    /**
     * Update chart with new price data
     */
    updatePriceData(quote) {
        if (!quote || quote.symbol !== this.currentSymbol) return;
        
        const startTime = this.performanceMonitor.start();
        
        try {
            const timestamp = Date.now();
            const price = (quote.bid + quote.ask) / 2; // Mid price
            
            // Add new price point
            this.priceData.push({
                x: timestamp,
                y: price
            });
            
            // Generate mock volume
            this.volumeData.push({
                x: timestamp,
                y: Math.random() * 500 + 250
            });
            
            // Limit data points for performance
            if (this.priceData.length > CONFIG.PERFORMANCE.MAX_CHART_POINTS) {
                this.priceData.shift();
                this.volumeData.shift();
            }
            
            // Update chart if not currently updating
            if (!this.isUpdating) {
                this.isUpdating = true;
                requestAnimationFrame(() => {
                    this.updateChartData();
                    this.isUpdating = false;
                });
            }
            
        } catch (error) {
            Logger.error('Price data update failed:', error);
        } finally {
            this.performanceMonitor.end(startTime);
        }
    }
    
    /**
     * Update chart data and redraw
     */
    updateChartData() {
        if (!this.chart) return;
        
        try {
            // Update price dataset
            const priceDataset = this.chart.data.datasets.find(d => d.label === 'Price');
            if (priceDataset) {
                priceDataset.data = [...this.priceData];
            } else {
                this.chart.data.datasets.push({
                    label: 'Price',
                    data: [...this.priceData],
                    borderColor: 'var(--accent-primary)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4
                });
            }
            
            this.chart.update('none');
            this.updateAnalysisInsights();
            
        } catch (error) {
            Logger.error('Chart update failed:', error);
        }
    }
    
    /**
     * Add technical indicators to chart
     */
    addTechnicalIndicators() {
        try {
            // Simple Moving Average (SMA 20)
            const sma20 = this.calculateSMA(20);
            if (sma20.length > 0) {
                this.addIndicatorDataset('SMA 20', sma20, '#f59e0b', false);
            }
            
            // Exponential Moving Average (EMA 12)
            const ema12 = this.calculateEMA(12);
            if (ema12.length > 0) {
                this.addIndicatorDataset('EMA 12', ema12, '#10b981', false);
            }
            
            // Bollinger Bands
            const bb = this.calculateBollingerBands(20, 2);
            if (bb.upper.length > 0) {
                this.addIndicatorDataset('BB Upper', bb.upper, '#ef4444', false);
                this.addIndicatorDataset('BB Lower', bb.lower, '#ef4444', false);
                
                // Fill between bands
                this.addIndicatorDataset('BB Fill', bb.middle, 'rgba(239, 68, 68, 0.1)', true);
            }
            
        } catch (error) {
            Logger.error('Technical indicators failed:', error);
        }
    }
    
    /**
     * Calculate Simple Moving Average
     */
    calculateSMA(period) {
        if (this.priceData.length < period) return [];
        
        const sma = [];
        
        for (let i = period - 1; i < this.priceData.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += this.priceData[i - j].y;
            }
            
            sma.push({
                x: this.priceData[i].x,
                y: sum / period
            });
        }
        
        return sma;
    }
    
    /**
     * Calculate Exponential Moving Average
     */
    calculateEMA(period) {
        if (this.priceData.length < period) return [];
        
        const multiplier = 2 / (period + 1);
        const ema = [];
        
        // Start with SMA for first value
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += this.priceData[i].y;
        }
        
        ema.push({
            x: this.priceData[period - 1].x,
            y: sum / period
        });
        
        // Calculate EMA for remaining values
        for (let i = period; i < this.priceData.length; i++) {
            const value = (this.priceData[i].y - ema[ema.length - 1].y) * multiplier + ema[ema.length - 1].y;
            ema.push({
                x: this.priceData[i].x,
                y: value
            });
        }
        
        return ema;
    }
    
    /**
     * Calculate Bollinger Bands
     */
    calculateBollingerBands(period, stdDev) {
        const sma = this.calculateSMA(period);
        if (sma.length === 0) return { upper: [], middle: [], lower: [] };
        
        const upper = [];
        const middle = [];
        const lower = [];
        
        for (let i = 0; i < sma.length; i++) {
            const dataIndex = i + period - 1;
            
            // Calculate standard deviation
            let sum = 0;
            for (let j = 0; j < period; j++) {
                const diff = this.priceData[dataIndex - j].y - sma[i].y;
                sum += diff * diff;
            }
            
            const variance = sum / period;
            const standardDeviation = Math.sqrt(variance);
            
            const timestamp = sma[i].x;
            const middleValue = sma[i].y;
            
            middle.push({ x: timestamp, y: middleValue });
            upper.push({ x: timestamp, y: middleValue + (standardDeviation * stdDev) });
            lower.push({ x: timestamp, y: middleValue - (standardDeviation * stdDev) });
        }
        
        return { upper, middle, lower };
    }
    
    /**
     * Add indicator dataset to chart
     */
    addIndicatorDataset(label, data, color, fill = false) {
        if (!this.chart) return;
        
        const existing = this.chart.data.datasets.findIndex(d => d.label === label);
        
        const dataset = {
            label: label,
            data: data,
            borderColor: color,
            backgroundColor: fill ? color : 'transparent',
            borderWidth: fill ? 0 : 1,
            fill: fill,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 0
        };
        
        if (existing >= 0) {
            this.chart.data.datasets[existing] = dataset;
        } else {
            this.chart.data.datasets.push(dataset);
        }
    }
    
    /**
     * Update analysis insights based on current data
     */
    updateAnalysisInsights() {
        const insightsContainer = document.getElementById('analysis-insights');
        if (!insightsContainer || this.priceData.length < 10) return;
        
        try {
            const currentPrice = this.priceData[this.priceData.length - 1].y;
            const prevPrice = this.priceData[this.priceData.length - 10].y;
            const change = currentPrice - prevPrice;
            const changePercent = (change / prevPrice) * 100;
            
            // Calculate volatility (standard deviation of last 20 prices)
            const recentPrices = this.priceData.slice(-20).map(p => p.y);
            const avgPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
            const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / recentPrices.length;
            const volatility = Math.sqrt(variance);
            
            const insights = [];
            
            // Trend analysis
            if (changePercent > 0.05) {
                insights.push({
                    icon: 'fas fa-trending-up',
                    class: 'text-success',
                    text: 'Strong bullish momentum detected'
                });
            } else if (changePercent < -0.05) {
                insights.push({
                    icon: 'fas fa-trending-down',
                    class: 'text-danger',
                    text: 'Strong bearish momentum detected'
                });
            } else {
                insights.push({
                    icon: 'fas fa-arrows-alt-h',
                    class: 'text-info',
                    text: 'Sideways price action'
                });
            }
            
            // Volatility analysis
            if (volatility > 0.001) {
                insights.push({
                    icon: 'fas fa-exclamation-triangle',
                    class: 'text-warning',
                    text: 'High volatility period'
                });
            } else {
                insights.push({
                    icon: 'fas fa-compress-alt',
                    class: 'text-info',
                    text: 'Low volatility environment'
                });
            }
            
            // Support/Resistance levels
            const recentHigh = Math.max(...recentPrices);
            const recentLow = Math.min(...recentPrices);
            const range = recentHigh - recentLow;
            
            if (currentPrice > recentHigh - range * 0.1) {
                insights.push({
                    icon: 'fas fa-arrow-up',
                    class: 'text-warning',
                    text: 'Near resistance level'
                });
            } else if (currentPrice < recentLow + range * 0.1) {
                insights.push({
                    icon: 'fas fa-arrow-down',
                    class: 'text-warning',
                    text: 'Near support level'
                });
            }
            
            // Update UI
            insightsContainer.innerHTML = insights.map(insight => `
                <div class="insight-item">
                    <i class="${insight.icon} ${insight.class}"></i>
                    <span>${insight.text}</span>
                </div>
            `).join('');
            
        } catch (error) {
            Logger.error('Analysis insights update failed:', error);
        }
    }
    
    /**
     * Change symbol and reload data
     */
    async changeSymbol(symbol) {
        if (symbol === this.currentSymbol) return;
        
        Logger.info(`Changing symbol from ${this.currentSymbol} to ${symbol}`);
        
        this.currentSymbol = symbol;
        
        // Clear current data
        this.priceData = [];
        this.volumeData = [];
        
        // Subscribe to new symbol
        if (window.ctraderSDK) {
            await window.ctraderSDK.unsubscribeFromSymbol(this.currentSymbol);
            await window.ctraderSDK.subscribeToSymbol(symbol);
        }
        
        // Load new data
        await this.loadInitialData();
        
        // Emit symbol change event
        document.dispatchEvent(new CustomEvent('symbolChanged', {
            detail: { symbol: symbol }
        }));
    }
    
    /**
     * Change timeframe and reload data
     */
    async changeTimeframe(timeframe) {
        if (timeframe === this.currentTimeframe) return;
        
        Logger.info(`Changing timeframe from ${this.currentTimeframe} to ${timeframe}`);
        
        this.currentTimeframe = timeframe;
        
        // Update chart time axis
        if (this.chart) {
            const unit = this.getTimeUnit(timeframe);
            this.chart.options.scales.x.time.unit = unit;
            this.chart.update();
        }
        
        // Reload data for new timeframe
        await this.loadInitialData();
    }
    
    /**
     * Get appropriate time unit for timeframe
     */
    getTimeUnit(timeframe) {
        if (timeframe.startsWith('M')) return 'minute';
        if (timeframe.startsWith('H')) return 'hour';
        if (timeframe.startsWith('D')) return 'day';
        if (timeframe.startsWith('W')) return 'week';
        return 'minute';
    }
    
    /**
     * Update chart theme colors
     */
    updateChartTheme() {
        if (!this.chart) return;
        
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? '#475569' : '#e2e8f0';
        const textColor = isDark ? '#cbd5e1' : '#64748b';
        
        this.chart.options.scales.x.grid.color = gridColor;
        this.chart.options.scales.x.ticks.color = textColor;
        this.chart.options.scales.y.grid.color = gridColor;
        this.chart.options.scales.y.ticks.color = textColor;
        
        this.chart.update();
    }
    
    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        // Clear existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Set up periodic updates
        this.updateInterval = setInterval(() => {
            if (this.chart && this.priceData.length > 0) {
                // Update indicators periodically
                this.addTechnicalIndicators();
                this.chart.update('none');
            }
        }, CONFIG.PERFORMANCE.CHART_UPDATE_INTERVAL);
    }
    
    /**
     * Stop real-time updates
     */
    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Get chart performance statistics
     */
    getPerformanceStats() {
        return this.performanceMonitor.getStats();
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopRealTimeUpdates();
        
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        this.priceData = [];
        this.volumeData = [];
        this.indicators.clear();
    }
}

// Initialize chart manager
const chartManager = new ChartManager();