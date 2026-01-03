<script lang="ts">
  import type { CelestialBodyData } from '../types/game';
  
  export let isOpen: boolean = false;
  export let celestialBody: CelestialBodyData | null = null;
  export let onClose: () => void;
  export let lang: string = 'en';
  export let translations: Record<string, string> = {};
  
  // Create translation function with fallback
  $: t = (key: string) => translations[key] || key;
  
  // Reactive statement that uses lang prop to suppress warning
  $: currentLanguage = lang;
  
  // Get translated planet content
  $: getTranslatedName = (body: CelestialBodyData | null) => {
    if (!body) return '';
    const translationKey = `planet.${body.id}.name`;
    return t(translationKey) !== translationKey ? t(translationKey) : body.name;
  };
  
  $: getTranslatedDescription = (body: CelestialBodyData | null) => {
    if (!body) return '';
    const translationKey = `planet.${body.id}.description`;
    return t(translationKey) !== translationKey ? t(translationKey) : body.description;
  };
  
  $: getTranslatedType = (body: CelestialBodyData | null) => {
    if (!body) return '';
    const translationKey = `planet.type.${body.type}`;
    return t(translationKey) !== translationKey ? t(translationKey).toUpperCase() : body.type.toUpperCase();
  };
  
  // Translate composition elements
  $: translateComposition = (composition: string) => {
    // Extract element name and percentage/description
    const match = composition.match(/^(.+?)\s*\((.+)\)$/);
    if (match) {
      const elementName = match[1].trim();
      const percentage = match[2].trim();
      
      // Handle specific cases first
      if (elementName.toLowerCase() === 'trace metals') {
        return `${t('element.trace')} ${t('element.metals')} (${percentage})`;
      }
      if (elementName.toLowerCase().includes('other elements')) {
        return `${t('element.other')} ${t('element.elements')} (${percentage})`;
      }
      
      // Try to translate the element name directly
      const normalizedElement = elementName.toLowerCase().replace(/\s+/g, '');
      const translationKey = `element.${normalizedElement}`;
      const translatedElement = t(translationKey);
      
      if (translatedElement !== translationKey) {
        return `${translatedElement} (${percentage})`;
      }
      
      // Try common patterns for fallback
      if (elementName.toLowerCase().includes('trace')) {
        return `${t('element.trace')} ${t('element.metals')} (${percentage})`;
      }
      if (elementName.toLowerCase().includes('other')) {
        return `${t('element.other')} ${t('element.elements')} (${percentage})`;
      }
    }
    
    // Fallback to original text
    return composition;
  };
  
  // Handle keyboard and click events
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };
  
  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };
  
  // Get planet-specific styling
  const getPlanetTheme = (body: CelestialBodyData | null) => {
    if (!body) return { 
      primary: '#60a5fa', 
      secondary: '#3b82f6', 
      accent: '#ddd6fe',
      background: undefined,
      textColor: undefined
    };
    
    // Use custom theme if defined in the data
    if (body.modalTheme) {
      return {
        primary: body.modalTheme.primary,
        secondary: body.modalTheme.secondary,
        accent: body.modalTheme.accent,
        background: body.modalTheme.background,
        textColor: body.modalTheme.textColor
      };
    }
    
    // Fallback to hardcoded themes based on planet ID
    const defaultThemes: Record<string, { 
      primary: string; 
      secondary: string; 
      accent: string;
      background?: string;
      textColor?: string;
    }> = {
      sun: { primary: '#fbbf24', secondary: '#f59e0b', accent: '#fcd34d' },
      mercury: { primary: '#94a3b8', secondary: '#64748b', accent: '#cbd5e1' },
      venus: { primary: '#fbbf24', secondary: '#d97706', accent: '#fed7aa' },
      earth: { primary: '#3b82f6', secondary: '#1d4ed8', accent: '#34d399' },
      mars: { primary: '#ef4444', secondary: '#dc2626', accent: '#fca5a5' },
      jupiter: { primary: '#f59e0b', secondary: '#d97706', accent: '#fde68a' },
      saturn: { primary: '#fbbf24', secondary: '#f59e0b', accent: '#fef3c7' },
      uranus: { primary: '#06b6d4', secondary: '#0891b2', accent: '#a5f3fc' },
      neptune: { primary: '#3b82f6', secondary: '#1e40af', accent: '#93c5fd' }
    };
    
    return defaultThemes[body.id] || { 
      primary: '#60a5fa', 
      secondary: '#3b82f6', 
      accent: '#ddd6fe',
      background: undefined,
      textColor: undefined
    };
  };
  
  $: theme = getPlanetTheme(celestialBody);
</script>

{#if isOpen && celestialBody}
  <div 
    class="modal-overlay" 
    on:click={handleOverlayClick}
    on:keydown={handleKeydown}
    role="dialog" 
    aria-modal="true"
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
    tabindex="-1"
  >
    <div class="modal-container">
      <div class="modal-content" style="
        --primary-color: {theme.primary}; 
        --secondary-color: {theme.secondary}; 
        --accent-color: {theme.accent};
        {theme.background ? `--modal-background: ${theme.background};` : ''}
        {theme.textColor ? `--modal-text-color: ${theme.textColor};` : ''}
      ">
        <!-- Star field background -->
        <div class="star-field">
          {#each Array(75) as _, i}
            <div 
              class="star" 
              style="
                left: {Math.random() * 100}%; 
                top: {Math.random() * 100}%; 
                animation-delay: {Math.random() * 4}s;
                opacity: {0.2 + Math.random() * 0.8};
                transform: scale({0.3 + Math.random() * 1.2});
              "
            ></div>
          {/each}
        </div>
        
        <!-- Cosmic particles -->
        <div class="cosmic-particles">
          {#each Array(20) as _, i}
            <div 
              class="particle" 
              style="
                left: {Math.random() * 100}%; 
                top: {Math.random() * 100}%;
                animation-delay: {Math.random() * 6}s;
                animation-duration: {4 + Math.random() * 4}s;
              "
            ></div>
          {/each}
        </div>
        
        <!-- Close button -->
        <button 
          class="modal-close" 
          on:click={onClose}
          aria-label="{t('modal.close')} {getTranslatedName(celestialBody)}"
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <!-- Header section -->
        <div class="modal-header">
          <div class="planet-icon">
            <div class="planet-sphere" style="background-color: {celestialBody.material.color}"></div>
            <div class="orbit-ring"></div>
          </div>
          <div class="header-text">
            <h2 id="modal-title" class="planet-name">{getTranslatedName(celestialBody)}</h2>
            <span class="planet-type">{getTranslatedType(celestialBody)}</span>
          </div>
        </div>
        
        <!-- Description section -->
        <div class="modal-body">
          <p id="modal-description" class="planet-description">{getTranslatedDescription(celestialBody)}</p>
          
          <!-- Key facts section -->
          <div class="facts-section">
            <h3 class="facts-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12,2 15.09,8.26 22,9 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9 8.91,8.26"></polygon>
              </svg>
              {t('modal.celestialData')}
            </h3>
            <div class="facts-grid">
              <div class="fact-item">
                <div class="fact-icon">🌍</div>
                <div class="fact-content">
                  <span class="fact-label">{t('modal.diameter')}</span>
                  <span class="fact-value">{celestialBody.keyFacts.diameter}</span>
                </div>
              </div>
              
              <div class="fact-item">
                <div class="fact-icon">📏</div>
                <div class="fact-content">
                  <span class="fact-label">{celestialBody.type === 'moon' ? t('modal.distanceFromParent') : t('modal.distanceFromSun')}</span>
                  <span class="fact-value">{celestialBody.keyFacts.distanceFromSun}</span>
                </div>
              </div>
              
              <div class="fact-item">
                <div class="fact-icon">🔄</div>
                <div class="fact-content">
                  <span class="fact-label">{t('modal.orbitalPeriod')}</span>
                  <span class="fact-value">{celestialBody.keyFacts.orbitalPeriod}</span>
                </div>
              </div>
              
              <div class="fact-item">
                <div class="fact-icon">🌡️</div>
                <div class="fact-content">
                  <span class="fact-label">{t('modal.temperature')}</span>
                  <span class="fact-value">{celestialBody.keyFacts.temperature}</span>
                </div>
              </div>
              
              {#if celestialBody.keyFacts.moons}
                <div class="fact-item">
                  <div class="fact-icon">🌙</div>
                  <div class="fact-content">
                    <span class="fact-label">{t('modal.moons')}</span>
                    <span class="fact-value">{celestialBody.keyFacts.moons}</span>
                  </div>
                </div>
              {/if}
            </div>
          </div>
          
          <!-- Composition section -->
          {#if celestialBody.keyFacts.composition && celestialBody.keyFacts.composition.length > 0}
            <div class="composition-section">
              <h3 class="composition-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                </svg>
                {t('modal.composition')}
              </h3>
              <div class="composition-tags">
                {#each celestialBody.keyFacts.composition as element}
                  <span class="composition-tag">{translateComposition(element)}</span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
        
        <!-- Action buttons section for terrain exploration -->
        {#if celestialBody.terrain && ['mercury', 'venus', 'earth', 'mars'].includes(celestialBody.id)}
          <div class="action-section">
            <button 
              class="terrain-button"
              on:click={() => {
                const terrainUrl = lang === 'en' 
                  ? `/en/planetary/terrain/${celestialBody.id}` 
                  : `/${lang}/planetary/terrain/${celestialBody.id}`;
                window.location.href = terrainUrl;
              }}
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {t('modal.viewTerrain')}
            </button>
          </div>
        {/if}
        
        <!-- Footer with cosmic decoration -->
        <div class="modal-footer">
          <div class="cosmic-divider"></div>
          <p class="footer-text">{t('modal.footerText')}</p>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 17, 0.95);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
  }
  
  .modal-container {
    position: relative;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow: hidden;
  }
  
  .modal-content {
    position: relative;
    background: var(--modal-background, linear-gradient(135deg, 
      rgba(15, 23, 42, 0.98) 0%, 
      rgba(30, 41, 59, 0.95) 50%, 
      rgba(15, 23, 42, 0.98) 100%));
    color: var(--modal-text-color, white);
    border: 2px solid;
    border-image: linear-gradient(45deg, var(--primary-color), var(--accent-color), var(--secondary-color)) 1;
    border-radius: 20px;
    box-shadow: 
      0 25px 50px -12px rgba(0, 0, 0, 0.8),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 0 100px rgba(var(--primary-color), 0.3);
    overflow: hidden;
    animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    backdrop-filter: blur(20px);
  }
  
  .modal-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      var(--primary-color) 25%, 
      var(--accent-color) 50%, 
      var(--secondary-color) 75%, 
      transparent 100%);
    z-index: 1;
  }
  
  .star-field {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }
  
  .star {
    position: absolute;
    width: 2px;
    height: 2px;
    background: white;
    border-radius: 50%;
    animation: twinkle 4s ease-in-out infinite;
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
  }
  
  .cosmic-particles {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }
  
  .particle {
    position: absolute;
    width: 4px;
    height: 4px;
    background: radial-gradient(circle, var(--primary-color), transparent);
    border-radius: 50%;
    animation: float 6s ease-in-out infinite;
    opacity: 0.4;
  }
  
  .modal-close {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    z-index: 10;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }
  
  .modal-close:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
    transform: scale(1.1);
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 30px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 1;
  }
  
  .planet-icon {
    position: relative;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .planet-sphere {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    position: relative;
    box-shadow: 
      0 0 20px rgba(255, 255, 255, 0.3),
      inset -10px -10px 20px rgba(0, 0, 0, 0.3),
      0 0 40px var(--primary-color);
    animation: rotate 20s linear infinite, pulse 3s ease-in-out infinite;
  }
  
  .planet-sphere::before {
    content: '';
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, var(--accent-color), transparent 70%);
    opacity: 0.3;
    animation: rotate 25s linear infinite reverse;
  }
  
  .orbit-ring {
    position: absolute;
    width: 80px;
    height: 80px;
    border: 1px solid var(--primary-color);
    border-radius: 50%;
    opacity: 0.3;
    animation: rotate 15s linear infinite reverse;
  }
  
  .header-text {
    flex: 1;
  }
  
  .planet-name {
    margin: 0 0 8px 0;
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--primary-color);
    text-shadow: 0 0 20px var(--primary-color);
    background: linear-gradient(45deg, var(--primary-color), var(--accent-color));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .planet-type {
    display: inline-block;
    background: rgba(var(--primary-color), 0.2);
    color: var(--accent-color);
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    border: 1px solid var(--primary-color);
  }
  
  .modal-body {
    padding: 30px;
    position: relative;
    z-index: 1;
  }
  
  .planet-description {
    margin: 0 0 30px 0;
    line-height: 1.7;
    color: var(--modal-text-color, rgba(255, 255, 255, 0.9));
    font-size: 1.1rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  
  .facts-section {
    margin-bottom: 30px;
  }
  
  .facts-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 20px 0;
    color: var(--accent-color);
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .facts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }
  
  .fact-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
  }
  
  .fact-item:hover {
    background: rgba(var(--primary-color), 0.1);
    border-color: var(--primary-color);
    transform: translateY(-2px);
  }
  
  .fact-icon {
    font-size: 1.5rem;
    filter: drop-shadow(0 0 10px var(--primary-color));
  }
  
  .fact-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .fact-label {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }
  
  .fact-value {
    color: white;
    font-weight: 600;
    font-size: 1rem;
  }
  
  .composition-section {
    margin-bottom: 20px;
  }
  
  .composition-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 16px 0;
    color: var(--accent-color);
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .composition-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .composition-tag {
    background: rgba(var(--secondary-color), 0.2);
    color: var(--accent-color);
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid var(--secondary-color);
    backdrop-filter: blur(5px);
  }
  
  .modal-footer {
    padding: 20px 30px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 1;
  }
  
  .cosmic-divider {
    height: 2px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      var(--primary-color) 25%, 
      var(--accent-color) 50%, 
      var(--secondary-color) 75%, 
      transparent 100%);
    margin-bottom: 12px;
    border-radius: 1px;
  }
  
  .footer-text {
    margin: 0;
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
    font-style: italic;
  }
  
  /* Action section styles */
  .action-section {
    padding: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .terrain-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
  }
  
  .terrain-button:hover {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(79, 70, 229, 0.6);
  }
  
  .terrain-button:active {
    transform: translateY(0);
  }
  
  .terrain-button svg {
    width: 20px;
    height: 20px;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.8) translateY(30px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 
        0 0 20px rgba(255, 255, 255, 0.3),
        inset -10px -10px 20px rgba(0, 0, 0, 0.3),
        0 0 40px var(--primary-color);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 
        0 0 30px rgba(255, 255, 255, 0.5),
        inset -10px -10px 20px rgba(0, 0, 0, 0.3),
        0 0 60px var(--primary-color);
    }
  }
  
  @keyframes twinkle {
    0%, 100% {
      opacity: 0.3;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.5);
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px) translateX(0px);
      opacity: 0.4;
    }
    25% {
      transform: translateY(-20px) translateX(10px);
      opacity: 0.8;
    }
    50% {
      transform: translateY(-10px) translateX(-5px);
      opacity: 0.6;
    }
    75% {
      transform: translateY(-15px) translateX(15px);
      opacity: 0.9;
    }
  }
  
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  /* Responsive design */
  @media (max-width: 768px) {
    .modal-container {
      width: 95%;
      max-height: 95vh;
    }
    
    .modal-header {
      flex-direction: column;
      text-align: center;
      padding: 20px;
    }
    
    .planet-name {
      font-size: 2rem;
    }
    
    .modal-body {
      padding: 20px;
    }
    
    .facts-grid {
      grid-template-columns: 1fr;
    }
    
    .modal-footer {
      padding: 15px 20px;
    }
  }
</style>
