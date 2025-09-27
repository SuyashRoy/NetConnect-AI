# NetConnect AI - Telecom Offerings Finder

A modern React application that helps users find the best telecom offerings (internet, mobile, and cable services) available in their area.

## Features

- 🏠 **Address-Based Search**: Enter your address to find telecom services in your area
- 🌐 **Multiple Service Types**: Internet, Mobile, and TV/Cable offerings
- 🗺️ **Interactive Map**: Visual location display with Leaflet maps
- 🌙 **Dark/Light Mode**: Toggle between themes with preference saving
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Fast Performance**: Built with Vite for lightning-fast development
- 🎨 **Modern UI**: Styled with Tailwind CSS and custom components

## Technologies Used

- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Leaflet** - Interactive maps
- **Lucide React** - Beautiful icons
- **TypeScript Support** - Type-safe development

## Getting Started

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd NetConnect-AI
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   ├── SearchPage.jsx      # Address search page
│   ├── OfferingsPage.jsx   # Telecom offerings display
│   └── ui/                 # Reusable UI components
│       ├── button.jsx
│       ├── card.jsx
│       ├── input.jsx
│       └── badge.jsx
├── lib/
│   └── utils.js           # Utility functions
├── App.jsx                # Main application component
├── main.jsx              # Application entry point
└── index.css             # Global styles and Tailwind imports
```

## Usage

1. **Enter Address**: Start by entering your complete address on the home page
2. **View Offerings**: Browse available telecom services for your location
3. **Interactive Map**: See your location on the map
4. **Service Details**: View pricing, features, and ratings for each service
5. **Dark Mode**: Toggle between light and dark themes using the button in the top-right

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
NetConnect AI is a RAG implemented to be a one stop shop regarding broadband offerings in the user's residential area.
