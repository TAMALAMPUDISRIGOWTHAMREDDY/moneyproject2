// Liquex App - Main JavaScript File

class LiquexApp {
    constructor() {
        this.currentUser = null;
        this.currentLocation = null;
        this.notifications = [];
        this.currentRequest = null;
        this.chatMessages = [];
        this.transactionHistory = [];
        this.userRatings = {};
        this.nearbyUsers = [];
        this.externalUsers = [];
        this.proximityRange = 700; // 700 meters
        this.locationUpdateInterval = null;
        this.proximityCheckInterval = null;
        this.proximitySimulationInterval = null;
        this.crossDeviceSyncInterval = null;
        this.externalUserDetectionInterval = null;
        this.locationCount = 0;
        this.externalUserLogins = [];

        this.init();
    }

    // Global request management - shared across all users with cross-device sync
    static getAllRequests() {
        try {
            const requests = localStorage.getItem('liquex_global_requests');
            const parsedRequests = requests ? JSON.parse(requests) : [];
            
            // Simulate cross-device sync by checking for updates
            this.syncWithOtherDevices();
            
            return parsedRequests;
        } catch (error) {
            console.error('Error loading global requests:', error);
            return [];
        }
    }

    static saveAllRequests(requests) {
        try {
            localStorage.setItem('liquex_global_requests', JSON.stringify(requests));
            // Simulate broadcasting to other devices
            this.broadcastToOtherDevices(requests);
        } catch (error) {
            console.error('Error saving global requests:', error);
        }
    }

    static addGlobalRequest(request) {
        const requests = this.getAllRequests();
        requests.push(request);
        this.saveAllRequests(requests);
        
        // Trigger cross-device notification
        this.notifyOtherDevices('new_request', request);
    }

    static removeGlobalRequest(requestId) {
        const requests = this.getAllRequests();
        const filteredRequests = requests.filter(req => req.id !== requestId);
        this.saveAllRequests(filteredRequests);
        
        // Trigger cross-device notification
        this.notifyOtherDevices('removed_request', { id: requestId });
    }

    // Cross-device synchronization methods
    static syncWithOtherDevices() {
        // Simulate checking for updates from other devices
        const lastSync = localStorage.getItem('liquex_last_sync');
        const now = Date.now();
        
        if (!lastSync || (now - parseInt(lastSync)) > 3000) { // Sync every 3 seconds
            this.checkForUpdates();
            this.checkForNewUserLogins();
            localStorage.setItem('liquex_last_sync', now.toString());
        }
    }

    static checkForUpdates() {
        // Simulate receiving updates from other devices
        const updates = this.getSimulatedUpdates();
        if (updates.length > 0) {
            this.applyUpdates(updates);
        }
    }

    static getSimulatedUpdates() {
        // Simulate updates from other devices by checking for new requests
        const updates = localStorage.getItem('liquex_pending_updates');
        if (updates) {
            const parsedUpdates = JSON.parse(updates);
            localStorage.removeItem('liquex_pending_updates');
            return parsedUpdates;
        }
        return [];
    }

    static applyUpdates(updates) {
        const requests = this.getAllRequests();
        let hasChanges = false;

        updates.forEach(update => {
            if (update.type === 'new_request') {
                const exists = requests.find(req => req.id === update.data.id);
                if (!exists) {
                    requests.push(update.data);
                    hasChanges = true;
                    // Show enhanced notification for new request
                    if (window.liquexApp) {
                        const distance = window.liquexApp.currentLocation ? 
                            Math.round(window.liquexApp.calculateDistance(
                                window.liquexApp.currentLocation.lat, 
                                window.liquexApp.currentLocation.lng,
                                update.data.location.lat, 
                                update.data.location.lng
                            )) : 'Unknown';
                        
                        window.liquexApp.showToast(
                            `New request nearby: $${update.data.amount} from ${update.data.requester} (${distance}m away)`, 
                            'info'
                        );
                    }
                }
            } else if (update.type === 'removed_request') {
                const index = requests.findIndex(req => req.id === update.data.id);
                if (index > -1) {
                    requests.splice(index, 1);
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            localStorage.setItem('liquex_global_requests', JSON.stringify(requests));
            // Trigger UI update
            this.triggerUIUpdate();
        }
    }

    static broadcastToOtherDevices(requests) {
        // Simulate broadcasting to other devices
        const broadcastData = {
            timestamp: Date.now(),
            requests: requests
        };
        
        // Store broadcast data for other devices to pick up
        localStorage.setItem('liquex_broadcast', JSON.stringify(broadcastData));
    }

    static notifyOtherDevices(type, data) {
        const notification = {
            type: type,
            data: data,
            timestamp: Date.now()
        };
        
        // Store notification for other devices
        const existingUpdates = JSON.parse(localStorage.getItem('liquex_pending_updates') || '[]');
        existingUpdates.push(notification);
        localStorage.setItem('liquex_pending_updates', JSON.stringify(existingUpdates));
    }

    static triggerUIUpdate() {
        // Trigger UI update for cross-device sync
        if (window.liquexApp) {
            window.liquexApp.updateNotificationCount();
            if (document.getElementById('notifications-screen').classList.contains('active')) {
                window.liquexApp.loadNotifications();
            }
        }
    }

    // Check for new user logins in the same location range
    static checkForNewUserLogins() {
        const currentUser = window.liquexApp?.currentUser;
        const currentLocation = window.liquexApp?.currentLocation;
        
        if (!currentUser || !currentLocation) return;

        // Get recent user logins from other devices
        const recentLogins = this.getRecentUserLogins();
        
        recentLogins.forEach(login => {
            if (login.username !== currentUser.username) {
                // Check if the new user is in the same location range
                const distance = window.liquexApp.calculateDistance(
                    currentLocation.lat, currentLocation.lng,
                    login.location.lat, login.location.lng
                );
                
                if (distance <= 700) { // Within 700m range
                    this.handleNewUserInRange(login, distance);
                }
            }
        });

        // Check for external user logins
        this.checkForExternalUserLogins();
    }

    // Check for external user logins with different credentials
    static checkForExternalUserLogins() {
        const currentUser = window.liquexApp?.currentUser;
        const currentLocation = window.liquexApp?.currentLocation;
        
        if (!currentUser || !currentLocation) return;

        // Get external user logins from demo data
        const externalUsers = window.demoData?.externalUsers || [];
        
        externalUsers.forEach(externalUser => {
            if (externalUser.username !== currentUser.username) {
                // Check if external user is in proximity
                const distance = window.liquexApp.calculateDistance(
                    currentLocation.lat, currentLocation.lng,
                    externalUser.location.lat, externalUser.location.lng
                );
                
                if (distance <= 700) {
                    this.handleExternalUserInRange(externalUser, distance);
                }
            }
        });
    }

    // Get recent user logins from other devices
    static getRecentUserLogins() {
        const logins = JSON.parse(localStorage.getItem('liquex_recent_logins') || '[]');
        const now = Date.now();
        
        // Filter logins from the last 5 minutes
        return logins.filter(login => (now - login.timestamp) < 300000);
    }

    // Handle new user login in the same location range
    static handleNewUserInRange(userLogin, distance) {
        const currentUser = window.liquexApp?.currentUser;
        if (!currentUser) return;

        // Check if we've already notified about this user recently
        const notificationKey = `notified_${userLogin.username}_${userLogin.timestamp}`;
        if (localStorage.getItem(notificationKey)) return;

        // Show notification about new user in range
        if (window.liquexApp) {
            window.liquexApp.showToast(
                `New user nearby: ${userLogin.username} logged in from another device (${Math.round(distance)}m away)`,
                'info'
            );
            
            // Mark as notified
            localStorage.setItem(notificationKey, 'true');
            
            // Auto-refresh notifications if on notifications screen
            if (document.getElementById('notifications-screen').classList.contains('active')) {
                setTimeout(() => {
                    window.liquexApp.loadNotifications();
                }, 1000);
            }
        }
    }

    // Handle external user login in the same location range
    static handleExternalUserInRange(externalUser, distance) {
        const currentUser = window.liquexApp?.currentUser;
        if (!currentUser) return;

        // Check if we've already notified about this external user recently
        const notificationKey = `external_notified_${externalUser.username}_${Date.now()}`;
        const lastNotification = localStorage.getItem(`external_last_notified_${externalUser.username}`);
        const now = Date.now();
        
        // Only notify if we haven't notified about this user in the last 5 minutes
        if (lastNotification && (now - parseInt(lastNotification)) < 300000) {
            return;
        }

        // Show notification about external user in range
        if (window.liquexApp) {
            window.liquexApp.showToast(
                `External user nearby: ${externalUser.username} logged in with different credentials (${Math.round(distance)}m away)`,
                'info'
            );
            
            // Mark as notified
            localStorage.setItem(`external_last_notified_${externalUser.username}`, now.toString());
            
            // Add to external user logins tracking
            window.liquexApp.addExternalUserLogin(externalUser, distance);
            
            // Increase location count
            window.liquexApp.incrementLocationCount();
            
            // Auto-refresh notifications if on notifications screen
            if (document.getElementById('notifications-screen').classList.contains('active')) {
                setTimeout(() => {
                    window.liquexApp.loadNotifications();
                }, 1000);
            }
        }
    }

    // Simulate user login from another device
    static simulateUserLoginFromOtherDevice(username, location) {
        const login = {
            username: username,
            location: location,
            timestamp: Date.now(),
            deviceId: `device_${Math.random().toString(36).substr(2, 9)}`
        };
        
        // Store recent login
        const recentLogins = JSON.parse(localStorage.getItem('liquex_recent_logins') || '[]');
        recentLogins.push(login);
        
        // Keep only last 10 logins
        if (recentLogins.length > 10) {
            recentLogins.splice(0, recentLogins.length - 10);
        }
        
        localStorage.setItem('liquex_recent_logins', JSON.stringify(recentLogins));
        
        // Trigger immediate sync for other devices
        this.checkForNewUserLogins();
    }

    init() {
        this.setupEventListeners();
        this.checkLocationPermission();
        this.loadMockData();
        this.startProximityTracking();
        this.startCrossDeviceSync();
        this.startExternalUserDetection();
        
        // Ensure demo data is available and initialize proximity detection
        if (window.demoData) {
            // Demo data loaded successfully
            console.log('Demo data loaded:', window.demoData.users.length, 'users');
            console.log('External users loaded:', window.demoData.externalUsers?.length || 0, 'external users');
        }
        
        // Initialize proximity detection with default location if needed
        setTimeout(() => {
            if (!this.currentLocation) {
                this.currentLocation = { lat: 16.922251, lng: 82.000117 };
                console.log('Using default location for demo');
            }
            this.updateNearbyUsers();
            this.updateProximityStatus();
            this.updateExternalUsers();
        }, 2000);
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('showSignup').addEventListener('click', (e) => this.showSignupPage(e));
        
        // Signup form
        document.getElementById('signupForm').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('showLogin').addEventListener('click', (e) => this.showLoginPage(e));
        
        // Password validation
        document.getElementById('signup-password').addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
        document.getElementById('signup-confirm-password').addEventListener('input', (e) => this.checkPasswordMatch());
        
        // Welcome screen
        document.getElementById('continue-btn').addEventListener('click', () => this.showPage('main-hub'));
        
    // Main hub
        document.getElementById('request-btn').addEventListener('click', () => this.handleRequestButton());
        document.getElementById('notifications-btn').addEventListener('click', () => this.showPage('notifications-screen'));
        document.getElementById('transaction-history-btn').addEventListener('click', () => this.showPage('transaction-history'));
        document.getElementById('analytics-btn').addEventListener('click', () => this.showPage('analytics'));
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

        // Location request button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'request-location-btn' || e.target.closest('#request-location-btn')) {
                this.requestLocationPermission();
            }
        });

        // Mode toggle buttons
        document.getElementById('request-mode-btn').addEventListener('click', () => this.setRequestMode('request'));
        document.getElementById('transfer-mode-btn').addEventListener('click', () => this.setRequestMode('transfer'));

        // Transfer form
        document.getElementById('transferForm').addEventListener('submit', (e) => this.handleTransfer(e));
        document.getElementById('transfer-recipient').addEventListener('change', (e) => this.updateTransferPreview(e));
        document.getElementById('transfer-amount').addEventListener('input', (e) => this.updateTransferPreview(e));
        
        // Raise request form
        document.getElementById('requestForm').addEventListener('submit', (e) => this.handleRaiseRequest(e));
        
        // Notifications
        document.getElementById('refresh-notifications').addEventListener('click', () => this.refreshNotifications());
        
        // Response actions
        document.getElementById('accept-btn').addEventListener('click', () => this.acceptRequest());
        document.getElementById('reject-btn').addEventListener('click', () => this.rejectRequest());
        
        // Payment verification
        document.getElementById('share-location').addEventListener('click', () => this.shareLocation());
        document.getElementById('send-message').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        document.getElementById('verify-otp').addEventListener('click', () => this.verifyOTP());
        document.getElementById('back-to-hub').addEventListener('click', () => this.showPage('main-hub'));
        
        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetPage = e.target.closest('.back-btn').dataset.back;
                this.showPage(targetPage);
            });
        });
    }

    // Page Navigation
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');
        
        // Update page-specific content
        if (pageId === 'notifications-screen') {
            this.loadNotifications();
        } else if (pageId === 'main-hub') {
            this.updateNotificationCount();
        } else if (pageId === 'transaction-history') {
            this.loadTransactionHistory();
        } else if (pageId === 'analytics') {
            this.loadAnalytics();
        } else if (pageId === 'transfer-money') {
            // Ensure nearby users are updated when transfer money page is shown
            // Add a small delay to ensure demo data is loaded
            setTimeout(() => {
                this.updateNearbyUsers();
                this.populateNearbyUsers();
            }, 100);
        }
    }

    // User Authentication
    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !phone || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }
        
        this.showLoading(true);
        
        // Check if user exists (for demo, we'll also allow demo login)
        const userData = this.getUserData(username, phone);
        
        setTimeout(() => {
            if (userData) {
                // Verify password for registered users
                if (userData.password === password) {
                    this.currentUser = userData;
                    this.registerUserLogin();
                    this.showLoading(false);
                    this.showPage('welcome-screen');
                    this.updateWelcomeMessage();
                    this.showToast(`Welcome back, ${username}!`, 'success');
                } else {
                    this.showLoading(false);
                    this.showToast('Invalid password. Please try again.', 'error');
                }
            } else if (username === 'demo' && phone === '1234567890' && password === 'demo123') {
                // Demo login
                this.currentUser = { 
                    username: username, 
                    phone: phone,
                    rating: 5.0,
                    completedTransactions: 0
                };
                
                this.registerUserLogin();
                this.showLoading(false);
                this.showPage('welcome-screen');
                this.updateWelcomeMessage();
                this.showToast('Demo login successful!', 'success');
                
                // Initialize proximity tracking after login
                setTimeout(() => {
                    if (!this.currentLocation) {
                        this.currentLocation = { lat: 16.922251, lng: 82.000117 };
                        console.log('Using default location for demo after login');
                    }
                    this.updateNearbyUsers();
                    this.updateProximityStatus();
                }, 1000);
            } else {
                // User not found
                this.showLoading(false);
                this.showToast('User not found. Please check your credentials or sign up.', 'error');
            }
        }, 1500);
    }

    showSignupPage(e) {
        e.preventDefault();
        this.showPage('signup-screen');
        this.clearForm('signupForm');
    }

    showLoginPage(e) {
        e.preventDefault();
        this.showPage('login-screen');
        this.clearForm('loginForm');
    }

    handleSignup(e) {
        e.preventDefault();
        
        // Get form values
        const username = document.getElementById('signup-username').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const phone = document.getElementById('signup-phone').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const termsAccepted = document.getElementById('signup-terms').checked;
        
        // Validation
        if (!this.validateSignupForm(username, email, phone, password, confirmPassword, termsAccepted)) {
            return;
        }
        
        this.showLoading(true);
        
        // Simulate signup process
        setTimeout(() => {
            // Create new user account
            const newUser = {
                id: Date.now(),
                username: username,
                email: email,
                phone: phone,
                password: password, // In real app, this would be hashed
                createdAt: new Date().toISOString(),
                rating: 5.0,
                completedTransactions: 0,
                isVerified: false
            };
            
            // Store user data (in real app, this would go to a database)
            this.storeUserData(newUser);
            
            this.showLoading(false);
            this.showToast('Account created successfully! Please login.', 'success');
            
            // Clear form and show login page
            this.clearForm('signupForm');
            this.showPage('login-screen');
        }, 2000);
    }

    validateSignupForm(username, email, phone, password, confirmPassword, termsAccepted) {
        // Username validation
        if (username.length < 3) {
            this.showToast('Username must be at least 3 characters long', 'error');
            return false;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showToast('Please enter a valid email address', 'error');
            return false;
        }
        
        // Phone validation
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
            this.showToast('Please enter a valid phone number', 'error');
            return false;
        }
        
        // Password validation
        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters long', 'error');
            return false;
        }
        
        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return false;
        }
        
        // Terms acceptance
        if (!termsAccepted) {
            this.showToast('Please accept the terms and conditions', 'error');
            return false;
        }
        
        return true;
    }

    storeUserData(user) {
        // In a real app, this would be stored in a database
        // For demo purposes, we'll store in localStorage
        const users = JSON.parse(localStorage.getItem('liquex_users') || '[]');
        users.push(user);
        localStorage.setItem('liquex_users', JSON.stringify(users));
    }

    getUserData(username, phone) {
        const users = JSON.parse(localStorage.getItem('liquex_users') || '[]');
        return users.find(user => 
            (user.username === username || user.phone === phone)
        );
    }

    checkPasswordStrength(password) {
        const strengthFill = document.getElementById('strength-fill');
        const strengthText = document.getElementById('strength-text');
        
        let strength = 0;
        let strengthClass = 'weak';
        let strengthLabel = 'Weak';
        
        // Length check
        if (password.length >= 6) strength += 1;
        if (password.length >= 8) strength += 1;
        
        // Character variety checks
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        
        // Determine strength level
        if (strength <= 2) {
            strengthClass = 'weak';
            strengthLabel = 'Weak';
        } else if (strength <= 3) {
            strengthClass = 'fair';
            strengthLabel = 'Fair';
        } else if (strength <= 4) {
            strengthClass = 'good';
            strengthLabel = 'Good';
        } else {
            strengthClass = 'strong';
            strengthLabel = 'Strong';
        }
        
        // Update UI
        strengthFill.className = `strength-fill ${strengthClass}`;
        strengthText.className = `strength-text ${strengthClass}`;
        strengthText.textContent = strengthLabel;
    }

    checkPasswordMatch() {
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const matchIndicator = document.getElementById('password-match');
        
        if (confirmPassword === '') {
            matchIndicator.innerHTML = '';
            return;
        }
        
        if (password === confirmPassword) {
            matchIndicator.innerHTML = '<i class="fas fa-check-circle"></i> Passwords match';
            matchIndicator.className = 'password-match match';
        } else {
            matchIndicator.innerHTML = '<i class="fas fa-times-circle"></i> Passwords do not match';
            matchIndicator.className = 'password-match no-match';
        }
    }

    handleLogout() {
        this.stopProximityTracking();
        this.stopCrossDeviceSync();
        this.stopExternalUserDetection();
        this.currentUser = null;
        this.currentLocation = null;
        this.notifications = [];
        this.currentRequest = null;
        this.chatMessages = [];
        this.nearbyUsers = [];
        this.externalUsers = [];
        this.externalUserLogins = [];
        this.locationCount = 0;
        this.showPage('login-screen');
        this.clearForm('loginForm');
    }

    updateWelcomeMessage() {
        const welcomeMessage = document.getElementById('welcome-message');
        if (this.currentUser) {
            welcomeMessage.textContent = `Welcome, ${this.currentUser.username}!`;
        }
    }

    // Location Services
    checkLocationPermission() {
        if ('geolocation' in navigator) {
            // Check if permissions API is available
            if ('permissions' in navigator) {
                navigator.permissions.query({name: 'geolocation'}).then((result) => {
                    if (result.state === 'granted') {
                        this.getCurrentLocation();
                    } else if (result.state === 'denied') {
                        this.handleLocationDenied('Location access denied by user');
                    } else {
                        this.requestLocationPermission();
                    }
                });
            } else {
                // Fallback for browsers without permissions API
                this.requestLocationPermission();
            }
        } else {
            this.handleLocationDenied('Geolocation is not supported on this device');
        }
    }

    requestLocationPermission() {
        this.showToast('Requesting location access...', 'info');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                this.showToast('Location access granted', 'success');
                this.updateLocationStatus('granted');
            },
            (error) => {
                this.handleLocationError(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    }

    getCurrentLocation() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                this.showToast('Location updated', 'success');
                this.updateNearbyUsers();
                this.updateProximityStatus();
                // Also populate nearby users if we're on the transfer money page
                if (document.getElementById('transfer-money').classList.contains('active')) {
                    this.populateNearbyUsers();
                }
            },
            (error) => {
                this.handleLocationError(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000 // 1 minute
            }
        );
    }

    handleLocationError(error) {
        let message = 'Location access denied. Some features may not work.';

        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = this.getMobileLocationDeniedMessage();
                this.updateLocationStatus('denied');
                // Set a default location for demo purposes
                this.currentLocation = { lat: 16.922251, lng: 82.000117 };
                this.updateNearbyUsers();
                this.updateProximityStatus();
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information is unavailable. Please check your GPS settings.';
                // Set a default location for demo purposes
                this.currentLocation = { lat: 16.922251, lng: 82.000117 };
                this.updateNearbyUsers();
                this.updateProximityStatus();
                break;
            case error.TIMEOUT:
                message = 'Location request timed out. Please try again.';
                // Set a default location for demo purposes
                this.currentLocation = { lat: 16.922251, lng: 82.000117 };
                this.updateNearbyUsers();
                this.updateProximityStatus();
                break;
            default:
                message = 'An unknown error occurred while retrieving location.';
                // Set a default location for demo purposes
                this.currentLocation = { lat: 16.922251, lng: 82.000117 };
                this.updateNearbyUsers();
                this.updateProximityStatus();
                break;
        }

        this.showToast(message, 'error');
    }

    handleLocationDenied(message) {
        this.showToast(message, 'error');
        this.updateLocationStatus('denied');
        // Set a default location for demo purposes
        this.currentLocation = { lat: 16.922251, lng: 82.000117 };
        this.updateNearbyUsers();
        this.updateProximityStatus();
    }

    getMobileLocationDeniedMessage() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            return 'Location access denied. Please enable location permissions in your browser settings and refresh the page.';
        } else {
            return 'Location access denied. Please allow location access when prompted.';
        }
    }

    updateLocationStatus(status) {
        const locationStatus = document.getElementById('location-status');
        const locationButton = document.getElementById('request-location-btn');

        if (locationStatus) {
            if (status === 'granted' && this.currentLocation) {
                locationStatus.innerHTML = `
                    <div class="location-success">
                        <i class="fas fa-check-circle"></i>
                        <p><strong>Location:</strong> ${this.currentLocation.lat.toFixed(6)}, ${this.currentLocation.lng.toFixed(6)}</p>
                        <small>Last updated: ${new Date().toLocaleTimeString()}</small>
                    </div>
                `;
            } else if (status === 'denied') {
                locationStatus.innerHTML = `
                    <div class="location-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Location access denied</p>
                        <button id="retry-location" class="btn-secondary">Enable Location</button>
                    </div>
                `;
                document.getElementById('retry-location').addEventListener('click', () => {
                    this.retryLocationAccess();
                });
            }
        }

        if (locationButton) {
            locationButton.style.display = status === 'denied' ? 'block' : 'none';
        }
    }

    retryLocationAccess() {
        this.showToast('Please enable location access in your browser settings and refresh the page.', 'info');
        this.updateLocationStatus('denied');
    }

    shareLocation() {
        if (!this.currentLocation) {
            this.showToast('Location not available', 'error');
            return;
        }
        
        this.showToast('Location shared successfully', 'success');
        document.getElementById('location-status').innerHTML = `
            <p><strong>Latitude:</strong> ${this.currentLocation.lat.toFixed(6)}</p>
            <p><strong>Longitude:</strong> ${this.currentLocation.lng.toFixed(6)}</p>
        `;
        
        // Show OTP section after location sharing
        setTimeout(() => {
            document.getElementById('otp-section').style.display = 'block';
            this.showToast('OTP verification required', 'info');
        }, 2000);
    }

    // Request Mode Management
    setRequestMode(mode) {
        const requestModeBtn = document.getElementById('request-mode-btn');
        const transferModeBtn = document.getElementById('transfer-mode-btn');
        const requestBtnText = document.getElementById('request-btn-text');

        if (mode === 'request') {
            requestModeBtn.classList.add('active');
            transferModeBtn.classList.remove('active');
            requestBtnText.textContent = 'Raise Request';
        } else {
            transferModeBtn.classList.add('active');
            requestModeBtn.classList.remove('active');
            requestBtnText.textContent = 'Transfer Money';
        }
    }

    handleRequestButton() {
        const isTransferMode = document.getElementById('transfer-mode-btn').classList.contains('active');

        if (isTransferMode) {
            this.showPage('transfer-money');
            // Ensure nearby users are updated and populated with a small delay
            setTimeout(() => {
                this.updateNearbyUsers();
                this.populateNearbyUsers();
                this.showProximityWarning();
            }, 100);
        } else {
            this.showPage('raise-request');
        }
    }

    showProximityWarning() {
        const warning = document.getElementById('proximity-warning');
        if (warning) {
            warning.style.display = this.nearbyUsers.length > 0 ? 'block' : 'none';
        }
    }

    // Transfer Management
    handleTransfer(e) {
        e.preventDefault();
        const amount = document.getElementById('transfer-amount').value;
        const recipient = document.getElementById('transfer-recipient').value;
        const reason = document.getElementById('transfer-reason').value;
        const description = document.getElementById('transfer-description').value;

        if (!amount || !recipient) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (parseFloat(amount) <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
        }

        this.showLoading(true);

        // Use proximity transfer system
        setTimeout(() => {
            const success = this.handleProximityTransfer(recipient, amount, reason, description);
            
            if (success) {
                // Add to transaction history
                this.addTransaction({
                    id: Date.now(),
                    amount: parseFloat(amount),
                    recipient: recipient,
                    reason: reason,
                    description: description,
                    sender: this.currentUser.username,
                    timestamp: new Date().toISOString(),
                    location: this.currentLocation,
                    type: 'proximity_transfer',
                    status: 'completed'
                });
                
                this.showToast('Transfer completed successfully!', 'success');
            } else {
                this.showToast('Transfer failed. Please try again.', 'error');
            }

            this.showLoading(false);
            this.showPage('main-hub');
            this.clearForm('transferForm');
            document.getElementById('transfer-preview').style.display = 'none';
        }, 2000);
    }

    updateTransferPreview() {
        const amount = document.getElementById('transfer-amount').value;
        const recipientSelect = document.getElementById('transfer-recipient');
        const recipientInfo = document.getElementById('recipient-info');
        const recipientDistance = document.getElementById('recipient-distance');

        const preview = document.getElementById('transfer-preview');
        const previewAmount = document.getElementById('preview-amount');
        const previewRecipient = document.getElementById('preview-recipient');
        const previewDistance = document.getElementById('preview-distance');

        if (amount && recipientSelect.value) {
            preview.style.display = 'block';
            previewAmount.textContent = `$${parseFloat(amount).toFixed(2)}`;
            previewRecipient.textContent = recipientSelect.options[recipientSelect.selectedIndex].text;

            // Calculate distance to recipient
            const recipientData = this.getNearbyUsers().find(user => user.username === recipientSelect.value);
            if (recipientData && this.currentLocation) {
                const distance = this.calculateDistance(
                    this.currentLocation.lat, this.currentLocation.lng,
                    recipientData.location.lat, recipientData.location.lng
                );
                previewDistance.textContent = `${Math.round(distance)}m`;
                recipientDistance.textContent = `${Math.round(distance)}m away`;
                recipientInfo.style.display = 'block';
            }
        } else {
            preview.style.display = 'none';
            recipientInfo.style.display = 'none';
        }
    }

    // Request Management
    handleRaiseRequest(e) {
        e.preventDefault();
        const amount = document.getElementById('amount').value;
        const type = document.getElementById('request-type').value;
        const description = document.getElementById('description').value;
        const urgency = document.getElementById('request-urgency').value;
        const category = document.getElementById('request-category').value;

        if (!amount || !type || !urgency || !category) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (!this.currentLocation) {
            this.showToast('Location access required to raise requests', 'error');
            return;
        }

        this.showLoading(true);

        // Simulate request creation
        setTimeout(() => {
            const newRequest = {
                id: Date.now(),
                amount: parseFloat(amount),
                type: type,
                description: description,
                urgency: urgency,
                category: category,
                requester: this.currentUser.username,
                timestamp: new Date().toISOString(),
                location: this.currentLocation,
                userRating: this.currentUser.rating || 5.0
            };

            // Add to global requests (shared across all users)
            LiquexApp.addGlobalRequest(newRequest);

            this.showLoading(false);
            this.showToast('Request raised successfully!', 'success');
            this.showPage('main-hub');
            this.clearForm('requestForm');
        }, 1500);
    }

    loadNotifications() {
        const notificationsList = document.getElementById('notifications-list');
        notificationsList.innerHTML = '';

        // Get all global requests and filter out current user's own requests
        const allRequests = LiquexApp.getAllRequests();
        const otherUsersRequests = allRequests.filter(request =>
            request.requester !== this.currentUser.username
        );

        if (otherUsersRequests.length === 0) {
            notificationsList.innerHTML = '<p style="text-align: center; color: white; padding: 20px;">No requests from other users found</p>';
            return;
        }

        // Sort by proximity first, then by urgency
        otherUsersRequests.sort((a, b) => {
            const distanceA = this.currentLocation ? 
                this.calculateDistance(this.currentLocation.lat, this.currentLocation.lng, a.location.lat, a.location.lng) : Infinity;
            const distanceB = this.currentLocation ? 
                this.calculateDistance(this.currentLocation.lat, this.currentLocation.lng, b.location.lat, b.location.lng) : Infinity;
            
            // Prioritize proximity requests (within 700m)
            if (distanceA <= 700 && distanceB > 700) return -1;
            if (distanceA > 700 && distanceB <= 700) return 1;
            
            // Then sort by distance
            return distanceA - distanceB;
        });

        otherUsersRequests.forEach(request => {
            const distance = this.currentLocation ?
                Math.round(this.calculateDistance(
                    this.currentLocation.lat, this.currentLocation.lng,
                    request.location.lat, request.location.lng
                )) : 'Unknown';

            const isProximityRequest = distance <= 700;
            const proximityIndicator = isProximityRequest ? 
                (distance <= 100 ? '🟢' : distance <= 300 ? '🟡' : '🔴') : '⚪';

            // Check if this is a recent request from a newly logged-in user
            const isRecentRequest = this.isRecentRequestFromNewUser(request);
            const isNewUserRequest = this.isFromNewlyLoggedInUser(request);
            const isExternalRequest = request.isExternal || false;

            const notificationItem = document.createElement('div');
            notificationItem.className = `notification-item ${isProximityRequest ? 'proximity-notification-item' : ''} ${isNewUserRequest ? 'new-user-request' : ''} ${isExternalRequest ? 'external-user-request' : ''}`;
            notificationItem.innerHTML = `
                <div class="notification-header">
                    <span class="notification-amount">$${request.amount}</span>
                    <div class="notification-meta">
                        <span class="notification-type">${request.type}</span>
                        <span class="notification-urgency urgency-${request.urgency}">${request.urgency}</span>
                        ${isProximityRequest ? '<span class="proximity-badge">NEARBY</span>' : ''}
                        ${isNewUserRequest ? '<span class="new-user-badge">NEW USER</span>' : ''}
                        ${isExternalRequest ? '<span class="external-user-badge">EXTERNAL</span>' : ''}
                    </div>
                </div>
                <div class="notification-user">
                    <span>Requested by: ${request.requester}</span>
                    <span class="user-rating">⭐ ${request.userRating || 'N/A'}</span>
                    ${isExternalRequest ? `<span class="external-device-info">📱 ${request.deviceType || 'Unknown'}</span>` : ''}
                </div>
                <div class="notification-details">
                    <span class="notification-distance">${proximityIndicator} ${distance}m away</span>
                    <span class="notification-category">${request.category || 'General'}</span>
                    ${isExternalRequest ? `<span class="external-source">🔗 ${request.loginSource || 'External Device'}</span>` : ''}
                </div>
                ${request.description ? `<div class="notification-description">${request.description}</div>` : ''}
                <div class="notification-time">
                    ${this.getTimeAgo(request.timestamp)}
                    ${isRecentRequest ? '<span class="recent-indicator">🆕 Just posted</span>' : ''}
                    ${isExternalRequest ? '<span class="external-indicator">🌐 External Login</span>' : ''}
                </div>
            `;

            notificationItem.addEventListener('click', () => this.viewRequestDetails(request));
            notificationsList.appendChild(notificationItem);
        });
    }

    viewRequestDetails(request) {
        this.currentRequest = request;
        const requestDetails = document.getElementById('request-details');
        
        requestDetails.innerHTML = `
            <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value">$${request.amount}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${request.type}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Requester:</span>
                <span class="detail-value">${request.requester}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${new Date(request.timestamp).toLocaleString()}</span>
            </div>
            ${request.description ? `
                <div class="detail-row">
                    <span class="detail-label">Description:</span>
                    <span class="detail-value">${request.description}</span>
                </div>
            ` : ''}
        `;
        
        this.showPage('notification-response');
    }

    acceptRequest() {
        if (!this.currentRequest) return;
        
        this.showToast('Request accepted! Proceeding to payment...', 'success');
        this.showPage('payment-verification');
        
        // Add initial chat message
        this.addChatMessage('Request accepted. Let\'s proceed with the payment.', 'sent');
        this.addChatMessage('Great! Please share your location so we can meet.', 'received');
    }

    rejectRequest() {
        this.showToast('Request rejected', 'info');
        this.showPage('main-hub');
    }

    // Chat System
    addChatMessage(message, type) {
        this.chatMessages.push({ message, type, timestamp: new Date() });
        this.updateChatDisplay();
    }

    updateChatDisplay() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';
        
        this.chatMessages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${msg.type}`;
            messageDiv.textContent = msg.message;
            chatMessages.appendChild(messageDiv);
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        this.addChatMessage(message, 'sent');
        input.value = '';
        
        // Simulate response
        setTimeout(() => {
            const responses = [
                'Thanks for the update!',
                'Perfect, I\'ll be there soon.',
                'Got it, see you shortly!',
                'Thanks for letting me know.'
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            this.addChatMessage(randomResponse, 'received');
        }, 1000);
    }

    // OTP Verification
    verifyOTP() {
        const otpInput = document.getElementById('otp-input');
        const otp = otpInput.value.trim();
        
        if (!otp || otp.length !== 6) {
            this.showToast('Please enter a valid 6-digit OTP', 'error');
            return;
        }
        
        this.showLoading(true);
        
        // Simulate OTP verification
        setTimeout(() => {
            this.showLoading(false);
            document.getElementById('otp-section').style.display = 'none';
            document.getElementById('payment-complete').style.display = 'block';
            
            // Add transaction to history
            if (this.currentRequest) {
                this.addTransaction({
                    amount: this.currentRequest.amount,
                    type: this.currentRequest.type,
                    requester: this.currentRequest.requester,
                    responder: this.currentUser.username,
                    status: 'completed',
                    rating: 5
                });
            }
            
            this.showToast('Payment completed successfully!', 'success');
        }, 2000);
    }

    // Utility Functions
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    clearForm(formId) {
        document.getElementById(formId).reset();
    }

    updateNotificationCount() {
        const badge = document.getElementById('notification-count');
        // Get all global requests and filter out current user's own requests
        const allRequests = LiquexApp.getAllRequests();
        const otherUsersRequests = allRequests.filter(request =>
            request.requester !== this.currentUser.username
        );
        badge.textContent = otherUsersRequests.length;
        
        // Add visual indicator for new requests
        if (otherUsersRequests.length > 0) {
            badge.style.animation = 'pulse 1s infinite';
        } else {
            badge.style.animation = 'none';
        }
    }

    refreshNotifications() {
        this.loadNotifications();
        this.showToast('Notifications refreshed', 'success');
    }



    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in kilometers
        return distance * 1000; // Convert to meters
    }

    // User Rating System
    rateUser(userId, rating, comment = '') {
        if (!this.userRatings[userId]) {
            this.userRatings[userId] = [];
        }
        
        this.userRatings[userId].push({
            rating: rating,
            comment: comment,
            timestamp: new Date().toISOString(),
            rater: this.currentUser.username
        });
        
        this.showToast('Rating submitted successfully!', 'success');
    }

    getUserAverageRating(userId) {
        if (!this.userRatings[userId] || this.userRatings[userId].length === 0) {
            return 0;
        }
        
        const totalRating = this.userRatings[userId].reduce((sum, rating) => sum + rating.rating, 0);
        return (totalRating / this.userRatings[userId].length).toFixed(1);
    }

    // Transaction History
    addTransaction(transaction) {
        this.transactionHistory.push({
            ...transaction,
            id: `TXN${Date.now()}`,
            timestamp: new Date().toISOString()
        });
    }

    getTransactionHistory() {
        return this.transactionHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Safe Meetup Spots
    getSafeMeetupSpots() {
        if (!window.demoData || !this.currentLocation) return [];
        
        return window.demoData.locationData.safeMeetupSpots.map(spot => {
            const distance = this.calculateDistance(
                this.currentLocation.lat, this.currentLocation.lng,
                spot.coordinates.lat, spot.coordinates.lng
            );
            return {
                ...spot,
                distance: Math.round(distance)
            };
        }).sort((a, b) => a.distance - b.distance);
    }

    // Enhanced Chat Features
    addTypingIndicator(userId) {
        const chatMessages = document.getElementById('chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = `typing-${userId}`;
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    removeTypingIndicator(userId) {
        const typingIndicator = document.getElementById(`typing-${userId}`);
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Request Analytics
    getRequestAnalytics() {
        // Get all global requests and filter out current user's own requests
        const allRequests = LiquexApp.getAllRequests();
        const otherUsersRequests = allRequests.filter(request =>
            request.requester !== this.currentUser.username
        );

        const analytics = {
            totalRequests: otherUsersRequests.length,
            byType: {},
            byUrgency: {},
            averageAmount: 0,
            totalAmount: 0
        };

        otherUsersRequests.forEach(request => {
            // Count by type
            analytics.byType[request.type] = (analytics.byType[request.type] || 0) + 1;

            // Count by urgency
            analytics.byUrgency[request.urgency] = (analytics.byUrgency[request.urgency] || 0) + 1;

            // Calculate amounts
            analytics.totalAmount += request.amount;
        });

        analytics.averageAmount = analytics.totalRequests > 0 ? analytics.totalAmount / analytics.totalRequests : 0;

        return analytics;
    }

    // Load Transaction History
    loadTransactionHistory() {
        const transactionList = document.getElementById('transaction-list');
        transactionList.innerHTML = '';
        
        const transactions = this.getTransactionHistory();
        
        if (transactions.length === 0) {
            transactionList.innerHTML = '<p style="text-align: center; color: white; padding: 20px;">No transactions found</p>';
            return;
        }
        
        transactions.forEach(transaction => {
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            transactionItem.innerHTML = `
                <div class="transaction-header">
                    <span class="transaction-amount">$${transaction.amount}</span>
                    <span class="transaction-status status-${transaction.status}">${transaction.status}</span>
                </div>
                <div class="transaction-details">
                    <p><strong>Type:</strong> ${transaction.type}</p>
                    <p><strong>Requester:</strong> ${transaction.requester}</p>
                    <p><strong>Responder:</strong> ${transaction.responder}</p>
                    <p><strong>Time:</strong> ${this.getTimeAgo(transaction.timestamp)}</p>
                    ${transaction.rating ? `<p><strong>Rating:</strong> ⭐ ${transaction.rating}/5</p>` : ''}
                </div>
            `;
            
            transactionList.appendChild(transactionItem);
        });
    }

    // Load Analytics Dashboard
    loadAnalytics() {
        const analytics = this.getRequestAnalytics();
        
        // Update stats
        document.getElementById('total-requests').textContent = analytics.totalRequests;
        document.getElementById('avg-amount').textContent = `$${analytics.averageAmount.toFixed(2)}`;
        document.getElementById('total-value').textContent = `$${analytics.totalAmount.toFixed(2)}`;
        
        // Create simple charts
        this.createTypeChart(analytics.byType);
        this.createUrgencyChart(analytics.byUrgency);
    }

    createTypeChart(typeData) {
        const chartContainer = document.getElementById('type-chart');
        chartContainer.innerHTML = '';
        
        Object.entries(typeData).forEach(([type, count]) => {
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.cssText = `
                background: #667eea;
                height: ${(count / Math.max(...Object.values(typeData))) * 150}px;
                width: 60px;
                margin: 0 10px;
                border-radius: 4px 4px 0 0;
                position: relative;
            `;
            
            const label = document.createElement('div');
            label.textContent = type;
            label.style.cssText = `
                text-align: center;
                margin-top: 5px;
                font-size: 0.8rem;
                color: #666;
            `;
            
            const value = document.createElement('div');
            value.textContent = count;
            value.style.cssText = `
                position: absolute;
                top: -25px;
                left: 50%;
                transform: translateX(-50%);
                font-weight: 600;
                color: #667eea;
            `;
            
            bar.appendChild(value);
            
            const barContainer = document.createElement('div');
            barContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
            `;
            
            barContainer.appendChild(bar);
            barContainer.appendChild(label);
            chartContainer.appendChild(barContainer);
        });
        
        chartContainer.style.cssText = `
            display: flex;
            align-items: end;
            justify-content: center;
            gap: 20px;
            height: 200px;
            padding: 20px;
        `;
    }

    createUrgencyChart(urgencyData) {
        const chartContainer = document.getElementById('urgency-chart');
        chartContainer.innerHTML = '';
        
        const colors = { low: '#2ed573', medium: '#ffa502', high: '#ff4757' };
        
        Object.entries(urgencyData).forEach(([urgency, count]) => {
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.cssText = `
                background: ${colors[urgency] || '#667eea'};
                height: ${(count / Math.max(...Object.values(urgencyData))) * 150}px;
                width: 60px;
                margin: 0 10px;
                border-radius: 4px 4px 0 0;
                position: relative;
            `;
            
            const label = document.createElement('div');
            label.textContent = urgency;
            label.style.cssText = `
                text-align: center;
                margin-top: 5px;
                font-size: 0.8rem;
                color: #666;
            `;
            
            const value = document.createElement('div');
            value.textContent = count;
            value.style.cssText = `
                position: absolute;
                top: -25px;
                left: 50%;
                transform: translateX(-50%);
                font-weight: 600;
                color: ${colors[urgency] || '#667eea'};
            `;
            
            bar.appendChild(value);
            
            const barContainer = document.createElement('div');
            barContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
            `;
            
            barContainer.appendChild(bar);
            barContainer.appendChild(label);
            chartContainer.appendChild(barContainer);
        });
        
        chartContainer.style.cssText = `
            display: flex;
            align-items: end;
            justify-content: center;
            gap: 20px;
            height: 200px;
            padding: 20px;
        `;
    }

    // Utility Methods
    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diffInSeconds = Math.floor((now - past) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    // Get nearby users within 700 meters
    getNearbyUsers() {
        if (!this.currentLocation) {
            console.log('No current location for getNearbyUsers');
            return [];
        }

        // Get users from demo data
        const allUsers = window.demoData ? window.demoData.users : [];
        console.log('getNearbyUsers: Found', allUsers.length, 'users in demo data');
        
        if (allUsers.length === 0) {
            console.log('No users in demo data');
            return [];
        }
        
        // Calculate distances and filter users within 700 meters
        const nearbyUsers = allUsers
            .filter(user => user.username !== this.currentUser?.username)
            .map(user => {
                const distance = this.calculateDistance(
                    this.currentLocation.lat, this.currentLocation.lng,
                    user.location.lat, user.location.lng
                );
                console.log(`getNearbyUsers: ${user.username} is ${Math.round(distance)}m away`);
                return {
                    ...user,
                    distance: Math.round(distance)
                };
            })
            .filter(user => user.distance <= 700)
            .sort((a, b) => a.distance - b.distance);
            
        console.log('getNearbyUsers: Found', nearbyUsers.length, 'nearby users');
        return nearbyUsers;
    }

    // Populate nearby users dropdown
    populateNearbyUsers() {
        const recipientSelect = document.getElementById('transfer-recipient');
        if (!recipientSelect) {
            console.log('transfer-recipient element not found');
            return;
        }
        
        const nearbyUsers = this.getNearbyUsers();
        console.log('populateNearbyUsers: Found', nearbyUsers.length, 'nearby users');

        // Clear existing options
        recipientSelect.innerHTML = '';

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Choose nearby user...';
        recipientSelect.appendChild(defaultOption);

        // Add nearby users as options with proximity indicators
        nearbyUsers.forEach(user => {
            const option = document.createElement('option');
            const proximityIndicator = user.distance <= 100 ? '🟢' : user.distance <= 300 ? '🟡' : '🔴';
            option.value = user.username;
            option.textContent = `${proximityIndicator} ${user.username} (${user.distance}m away) ⭐ ${user.rating}`;
            option.dataset.distance = user.distance;
            option.dataset.rating = user.rating;
            recipientSelect.appendChild(option);
        });

        // Show message if no nearby users
        if (nearbyUsers.length === 0) {
            const noUsersOption = document.createElement('option');
            noUsersOption.value = '';
            noUsersOption.textContent = 'No users within 700m - Move closer to other users';
            noUsersOption.disabled = true;
            recipientSelect.appendChild(noUsersOption);
        }

        // Update proximity warning
        this.showProximityWarning();
    }

    // Proximity Tracking System
    startProximityTracking() {
        // Start continuous location updates for proximity detection
        if (this.currentLocation) {
            this.locationUpdateInterval = setInterval(() => {
                this.getCurrentLocation();
            }, 30000); // Update every 30 seconds
        }

        // Check for nearby users and proximity-based requests
        this.proximityCheckInterval = setInterval(() => {
            this.checkProximityRequests();
        }, 10000); // Check every 10 seconds

        // Simulate real-time proximity updates for demo
        this.proximitySimulationInterval = setInterval(() => {
            this.simulateProximityUpdates();
        }, 15000); // Update every 15 seconds
    }

    stopProximityTracking() {
        if (this.locationUpdateInterval) {
            clearInterval(this.locationUpdateInterval);
            this.locationUpdateInterval = null;
        }
        if (this.proximityCheckInterval) {
            clearInterval(this.proximityCheckInterval);
            this.proximityCheckInterval = null;
        }
        if (this.proximitySimulationInterval) {
            clearInterval(this.proximitySimulationInterval);
            this.proximitySimulationInterval = null;
        }
    }

    // Cross-device synchronization
    startCrossDeviceSync() {
        // Start continuous sync every 3 seconds
        this.crossDeviceSyncInterval = setInterval(() => {
            this.syncWithOtherDevices();
        }, 3000);
        
        // Simulate cross-device requests from demo data
        this.simulateCrossDeviceRequests();
    }

    // External user detection system
    startExternalUserDetection() {
        // Start external user detection every 10 seconds
        this.externalUserDetectionInterval = setInterval(() => {
            this.detectExternalUsers();
        }, 10000);
        
        // Simulate external user logins
        this.simulateExternalUserLogins();
    }

    stopExternalUserDetection() {
        if (this.externalUserDetectionInterval) {
            clearInterval(this.externalUserDetectionInterval);
            this.externalUserDetectionInterval = null;
        }
    }

    // Detect external users in proximity
    detectExternalUsers() {
        if (!this.currentLocation || !window.demoData?.externalUsers) return;

        const externalUsers = window.demoData.externalUsers;
        
        externalUsers.forEach(externalUser => {
            if (externalUser.username !== this.currentUser?.username) {
                const distance = this.calculateDistance(
                    this.currentLocation.lat, this.currentLocation.lng,
                    externalUser.location.lat, externalUser.location.lng
                );
                
                if (distance <= this.proximityRange) {
                    this.handleExternalUserDetection(externalUser, distance);
                }
            }
        });
    }

    // Handle external user detection
    handleExternalUserDetection(externalUser, distance) {
        // Check if we've already detected this user recently
        const lastDetection = localStorage.getItem(`external_detected_${externalUser.username}`);
        const now = Date.now();
        
        if (lastDetection && (now - parseInt(lastDetection)) < 300000) { // 5 minutes
            return;
        }

        // Mark as detected
        localStorage.setItem(`external_detected_${externalUser.username}`, now.toString());
        
        // Add to external users list
        this.addExternalUser(externalUser, distance);
        
        // Show notification
        this.showToast(
            `External user detected: ${externalUser.username} (${Math.round(distance)}m away)`,
            'info'
        );
    }

    // Add external user to tracking
    addExternalUser(externalUser, distance) {
        const existingIndex = this.externalUsers.findIndex(user => user.username === externalUser.username);
        
        if (existingIndex >= 0) {
            // Update existing user
            this.externalUsers[existingIndex] = {
                ...externalUser,
                distance: distance,
                detectedAt: new Date().toISOString()
            };
        } else {
            // Add new external user
            this.externalUsers.push({
                ...externalUser,
                distance: distance,
                detectedAt: new Date().toISOString()
            });
        }
        
        // Update location count
        this.incrementLocationCount();
    }

    // Add external user login to tracking
    addExternalUserLogin(externalUser, distance) {
        const login = {
            username: externalUser.username,
            location: externalUser.location,
            distance: distance,
            timestamp: Date.now(),
            deviceType: externalUser.deviceType,
            loginSource: externalUser.loginSource,
            rating: externalUser.rating,
            completedTransactions: externalUser.completedTransactions
        };
        
        this.externalUserLogins.push(login);
        
        // Keep only last 20 logins
        if (this.externalUserLogins.length > 20) {
            this.externalUserLogins.splice(0, this.externalUserLogins.length - 20);
        }
        
        // Store in localStorage for persistence
        localStorage.setItem('liquex_external_user_logins', JSON.stringify(this.externalUserLogins));
    }

    // Increment location count
    incrementLocationCount() {
        this.locationCount++;
        
        // Store in localStorage for persistence
        localStorage.setItem('liquex_location_count', this.locationCount.toString());
        
        // Update UI if on main hub
        this.updateLocationCountDisplay();
        
        console.log(`Location count increased to: ${this.locationCount}`);
    }

    // Update location count display
    updateLocationCountDisplay() {
        const locationStatus = document.getElementById('location-status');
        if (!locationStatus) return;

        // Find or create location count element
        let countElement = locationStatus.querySelector('.location-count');
        if (!countElement) {
            countElement = document.createElement('div');
            countElement.className = 'location-count';
            locationStatus.appendChild(countElement);
        }
        
        countElement.innerHTML = `
            <div class="location-count-info">
                <i class="fas fa-map-marker-alt"></i>
                <span>Location Count: ${this.locationCount}</span>
            </div>
        `;
    }

    // Update external users list
    updateExternalUsers() {
        if (!this.currentLocation || !window.demoData?.externalUsers) return;

        const externalUsers = window.demoData.externalUsers;
        
        this.externalUsers = externalUsers
            .filter(user => user.username !== this.currentUser?.username)
            .map(user => {
                const distance = this.calculateDistance(
                    this.currentLocation.lat, this.currentLocation.lng,
                    user.location.lat, user.location.lng
                );
                return {
                    ...user,
                    distance: Math.round(distance),
                    isNearby: distance <= this.proximityRange
                };
            })
            .filter(user => user.isNearby)
            .sort((a, b) => a.distance - b.distance);
        
        console.log('External users updated:', this.externalUsers.length);
    }

    stopCrossDeviceSync() {
        if (this.crossDeviceSyncInterval) {
            clearInterval(this.crossDeviceSyncInterval);
            this.crossDeviceSyncInterval = null;
        }
    }

    syncWithOtherDevices() {
        // Check for updates from other devices
        LiquexApp.syncWithOtherDevices();
        
        // Update notification count if on main hub
        if (document.getElementById('main-hub').classList.contains('active')) {
            this.updateNotificationCount();
        }
        
        // Update notifications if on notifications screen
        if (document.getElementById('notifications-screen').classList.contains('active')) {
            this.loadNotifications();
        }
    }

    simulateCrossDeviceRequests() {
        // Simulate requests from other devices using demo data
        if (window.demoData && window.demoData.sampleRequests) {
            const demoRequests = window.demoData.sampleRequests;
            const currentRequests = LiquexApp.getAllRequests();
            
            // Add demo requests that aren't already in the system
            demoRequests.forEach(demoRequest => {
                const exists = currentRequests.find(req => req.id === demoRequest.id);
                if (!exists) {
                    // Simulate adding this request from another device
                    setTimeout(() => {
                        LiquexApp.addGlobalRequest(demoRequest);
                    }, Math.random() * 10000 + 5000); // Random delay between 5-15 seconds
                }
            });
        }
        
        // Simulate users logging in from other devices
        this.simulateOtherDeviceLogins();
    }

    // Simulate users logging in from other devices
    simulateOtherDeviceLogins() {
        if (!window.demoData || !this.currentLocation) return;
        
        // Simulate random user logins from demo data
        const demoUsers = window.demoData.users.filter(user => 
            user.username !== this.currentUser?.username
        );
        
        if (demoUsers.length === 0) return;
        
        // Simulate a random user login every 30-60 seconds
        const simulateLogin = () => {
            const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
            
            // Simulate user login from another device
            LiquexApp.simulateUserLoginFromOtherDevice(randomUser.username, randomUser.location);
            
            // Sometimes simulate them making a request shortly after login
            if (Math.random() < 0.7) { // 70% chance
                setTimeout(() => {
                    this.simulateRequestFromNewUser(randomUser);
                }, Math.random() * 10000 + 5000); // 5-15 seconds after login
            }
            
            // Schedule next simulation
            setTimeout(simulateLogin, Math.random() * 30000 + 30000); // 30-60 seconds
        };
        
        // Start simulation after initial delay
        setTimeout(simulateLogin, Math.random() * 20000 + 10000); // 10-30 seconds
    }

    // Simulate external user logins
    simulateExternalUserLogins() {
        if (!window.demoData?.externalUsers || !this.currentLocation) return;
        
        const externalUsers = window.demoData.externalUsers;
        
        // Simulate external user login every 45-90 seconds
        const simulateExternalLogin = () => {
            const randomExternalUser = externalUsers[Math.floor(Math.random() * externalUsers.length)];
            
            // Simulate external user login
            LiquexApp.handleExternalUserInRange(randomExternalUser, Math.random() * 500 + 100); // 100-600m
            
            // Sometimes simulate them making a request shortly after login
            if (Math.random() < 0.8) { // 80% chance
                setTimeout(() => {
                    this.simulateRequestFromExternalUser(randomExternalUser);
                }, Math.random() * 15000 + 5000); // 5-20 seconds after login
            }
            
            // Schedule next simulation
            setTimeout(simulateExternalLogin, Math.random() * 45000 + 45000); // 45-90 seconds
        };
        
        // Start simulation after initial delay
        setTimeout(simulateExternalLogin, Math.random() * 30000 + 15000); // 15-45 seconds
    }

    // Simulate a request from an external user
    simulateRequestFromExternalUser(externalUser) {
        if (!this.currentLocation) return;
        
        const requestTypes = ['money', 'service', 'goods'];
        const urgencies = ['low', 'medium', 'high'];
        const categories = ['food', 'transport', 'shopping', 'services', 'delivery'];
        
        const newRequest = {
            id: Date.now() + Math.random() * 1000,
            amount: Math.round((Math.random() * 50 + 5) * 100) / 100, // $5-$55
            type: requestTypes[Math.floor(Math.random() * requestTypes.length)],
            description: `External request from ${externalUser.username} - ${this.getRandomRequestDescription()}`,
            urgency: urgencies[Math.floor(Math.random() * urgencies.length)],
            category: categories[Math.floor(Math.random() * categories.length)],
            requester: externalUser.username,
            timestamp: new Date().toISOString(),
            location: externalUser.location,
            userRating: externalUser.rating,
            isExternal: true,
            deviceType: externalUser.deviceType,
            loginSource: externalUser.loginSource
        };
        
        // Add the request globally
        LiquexApp.addGlobalRequest(newRequest);
        
        // Show enhanced notification
        if (this.currentLocation) {
            const distance = this.calculateDistance(
                this.currentLocation.lat, this.currentLocation.lng,
                externalUser.location.lat, externalUser.location.lng
            );
            
            if (distance <= 700) {
                this.showToast(
                    `External user request: $${newRequest.amount} from ${externalUser.username} (${Math.round(distance)}m away)`,
                    'info'
                );
            }
        }
    }

    // Simulate a request from a newly logged-in user
    simulateRequestFromNewUser(user) {
        if (!this.currentLocation) return;
        
        const requestTypes = ['money', 'service', 'goods'];
        const urgencies = ['low', 'medium', 'high'];
        const categories = ['food', 'transport', 'shopping', 'services', 'delivery'];
        
        const newRequest = {
            id: Date.now() + Math.random() * 1000,
            amount: Math.round((Math.random() * 50 + 5) * 100) / 100, // $5-$55
            type: requestTypes[Math.floor(Math.random() * requestTypes.length)],
            description: `Request from ${user.username} - ${this.getRandomRequestDescription()}`,
            urgency: urgencies[Math.floor(Math.random() * urgencies.length)],
            category: categories[Math.floor(Math.random() * categories.length)],
            requester: user.username,
            timestamp: new Date().toISOString(),
            location: user.location,
            userRating: user.rating
        };
        
        // Add the request globally
        LiquexApp.addGlobalRequest(newRequest);
        
        // Show enhanced notification
        if (this.currentLocation) {
            const distance = this.calculateDistance(
                this.currentLocation.lat, this.currentLocation.lng,
                user.location.lat, user.location.lng
            );
            
            if (distance <= 700) {
                this.showToast(
                    `New request from nearby user: $${newRequest.amount} from ${user.username} (${Math.round(distance)}m away)`,
                    'info'
                );
            }
        }
    }

    // Get random request description
    getRandomRequestDescription() {
        const descriptions = [
            'Need help with something urgent',
            'Looking for assistance nearby',
            'Quick favor needed',
            'Emergency situation',
            'Need cash for immediate use',
            'Help with transportation',
            'Service request in the area'
        ];
        return descriptions[Math.floor(Math.random() * descriptions.length)];
    }

    // Check if request is recent (within last 5 minutes)
    isRecentRequestFromNewUser(request) {
        const requestTime = new Date(request.timestamp).getTime();
        const now = Date.now();
        return (now - requestTime) < 300000; // 5 minutes
    }

    // Check if request is from a newly logged-in user
    isFromNewlyLoggedInUser(request) {
        const recentLogins = LiquexApp.getRecentUserLogins();
        const userLogin = recentLogins.find(login => 
            login.username === request.requester
        );
        
        if (!userLogin) return false;
        
        // Check if request was made within 10 minutes of login
        const requestTime = new Date(request.timestamp).getTime();
        const loginTime = userLogin.timestamp;
        return (requestTime - loginTime) < 600000; // 10 minutes
    }

    updateNearbyUsers() {
        if (!this.currentLocation) {
            console.log('No current location available');
            return;
        }

        // Get all users from demo data and calculate distances
        const allUsers = window.demoData ? window.demoData.users : [];
        console.log('All users from demo data:', allUsers.length);
        console.log('Current location:', this.currentLocation);
        
        this.nearbyUsers = allUsers
            .filter(user => user.username !== this.currentUser?.username)
            .map(user => {
                const distance = this.calculateDistance(
                    this.currentLocation.lat, this.currentLocation.lng,
                    user.location.lat, user.location.lng
                );
                console.log(`User ${user.username}: distance = ${Math.round(distance)}m`);
                return {
                    ...user,
                    distance: Math.round(distance),
                    isNearby: distance <= this.proximityRange
                };
            })
            .filter(user => user.isNearby)
            .sort((a, b) => a.distance - b.distance);
        
        console.log('Nearby users found:', this.nearbyUsers.length);
        
        // Update transfer recipient dropdown
        this.populateNearbyUsers();
    }

    updateProximityStatus() {
        const locationStatus = document.getElementById('location-status');
        if (!locationStatus || !this.currentLocation) return;

        const nearbyCount = this.nearbyUsers.length;
        console.log('Updating proximity status:', nearbyCount, 'users nearby');
        
        const proximityStatus = document.createElement('div');
        proximityStatus.className = 'proximity-status';
        proximityStatus.innerHTML = `
            <div class="proximity-info">
                <i class="fas fa-users"></i>
                <span>${nearbyCount} users within ${this.proximityRange}m</span>
            </div>
        `;

        // Update or add proximity status
        const existingStatus = locationStatus.querySelector('.proximity-status');
        if (existingStatus) {
            existingStatus.replaceWith(proximityStatus);
        } else {
            locationStatus.appendChild(proximityStatus);
        }
    }

    checkProximityRequests() {
        if (!this.currentLocation) return;

        // Get all global requests and filter by proximity
        const allRequests = LiquexApp.getAllRequests();
        const proximityRequests = allRequests.filter(request => {
            const distance = this.calculateDistance(
                this.currentLocation.lat, this.currentLocation.lng,
                request.location.lat, request.location.lng
            );
            return distance <= this.proximityRange && request.requester !== this.currentUser?.username;
        });

        // Show proximity notifications
        if (proximityRequests.length > 0) {
            this.showProximityNotification(proximityRequests);
        }
    }

    showProximityNotification(requests) {
        const latestRequest = requests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        const distance = Math.round(this.calculateDistance(
            this.currentLocation.lat, this.currentLocation.lng,
            latestRequest.location.lat, latestRequest.location.lng
        ));

        this.showToast(
            `New request nearby: $${latestRequest.amount} from ${latestRequest.requester} (${distance}m away)`,
            'info'
        );
    }

    // Enhanced transfer with proximity validation
    handleProximityTransfer(recipientUsername, amount, reason, description) {
        // Re-check nearby users to ensure recipient is still in range
        this.updateNearbyUsers();
        const recipient = this.nearbyUsers.find(user => user.username === recipientUsername);
        
        if (!recipient) {
            this.showToast('Recipient is not within proximity range', 'error');
            return false;
        }

        if (recipient.distance > this.proximityRange) {
            this.showToast('Recipient is too far away for proximity transfer', 'error');
            return false;
        }

        // Create proximity transfer request
        const proximityTransfer = {
            id: Date.now(),
            amount: parseFloat(amount),
            recipient: recipientUsername,
            reason: reason,
            description: description,
            sender: this.currentUser.username,
            timestamp: new Date().toISOString(),
            location: this.currentLocation,
            recipientLocation: recipient.location,
            distance: recipient.distance,
            type: 'proximity_transfer',
            status: 'completed' // Mark as completed for demo
        };

        // Add to global proximity transfers
        this.addProximityTransfer(proximityTransfer);
        
        return true;
    }

    addProximityTransfer(transfer) {
        const proximityTransfers = JSON.parse(localStorage.getItem('liquex_proximity_transfers') || '[]');
        proximityTransfers.push(transfer);
        localStorage.setItem('liquex_proximity_transfers', JSON.stringify(proximityTransfers));
    }

    getProximityTransfers() {
        return JSON.parse(localStorage.getItem('liquex_proximity_transfers') || '[]');
    }

    // Simulate real-time proximity updates
    simulateProximityUpdates() {
        if (!this.currentLocation || !window.demoData) return;

        // Simulate users moving around
        window.demoData.users.forEach(user => {
            if (user.username !== this.currentUser?.username) {
                // Add small random movement to simulate real-world location changes
                const movement = 0.0001; // Small movement in degrees
                user.location.lat += (Math.random() - 0.5) * movement;
                user.location.lng += (Math.random() - 0.5) * movement;
                user.lastSeen = new Date().toISOString();
            }
        });

        // Update nearby users list
        this.updateNearbyUsers();
        this.updateProximityStatus();
    }

    // Enhanced proximity notification system
    showProximityAlert(user, distance) {
        const alert = document.createElement('div');
        alert.className = 'proximity-notification';
        alert.innerHTML = `
            <h5><i class="fas fa-map-marker-alt"></i> User Nearby!</h5>
            <p><strong>${user.username}</strong> is ${distance}m away</p>
            <small>Rating: ⭐ ${user.rating} | Transactions: ${user.completedTransactions}</small>
        `;

        document.body.appendChild(alert);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    // Register user login for cross-device sync
    registerUserLogin() {
        if (!this.currentUser || !this.currentLocation) return;
        
        const login = {
            username: this.currentUser.username,
            location: this.currentLocation,
            timestamp: Date.now(),
            deviceId: `device_${Math.random().toString(36).substr(2, 9)}`
        };
        
        // Store recent login
        const recentLogins = JSON.parse(localStorage.getItem('liquex_recent_logins') || '[]');
        recentLogins.push(login);
        
        // Keep only last 10 logins
        if (recentLogins.length > 10) {
            recentLogins.splice(0, recentLogins.length - 10);
        }
        
        localStorage.setItem('liquex_recent_logins', JSON.stringify(recentLogins));
        
        // Trigger cross-device sync
        LiquexApp.checkForNewUserLogins();
    }

    // Mock Data for Demo
    loadMockData() {
        // Add some sample notifications for demo purposes
        this.notifications = [
            {
                id: 1,
                amount: 25.50,
                type: 'money',
                description: 'Need cash for lunch',
                requester: 'John Doe',
                timestamp: new Date(Date.now() - 300000).toISOString(),
                location: { lat: 40.7128, lng: -74.0060 },
                urgency: 'medium',
                category: 'food',
                userRating: 4.8
            },
            {
                id: 2,
                amount: 15.00,
                type: 'service',
                description: 'Help with grocery shopping',
                requester: 'Jane Smith',
                timestamp: new Date(Date.now() - 600000).toISOString(),
                location: { lat: 40.7128, lng: -74.0060 },
                urgency: 'low',
                category: 'shopping',
                userRating: 4.9
            },
            {
                id: 3,
                amount: 50.00,
                type: 'money',
                description: 'Emergency cash needed for taxi fare',
                requester: 'Mike Johnson',
                timestamp: new Date(Date.now() - 900000).toISOString(),
                location: { lat: 40.7125, lng: -74.0062 },
                urgency: 'high',
                category: 'transport',
                userRating: 4.7
            }
        ];
        
        // Load demo data from demo-data.js if available
        if (window.demoData) {
            this.notifications = window.demoData.sampleRequests;
            this.transactionHistory = window.demoData.transactionHistory;
        }

        // Load location count from localStorage
        const savedLocationCount = localStorage.getItem('liquex_location_count');
        if (savedLocationCount) {
            this.locationCount = parseInt(savedLocationCount);
        }

        // Load external user logins from localStorage
        const savedExternalLogins = localStorage.getItem('liquex_external_user_logins');
        if (savedExternalLogins) {
            this.externalUserLogins = JSON.parse(savedExternalLogins);
        }
    }

    // Test proximity features
    testProximityFeatures() {
        console.log('Testing proximity features...');
        
        // Test distance calculation
        const testDistance = this.calculateDistance(16.922251, 82.000117, 16.922251, 82.000117);
        console.log('Test distance calculation (same coordinates):', testDistance, 'meters');
        
        // Test nearby users detection
        if (this.currentLocation) {
            console.log('Current location:', this.currentLocation);
            const nearbyUsers = this.getNearbyUsers();
            console.log('Nearby users found:', nearbyUsers.length);
            nearbyUsers.forEach(user => {
                console.log(`- ${user.username}: ${user.distance}m away`);
            });
        } else {
            console.log('No current location set');
        }
        
        // Test proximity transfer
        if (this.nearbyUsers.length > 0) {
            const testUser = this.nearbyUsers[0];
            console.log('Testing proximity transfer to:', testUser.username);
            const success = this.handleProximityTransfer(testUser.username, 10, 'test', 'Proximity test transfer');
            console.log('Proximity transfer result:', success);
        }
        
        console.log('Proximity features test completed');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.liquexApp = new LiquexApp();
    
    // Add test method to global scope for debugging
    window.testProximity = () => window.liquexApp.testProximityFeatures();
    window.triggerProximity = () => triggerProximityDetection();
    window.simulateCrossDeviceLogin = () => simulateCrossDeviceUserLogin();
    window.simulateCrossDeviceRequest = () => simulateCrossDeviceMoneyRequest();
    window.simulateExternalLogin = () => simulateExternalUserLogin();
    window.simulateExternalRequest = () => simulateExternalUserRequest();
    window.testExternalFeatures = () => testExternalUserFeatures();
});

// Add some additional utility functions
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance * 1000; // Convert to meters
}

// Manual proximity detection trigger for testing
function triggerProximityDetection() {
    if (window.liquexApp) {
        console.log('Manually triggering proximity detection...');
        window.liquexApp.updateNearbyUsers();
        window.liquexApp.updateProximityStatus();
        console.log('Proximity detection triggered');
    } else {
        console.log('LiquexApp not available');
    }
}

// Simulate real-time location updates
setInterval(() => {
    if (window.liquexApp && window.liquexApp.currentLocation) {
        // Simulate small location changes for demo
        const change = (Math.random() - 0.5) * 0.0001;
        window.liquexApp.currentLocation.lat += change;
        window.liquexApp.currentLocation.lng += change;
    }
}, 30000); // Update every 30 seconds

// Manual simulation functions for testing cross-device functionality
function simulateCrossDeviceUserLogin() {
    if (!window.liquexApp || !window.demoData) {
        console.log('App or demo data not available');
        return;
    }
    
    const demoUsers = window.demoData.users.filter(user => 
        user.username !== window.liquexApp.currentUser?.username
    );
    
    if (demoUsers.length === 0) {
        console.log('No demo users available for simulation');
        return;
    }
    
    const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
    console.log(`Simulating login from: ${randomUser.username}`);
    
    LiquexApp.simulateUserLoginFromOtherDevice(randomUser.username, randomUser.location);
}

function simulateCrossDeviceMoneyRequest() {
    if (!window.liquexApp || !window.demoData) {
        console.log('App or demo data not available');
        return;
    }
    
    const demoUsers = window.demoData.users.filter(user => 
        user.username !== window.liquexApp.currentUser?.username
    );
    
    if (demoUsers.length === 0) {
        console.log('No demo users available for simulation');
        return;
    }
    
    const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
    console.log(`Simulating money request from: ${randomUser.username}`);
    
    window.liquexApp.simulateRequestFromNewUser(randomUser);
}

// Manual simulation functions for testing external user functionality
function simulateExternalUserLogin() {
    if (!window.liquexApp || !window.demoData?.externalUsers) {
        console.log('App or external users data not available');
        return;
    }
    
    const externalUsers = window.demoData.externalUsers;
    const randomExternalUser = externalUsers[Math.floor(Math.random() * externalUsers.length)];
    
    console.log(`Simulating external user login from: ${randomExternalUser.username}`);
    
    // Simulate external user login
    LiquexApp.handleExternalUserInRange(randomExternalUser, Math.random() * 500 + 100);
}

function simulateExternalUserRequest() {
    if (!window.liquexApp || !window.demoData?.externalUsers) {
        console.log('App or external users data not available');
        return;
    }
    
    const externalUsers = window.demoData.externalUsers;
    const randomExternalUser = externalUsers[Math.floor(Math.random() * externalUsers.length)];
    
    console.log(`Simulating external user request from: ${randomExternalUser.username}`);
    
    window.liquexApp.simulateRequestFromExternalUser(randomExternalUser);
}

function testExternalUserFeatures() {
    if (!window.liquexApp) {
        console.log('App not available');
        return;
    }
    
    console.log('Testing external user features...');
    console.log('Current location count:', window.liquexApp.locationCount);
    console.log('External users detected:', window.liquexApp.externalUsers.length);
    console.log('External user logins:', window.liquexApp.externalUserLogins.length);
    
    // Test external user detection
    window.liquexApp.detectExternalUsers();
    
    // Test location count increment
    window.liquexApp.incrementLocationCount();
    
    console.log('External user features test completed');
}
