// Authentication Controller
class AuthController {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.authStateListeners = [];
        this.authProvider = 'firebase'; // Will be configured when Firebase is connected
    }

    async init() {
        console.log('🔐 Initializing Auth Controller...');
        
        try {
            // Initialize authentication state
            await this.initializeAuthState();
            
            // Setup auth UI listeners
            this.setupAuthUIListeners();
            
            // Check for existing session
            await this.checkExistingSession();
            
            this.isInitialized = true;
            console.log('✅ Auth Controller initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Auth Controller:', error);
            throw error;
        }
    }

    async initializeAuthState() {
        // For now, work with localStorage until Firebase is connected
        const userMode = localStorage.getItem('userMode');
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        
        if (userMode === 'guest') {
            this.currentUser = {
                uid: 'guest',
                email: null,
                displayName: 'Guest User',
                mode: 'guest',
                isAnonymous: true
            };
        } else if (userProfile.email) {
            // Simulate authenticated user
            this.currentUser = {
                uid: userProfile.id || 'local-user',
                email: userProfile.email,
                displayName: userProfile.name || 'User',
                mode: 'authenticated',
                isAnonymous: false
            };
        }
        
        this.notifyAuthStateChange();
    }

    setupAuthUIListeners() {
        // Main auth button
        const authButton = document.getElementById('authButton');
        if (authButton) {
            authButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.currentUser && !this.currentUser.isAnonymous) {
                    this.showUserMenu();
                } else {
                    this.redirectToAuth();
                }
            });
        }

        // Listen for auth form submissions
        this.setupFormListeners();
    }

    setupFormListeners() {
        // Sign In Form
        const signInForm = document.getElementById('signInForm');
        if (signInForm) {
            signInForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSignIn(new FormData(signInForm));
            });
        }

        // Sign Up Form
        const signUpForm = document.getElementById('signUpForm');
        if (signUpForm) {
            signUpForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSignUp(new FormData(signUpForm));
            });
        }

        // Password Reset Form
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handlePasswordReset(new FormData(forgotPasswordForm));
            });
        }
    }

    async checkExistingSession() {
        // Check if user is remembered
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        const lastLogin = localStorage.getItem('lastLogin');
        
        if (rememberMe && lastLogin) {
            const daysSinceLogin = (Date.now() - parseInt(lastLogin)) / (1000 * 60 * 60 * 24);
            if (daysSinceLogin < 30) { // Auto-login within 30 days
                console.log('Auto-login from remembered session');
                // Would restore Firebase session here
            }
        }
    }

    // Authentication Methods
    async handleSignIn(formData) {
        const email = formData.get('email');
        const password = formData.get('password');
        const rememberMe = formData.get('rememberMe') === 'on';

        try {
            this.showAuthLoading(true);

            // Validate inputs
            if (!this.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            // For now, simulate Firebase auth
            await this.simulateFirebaseSignIn(email, password, rememberMe);

            this.showAuthNotification('Sign in successful!', 'success');
            
            // Redirect after successful login
            setTimeout(() => {
                window.location.href = 'index.html?welcome=true';
            }, 1000);

        } catch (error) {
            console.error('Sign in error:', error);
            this.showAuthNotification(error.message, 'error');
        } finally {
            this.showAuthLoading(false);
        }
    }

    async handleSignUp(formData) {
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        try {
            this.showAuthLoading(true);

            // Validate inputs
            if (!firstName || !lastName) {
                throw new Error('Please enter your full name');
            }

            if (!this.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            if (!this.validatePasswordStrength(password)) {
                throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
            }

            // For now, simulate Firebase auth
            await this.simulateFirebaseSignUp(email, password, firstName, lastName);

            this.showAuthNotification('Account created successfully!', 'success');
            
            // Redirect to onboarding for new users
            setTimeout(() => {
                window.location.href = 'onboarding.html';
            }, 1000);

        } catch (error) {
            console.error('Sign up error:', error);
            this.showAuthNotification(error.message, 'error');
        } finally {
            this.showAuthLoading(false);
        }
    }

    async handlePasswordReset(formData) {
        const email = formData.get('email');

        try {
            this.showAuthLoading(true);

            if (!this.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            // For now, simulate Firebase password reset
            await this.simulateFirebasePasswordReset(email);

            this.showAuthNotification('Password reset email sent!', 'success');
            
            // Switch back to sign in form
            setTimeout(() => {
                if (typeof showSignIn === 'function') {
                    showSignIn();
                }
            }, 2000);

        } catch (error) {
            console.error('Password reset error:', error);
            this.showAuthNotification(error.message, 'error');
        } finally {
            this.showAuthLoading(false);
        }
    }

    async signOut() {
        try {
            // Clear local session data
            localStorage.removeItem('userMode');
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('lastLogin');
            
            // Reset user state
            this.currentUser = null;
            
            // When Firebase is connected, call firebase.auth().signOut()
            console.log('User signed out');
            
            this.notifyAuthStateChange();
            
            // Redirect to auth page
            window.location.href = 'auth.html';
            
        } catch (error) {
            console.error('Sign out error:', error);
            this.showAuthNotification('Error signing out', 'error');
        }
    }

    async continueAsGuest() {
        try {
            localStorage.setItem('userMode', 'guest');
            
            this.currentUser = {
                uid: 'guest',
                email: null,
                displayName: 'Guest User',
                mode: 'guest',
                isAnonymous: true
            };
            
            this.notifyAuthStateChange();
            
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Guest mode error:', error);
            this.showAuthNotification('Error entering guest mode', 'error');
        }
    }

    // Social Authentication (Prepared for Firebase)
    async signInWithGoogle() {
        try {
            this.showAuthNotification('Google sign in will be available soon', 'info');
            
            // When Firebase is connected:
            // const provider = new firebase.auth.GoogleAuthProvider();
            // const result = await firebase.auth().signInWithPopup(provider);
            // this.handleAuthResult(result);
            
        } catch (error) {
            console.error('Google sign in error:', error);
            this.showAuthNotification('Google sign in failed', 'error');
        }
    }

    async signInWithApple() {
        try {
            this.showAuthNotification('Apple sign in will be available soon', 'info');
            
            // When Firebase is connected:
            // const provider = new firebase.auth.OAuthProvider('apple.com');
            // const result = await firebase.auth().signInWithPopup(provider);
            // this.handleAuthResult(result);
            
        } catch (error) {
            console.error('Apple sign in error:', error);
            this.showAuthNotification('Apple sign in failed', 'error');
        }
    }

    // Firebase Simulation Methods (Remove when Firebase is connected)
    async simulateFirebaseSignIn(email, password, rememberMe) {
        // Simulate network delay
        await this.delay(2000);
        
        // Simple validation
        if (email === 'test@example.com' && password === 'password123') {
            const user = {
                uid: 'test-user-id',
                email: email,
                displayName: 'Test User',
                mode: 'authenticated',
                isAnonymous: false
            };
            
            // Store user data
            this.currentUser = user;
            localStorage.setItem('userMode', 'authenticated');
            
            const profile = {
                id: user.uid,
                email: user.email,
                name: user.displayName,
                joinDate: new Date().toISOString()
            };
            localStorage.setItem('userProfile', JSON.stringify(profile));
            
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
                localStorage.setItem('lastLogin', Date.now().toString());
            }
            
            this.notifyAuthStateChange();
            return user;
        } else {
            throw new Error('Invalid email or password');
        }
    }

    async simulateFirebaseSignUp(email, password, firstName, lastName) {
        // Simulate network delay
        await this.delay(2000);
        
        const user = {
            uid: 'new-user-' + Date.now(),
            email: email,
            displayName: `${firstName} ${lastName}`,
            mode: 'authenticated',
            isAnonymous: false
        };
        
        // Store user data
        this.currentUser = user;
        localStorage.setItem('userMode', 'authenticated');
        
        const profile = {
            id: user.uid,
            email: user.email,
            name: user.displayName,
            firstName: firstName,
            lastName: lastName,
            joinDate: new Date().toISOString()
        };
        localStorage.setItem('userProfile', JSON.stringify(profile));
        
        this.notifyAuthStateChange();
        return user;
    }

    async simulateFirebasePasswordReset(email) {
        // Simulate network delay
        await this.delay(1500);
        
        // In real implementation, Firebase would send password reset email
        console.log(`Password reset email would be sent to: ${email}`);
        return true;
    }

    // Utility Methods
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePasswordStrength(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return re.test(password);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // UI Helper Methods
    showAuthLoading(show) {
        const overlay = document.getElementById('authLoadingOverlay');
        if (overlay) {
            if (show) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        }
    }

    showAuthNotification(message, type = 'info') {
        const container = document.getElementById('authNotificationContainer') || 
                         document.getElementById('notificationContainer');
        
        if (!container) {
            // Fallback to alert if no notification container
            alert(message);
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${iconMap[type]}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    redirectToAuth() {
        window.location.href = 'auth.html';
    }

    showUserMenu() {
        // Create user menu dropdown
        const userMenu = document.createElement('div');
        userMenu.className = 'user-menu dropdown';
        userMenu.innerHTML = `
            <div class="user-menu-header">
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-info">
                    <div class="user-name">${this.currentUser.displayName}</div>
                    <div class="user-email">${this.currentUser.email}</div>
                </div>
            </div>
            <div class="user-menu-items">
                <a href="profile.html" class="menu-item">
                    <i class="fas fa-user"></i>
                    Profile
                </a>
                <a href="settings.html" class="menu-item">
                    <i class="fas fa-cog"></i>
                    Settings
                </a>
                <button class="menu-item sign-out-btn" onclick="window.app.auth.signOut()">
                    <i class="fas fa-sign-out-alt"></i>
                    Sign Out
                </button>
            </div>
        `;
        
        // Position and show menu
        const authButton = document.getElementById('authButton');
        if (authButton) {
            const rect = authButton.getBoundingClientRect();
            userMenu.style.position = 'absolute';
            userMenu.style.top = (rect.bottom + 10) + 'px';
            userMenu.style.right = '20px';
            userMenu.style.zIndex = '1050';
            
            document.body.appendChild(userMenu);
            
            // Close menu when clicking outside
            setTimeout(() => {
                document.addEventListener('click', function closeMenu(e) {
                    if (!userMenu.contains(e.target) && e.target !== authButton) {
                        userMenu.remove();
                        document.removeEventListener('click', closeMenu);
                    }
                });
            }, 100);
        }
    }

    updateAuthUI() {
        const authButton = document.getElementById('authButton');
        if (!authButton) return;

        if (this.currentUser && !this.currentUser.isAnonymous) {
            // Authenticated user
            authButton.innerHTML = `
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <span>${this.currentUser.displayName}</span>
            `;
            authButton.onclick = () => this.showUserMenu();
        } else if (this.currentUser && this.currentUser.isAnonymous) {
            // Guest user
            authButton.innerHTML = `
                <i class="fas fa-user"></i>
                <span>Guest</span>
            `;
            authButton.onclick = () => this.redirectToAuth();
        } else {
            // Not authenticated
            authButton.innerHTML = `
                <i class="fas fa-sign-in-alt"></i>
                <span>Sign In</span>
            `;
            authButton.onclick = () => this.redirectToAuth();
        }
    }

    // State Management
    addAuthStateListener(callback) {
        this.authStateListeners.push(callback);
    }

    removeAuthStateListener(callback) {
        const index = this.authStateListeners.indexOf(callback);
        if (index > -1) {
            this.authStateListeners.splice(index, 1);
        }
    }

    notifyAuthStateChange() {
        this.updateAuthUI();
        this.authStateListeners.forEach(callback => {
            try {
                callback(this.currentUser);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }

    // Public API
    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser && !this.currentUser.isAnonymous;
    }

    isGuest() {
        return this.currentUser && this.currentUser.isAnonymous;
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            this.redirectToAuth();
            return false;
        }
        return true;
    }

    // Firebase Integration Methods (To be implemented)
    async connectFirebase() {
        // This will be implemented when Firebase config is provided
        console.log('Firebase connection not yet implemented');
    }

    onAuthStateChanged(callback) {
        // Firebase auth state change listener
        this.addAuthStateListener(callback);
        
        // When Firebase is connected:
        // return firebase.auth().onAuthStateChanged(callback);
    }
}

// Global auth functions for HTML event handlers
window.signInWithGoogle = function() {
    if (window.app && window.app.auth) {
        window.app.auth.signInWithGoogle();
    }
};

window.signInWithApple = function() {
    if (window.app && window.app.auth) {
        window.app.auth.signInWithApple();
    }
};

window.continueAsGuest = function() {
    if (window.app && window.app.auth) {
        window.app.auth.continueAsGuest();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthController;
}

// Make available globally
window.AuthController = AuthController;
