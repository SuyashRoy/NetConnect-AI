# Net Connect AI - Telecom Offerings Finder

## Project Overview

Net Connect AI is a modern, responsive web application that helps users discover telecom offerings available in their residential area. The platform features a clean, intuitive interface with two main sections: a search page for address input and an offerings page displaying available services with interactive map integration.

## Key Features Implemented

### 🔍 Search Page (Tab 1)
- **Prominent Header**: "Net Connect AI" title with WiFi icon branding
- **Address Input**: Comprehensive search bar with validation
- **User Experience**: Clean, modern design with gradient backgrounds
- **Feature Preview**: Three service category cards (Internet, Mobile, TV & Cable)
- **Loading States**: Smooth loading animation during search processing

### 📍 Offerings Page (Tab 2)
- **Interactive Map**: OpenStreetMap integration with location markers
- **Service Listings**: Card-based layout showing telecom offerings
- **Detailed Information**: Each offering includes:
  - Service type (Internet, Mobile, TV & Cable)
  - Speed/capacity specifications
  - Monthly pricing
  - Customer ratings (star system)
  - Key features and benefits
  - Availability status
- **Navigation**: Easy return to search page

### 🌓 Dark/Light Mode Toggle
- **Persistent Theme**: User preference saved to localStorage
- **System Integration**: Respects user's system color scheme preference
- **Smooth Transitions**: Animated theme switching
- **Complete Coverage**: All components adapt to selected theme

### 📱 Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Flexible Layout**: Grid system adapts from mobile to desktop
- **Touch-Friendly**: Appropriate button sizes and spacing
- **Cross-Platform**: Works seamlessly on desktop and mobile devices

## Technical Implementation

### Frontend Framework
- **React 19.1.0**: Modern React with hooks and functional components
- **React Router**: Client-side routing between search and offerings pages
- **Vite**: Fast build tool and development server

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **shadcn/ui**: High-quality, accessible UI components
- **Lucide Icons**: Consistent iconography throughout the application
- **Custom Animations**: Smooth transitions and hover effects

### Map Integration
- **Leaflet**: Open-source mapping library
- **React-Leaflet**: React components for Leaflet maps
- **OpenStreetMap**: Free, open-source map tiles
- **Interactive Features**: Zoom controls, markers, and popups

### Data Management
- **Mock Data**: Comprehensive telecom offerings database
- **Address Validation**: Client-side validation with error handling
- **State Management**: React hooks for application state
- **Local Storage**: Theme preference persistence

## Application Flow

1. **Landing**: User arrives at the search page
2. **Address Entry**: User enters their residential address
3. **Validation**: System validates address format and completeness
4. **Processing**: Loading state while "searching" for offerings
5. **Results**: Navigation to offerings page with map and service listings
6. **Exploration**: User can view detailed service information
7. **Navigation**: Easy return to search for new address

## Mock Data Features

The application includes realistic mock data for demonstration:

### Internet Services
- **FiberMax Pro**: 1 Gbps fiber internet ($79.99/month)
- **SpeedNet Basic**: 100 Mbps broadband ($39.99/month)

### Mobile Services
- **ConnectMobile Plus**: 5G network with 50GB data ($65/month)
- **MegaMobile Family**: Family plan with 4 lines ($120/month)

### TV & Cable
- **StreamTV Ultimate**: 300+ channels with premium content ($89.99/month)

Each service includes detailed features, ratings, and availability status.

## Address Geocoding

The application includes a mock geocoding system that recognizes major US cities:
- New York, Los Angeles, Chicago, Houston, Phoenix
- Philadelphia, San Antonio, San Diego, Dallas, San Jose
- Defaults to New York coordinates for unrecognized locations

## Deployment

The application has been built for production and is ready for deployment. The build includes:
- Optimized JavaScript bundles
- Compressed CSS assets
- Static file optimization
- Production-ready configuration

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile, Samsung Internet
- **Features**: Full ES6+ support, CSS Grid, Flexbox

## Performance Optimizations

- **Code Splitting**: Automatic route-based code splitting
- **Asset Optimization**: Compressed images and minified code
- **Lazy Loading**: Components loaded on demand
- **Caching**: Browser caching for static assets

## Future Enhancement Opportunities

1. **Real API Integration**: Connect to actual telecom provider APIs
2. **Advanced Filtering**: Filter by price, speed, provider
3. **Comparison Tool**: Side-by-side service comparison
4. **User Accounts**: Save preferences and favorite services
5. **Reviews System**: User-generated reviews and ratings
6. **Availability Checker**: Real-time service availability
7. **Price Alerts**: Notifications for price changes or new offers

## Development Notes

- **Component Structure**: Modular, reusable components
- **State Management**: Clean separation of concerns
- **Error Handling**: Graceful error states and user feedback
- **Accessibility**: Semantic HTML and ARIA labels
- **Code Quality**: ESLint configuration and best practices

The application successfully meets all specified requirements and provides a solid foundation for a production telecom offerings platform.

