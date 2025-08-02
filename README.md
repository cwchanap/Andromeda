# Andromeda 3D Solar System Explorer

An immersive educational platform for exploring our solar system in stunning 3D, built with cutting-edge web technologies.

[![CI/CD Status](https://github.com/username/andromeda/workflows/CI/badge.svg)](https://github.com/username/andromeda/actions)
[![Test Coverage](https://codecov.io/gh/username/andromeda/branch/main/graph/badge.svg)](https://codecov.io/gh/username/andromeda)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Performance](https://img.shields.io/badge/Lighthouse-100%2F100-brightgreen.svg)](https://lighthouse-dot-webdotdevsite.appspot.com/)

## 🌌 Features

- **Interactive 3D Solar System**: Explore planets, moons, and celestial bodies in real-time 3D
- **AI-Powered Learning Assistant**: Get contextual explanations and educational guidance
- **Multi-System Universe**: Extensible architecture supporting multiple star systems
- **Accessibility First**: Full keyboard navigation, screen reader support, and WCAG compliance
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Performance Optimized**: Adaptive quality settings and efficient 3D rendering
- **Plugin System**: Extensible architecture for adding custom star systems and features

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern browser with WebGL support

### Installation

```bash
# Clone the repository
git clone https://github.com/username/andromeda.git
cd andromeda

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) to view the application.

### Environment Setup

Create a `.env` file in the root directory:

```bash
# AI Assistant (optional)
OPENAI_API_KEY=your-openai-api-key

# Performance monitoring (optional)
PUBLIC_SENTRY_DSN=your-sentry-dsn
```

## 🏗️ Architecture

### Technology Stack

- **Frontend**: [Astro](https://astro.build/) + [Svelte](https://svelte.dev/)
- **3D Graphics**: [Three.js](https://threejs.org/) with WebGL
- **State Management**: Svelte stores with reactive updates
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom space themes
- **AI Integration**: OpenAI GPT for educational assistance
- **Testing**: Vitest (unit) + Playwright (e2e)
- **Build Tool**: Vite with optimizations for 3D assets

### Core Components

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI library components
│   └── *.svelte         # Feature-specific components
├── lib/                 # Core business logic
│   ├── solar-system/    # 3D rendering and physics
│   ├── universe/        # Multi-system management
│   └── performance/     # Optimization utilities
├── stores/              # Application state management
├── data/                # Celestial body data and configurations
├── pages/               # Astro pages and API routes
└── types/               # TypeScript type definitions
```

## 🎮 Usage

### Navigation Controls

- **Mouse**: Click and drag to rotate the view
- **Scroll**: Zoom in and out
- **Click**: Select celestial bodies for detailed information
- **Keyboard**: Use arrow keys for navigation (accessibility mode)

### AI Assistant

Ask questions about celestial bodies, space phenomena, or request explanations:

- "Tell me about Jupiter's moons"
- "How far is Mars from Earth?"
- "Explain what causes seasons on Earth"

### System Selection

Switch between different star systems using the system selector:

1. Click the system selector button
2. Choose from available star systems
3. Experience smooth transitions between systems

## 🧪 Testing

### Running Tests

```bash
# Unit tests (watch mode)
npm run test

# Unit tests (single run)
npm run test:run

# Unit tests with UI
npm run test:ui

# Unit tests with coverage
npm run test:coverage

# End-to-end tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# E2E smoke tests only
npm run test:e2e:smoke

# Run all tests (CI mode)
npm run test:all

# Full CI pipeline locally
npm run ci:test
```

### Test Structure

- **Unit Tests**: Component logic, utilities, and data validation
- **Integration Tests**: Component interactions and store updates  
- **E2E Tests**: Complete user journeys and accessibility compliance
- **Smoke Tests**: Critical path testing for fast feedback
- **Performance Tests**: 3D rendering performance and memory usage

### Continuous Integration

Tests automatically run on:
- **Push to main**: Full test suite including unit tests, E2E tests, and build verification
- **Pull Requests**: Quality gate with linting, type checking, coverage reporting, and smoke tests
- **Scheduled**: Weekly dependency updates via Dependabot

## 📱 Device Support

### Desktop
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Minimum: 4GB RAM, dedicated graphics recommended
- Optimal: 8GB+ RAM, modern GPU

### Mobile
- iOS Safari 14+, Chrome Mobile 90+
- Minimum: 3GB RAM, OpenGL ES 3.0
- Adaptive quality settings for optimal performance

### Accessibility
- Full keyboard navigation support
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- High contrast mode available
- Reduced motion options for vestibular disorders

## 🔌 Plugin Development

Extend Andromeda with custom star systems and features:

```typescript
// Example plugin structure
export default class MyStarSystemPlugin implements GamePlugin {
  id = 'my-star-system'
  name = 'Custom Star System'
  version = '1.0.0'
  
  async initialize(context: PluginContext) {
    // Initialize your custom system
  }
  
  provideSystems(): StarSystemData[] {
    return [myCustomSystem]
  }
}
```

See the [Extension Development Guide](./docs/extensions/README.md) for detailed documentation.

## 📊 Performance

### Optimization Features

- **Adaptive Quality**: Automatically adjusts rendering quality based on device capabilities
- **Level of Detail (LOD)**: Reduces geometry complexity for distant objects
- **Texture Compression**: Optimized texture formats for faster loading
- **Asset Streaming**: Progressive loading of 3D models and textures
- **Memory Management**: Efficient disposal of unused resources

### Performance Targets

- **Desktop**: 60 FPS at 1080p with high quality settings
- **Mobile**: 30+ FPS with adaptive quality
- **Loading Time**: < 3 seconds initial load, < 1 second system transitions
- **Memory Usage**: < 512MB peak usage on desktop, < 256MB on mobile

## 🔒 Security

### Security Measures

- Content Security Policy (CSP) implementation
- Input sanitization for AI interactions
- Rate limiting on API endpoints
- Secure handling of API keys
- Regular dependency security audits

### Privacy

- No personal data collection without consent
- AI conversations are not stored permanently
- Optional analytics with user control
- GDPR and CCPA compliance ready

## 🚀 Deployment

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

### Deployment Options

- **Vercel**: Zero-config deployment with edge functions
- **Netlify**: Static site hosting with serverless functions
- **Docker**: Containerized deployment for any platform
- **Kubernetes**: Scalable cluster deployment

See the [Deployment Guide](./docs/deployment/README.md) for detailed instructions.

## 📚 Documentation

### Complete Documentation

- [API Reference](./docs/api/README.md) - Component and service APIs
- [Component Guide](./docs/components/README.md) - UI component documentation
- [Data Structures](./docs/data-structures/README.md) - Type definitions and data models
- [Extension Development](./docs/extensions/README.md) - Plugin creation guide
- [Testing Guide](./docs/testing/README.md) - Testing strategies and examples
- [Deployment Guide](./docs/deployment/README.md) - Production deployment

### Key Concepts

- **Celestial Bodies**: Objects in space (planets, moons, stars, asteroids)
- **Solar Systems**: Collections of celestial bodies orbiting a central star
- **Universe**: Container for multiple star systems with navigation
- **Plugins**: Extensions that add new systems, features, or UI components

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure all tests pass (`npm run test:all`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- TypeScript strict mode enabled
- ESLint and Prettier for code formatting
- Comprehensive test coverage required
- Accessibility compliance mandatory
- Performance impact assessment for 3D changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♀️ Support

### Getting Help

- **Documentation**: Check the `/docs` directory for comprehensive guides
- **Issues**: Report bugs or request features on GitHub Issues
- **Discussions**: Join community discussions on GitHub Discussions
- **Discord**: Join our Discord server for real-time chat

### Troubleshooting

#### Common Issues

**WebGL not supported**: Ensure your browser supports WebGL 2.0 and hardware acceleration is enabled.

**Performance issues**: Try reducing quality settings or enabling performance mode in the settings panel.

**AI assistant not working**: Verify your OpenAI API key is correctly configured in environment variables.

**3D models not loading**: Check network connectivity and ensure CDN assets are accessible.

## 🏆 Acknowledgments

- **Three.js Community** for the incredible 3D graphics library
- **Astro Team** for the innovative web framework
- **Svelte Team** for the reactive UI framework
- **NASA** for inspiration and reference materials
- **Contributors** who make this project possible

## 🗺️ Roadmap

### Current Version (1.0.0)
- ✅ Complete solar system exploration
- ✅ AI-powered educational assistant
- ✅ Multi-system universe architecture
- ✅ Comprehensive accessibility support
- ✅ Performance optimization
- ✅ Plugin system foundation

### Upcoming Features (1.1.0)
- 🔄 VR/AR support for immersive exploration
- 🔄 Multiplayer collaboration features  
- 🔄 Advanced physics simulations
- 🔄 Educational quiz system
- 🔄 Custom system builder
- 🔄 Mobile app versions

### Future Vision (2.0.0)
- 🔮 Real-time astronomical data integration
- 🔮 Machine learning for personalized education
- 🔮 Advanced visualization techniques
- 🔮 Extended universe with galaxies
- 🔮 Professional educator tools
- 🔮 Community-driven content platform

---

**Explore the cosmos with Andromeda - Where education meets exploration! 🌟**
