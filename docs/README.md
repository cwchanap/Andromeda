# Andromeda - 3D Solar System Explorer

An educational 3D space exploration application built with Astro, Svelte, and Three.js, featuring immersive solar system navigation and AI-powered learning assistance.

## Overview

Andromeda provides an interactive 3D environment for exploring solar systems, with extensible architecture supporting multiple star systems, accessibility features, and performance optimization.

## Architecture

### Core Components

- **Frontend Framework**: Astro with Svelte components
- **3D Rendering**: Three.js with WebGL
- **State Management**: Svelte stores with reactive updates
- **AI Integration**: OpenAI-powered chatbot assistance
- **Extension System**: Plugin-based architecture for adding new star systems

### Key Features

- 🌌 Interactive 3D solar system exploration
- 🤖 AI chatbot for educational guidance
- ♿ Comprehensive accessibility support
- 📱 Responsive design for all devices
- 🔌 Extensible plugin system
- ⚡ Performance-optimized rendering
- 🎨 Customizable visual themes

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern browser with WebGL support

### Installation

```bash
npm install
npm run dev
```

### Building for Production

```bash
npm run build
npm run preview
```

## Documentation Structure

- [`/api`](./api/README.md) - Component and service APIs
- [`/components`](./components/README.md) - UI component documentation
- [`/data-structures`](./data-structures/README.md) - Data models and types
- [`/extensions`](./extensions/README.md) - Plugin development guide
- [`/testing`](./testing/README.md) - Testing strategies and examples
- [`/deployment`](./deployment/README.md) - Deployment and configuration

## Extension Development

The extensible architecture allows developers to add new star systems, celestial bodies, and interactive features through a plugin system.

See the [Extensions Guide](./extensions/README.md) for detailed information on creating custom plugins.

## Testing

Comprehensive test coverage including:

- Unit tests with Vitest
- End-to-end tests with Playwright
- Performance and accessibility testing
- Visual regression testing

See the [Testing Guide](./testing/README.md) for running and writing tests.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
