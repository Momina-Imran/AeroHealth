// Main Application Controller
class BreatheWellApp {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.currentSection = 'breathing';
        this.isOnline = navigator.onLine;
        this.notifications = [];
        
        this.init();
    }

    async init() {
        try {
            console.log('🌟 Initializing Aura BreatheWell...');
            
            // Check if first time user
            await this.checkFirstTimeUser();
            
            // Initialize core systems
            await this.initializeCore();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize modules
            await this.initializeModules();
            
            // Setup navigation
            this.setupNavigation();
            
            // Check authentication state
            await this.checkAuthState();
            
            // Load user preferences
            await this.loadUserPreferences();
            
            // Initialize environmental monitoring
            await this.initializeEnvironmentalMonitoring();
            
            // Setup PWA features
            this.setupPWA();
            
            this.isInitialized = true;
            console.log('✅ Aura BreatheWell initialized successfully');
            
            // Show welcome message if needed
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showNotification('Failed to initialize application. Please refresh the page.', 'error');
        }
    }

    async checkFirstTimeUser() {
        const onboardingCompleted = localStorage.getItem('onboardingCompleted');
        const isFirstTime = !onboardingCompleted;
        
        if (isFirstTime && !window.location.pathname.includes('onboarding.html')) {
            console.log('🎯 First time user detected, redirecting to onboarding...');
            window.location.href = 'onboarding.html';
            return;
        }
    }

    async initializeCore() {
        // Initialize localStorage structure
        this.initializeLocalStorage();
        
        // Setup theme
        this.applyTheme();
        
        // Setup offline detection
        this.setupOfflineDetection();
        
        // Initialize error handling
        this.setupErrorHandling();
    }

    initializeLocalStorage() {
        const defaultSettings = {
            theme: 'auto',
            language: 'en',
            notifications: true,
            sounds: true,
            location: true,
            defaultSession: 'calm',
            sessionLength: 300,
            breathingSound: true,
            hapticFeedback: true,
            dailyReminder: true,
            reminderTime: '09:00',
            achievementNotifications: true,
            weatherAlerts: true,
            dataCollection: false,
            locationAccess: true,
            debugMode: false,
            offlineMode: true
        };

        if (!localStorage.getItem('appSettings')) {
            localStorage.setItem('appSettings', JSON.stringify(defaultSettings));
        }

        if (!localStorage.getItem('breathingSessions')) {
            localStorage.setItem('breathingSessions', JSON.stringify([]));
        }

        if (!localStorage.getItem('userProfile')) {
            localStorage.setItem('userProfile', JSON.stringify({
                name: 'Wellness User',
                email: '',
                joinDate: new Date().toISOString(),
                goals: [],
                experience: 'beginner'
            }));
        }
    }

    applyTheme() {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        const theme = settings.theme || 'auto';
        
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            if (prefersDark) {
                document.body.classList.add('theme-dark');
            }
        } else {
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            if (theme !== 'light') {
                document.body.classList.add(`theme-${theme}`);
            }
        }
    }

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('Back online! 🌐', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('You are offline. Some features may be limited.', 'warning');
        });
    }

    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error caught:', event.error);
            if (this.isDebugMode()) {
                this.showNotification(`Error: ${event.error.message}`, 'error');
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (this.isDebugMode()) {
                this.showNotification(`Promise rejection: ${event.reason}`, 'error');
            }
        });
    }

    setupEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-section]')) {
                e.preventDefault();
                this.switchSection(e.target.dataset.section);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchSection('breathing');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchSection('analytics');
                        break;
                    case 'd':
                        e.preventDefault();
                        this.exportData();
                        break;
                }
            }
            
            // Escape key
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });

        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleAppHidden();
            } else {
                this.handleAppVisible();
            }
        });

        // Before unload
        window.addEventListener('beforeunload', (e) => {
            this.handleAppUnload(e);
        });
    }

    async initializeModules() {
        try {
            // Initialize breathing module
            if (window.BreathingController) {
                this.breathing = new BreathingController();
                await this.breathing.init();
            }

            // Initialize analytics module
            if (window.AnalyticsController) {
                this.analytics = new AnalyticsController();
                await this.analytics.init();
            }

            // Initialize auth module
            if (window.AuthController) {
                this.auth = new AuthController();
                await this.auth.init();
            }

        } catch (error) {
            console.error('Error initializing modules:', error);
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (item.dataset.section) {
                    e.preventDefault();
                    this.switchSection(item.dataset.section);
                }
            });
        });
    }

    switchSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => section.classList.remove('active'));

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionName) {
                item.classList.add('active');
            }
        });

        this.currentSection = sectionName;

        // Notify modules of section change
        if (this.breathing && sectionName === 'breathing') {
            this.breathing.onSectionActivated();
        }
        if (this.analytics && sectionName === 'analytics') {
            this.analytics.onSectionActivated();
        }

        // Update URL without page reload
        const newUrl = sectionName === 'breathing' ? '/' : `/#${sectionName}`;
        window.history.pushState({ section: sectionName }, '', newUrl);
    }

    async checkAuthState() {
        const userMode = localStorage.getItem('userMode');
        const authButton = document.getElementById('authButton');
        
        if (userMode === 'guest') {
            this.currentUser = { mode: 'guest', name: 'Guest User' };
            if (authButton) {
                authButton.innerHTML = '<i class="fas fa-user"></i><span>Guest</span>';
            }
        } else if (this.auth) {
            // Check Firebase auth state (will be implemented when Firebase is connected)
            console.log('Checking Firebase auth state...');
        } else {
            if (authButton) {
                authButton.addEventListener('click', () => {
                    window.location.href = 'auth.html';
                });
            }
        }
    }

    async loadUserPreferences() {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        
        // Apply language settings
        if (settings.language && settings.language !== 'en') {
            // Language implementation would go here
            console.log(`Loading language: ${settings.language}`);
        }
        
        // Apply notification settings
        if (settings.dailyReminder && 'Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.scheduleReminders(settings.reminderTime);
            }
        }
    }

    async initializeEnvironmentalMonitoring() {
        if (!this.isOnline) {
            console.log('Offline mode - skipping environmental monitoring');
            return;
        }

        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        if (!settings.locationAccess) {
            console.log('Location access disabled - skipping environmental monitoring');
            return;
        }

        try {
            await this.requestLocationAndWeather();
        } catch (error) {
            console.error('Failed to initialize environmental monitoring:', error);
        }
    }

    async requestLocationAndWeather() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            };

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        await this.fetchEnvironmentalData(position.coords);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                },
                (error) => {
                    console.warn('Geolocation error:', error.message);
                    this.handleLocationError(error);
                    reject(error);
                },
                options
            );
        });
    }

    async fetchEnvironmentalData(coords) {
        const apiKey = this.getOpenWeatherApiKey();
        if (!apiKey) {
            console.warn('OpenWeather API key not available');
            return;
        }

        try {
            const [weatherResponse, aqiResponse] = await Promise.all([
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&appid=${apiKey}&units=metric`),
                fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${coords.latitude}&lon=${coords.longitude}&appid=${apiKey}`)
            ]);

            if (!weatherResponse.ok || !aqiResponse.ok) {
                throw new Error('Failed to fetch environmental data');
            }

            const weatherData = await weatherResponse.json();
            const aqiData = await aqiResponse.json();

            this.updateEnvironmentalDisplay(weatherData, aqiData);
            this.checkEnvironmentalAlerts(weatherData, aqiData);

        } catch (error) {
            console.error('Error fetching environmental data:', error);
            this.showEnvironmentalError();
        }
    }

    getOpenWeatherApiKey() {
        // This would normally come from environment variables
        // For demo purposes, using the key from the original files
        return "656114096a9a445758bc9bbdc5cf45a1";
    }

    updateEnvironmentalDisplay(weatherData, aqiData) {
        // Update air quality display
        const aqiValue = document.getElementById('aqiValue');
        const aqiDescription = document.getElementById('aqiDescription');
        const locationInfo = document.getElementById('locationInfo');

        if (aqiValue && aqiData.list && aqiData.list[0]) {
            const aqi = aqiData.list[0].main.aqi;
            const { quality, description, colorClass } = this.getAqiInfo(aqi);
            
            aqiValue.textContent = `AIR QUALITY: ${quality}`;
            aqiValue.className = `aqi-value ${colorClass}`;
            
            if (aqiDescription) {
                aqiDescription.textContent = description;
            }
        }

        // Update weather display
        const weatherContent = document.getElementById('weatherContent');
        if (weatherContent && weatherData) {
            const temp = Math.round(weatherData.main.temp);
            const condition = weatherData.weather[0].main;
            const city = weatherData.name;
            
            weatherContent.innerHTML = `
                <div class="weather-info">
                    <div class="weather-main">${condition}, ${temp}°C</div>
                    <div class="weather-location">${city}</div>
                </div>
            `;
        }

        // Update location info
        if (locationInfo && weatherData) {
            locationInfo.textContent = `${weatherData.name}, ${weatherData.sys.country}`;
        }

        // Apply theme based on weather
        this.applyWeatherTheme(weatherData.weather[0].main.toLowerCase());
    }

    getAqiInfo(aqi) {
        const aqiLevels = {
            1: { quality: 'GOOD 🌿', description: 'Great outdoor air quality! Perfect for breathing exercises outside.', colorClass: 'aqi-good' },
            2: { quality: 'FAIR 🌤️', description: 'Moderate outdoor air quality. Suitable for outdoor breathing.', colorClass: 'aqi-fair' },
            3: { quality: 'MODERATE ☁️', description: 'Air quality is moderate. Consider indoor breathing if sensitive.', colorClass: 'aqi-moderate' },
            4: { quality: 'POOR 😷', description: 'Poor air quality. Recommended to do breathing exercises indoors.', colorClass: 'aqi-poor' },
            5: { quality: 'VERY POOR 🚨', description: 'Very poor air quality! Strongly recommended to breathe indoors only.', colorClass: 'aqi-very-poor' }
        };
        
        return aqiLevels[aqi] || aqiLevels[3];
    }

    applyWeatherTheme(condition) {
        const breathingPanel = document.querySelector('.breathing-panel');
        if (!breathingPanel) return;

        // Remove existing weather classes
        breathingPanel.className = breathingPanel.className.replace(/weather-\w+/g, '');

        // Apply weather-specific styling
        if (condition.includes('rain')) {
            breathingPanel.style.background = 'linear-gradient(135deg, #4e4e50, #22223b)';
        } else if (condition.includes('clear')) {
            breathingPanel.style.background = 'linear-gradient(135deg, #ffe066, #fab1a0)';
        } else if (condition.includes('cloud')) {
            breathingPanel.style.background = 'linear-gradient(135deg, #dfe6e9, #b2bec3)';
        } else {
            breathingPanel.style.background = 'var(--gradient-primary)';
        }
    }

    checkEnvironmentalAlerts(weatherData, aqiData) {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        if (!settings.weatherAlerts) return;

        const aqi = aqiData.list[0].main.aqi;
        
        // High AQI alert
        if (aqi >= 4) {
            this.showNotification(
                'Poor air quality detected! Consider indoor breathing exercises only.',
                'warning'
            );
        }

        // Extreme weather alerts
        const condition = weatherData.weather[0].main.toLowerCase();
        if (condition.includes('storm') || condition.includes('snow')) {
            this.showNotification(
                'Extreme weather detected. Indoor breathing sessions recommended.',
                'info'
            );
        }
    }

    showEnvironmentalError() {
        const aqiValue = document.getElementById('aqiValue');
        const aqiDescription = document.getElementById('aqiDescription');
        const weatherContent = document.getElementById('weatherContent');

        if (aqiValue) {
            aqiValue.textContent = 'AIR QUALITY: DATA UNAVAILABLE';
            aqiValue.className = 'aqi-value';
        }

        if (aqiDescription) {
            aqiDescription.textContent = 'Could not fetch environmental data. Please check your connection.';
        }

        if (weatherContent) {
            weatherContent.innerHTML = '<div class="weather-info">Weather data unavailable</div>';
        }
    }

    handleLocationError(error) {
        let message = 'Location access required for environmental data.';
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Location access denied. Enable location services to get air quality data.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information unavailable.';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out.';
                break;
        }

        const aqiDescription = document.getElementById('aqiDescription');
        if (aqiDescription) {
            aqiDescription.textContent = message;
        }
    }

    setupPWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }

        // Handle install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallPrompt(deferredPrompt);
        });
    }

    showInstallPrompt(deferredPrompt) {
        const notification = {
            id: 'install-prompt',
            message: 'Install Aura BreatheWell for a better experience!',
            type: 'info',
            persistent: true,
            actions: [
                {
                    text: 'Install',
                    action: () => {
                        deferredPrompt.prompt();
                        deferredPrompt.userChoice.then((choiceResult) => {
                            if (choiceResult.outcome === 'accepted') {
                                console.log('User accepted the install prompt');
                            }
                            deferredPrompt = null;
                        });
                    }
                },
                {
                    text: 'Later',
                    action: () => this.dismissNotification('install-prompt')
                }
            ]
        };
        
        this.showNotification(notification.message, notification.type, notification);
    }

    scheduleReminders(time) {
        // This would implement push notification scheduling
        // For now, just log the intent
        console.log(`Scheduling daily reminders for ${time}`);
    }

    handleAppHidden() {
        // Pause any active sessions
        if (this.breathing && this.breathing.isSessionActive()) {
            this.breathing.pauseSession();
        }

        // Save current state
        this.saveAppState();
    }

    handleAppVisible() {
        // Resume paused sessions if needed
        if (this.breathing && this.breathing.isPaused()) {
            // Show resume prompt
            this.showNotification('Resume your breathing session?', 'info', {
                actions: [
                    { text: 'Resume', action: () => this.breathing.resumeSession() },
                    { text: 'Stop', action: () => this.breathing.stopSession() }
                ]
            });
        }

        // Refresh environmental data if needed
        const lastUpdate = localStorage.getItem('lastEnvironmentalUpdate');
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        
        if (!lastUpdate || parseInt(lastUpdate) < fiveMinutesAgo) {
            this.initializeEnvironmentalMonitoring();
        }
    }

    handleAppUnload(e) {
        this.saveAppState();

        // Warn if session is active
        if (this.breathing && this.breathing.isSessionActive()) {
            e.preventDefault();
            e.returnValue = 'You have an active breathing session. Are you sure you want to leave?';
            return e.returnValue;
        }
    }

    saveAppState() {
        const appState = {
            currentSection: this.currentSection,
            timestamp: Date.now()
        };
        
        localStorage.setItem('appState', JSON.stringify(appState));
    }

    restoreAppState() {
        const appState = JSON.parse(localStorage.getItem('appState') || '{}');
        
        if (appState.currentSection && appState.currentSection !== 'breathing') {
            this.switchSection(appState.currentSection);
        }
    }

    showNotification(message, type = 'info', options = {}) {
        const notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('data-id', options.id || 'notification-' + Date.now());

        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        let actionsHTML = '';
        if (options.actions) {
            actionsHTML = options.actions.map(action => 
                `<button class="notification-action" onclick="(${action.action.toString()})()">${action.text}</button>`
            ).join('');
        }

        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${iconMap[type]}"></i>
                <span>${message}</span>
            </div>
            ${actionsHTML}
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        notificationContainer.appendChild(notification);

        // Auto remove after delay (unless persistent)
        if (!options.persistent) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, options.duration || 5000);
        }

        this.notifications.push({
            id: notification.getAttribute('data-id'),
            message,
            type,
            timestamp: Date.now()
        });
    }

    dismissNotification(id) {
        const notification = document.querySelector(`[data-id="${id}"]`);
        if (notification) {
            notification.remove();
        }
    }

    closeModals() {
        const modals = document.querySelectorAll('.modal-overlay.active');
        modals.forEach(modal => modal.classList.remove('active'));
    }

    exportData() {
        const allData = {
            settings: JSON.parse(localStorage.getItem('appSettings') || '{}'),
            profile: JSON.parse(localStorage.getItem('userProfile') || '{}'),
            sessions: JSON.parse(localStorage.getItem('breathingSessions') || '[]'),
            analytics: this.analytics ? this.analytics.getAnalyticsData() : {},
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const dataStr = JSON.stringify(allData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `breathewell-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        this.showNotification('Data exported successfully!', 'success');
    }

    showWelcomeMessage() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('welcome') === 'true') {
            setTimeout(() => {
                this.showNotification('Welcome to Aura BreatheWell! Your wellness journey begins now. 🌟', 'success');
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 1000);
        }
    }

    isDebugMode() {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        return settings.debugMode === true;
    }

    // Public API methods
    getCurrentUser() {
        return this.currentUser;
    }

    getCurrentSection() {
        return this.currentSection;
    }

    isUserAuthenticated() {
        return this.currentUser && this.currentUser.mode !== 'guest';
    }

    getSettings() {
        return JSON.parse(localStorage.getItem('appSettings') || '{}');
    }

    updateSettings(newSettings) {
        const currentSettings = this.getSettings();
        const updatedSettings = { ...currentSettings, ...newSettings };
        localStorage.setItem('appSettings', JSON.stringify(updatedSettings));
        
        // Apply settings that need immediate effect
        if (newSettings.theme) {
            this.applyTheme();
        }
        
        return updatedSettings;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BreatheWellApp();
});

// Global utility functions
window.BreatheWellUtils = {
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    },

    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(date));
    },

    formatDateTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    getRandomQuote() {
        const quotes = [
            "Breathe in peace, breathe out stress.",
            "Every breath is a new beginning.",
            "Your breath is your anchor to the present moment.",
            "Breathing is the bridge between mind and body.",
            "In the rhythm of breathing, find your calm.",
            "Each exhale releases what no longer serves you.",
            "Breathe deeply and let tranquility fill your soul."
        ];
        return quotes[Math.floor(Math.random() * quotes.length)];
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BreatheWellApp;
}
