// Breathing Exercise Controller
class BreathingController {
    constructor() {
        this.currentSession = null;
        this.isActive = false;
        this.isPaused = false;
        this.sessionTimer = null;
        this.breathingTimer = null;
        this.currentPhase = 'ready'; // ready, inhale, hold, exhale
        this.cycleCount = 0;
        this.sessionStartTime = null;
        this.breathingOrb = null;
        this.instructionElement = null;
        this.sessionTypes = {
            calm: { duration: 6, pattern: [4, 0, 4], name: 'Deep Calm', icon: '🌊' },
            energy: { duration: 4, pattern: [2, 1, 2], name: 'Energizing', icon: '⚡' },
            focus: { duration: 8, pattern: [4, 4, 4], name: 'Focused Mind', icon: '🧘' },
            sleep: { duration: 10, pattern: [4, 7, 8], name: 'Sleep Ready', icon: '🌙' }
        };
        this.currentSessionType = 'calm';
        this.sessionDuration = 300; // 5 minutes default
        this.remainingTime = 0;
        this.isInitialized = false;
    }

    async init() {
        console.log('🫁 Initializing Breathing Controller...');
        
        try {
            this.bindElements();
            this.setupEventListeners();
            this.loadUserPreferences();
            this.initializeSessionCards();
            this.initializeBreathingOrb();
            
            this.isInitialized = true;
            console.log('✅ Breathing Controller initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Breathing Controller:', error);
            throw error;
        }
    }

    bindElements() {
        // Control elements
        this.startButton = document.getElementById('startButton');
        this.pauseButton = document.getElementById('pauseButton');
        this.stopButton = document.getElementById('stopButton');
        
        // Display elements
        this.breathingOrb = document.getElementById('breathingOrb');
        this.instructionElement = document.getElementById('breathingInstruction');
        this.timerDisplay = document.getElementById('timerDisplay');
        this.progressBar = document.getElementById('progressBar');
        
        // Session cards
        this.sessionCards = document.querySelectorAll('.session-card');
        
        if (!this.breathingOrb || !this.instructionElement) {
            throw new Error('Required breathing elements not found');
        }
    }

    setupEventListeners() {
        // Control buttons
        if (this.startButton) {
            this.startButton.addEventListener('click', () => this.startSession());
        }
        
        if (this.pauseButton) {
            this.pauseButton.addEventListener('click', () => this.pauseSession());
        }
        
        if (this.stopButton) {
            this.stopButton.addEventListener('click', () => this.stopSession());
        }

        // Session type selection
        this.sessionCards.forEach(card => {
            card.addEventListener('click', () => {
                const sessionType = card.dataset.type;
                const duration = parseInt(card.dataset.duration);
                if (sessionType) {
                    this.selectSessionType(sessionType, duration);
                }
            });
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.key) {
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    if (this.isActive) {
                        this.isPaused ? this.resumeSession() : this.pauseSession();
                    } else {
                        this.startSession();
                    }
                    break;
                case 'Escape':
                    if (this.isActive) {
                        this.stopSession();
                    }
                    break;
            }
        });
    }

    loadUserPreferences() {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        const onboardingData = JSON.parse(localStorage.getItem('onboardingData') || '{}');
        
        // Set default session type
        if (settings.defaultSession) {
            this.currentSessionType = settings.defaultSession;
        }
        
        // Set default session duration
        if (settings.sessionLength) {
            this.sessionDuration = settings.sessionLength;
        }
        
        // Apply onboarding preferences
        if (onboardingData.practiceGoal) {
            this.sessionDuration = onboardingData.practiceGoal * 60; // Convert minutes to seconds
        }
    }

    initializeSessionCards() {
        this.sessionCards.forEach(card => {
            const sessionType = card.dataset.type;
            if (sessionType === this.currentSessionType) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }

    initializeBreathingOrb() {
        if (this.breathingOrb) {
            // Reset orb to initial state
            this.breathingOrb.style.transform = 'scale(1)';
            this.breathingOrb.classList.remove('breathing-inhale', 'breathing-exhale', 'breathing-hold');
        }
        
        this.updateInstructionText('Ready to breathe');
    }

    selectSessionType(sessionType, customDuration = null) {
        if (!this.sessionTypes[sessionType]) {
            console.error('Invalid session type:', sessionType);
            return;
        }

        this.currentSessionType = sessionType;
        
        if (customDuration) {
            this.sessionTypes[sessionType].duration = customDuration;
        }

        // Update active card
        this.sessionCards.forEach(card => {
            card.classList.remove('active');
            if (card.dataset.type === sessionType) {
                card.classList.add('active');
            }
        });

        // Apply session-specific theme
        this.applySessionTheme(sessionType);
        
        console.log(`Selected session type: ${this.sessionTypes[sessionType].name}`);
    }

    applySessionTheme(sessionType) {
        const breathingPanel = document.querySelector('.breathing-panel');
        if (!breathingPanel) return;

        // Remove existing session themes
        breathingPanel.classList.remove('session-calm', 'session-energy', 'session-focus', 'session-sleep');
        
        // Apply new theme
        breathingPanel.classList.add(`session-${sessionType}`);
    }

    async startSession() {
        if (this.isActive) {
            console.warn('Session already active');
            return;
        }

        try {
            this.isActive = true;
            this.isPaused = false;
            this.cycleCount = 0;
            this.sessionStartTime = Date.now();
            this.remainingTime = this.sessionDuration;
            
            // Update UI
            this.updateControlButtons();
            this.updateInstructionText('Get ready...');
            
            // Start countdown
            await this.startCountdown();
            
            // Begin breathing cycle
            this.startBreathingCycle();
            
            // Start session timer
            this.startSessionTimer();
            
            console.log(`Started ${this.sessionTypes[this.currentSessionType].name} session`);
            
        } catch (error) {
            console.error('Error starting session:', error);
            this.stopSession();
        }
    }

    async startCountdown() {
        for (let i = 3; i > 0; i--) {
            this.updateInstructionText(`${i}`);
            await this.delay(1000);
        }
        this.updateInstructionText('Begin breathing...');
    }

    startBreathingCycle() {
        if (!this.isActive || this.isPaused) return;

        const sessionConfig = this.sessionTypes[this.currentSessionType];
        const [inhaleTime, holdTime, exhaleTime] = sessionConfig.pattern;
        
        this.currentPhase = 'inhale';
        this.cycleBreathing(inhaleTime, holdTime, exhaleTime);
    }

    async cycleBreathing(inhaleTime, holdTime, exhaleTime) {
        if (!this.isActive || this.isPaused) return;

        try {
            // Inhale phase
            this.currentPhase = 'inhale';
            this.updateInstructionText('Inhale...');
            this.animateOrb('inhale', inhaleTime);
            await this.delay(inhaleTime * 1000);

            if (!this.isActive || this.isPaused) return;

            // Hold phase (if configured)
            if (holdTime > 0) {
                this.currentPhase = 'hold';
                this.updateInstructionText('Hold...');
                this.animateOrb('hold', holdTime);
                await this.delay(holdTime * 1000);
            }

            if (!this.isActive || this.isPaused) return;

            // Exhale phase
            this.currentPhase = 'exhale';
            this.updateInstructionText('Exhale...');
            this.animateOrb('exhale', exhaleTime);
            await this.delay(exhaleTime * 1000);

            if (!this.isActive || this.isPaused) return;

            // Complete cycle
            this.cycleCount++;
            this.updateInstructionCounter();
            
            // Start next cycle
            this.startBreathingCycle();

        } catch (error) {
            console.error('Error in breathing cycle:', error);
        }
    }

    animateOrb(phase, duration) {
        if (!this.breathingOrb) return;

        // Remove existing animation classes
        this.breathingOrb.classList.remove('breathing-inhale', 'breathing-exhale', 'breathing-hold');
        
        // Apply new animation class
        this.breathingOrb.classList.add(`breathing-${phase}`);
        
        // Set animation duration
        this.breathingOrb.style.animationDuration = `${duration}s`;
        
        // Apply haptic feedback if enabled
        this.triggerHapticFeedback(phase);
        
        // Play breathing sound if enabled
        this.playBreathingSound(phase);
    }

    triggerHapticFeedback(phase) {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        if (!settings.hapticFeedback || !navigator.vibrate) return;

        const patterns = {
            inhale: [100],
            hold: [50, 50, 50],
            exhale: [200]
        };

        navigator.vibrate(patterns[phase] || []);
    }

    playBreathingSound(phase) {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        if (!settings.breathingSound) return;

        // Audio implementation would go here
        // For now, just log the intent
        console.log(`Playing ${phase} sound`);
    }

    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            if (this.isPaused) return;

            this.remainingTime--;
            this.updateTimerDisplay();
            this.updateProgressBar();

            if (this.remainingTime <= 0) {
                this.completeSession();
            }
        }, 1000);
    }

    pauseSession() {
        if (!this.isActive || this.isPaused) return;

        this.isPaused = true;
        this.updateControlButtons();
        this.updateInstructionText('Session paused');
        
        // Pause orb animation
        if (this.breathingOrb) {
            this.breathingOrb.style.animationPlayState = 'paused';
        }
        
        console.log('Session paused');
    }

    resumeSession() {
        if (!this.isActive || !this.isPaused) return;

        this.isPaused = false;
        this.updateControlButtons();
        
        // Resume orb animation
        if (this.breathingOrb) {
            this.breathingOrb.style.animationPlayState = 'running';
        }
        
        // Resume breathing cycle
        this.startBreathingCycle();
        
        console.log('Session resumed');
    }

    stopSession() {
        if (!this.isActive) return;

        // Clear timers
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }

        if (this.breathingTimer) {
            clearTimeout(this.breathingTimer);
            this.breathingTimer = null;
        }

        // Reset state
        this.isActive = false;
        this.isPaused = false;
        this.currentPhase = 'ready';
        
        // Save session data
        this.saveSessionData(false);
        
        // Reset UI
        this.resetUI();
        
        console.log('Session stopped');
    }

    completeSession() {
        if (!this.isActive) return;

        // Clear timers
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }

        // Reset state
        this.isActive = false;
        this.isPaused = false;
        this.currentPhase = 'complete';
        
        // Save session data
        this.saveSessionData(true);
        
        // Show completion
        this.showSessionComplete();
        
        // Reset UI after delay
        setTimeout(() => {
            this.resetUI();
        }, 5000);
        
        console.log('Session completed successfully');
    }

    saveSessionData(completed) {
        const sessionData = {
            id: Date.now().toString(),
            type: this.currentSessionType,
            startTime: this.sessionStartTime,
            endTime: Date.now(),
            duration: this.sessionDuration - this.remainingTime,
            plannedDuration: this.sessionDuration,
            completed: completed,
            cycles: this.cycleCount,
            date: new Date().toISOString(),
            sessionName: this.sessionTypes[this.currentSessionType].name
        };

        // Save to localStorage
        const sessions = JSON.parse(localStorage.getItem('breathingSessions') || '[]');
        sessions.push(sessionData);
        localStorage.setItem('breathingSessions', JSON.stringify(sessions));

        // Update legacy storage for compatibility
        const currentTime = parseInt(localStorage.getItem(`${this.currentSessionType}Time`) || '0');
        localStorage.setItem(`${this.currentSessionType}Time`, (currentTime + sessionData.duration).toString());
        
        const totalSessions = parseInt(localStorage.getItem('totalSessions') || '0');
        localStorage.setItem('totalSessions', (totalSessions + 1).toString());

        // Notify analytics module
        if (window.app && window.app.analytics) {
            window.app.analytics.recordSession(sessionData);
        }

        // Check for achievements
        this.checkAchievements(sessionData);
    }

    checkAchievements(sessionData) {
        const sessions = JSON.parse(localStorage.getItem('breathingSessions') || '[]');
        const totalSessions = sessions.length;
        
        // Achievement checks
        const achievements = [];
        
        if (totalSessions === 1) {
            achievements.push({ title: 'First Breath', description: 'Completed your first breathing session!' });
        }
        
        if (totalSessions === 10) {
            achievements.push({ title: 'Getting Started', description: 'Completed 10 breathing sessions!' });
        }
        
        if (totalSessions === 50) {
            achievements.push({ title: 'Dedicated Practitioner', description: 'Completed 50 breathing sessions!' });
        }
        
        // Check for streak
        const streak = this.calculateCurrentStreak(sessions);
        if (streak === 7) {
            achievements.push({ title: 'Week Warrior', description: '7-day breathing streak!' });
        }
        
        // Show achievement notifications
        achievements.forEach(achievement => {
            if (window.app) {
                window.app.showNotification(`🏆 ${achievement.title}: ${achievement.description}`, 'success');
            }
        });
    }

    calculateCurrentStreak(sessions) {
        if (sessions.length === 0) return 0;
        
        const today = new Date();
        let streak = 0;
        let currentDate = new Date(today);
        
        while (true) {
            const dateStr = currentDate.toDateString();
            const hasSession = sessions.some(session => 
                new Date(session.date).toDateString() === dateStr
            );
            
            if (hasSession) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    }

    showSessionComplete() {
        this.updateInstructionText('Session Complete! 🎉');
        this.updateTimerDisplay('Well done!');
        
        // Celebration animation
        if (this.breathingOrb) {
            this.breathingOrb.classList.remove('breathing-inhale', 'breathing-exhale', 'breathing-hold');
            this.breathingOrb.classList.add('celebration');
        }
        
        // Show completion notification
        if (window.app) {
            const sessionName = this.sessionTypes[this.currentSessionType].name;
            const duration = Math.round((this.sessionDuration - this.remainingTime) / 60);
            window.app.showNotification(
                `✨ Completed ${sessionName} session (${duration} minutes)!`, 
                'success'
            );
        }
    }

    resetUI() {
        this.updateControlButtons();
        this.updateInstructionText('Ready to breathe');
        this.updateTimerDisplay('');
        this.updateProgressBar(0);
        this.initializeBreathingOrb();
        
        if (this.breathingOrb) {
            this.breathingOrb.classList.remove('celebration');
        }
    }

    updateControlButtons() {
        if (this.startButton) {
            this.startButton.disabled = this.isActive;
        }
        
        if (this.pauseButton) {
            this.pauseButton.disabled = !this.isActive;
            const pauseText = this.pauseButton.querySelector('span');
            if (pauseText) {
                pauseText.textContent = this.isPaused ? 'Resume' : 'Pause';
            }
        }
        
        if (this.stopButton) {
            this.stopButton.disabled = !this.isActive;
        }
    }

    updateInstructionText(text) {
        const instructionText = document.querySelector('.instruction-text');
        if (instructionText) {
            instructionText.textContent = text;
        }
    }

    updateInstructionCounter() {
        const instructionCounter = document.querySelector('.instruction-counter');
        if (instructionCounter) {
            instructionCounter.textContent = `Cycle ${this.cycleCount}`;
        }
    }

    updateTimerDisplay(customText = null) {
        const timerText = document.querySelector('.timer-text');
        if (timerText) {
            if (customText) {
                timerText.textContent = customText;
            } else if (this.isActive) {
                const minutes = Math.floor(this.remainingTime / 60);
                const seconds = this.remainingTime % 60;
                timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                timerText.textContent = 'Ready to begin';
            }
        }
    }

    updateProgressBar(customProgress = null) {
        if (!this.progressBar) return;
        
        let progress = 0;
        
        if (customProgress !== null) {
            progress = customProgress;
        } else if (this.isActive) {
            progress = ((this.sessionDuration - this.remainingTime) / this.sessionDuration) * 100;
        }
        
        this.progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API Methods
    isSessionActive() {
        return this.isActive;
    }

    isPaused() {
        return this.isPaused;
    }

    getCurrentSession() {
        return {
            type: this.currentSessionType,
            isActive: this.isActive,
            isPaused: this.isPaused,
            remainingTime: this.remainingTime,
            cycleCount: this.cycleCount,
            currentPhase: this.currentPhase
        };
    }

    onSectionActivated() {
        // Called when breathing section becomes active
        if (!this.isActive) {
            this.initializeBreathingOrb();
        }
    }

    // Settings integration
    updateSettings(newSettings) {
        if (newSettings.defaultSession) {
            this.selectSessionType(newSettings.defaultSession);
        }
        
        if (newSettings.sessionLength) {
            this.sessionDuration = newSettings.sessionLength;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BreathingController;
}

// Make available globally
window.BreathingController = BreathingController;
