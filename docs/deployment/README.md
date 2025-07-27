# Deployment and Configuration Guide

Comprehensive guide for deploying and configuring the Andromeda 3D Solar System Explorer in production environments.

## Production Build

### Building for Production

```bash
# Install dependencies
npm ci

# Run type checking
npm run type-check

# Run tests
npm run test:all

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Build Configuration

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config'
import svelte from '@astrojs/svelte'
import node from '@astrojs/node'

export default defineConfig({
  integrations: [svelte()],
  output: 'hybrid', // Enable both static and server-side rendering
  adapter: node({
    mode: 'standalone'
  }),
  
  build: {
    // Optimize assets
    assets: '_astro',
    inlineStylesheets: 'auto',
    
    // Split large chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'svelte': ['svelte'],
          'ai': ['openai']
        }
      }
    }
  },
  
  vite: {
    build: {
      // Increase chunk size warning limit for 3D assets
      chunkSizeWarningLimit: 2000,
      
      // Optimize for production
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    
    // Asset optimization
    assetsInclude: ['**/*.hdr', '**/*.ktx2'],
    
    define: {
      'process.env.NODE_ENV': JSON.stringify('production')
    }
  },
  
  // Security headers
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  }
})
```

## Environment Configuration

### Environment Variables

```bash
# .env.production
NODE_ENV=production
PUBLIC_APP_VERSION=1.0.0
PUBLIC_API_BASE_URL=https://api.andromeda.space
PUBLIC_ASSETS_URL=https://cdn.andromeda.space
PUBLIC_SENTRY_DSN=https://your-sentry-dsn

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORGANIZATION=your-org-id

# Performance Monitoring  
PUBLIC_ENABLE_ANALYTICS=true
PUBLIC_PERFORMANCE_MONITORING=true

# Feature Flags
PUBLIC_ENABLE_AI_ASSISTANT=true
PUBLIC_ENABLE_MULTI_SYSTEMS=true
PUBLIC_ENABLE_PLUGIN_SYSTEM=false

# Security
ALLOWED_ORIGINS=https://andromeda.space,https://www.andromeda.space
CSP_NONCE_HEADER=x-csp-nonce
```

### Runtime Configuration

```typescript
// src/config/production.ts
export const productionConfig = {
  app: {
    name: 'Andromeda',
    version: process.env.PUBLIC_APP_VERSION || '1.0.0',
    environment: 'production'
  },
  
  api: {
    baseUrl: process.env.PUBLIC_API_BASE_URL || 'https://api.andromeda.space',
    timeout: 30000,
    retries: 3
  },
  
  assets: {
    baseUrl: process.env.PUBLIC_ASSETS_URL || 'https://cdn.andromeda.space',
    cacheTTL: 86400 // 24 hours
  },
  
  performance: {
    enableMetrics: process.env.PUBLIC_PERFORMANCE_MONITORING === 'true',
    sampleRate: 0.1,
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    targetFPS: 60
  },
  
  graphics: {
    defaultQuality: 'medium',
    enableAdaptiveQuality: true,
    maxTextureSizeMobile: 1024,
    maxTextureSizeDesktop: 2048
  },
  
  ai: {
    enabled: process.env.PUBLIC_ENABLE_AI_ASSISTANT === 'true',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    maxTokens: 500,
    temperature: 0.7
  },
  
  logging: {
    level: 'warn',
    enableRemoteLogging: true,
    sentryDsn: process.env.PUBLIC_SENTRY_DSN
  }
}
```

## Deployment Platforms

### Vercel Deployment

```json
// vercel.json
{
  "framework": "astro",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  
  "functions": {
    "src/pages/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options", 
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  
  "redirects": [
    {
      "source": "/solar-system",
      "destination": "/",
      "permanent": false
    }
  ],
  
  "rewrites": [
    {
      "source": "/api/ai/(.*)",
      "destination": "/api/ai/$1"
    }
  ]
}
```

### Netlify Deployment

```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"
  NPM_FLAGS = "--prefix=/dev/null"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[redirects]]
  from = "/solar-system"
  to = "/"
  status = 302

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[plugins]]
  package = "@netlify/plugin-lighthouse"
  
  [plugins.inputs.audits]
    performance = true
    accessibility = true
    best-practices = true
    seo = true
    
  [plugins.inputs.settings]
    emulatedFormFactor = "mobile"
    throttling = "mobileSlow4G"
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run astro
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 astro

# Copy the built application
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/package.json ./package.json

USER astro

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "./dist/server/entry.mjs"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  andromeda:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PUBLIC_API_BASE_URL=https://api.andromeda.space
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - andromeda
    restart: unless-stopped
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: andromeda-app
  labels:
    app: andromeda
spec:
  replicas: 3
  selector:
    matchLabels:
      app: andromeda
  template:
    metadata:
      labels:
        app: andromeda
    spec:
      containers:
      - name: andromeda
        image: andromeda:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: andromeda-secrets
              key: openai-api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: andromeda-service
spec:
  selector:
    app: andromeda
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: andromeda-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - andromeda.space
    secretName: andromeda-tls
  rules:
  - host: andromeda.space
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: andromeda-service
            port:
              number: 80
```

## Performance Optimization

### Asset Optimization

```typescript
// src/lib/asset-optimization.ts
export class AssetOptimizer {
  private static readonly CDN_BASE = process.env.PUBLIC_ASSETS_URL || '/assets'
  
  static optimizeTexture(url: string, devicePixelRatio: number = 1): string {
    const quality = this.getQualityLevel()
    const size = this.getOptimalTextureSize(devicePixelRatio)
    
    return `${this.CDN_BASE}/textures/${quality}/${size}/${url}`
  }
  
  static preloadCriticalAssets(): Promise<void[]> {
    const criticalAssets = [
      '/textures/sun.jpg',
      '/textures/earth.jpg',
      '/models/solar-system-base.glb'
    ]
    
    return Promise.all(
      criticalAssets.map(asset => this.preloadAsset(asset))
    )
  }
  
  private static getQualityLevel(): 'low' | 'medium' | 'high' {
    const connection = (navigator as any).connection
    const deviceMemory = (navigator as any).deviceMemory || 4
    
    if (connection?.effectiveType === '2g' || deviceMemory < 2) {
      return 'low'
    } else if (connection?.effectiveType === '3g' || deviceMemory < 4) {
      return 'medium'
    }
    
    return 'high'
  }
  
  private static getOptimalTextureSize(devicePixelRatio: number): number {
    const isMobile = window.innerWidth < 768
    const baseSize = isMobile ? 512 : 1024
    
    return Math.min(baseSize * devicePixelRatio, 2048)
  }
  
  private static preloadAsset(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = url
      link.as = this.getAssetType(url)
      link.onload = () => resolve()
      link.onerror = reject
      document.head.appendChild(link)
    })
  }
  
  private static getAssetType(url: string): string {
    if (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.webp')) {
      return 'image'
    } else if (url.endsWith('.glb') || url.endsWith('.gltf')) {
      return 'fetch'
    }
    return 'fetch'
  }
}
```

### CDN Configuration

```javascript
// CloudFlare Workers configuration
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    
    // Cache static assets for 1 year
    if (url.pathname.startsWith('/assets/')) {
      const response = await fetch(request)
      const newResponse = new Response(response.body, response)
      
      newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      newResponse.headers.set('Vary', 'Accept-Encoding')
      
      return newResponse
    }
    
    // Cache API responses for 5 minutes
    if (url.pathname.startsWith('/api/')) {
      const cacheKey = new Request(url.toString(), request)
      const cache = caches.default
      
      let response = await cache.match(cacheKey)
      
      if (!response) {
        response = await fetch(request)
        
        if (response.status === 200) {
          const newResponse = new Response(response.body, response)
          newResponse.headers.set('Cache-Control', 'public, max-age=300')
          
          await cache.put(cacheKey, newResponse.clone())
          return newResponse
        }
      }
      
      return response
    }
    
    return fetch(request)
  }
}
```

## Monitoring and Analytics

### Application Monitoring

```typescript
// src/lib/monitoring.ts
import * as Sentry from '@sentry/browser'
import { BrowserTracing } from '@sentry/tracing'

export function initializeMonitoring() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.PUBLIC_SENTRY_DSN,
      integrations: [
        new BrowserTracing({
          tracingOrigins: ['andromeda.space', /^\//],
        }),
      ],
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
      beforeSend(event) {
        // Filter out non-critical errors
        if (event.exception) {
          const error = event.exception.values?.[0]
          if (error?.type === 'ChunkLoadError') {
            return null // Ignore chunk loading errors
          }
        }
        return event
      }
    })
  }
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()
  
  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor()
    }
    return this.instance
  }
  
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift()
    }
    
    // Send to analytics if significant metric
    if (this.isCriticalMetric(name)) {
      this.sendToAnalytics(name, value)
    }
  }
  
  getAverageMetric(name: string): number {
    const values = this.metrics.get(name) || []
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }
  
  private isCriticalMetric(name: string): boolean {
    return ['fps', 'memory_usage', 'load_time'].includes(name)
  }
  
  private sendToAnalytics(name: string, value: number): void {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: value,
        custom_parameter_1: navigator.userAgent.slice(0, 100)
      })
    }
  }
}
```

### Health Check Endpoints

```typescript
// src/pages/api/health.ts
import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.PUBLIC_APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: await checkDatabase(),
      ai_service: await checkAIService(),
      external_apis: await checkExternalAPIs()
    }
  }
  
  const isHealthy = Object.values(health.checks).every(check => check === 'ok')
  
  return new Response(JSON.stringify(health), {
    status: isHealthy ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  })
}

async function checkDatabase(): Promise<string> {
  try {
    // Add database connectivity check if applicable
    return 'ok'
  } catch (error) {
    return 'error'
  }
}

async function checkAIService(): Promise<string> {
  try {
    // Test OpenAI API connectivity
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    })
    
    return response.ok ? 'ok' : 'error'
  } catch (error) {
    return 'error'
  }
}

async function checkExternalAPIs(): Promise<string> {
  try {
    // Check any external APIs the app depends on
    return 'ok'
  } catch (error) {
    return 'error'
  }
}
```

## Security Configuration

### Content Security Policy

```typescript
// src/middleware/security.ts
export function securityHeaders() {
  const nonce = crypto.randomUUID()
  
  return {
    'Content-Security-Policy': [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`, // unsafe-eval needed for Three.js
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: blob: https://cdn.andromeda.space`,
      `media-src 'self' https://cdn.andromeda.space`,
      `connect-src 'self' https://api.openai.com https://api.andromeda.space`,
      `worker-src 'self' blob:`,
      `font-src 'self' data:`,
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`
    ].join('; '),
    
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()'
    ].join(', '),
    
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Nonce': nonce
  }
}
```

### Rate Limiting

```typescript
// src/middleware/rate-limit.ts
const rateLimitMap = new Map()

export function rateLimit(windowMs: number = 900000, max: number = 100) {
  return (request: Request): boolean => {
    const ip = getClientIP(request)
    const now = Date.now()
    const windowStart = now - windowMs
    
    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, [])
    }
    
    const requestTimes = rateLimitMap.get(ip)
    
    // Remove old requests outside the window
    const validRequests = requestTimes.filter((time: number) => time > windowStart)
    
    if (validRequests.length >= max) {
      return false // Rate limit exceeded
    }
    
    validRequests.push(now)
    rateLimitMap.set(ip, validRequests)
    
    return true
  }
}

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}
```

## Backup and Recovery

### Automated Backups

```bash
#!/bin/bash
# backup.sh

set -e

BACKUP_DIR="/backups/andromeda"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="andromeda_backup_${DATE}.tar.gz"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Backup configuration files
tar -czf ${BACKUP_DIR}/${BACKUP_FILE} \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude=logs \
  .

# Upload to cloud storage (example with AWS S3)
aws s3 cp ${BACKUP_DIR}/${BACKUP_FILE} s3://andromeda-backups/

# Keep only last 7 days of backups locally
find ${BACKUP_DIR} -name "andromeda_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}"
```

### Disaster Recovery Plan

1. **Data Recovery**: All configuration and user data backed up to multiple locations
2. **Infrastructure**: Infrastructure as Code (IaC) for quick environment recreation
3. **DNS Management**: Multiple DNS providers for redundancy
4. **Monitoring**: 24/7 monitoring with alerting for critical failures
5. **Communication**: Incident communication plan and status page

This deployment guide ensures the Andromeda application runs reliably and securely in production environments while maintaining optimal performance and user experience.
