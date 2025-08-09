# Aura BreatheWell - Wellness & Breathing Application

## Overview

Aura BreatheWell is a Progressive Web App (PWA) focused on wellness through guided breathing exercises and environmental awareness. The application provides personalized breathing techniques, progress tracking, and environmental insights to support users' mental and physical wellbeing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Vanilla HTML5, CSS3, and JavaScript
- **Design Pattern**: Multi-page application with modular JavaScript controllers
- **Styling Approach**: CSS custom properties (CSS variables) with responsive design
- **PWA Features**: Service worker for offline functionality, web app manifest for installability

### Component Structure
The application follows a modular architecture with separate controllers for different functionalities:
- **Main App Controller** (`app.js`): Central orchestrator managing initialization and navigation
- **Breathing Controller** (`breathing.js`): Handles breathing exercises and sessions
- **Analytics Controller** (`analytics.js`): Manages progress tracking and data visualization
- **Authentication Controller** (`auth.js`): Handles user authentication and session management
- **Firebase Config** (`firebase-config.js`): Prepared for Firebase integration with offline fallback

### User Interface
- **Responsive Design**: Mobile-first approach with breakpoint-based responsiveness
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Accessibility**: Semantic HTML structure with ARIA labels and keyboard navigation support

## Key Components

### Core Pages
1. **Main Application** (`index.html`): Primary breathing interface with exercise selection
2. **Dashboard** (`dashboard.html`): Analytics and progress tracking interface
3. **Profile Management** (`profile.html`): User profile and personal settings
4. **Settings** (`settings.html`): Application preferences and configuration
5. **Authentication** (`auth.html`): Sign-in and registration interface
6. **Onboarding** (`onboarding.html`): First-time user experience

### JavaScript Modules
- **Breathing System**: Multiple breathing patterns (calm, energy, focus, sleep) with visual guidance
- **Progress Tracking**: Session analytics with Chart.js integration for data visualization
- **User Management**: Profile management with local storage persistence
- **Environmental Integration**: Weather and air quality API integration (prepared)

### Styling System
- **CSS Architecture**: Custom properties for consistent theming and easy customization
- **Component-based Styles**: Modular CSS with clear separation of concerns
- **Responsive Framework**: Comprehensive breakpoint system for all device sizes

## Data Flow

### Client-Side Data Management
- **Local Storage**: Primary data persistence for offline functionality
- **Session Management**: Real-time session tracking with progress persistence
- **Cache Strategy**: Service worker implements cache-first strategy for static assets

### Prepared Integrations
- **Firebase Authentication**: Ready for user account management
- **Firestore Database**: Prepared for cloud data synchronization
- **Weather APIs**: OpenWeatherMap integration for environmental data

### Data Structure
```javascript
// User session data structure
{
  sessions: [{
    type: 'calm|energy|focus|sleep',
    duration: number,
    timestamp: Date,
    cyclesCompleted: number
  }],
  profile: {
    preferences: {},
    goals: {},
    achievements: []
  }
}
```

## External Dependencies

### CDN Dependencies
- **Font Awesome 6.0.0**: Icon library for UI elements
- **Chart.js**: Data visualization for analytics dashboard
- **Firebase SDK**: Prepared for authentication and database services

### API Integrations (Prepared)
- **OpenWeatherMap API**: Weather data and air quality information
- **Firebase Services**: Authentication, Firestore, and Analytics

### Browser APIs
- **Service Worker API**: Offline functionality and caching
- **Web App Manifest**: PWA installability
- **Local Storage API**: Client-side data persistence
- **Geolocation API**: Location-based environmental data

## Deployment Strategy

### Progressive Web App Features
- **Offline-First Design**: Core functionality available without internet connection
- **App Shell Architecture**: Fast loading with cached application shell
- **Service Worker Caching**: Static assets cached for offline access
- **Manifest Configuration**: Installable on mobile devices and desktops

### Hosting Requirements
- **Static File Hosting**: Application can be deployed to any static hosting service
- **HTTPS Required**: Necessary for PWA features and service worker functionality
- **CDN Integration**: External dependencies loaded from CDNs with fallbacks

### Environment Configuration
- **Development Mode**: Local development with hot reloading capabilities
- **Production Optimization**: Minified assets and optimized caching strategies
- **Firebase Integration**: Environment variables for API keys and configuration

### Performance Considerations
- **Lazy Loading**: Non-critical resources loaded on demand
- **Code Splitting**: Modular JavaScript architecture for optimized loading
- **Image Optimization**: Responsive images with appropriate formats
- **Caching Strategy**: Comprehensive service worker caching for optimal performance

The application is designed to work immediately as a static web application while being fully prepared for enhanced functionality through Firebase integration and external API services.