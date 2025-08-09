// Analytics and Progress Tracking Controller
class AnalyticsController {
    constructor() {
        this.isInitialized = false;
        this.charts = {};
        this.currentTimeframe = 'week';
        this.analytics = {
            totalSessions: 0,
            totalTime: 0,
            streak: 0,
            averageSession: 0,
            sessionsByType: {},
            weeklyProgress: [],
            monthlyProgress: [],
            achievements: []
        };
    }

    async init() {
        console.log('📊 Initializing Analytics Controller...');
        
        try {
            this.loadAnalyticsData();
            this.setupEventListeners();
            this.initializeCharts();
            this.updateAnalyticsDisplay();
            
            this.isInitialized = true;
            console.log('✅ Analytics Controller initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Analytics Controller:', error);
            throw error;
        }
    }

    loadAnalyticsData() {
        const sessions = JSON.parse(localStorage.getItem('breathingSessions') || '[]');
        const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        
        this.calculateAnalytics(sessions);
        this.loadGoalProgress();
    }

    calculateAnalytics(sessions) {
        // Basic metrics
        this.analytics.totalSessions = sessions.length;
        this.analytics.totalTime = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
        this.analytics.averageSession = sessions.length > 0 ? 
            Math.round(this.analytics.totalTime / sessions.length) : 0;
        
        // Sessions by type
        this.analytics.sessionsByType = sessions.reduce((acc, session) => {
            acc[session.type] = (acc[session.type] || 0) + 1;
            return acc;
        }, {});
        
        // Calculate streak
        this.analytics.streak = this.calculateCurrentStreak(sessions);
        
        // Weekly and monthly progress
        this.analytics.weeklyProgress = this.calculateWeeklyProgress(sessions);
        this.analytics.monthlyProgress = this.calculateMonthlyProgress(sessions);
        
        // Air quality correlation
        this.analytics.aqiCorrelation = this.calculateAqiCorrelation(sessions);
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

    calculateWeeklyProgress(sessions) {
        const weeks = [];
        const now = new Date();
        
        for (let i = 11; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            
            const weekSessions = sessions.filter(session => {
                const sessionDate = new Date(session.date);
                return sessionDate >= weekStart && sessionDate <= weekEnd;
            });
            
            weeks.push({
                week: this.getWeekLabel(weekStart),
                sessions: weekSessions.length,
                totalTime: weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0),
                completedSessions: weekSessions.filter(s => s.completed).length
            });
        }
        
        return weeks;
    }

    calculateMonthlyProgress(sessions) {
        const months = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            
            const monthSessions = sessions.filter(session => {
                const sessionDate = new Date(session.date);
                return sessionDate >= monthStart && sessionDate <= monthEnd;
            });
            
            months.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                sessions: monthSessions.length,
                totalTime: monthSessions.reduce((sum, s) => sum + (s.duration || 0), 0),
                uniqueDays: new Set(monthSessions.map(s => new Date(s.date).toDateString())).size
            });
        }
        
        return months;
    }

    calculateAqiCorrelation(sessions) {
        // Mock AQI data for now - would be replaced with real environmental data
        return sessions.map(session => ({
            date: session.date,
            duration: session.duration,
            aqi: Math.floor(Math.random() * 150) + 50, // Mock AQI between 50-200
            completed: session.completed
        }));
    }

    loadGoalProgress() {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        const onboardingData = JSON.parse(localStorage.getItem('onboardingData') || '{}');
        
        this.goals = {
            dailySessions: 3,
            weeklyMinutes: 150,
            streakDays: 7,
            ...settings.goals
        };
        
        if (onboardingData.practiceGoal) {
            this.goals.weeklyMinutes = onboardingData.practiceGoal * 7; // Convert daily to weekly
        }
    }

    setupEventListeners() {
        // Timeframe selectors
        const analyticsTimeframe = document.getElementById('analyticsTimeframe');
        if (analyticsTimeframe) {
            analyticsTimeframe.addEventListener('change', (e) => {
                this.currentTimeframe = e.target.value;
                this.updateAnalyticsDisplay();
            });
        }

        // Export data button
        const exportDataButton = document.getElementById('exportDataButton');
        if (exportDataButton) {
            exportDataButton.addEventListener('click', () => this.exportAnalyticsData());
        }

        // Chart period buttons
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = parseInt(e.target.dataset.period);
                this.updateProgressChart(period);
                
                // Update active button
                document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    initializeCharts() {
        // Initialize all charts
        this.initializeSessionTypeChart();
        this.initializeWeeklyProgressChart();
        this.initializeAqiCorrelationChart();
    }

    initializeSessionTypeChart() {
        const ctx = document.getElementById('sessionTypeChart');
        if (!ctx) return;

        const sessionTypes = this.analytics.sessionsByType;
        const labels = Object.keys(sessionTypes).map(type => this.getSessionTypeName(type));
        const data = Object.values(sessionTypes);
        const colors = ['#a0c4ff', '#ffadad', '#caffbf', '#ffd6a5'];

        this.charts.sessionType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((context.parsed / total) * 100);
                                return `${context.label}: ${context.parsed} sessions (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    initializeWeeklyProgressChart() {
        const ctx = document.getElementById('weeklyProgressChart');
        if (!ctx) return;

        const weeklyData = this.analytics.weeklyProgress;
        const labels = weeklyData.map(week => week.week);
        const sessionData = weeklyData.map(week => week.sessions);
        const timeData = weeklyData.map(week => Math.round(week.totalTime / 60)); // Convert to minutes

        this.charts.weeklyProgress = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sessions',
                    data: sessionData,
                    borderColor: '#a0c4ff',
                    backgroundColor: 'rgba(160, 196, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                }, {
                    label: 'Minutes',
                    data: timeData,
                    borderColor: '#ffadad',
                    backgroundColor: 'rgba(255, 173, 173, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Sessions'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Minutes'
                        },
                        grid: {
                            drawOnChartArea: false,
                        }
                    }
                }
            }
        });
    }

    initializeAqiCorrelationChart() {
        const ctx = document.getElementById('aqiCorrelationChart');
        if (!ctx) return;

        const aqiData = this.analytics.aqiCorrelation;
        const scatterData = aqiData.map(point => ({
            x: point.aqi,
            y: Math.round(point.duration / 60), // Convert to minutes
            completed: point.completed
        }));

        this.charts.aqiCorrelation = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Completed Sessions',
                    data: scatterData.filter(p => p.completed),
                    backgroundColor: '#caffbf',
                    borderColor: '#2ed573',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }, {
                    label: 'Incomplete Sessions',
                    data: scatterData.filter(p => !p.completed),
                    backgroundColor: '#ffadad',
                    borderColor: '#ff4757',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `AQI: ${context.parsed.x}, Duration: ${context.parsed.y} min`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Air Quality Index (AQI)'
                        },
                        min: 0,
                        max: 200
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Session Duration (minutes)'
                        },
                        min: 0
                    }
                }
            }
        });
    }

    updateAnalyticsDisplay() {
        this.updateStatsCards();
        this.updateRecentSessions();
        this.updateInsights();
        this.updateGoalProgress();
    }

    updateStatsCards() {
        // Total Sessions
        const totalSessionsEl = document.getElementById('totalSessions');
        if (totalSessionsEl) {
            totalSessionsEl.textContent = this.analytics.totalSessions;
        }

        // Total Time
        const totalTimeEl = document.getElementById('totalTime');
        if (totalTimeEl) {
            const minutes = Math.round(this.analytics.totalTime / 60);
            totalTimeEl.textContent = minutes + 'm';
        }

        // Streak
        const streakDaysEl = document.getElementById('streakDays');
        if (streakDaysEl) {
            streakDaysEl.textContent = this.analytics.streak;
        }

        // Average Session
        const averageSessionEl = document.getElementById('averageSession');
        if (averageSessionEl) {
            const avgMinutes = Math.round(this.analytics.averageSession / 60);
            averageSessionEl.textContent = avgMinutes + 'm';
        }
    }

    updateRecentSessions() {
        const sessionsList = document.getElementById('sessionsList');
        if (!sessionsList) return;

        const sessions = JSON.parse(localStorage.getItem('breathingSessions') || '[]');
        const recentSessions = sessions.slice(-5).reverse();

        if (recentSessions.length === 0) {
            sessionsList.innerHTML = `
                <div class="no-sessions">
                    <i class="fas fa-leaf"></i>
                    <h3>No sessions yet</h3>
                    <p>Start your first breathing session to see your progress here!</p>
                </div>
            `;
            return;
        }

        sessionsList.innerHTML = recentSessions.map(session => `
            <div class="session-item">
                <div class="session-icon">
                    ${this.getSessionTypeIcon(session.type)}
                </div>
                <div class="session-info">
                    <div class="session-title">${this.getSessionTypeName(session.type)}</div>
                    <div class="session-details">
                        ${Math.round(session.duration / 60)} minutes • 
                        ${this.formatDate(session.date)}
                        ${session.completed ? '' : ' • Incomplete'}
                    </div>
                </div>
                <div class="session-status ${session.completed ? 'completed' : 'incomplete'}">
                    <i class="fas fa-${session.completed ? 'check' : 'clock'}"></i>
                </div>
            </div>
        `).join('');
    }

    updateInsights() {
        const sessions = JSON.parse(localStorage.getItem('breathingSessions') || '[]');
        
        // Best practice time
        this.updateBestPracticeTime(sessions);
        
        // Favorite session type
        this.updateFavoriteSession(sessions);
        
        // Environmental insights
        this.updateEnvironmentalInsights(sessions);
    }

    updateBestPracticeTime(sessions) {
        const bestAirQuality = document.getElementById('bestAirQuality');
        const optimalWeather = document.getElementById('optimalWeather');
        const environmentalRecommendation = document.getElementById('environmentalRecommendation');

        if (sessions.length === 0) return;

        // Analyze practice times
        const timeAnalysis = sessions.reduce((acc, session) => {
            const hour = new Date(session.date).getHours();
            const timeOfDay = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
            acc[timeOfDay] = (acc[timeOfDay] || 0) + 1;
            return acc;
        }, {});

        const bestTime = Object.keys(timeAnalysis).reduce((a, b) => 
            timeAnalysis[a] > timeAnalysis[b] ? a : b
        );

        if (bestAirQuality) {
            bestAirQuality.textContent = `${bestTime} sessions show best completion rates`;
        }

        if (optimalWeather) {
            optimalWeather.textContent = 'Clear weather days optimal for practice';
        }

        if (environmentalRecommendation) {
            const recommendation = this.generateEnvironmentalRecommendation(sessions);
            environmentalRecommendation.textContent = recommendation;
        }
    }

    updateFavoriteSession(sessions) {
        if (sessions.length === 0) return;

        const typeAnalysis = sessions.reduce((acc, session) => {
            acc[session.type] = (acc[session.type] || 0) + 1;
            return acc;
        }, {});

        const favoriteType = Object.keys(typeAnalysis).reduce((a, b) => 
            typeAnalysis[a] > typeAnalysis[b] ? a : b
        );

        // This would update UI elements showing favorite session insights
        console.log(`Favorite session type: ${this.getSessionTypeName(favoriteType)}`);
    }

    updateEnvironmentalInsights(sessions) {
        // Environmental analysis would go here
        // For now, provide general insights
    }

    generateEnvironmentalRecommendation(sessions) {
        const completedSessions = sessions.filter(s => s.completed);
        const completionRate = sessions.length > 0 ? (completedSessions.length / sessions.length) * 100 : 0;

        if (completionRate > 80) {
            return 'Great consistency! Continue with your current schedule.';
        } else if (completionRate > 60) {
            return 'Good progress! Try shorter sessions if completing full sessions is challenging.';
        } else {
            return 'Consider adjusting session length or time of day for better completion rates.';
        }
    }

    updateGoalProgress() {
        this.updateDailySessionsGoal();
        this.updateWeeklyMinutesGoal();
        this.updateStreakGoal();
    }

    updateDailySessionsGoal() {
        const dailySessionsProgress = document.getElementById('dailySessionsProgress');
        const dailySessionsText = document.getElementById('dailySessionsText');
        
        if (!dailySessionsProgress || !dailySessionsText) return;

        const sessions = JSON.parse(localStorage.getItem('breathingSessions') || '[]');
        const today = new Date().toDateString();
        const todaySessions = sessions.filter(session => 
            new Date(session.date).toDateString() === today
        ).length;

        const progress = Math.min((todaySessions / this.goals.dailySessions) * 100, 100);
        dailySessionsProgress.style.width = progress + '%';
        dailySessionsText.textContent = `${todaySessions}/${this.goals.dailySessions}`;
    }

    updateWeeklyMinutesGoal() {
        const weeklyMinutesProgress = document.getElementById('weeklyMinutesProgress');
        const weeklyMinutesText = document.getElementById('weeklyMinutesText');
        
        if (!weeklyMinutesProgress || !weeklyMinutesText) return;

        const sessions = JSON.parse(localStorage.getItem('breathingSessions') || '[]');
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekSessions = sessions.filter(session => 
            new Date(session.date) >= weekStart
        );
        
        const weeklyMinutes = Math.round(weekSessions.reduce((sum, session) => 
            sum + (session.duration || 0), 0) / 60);

        const progress = Math.min((weeklyMinutes / this.goals.weeklyMinutes) * 100, 100);
        weeklyMinutesProgress.style.width = progress + '%';
        weeklyMinutesText.textContent = `${weeklyMinutes}/${this.goals.weeklyMinutes}`;
    }

    updateStreakGoal() {
        const streakProgress = document.getElementById('streakProgress');
        const streakText = document.getElementById('streakText');
        
        if (!streakProgress || !streakText) return;

        const progress = Math.min((this.analytics.streak / this.goals.streakDays) * 100, 100);
        streakProgress.style.width = progress + '%';
        streakText.textContent = `${this.analytics.streak}/${this.goals.streakDays}`;
    }

    updateProgressChart(period) {
        // Update the progress chart based on selected period
        if (this.charts.weeklyProgress) {
            const data = period === 7 ? this.analytics.weeklyProgress.slice(-4) :
                        period === 30 ? this.analytics.weeklyProgress :
                        this.analytics.monthlyProgress;
            
            this.charts.weeklyProgress.data.labels = data.map(d => d.week || d.month);
            this.charts.weeklyProgress.data.datasets[0].data = data.map(d => d.sessions);
            this.charts.weeklyProgress.data.datasets[1].data = data.map(d => Math.round((d.totalTime || 0) / 60));
            this.charts.weeklyProgress.update();
        }
    }

    recordSession(sessionData) {
        // Called when a session is completed
        this.loadAnalyticsData();
        this.updateAnalyticsDisplay();
        
        // Update charts if they exist
        if (this.charts.sessionType) {
            this.updateSessionTypeChart();
        }
        
        if (this.charts.weeklyProgress) {
            this.updateWeeklyProgressChart();
        }
    }

    updateSessionTypeChart() {
        if (!this.charts.sessionType) return;

        const sessionTypes = this.analytics.sessionsByType;
        const labels = Object.keys(sessionTypes).map(type => this.getSessionTypeName(type));
        const data = Object.values(sessionTypes);

        this.charts.sessionType.data.labels = labels;
        this.charts.sessionType.data.datasets[0].data = data;
        this.charts.sessionType.update();
    }

    updateWeeklyProgressChart() {
        if (!this.charts.weeklyProgress) return;

        const weeklyData = this.analytics.weeklyProgress;
        const labels = weeklyData.map(week => week.week);
        const sessionData = weeklyData.map(week => week.sessions);
        const timeData = weeklyData.map(week => Math.round(week.totalTime / 60));

        this.charts.weeklyProgress.data.labels = labels;
        this.charts.weeklyProgress.data.datasets[0].data = sessionData;
        this.charts.weeklyProgress.data.datasets[1].data = timeData;
        this.charts.weeklyProgress.update();
    }

    exportAnalyticsData() {
        const analyticsData = {
            summary: this.analytics,
            sessions: JSON.parse(localStorage.getItem('breathingSessions') || '[]'),
            goals: this.goals,
            insights: {
                completionRate: this.calculateCompletionRate(),
                averageSessionLength: this.analytics.averageSession,
                mostActiveTimeOfDay: this.getMostActiveTimeOfDay(),
                preferredSessionType: this.getPreferredSessionType()
            },
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(analyticsData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `breathewell-analytics-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        if (window.app) {
            window.app.showNotification('Analytics data exported successfully!', 'success');
        }
    }

    calculateCompletionRate() {
        const sessions = JSON.parse(localStorage.getItem('breathingSessions') || '[]');
        if (sessions.length === 0) return 0;
        
        const completedSessions = sessions.filter(s => s.completed);
        return Math.round((completedSessions.length / sessions.length) * 100);
    }

    getMostActiveTimeOfDay() {
        const sessions = JSON.parse(localStorage.getItem('breathingSessions') || '[]');
        const timeAnalysis = sessions.reduce((acc, session) => {
            const hour = new Date(session.date).getHours();
            const timeOfDay = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
            acc[timeOfDay] = (acc[timeOfDay] || 0) + 1;
            return acc;
        }, {});

        return Object.keys(timeAnalysis).reduce((a, b) => 
            timeAnalysis[a] > timeAnalysis[b] ? a : b, 'Morning'
        );
    }

    getPreferredSessionType() {
        const sessionTypes = this.analytics.sessionsByType;
        return Object.keys(sessionTypes).reduce((a, b) => 
            sessionTypes[a] > sessionTypes[b] ? a : b, 'calm'
        );
    }

    // Utility methods
    getSessionTypeName(type) {
        const names = {
            calm: 'Deep Calm',
            energy: 'Energizing',
            focus: 'Focused Mind',
            sleep: 'Sleep Ready'
        };
        return names[type] || 'Unknown';
    }

    getSessionTypeIcon(type) {
        const icons = {
            calm: '🌊',
            energy: '⚡',
            focus: '🧘',
            sleep: '🌙'
        };
        return icons[type] || '🫁';
    }

    getWeekLabel(date) {
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }

    // Public API
    getAnalyticsData() {
        return this.analytics;
    }

    onSectionActivated() {
        // Called when analytics section becomes active
        this.loadAnalyticsData();
        this.updateAnalyticsDisplay();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsController;
}

// Make available globally
window.AnalyticsController = AnalyticsController;
