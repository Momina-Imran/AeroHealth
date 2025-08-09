// Firebase Configuration (Prepared for Firebase Integration)
class FirebaseConfig {
    constructor() {
        this.isInitialized = false;
        this.firebaseApp = null;
        this.auth = null;
        this.firestore = null;
        this.analytics = null;
        this.isConnected = false;
        this.offlineQueue = [];
    }

    // Firebase configuration object (to be provided by user)
    getFirebaseConfig() {
        // This configuration will be provided when Firebase is actually connected
        // For now, return a placeholder structure
        return {
            apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBURFGb9n7QDqY6Xgs-hP2r9xh9_VSFQjU",
            authDomain: process.env.FIREBASE_AUTH_DOMAIN || "aura-breathwell.firebaseapp.com",
            projectId: process.env.FIREBASE_PROJECT_ID || "aura-breathwell",
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "aura-breathwell.firebasestorage.app",
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "322315007298",
            appId: process.env.FIREBASE_APP_ID || "1:322315007298:web:74c1211b1b4a98675484db",
            measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-ABCDEF1234"
        };
    }

    async init() {
        console.log('🔥 Preparing Firebase configuration...');
        
        try {
            // Check if Firebase SDK is available
            if (typeof firebase === 'undefined') {
                console.log('📦 Firebase SDK not loaded - running in offline mode');
                this.setupOfflineMode();
                return;
            }

            // Initialize Firebase with configuration
            const config = this.getFirebaseConfig();
            
            // Validate configuration
            if (!this.validateConfig(config)) {
                console.warn('⚠️ Firebase configuration incomplete - running in offline mode');
                this.setupOfflineMode();
                return;
            }

            // Initialize Firebase app
            this.firebaseApp = firebase.initializeApp(config);
            
            // Initialize Firebase services
            await this.initializeFirebaseServices();
            
            // Setup Firebase event listeners
            this.setupFirebaseListeners();
            
            this.isInitialized = true;
            this.isConnected = true;
            
            console.log('✅ Firebase initialized successfully');
            
            // Process offline queue
            await this.processOfflineQueue();
            
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            console.log('📱 Falling back to offline mode');
            this.setupOfflineMode();
        }
    }

    validateConfig(config) {
        const requiredFields = ['apiKey', 'authDomain', 'projectId'];
        return requiredFields.every(field => 
            config[field] && 
            config[field] !== `your-${field.toLowerCase().replace('_', '-')}-here` &&
            !config[field].includes('your-project')
        );
    }

    async initializeFirebaseServices() {
        try {
            // Initialize Authentication
            this.auth = firebase.auth();
            console.log('🔐 Firebase Auth initialized');

            // Initialize Firestore
            this.firestore = firebase.firestore();
            
            // Enable offline persistence
            await this.firestore.enablePersistence({
                synchronizeTabs: true
            }).catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                } else if (err.code === 'unimplemented') {
                    console.warn('The current browser does not support persistence.');
                }
            });
            
            console.log('📊 Firestore initialized with offline persistence');

            // Initialize Analytics (optional)
            if (firebase.analytics) {
                this.analytics = firebase.analytics();
                console.log('📈 Firebase Analytics initialized');
            }

            // Initialize Performance Monitoring (optional)
            if (firebase.performance) {
                this.performance = firebase.performance();
                console.log('⚡ Firebase Performance initialized');
            }

        } catch (error) {
            console.error('Error initializing Firebase services:', error);
            throw error;
        }
    }

    setupFirebaseListeners() {
        // Authentication state change listener
        this.auth.onAuthStateChanged((user) => {
            if (window.app && window.app.auth) {
                window.app.auth.handleFirebaseAuthStateChange(user);
            }
        });

        // Network state listener
        window.addEventListener('online', () => {
            if (this.isConnected) {
                this.processOfflineQueue();
            }
        });

        // Firestore connection state
        this.firestore.enableNetwork().then(() => {
            console.log('🌐 Firestore connected');
        }).catch((error) => {
            console.warn('Firestore connection failed:', error);
        });
    }

    setupOfflineMode() {
        this.isConnected = false;
        this.isInitialized = true;
        
        console.log('📱 Running in offline mode');
        
        // Create mock Firebase services for offline compatibility
        this.createOfflineServices();
    }

    createOfflineServices() {
        // Mock Auth service
        this.auth = {
            currentUser: null,
            onAuthStateChanged: (callback) => {
                // Return unsubscribe function
                return () => {};
            },
            signInWithEmailAndPassword: async (email, password) => {
                throw new Error('Authentication requires internet connection');
            },
            createUserWithEmailAndPassword: async (email, password) => {
                throw new Error('Authentication requires internet connection');
            },
            signOut: async () => {
                throw new Error('Authentication requires internet connection');
            }
        };

        // Mock Firestore service
        this.firestore = {
            collection: (path) => ({
                doc: (id) => ({
                    set: async (data) => {
                        this.queueOfflineOperation('set', path, id, data);
                    },
                    update: async (data) => {
                        this.queueOfflineOperation('update', path, id, data);
                    },
                    get: async () => {
                        throw new Error('Data access requires internet connection');
                    }
                }),
                add: async (data) => {
                    this.queueOfflineOperation('add', path, null, data);
                }
            })
        };
    }

    queueOfflineOperation(type, collection, docId, data) {
        this.offlineQueue.push({
            type,
            collection,
            docId,
            data,
            timestamp: Date.now()
        });
        
        console.log(`📝 Queued offline operation: ${type} in ${collection}`);
    }

    async processOfflineQueue() {
        if (!this.isConnected || this.offlineQueue.length === 0) {
            return;
        }

        console.log(`🔄 Processing ${this.offlineQueue.length} offline operations...`);

        const operations = [...this.offlineQueue];
        this.offlineQueue = [];

        for (const operation of operations) {
            try {
                await this.executeOfflineOperation(operation);
            } catch (error) {
                console.error('Failed to process offline operation:', error);
                // Re-queue failed operations
                this.offlineQueue.push(operation);
            }
        }

        if (this.offlineQueue.length === 0) {
            console.log('✅ All offline operations processed successfully');
        } else {
            console.warn(`⚠️ ${this.offlineQueue.length} operations failed and were re-queued`);
        }
    }

    async executeOfflineOperation(operation) {
        const { type, collection, docId, data } = operation;
        const collectionRef = this.firestore.collection(collection);

        switch (type) {
            case 'set':
                await collectionRef.doc(docId).set(data);
                break;
            case 'update':
                await collectionRef.doc(docId).update(data);
                break;
            case 'add':
                await collectionRef.add(data);
                break;
            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
    }

    // User Management Methods
    async createUser(userData) {
        if (!this.isConnected) {
            this.queueOfflineOperation('set', 'users', userData.uid, userData);
            return;
        }

        try {
            await this.firestore.collection('users').doc(userData.uid).set({
                ...userData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async updateUser(uid, userData) {
        if (!this.isConnected) {
            this.queueOfflineOperation('update', 'users', uid, userData);
            return;
        }

        try {
            await this.firestore.collection('users').doc(uid).update({
                ...userData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async getUser(uid) {
        if (!this.isConnected) {
            throw new Error('User data access requires internet connection');
        }

        try {
            const doc = await this.firestore.collection('users').doc(uid).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    // Session Management Methods
    async saveSession(sessionData) {
        if (!this.isConnected) {
            this.queueOfflineOperation('add', 'sessions', null, sessionData);
            return;
        }

        try {
            await this.firestore.collection('sessions').add({
                ...sessionData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error saving session:', error);
            throw error;
        }
    }

    async getUserSessions(uid, limit = 50) {
        if (!this.isConnected) {
            throw new Error('Session data access requires internet connection');
        }

        try {
            const snapshot = await this.firestore
                .collection('sessions')
                .where('userId', '==', uid)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting user sessions:', error);
            throw error;
        }
    }

    // Analytics Methods
    async saveAnalyticsEvent(eventName, eventData) {
        if (this.analytics) {
            this.analytics.logEvent(eventName, eventData);
        }

        if (!this.isConnected) {
            this.queueOfflineOperation('add', 'analytics_events', null, {
                eventName,
                eventData,
                timestamp: Date.now()
            });
            return;
        }

        try {
            await this.firestore.collection('analytics_events').add({
                eventName,
                eventData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error saving analytics event:', error);
        }
    }

    // Settings Management
    async saveUserSettings(uid, settings) {
        if (!this.isConnected) {
            this.queueOfflineOperation('set', 'user_settings', uid, settings);
            return;
        }

        try {
            await this.firestore.collection('user_settings').doc(uid).set({
                ...settings,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error saving user settings:', error);
            throw error;
        }
    }

    async getUserSettings(uid) {
        if (!this.isConnected) {
            throw new Error('Settings access requires internet connection');
        }

        try {
            const doc = await this.firestore.collection('user_settings').doc(uid).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error getting user settings:', error);
            throw error;
        }
    }

    // Utility Methods
    isFirebaseConnected() {
        return this.isConnected;
    }

    getCurrentUser() {
        return this.auth ? this.auth.currentUser : null;
    }

    getServerTimestamp() {
        return this.isConnected && firebase.firestore ? 
               firebase.firestore.FieldValue.serverTimestamp() : 
               new Date();
    }

    // Migration helpers for existing localStorage data
    async migrateLocalStorageToFirebase(uid) {
        if (!this.isConnected) {
            console.log('Cannot migrate data - Firebase not connected');
            return;
        }

        try {
            console.log('🔄 Migrating localStorage data to Firebase...');

            // Migrate user profile
            const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
            if (Object.keys(profile).length > 0) {
                await this.updateUser(uid, profile);
            }

            // Migrate sessions
            const sessions = JSON.parse(localStorage.getItem('breathingSessions') || '[]');
            for (const session of sessions) {
                await this.saveSession({ ...session, userId: uid });
            }

            // Migrate settings
            const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            if (Object.keys(settings).length > 0) {
                await this.saveUserSettings(uid, settings);
            }

            console.log('✅ Data migration completed successfully');

        } catch (error) {
            console.error('❌ Data migration failed:', error);
        }
    }

    // Data sync methods
    async syncLocalDataWithFirebase(uid) {
        if (!this.isConnected) return;

        try {
            // Get Firebase data
            const [firebaseUser, firebaseSessions, firebaseSettings] = await Promise.all([
                this.getUser(uid),
                this.getUserSessions(uid),
                this.getUserSettings(uid)
            ]);

            // Update localStorage with Firebase data
            if (firebaseUser) {
                localStorage.setItem('userProfile', JSON.stringify(firebaseUser));
            }

            if (firebaseSessions) {
                localStorage.setItem('breathingSessions', JSON.stringify(firebaseSessions));
            }

            if (firebaseSettings) {
                localStorage.setItem('appSettings', JSON.stringify(firebaseSettings));
            }

            console.log('✅ Local data synced with Firebase');

        } catch (error) {
            console.error('Error syncing data:', error);
        }
    }
}

// Create global instance
const firebaseConfig = new FirebaseConfig();

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    firebaseConfig.init().catch(error => {
        console.warn('Firebase auto-initialization failed:', error);
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseConfig;
}

// Make available globally
window.FirebaseConfig = FirebaseConfig;
window.firebaseConfig = firebaseConfig;
