# Product Requirements Document: Andromeda Feature Roadmap

**Version:** 1.0
**Date:** January 2026
**Status:** Draft

---

## Executive Summary

This document outlines the product requirements for expanding Andromeda, a 3D space exploration game built with Astro, Svelte, and Three.js. The proposed features leverage existing infrastructure while adding significant educational and entertainment value.

---

## Table of Contents

1. [High-Impact Features](#1-high-impact-features)
   - 1.1 Moon System Visualization
   - 1.2 AI Space Guide / Chatbot
   - 1.3 Ambient Soundscape System
   - 1.4 Smooth System Transitions
2. [Medium-Impact Features](#2-medium-impact-features)
   - 2.1 Time Controls
   - 2.2 Comparative Planetology Mode
   - 2.3 Discovery Journal / Progress Tracking
   - 2.4 Enhanced Constellation View
   - 2.5 Asteroid Belt & Kuiper Belt
3. [Creative Features](#3-creative-features)
   - 3.1 Spacecraft Mission Planner
   - 3.2 Exoplanet Habitability Analyzer
   - 3.3 Photo Mode
   - 3.4 VR/AR Mode
4. [Quick Wins](#4-quick-wins)
5. [Technical Considerations](#5-technical-considerations)
6. [Success Metrics](#6-success-metrics)

---

## 1. High-Impact Features

### 1.1 Moon System Visualization

#### Overview
Render moons orbiting their parent planets with full interactivity, building on the existing `parentId` field in `CelestialBodyData`.

#### User Stories
- As a user, I want to see moons orbiting planets so I can understand the hierarchical structure of planetary systems
- As a user, I want to click on moons to learn about them just like planets
- As a user, I want to see accurate relative sizes and orbital distances for moons

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| M-01 | Render moons as child objects of parent planets | Must Have |
| M-02 | Moons orbit their parent planet (not the star) | Must Have |
| M-03 | Click-to-select moons with info modal | Must Have |
| M-04 | Hover highlight effect on moons | Must Have |
| M-05 | Moon orbital paths visible as faint lines | Should Have |
| M-06 | Scale toggle: realistic vs. exaggerated for visibility | Should Have |
| M-07 | Moon phase visualization based on star position | Nice to Have |

#### Data Requirements
Add moon data for key planets:
- Earth: Moon (Luna)
- Mars: Phobos, Deimos
- Jupiter: Io, Europa, Ganymede, Callisto (Galilean moons)
- Saturn: Titan, Enceladus, Mimas
- Uranus: Miranda, Ariel, Titania
- Neptune: Triton

#### Technical Approach
- Extend `CelestialBodyManager` to handle parent-child relationships
- Create moon orbital calculations relative to parent body position
- Update `InteractionManager` raycasting to include moon meshes
- Add `type: "moon"` filter options in UI

#### Acceptance Criteria
- [ ] At least 4 planets have visible orbiting moons
- [ ] Moons are clickable and display info modals
- [ ] Moon orbits are correctly relative to parent planet
- [ ] Performance remains above 30 FPS with moons enabled

---

### 1.2 AI Space Guide / Chatbot

#### Overview
Integrate an AI-powered assistant that answers questions about celestial bodies and provides guided educational experiences. The `showChatbot` state already exists in `gameStore.ts`.

#### User Stories
- As a user, I want to ask questions about the planet I'm viewing and get intelligent answers
- As a user, I want guided tours that teach me about the solar system
- As a student, I want to explore topics in depth with follow-up questions

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| C-01 | Chat interface component accessible from any view | Must Have |
| C-02 | Context-aware responses based on `selectedBody` | Must Have |
| C-03 | "Ask about this" button in info modals | Must Have |
| C-04 | Predefined guided tour scripts | Should Have |
| C-05 | Conversation history within session | Should Have |
| C-06 | Markdown rendering for responses | Should Have |
| C-07 | Suggested questions based on current context | Nice to Have |
| C-08 | Voice input/output support | Nice to Have |

#### UI/UX Design
- Floating chat button in bottom-right corner
- Slide-out panel (mobile) or side panel (desktop)
- Typing indicator during response generation
- Quick-action buttons for common questions

#### Technical Approach
- Create `ChatbotPanel.svelte` component
- Integrate with OpenAI/Anthropic API via server endpoint
- Build context injection system using celestial body data
- Implement conversation state management in store

#### Privacy Considerations
- No user data stored beyond session
- Clear disclosure of AI-powered responses
- Option to disable in settings

#### Acceptance Criteria
- [ ] Chat interface opens/closes via `showChatbot` state
- [ ] Responses are contextually relevant to selected body
- [ ] At least 3 guided tour scripts available
- [ ] Response latency under 3 seconds

---

### 1.3 Ambient Soundscape System

#### Overview
Add immersive audio with ambient music, UI sounds, and accessibility considerations. The `audioEnabled` setting already exists but is not implemented.

#### User Stories
- As a user, I want atmospheric background music that enhances the space exploration experience
- As a user, I want audio feedback for my interactions
- As a user with sensory sensitivities, I want granular control over audio

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| A-01 | Ambient background music per star system | Must Have |
| A-02 | Master volume control in settings | Must Have |
| A-03 | Mute/unmute toggle (existing `audioEnabled`) | Must Have |
| A-04 | UI interaction sounds (clicks, hovers, modals) | Should Have |
| A-05 | Transition sounds between systems | Should Have |
| A-06 | Separate volume sliders (music, SFX, UI) | Should Have |
| A-07 | Spatial audio based on camera position | Nice to Have |
| A-08 | Unique ambient loops per celestial body type | Nice to Have |

#### Audio Assets Required
- 8 ambient tracks (one per star system)
- UI sound pack: click, hover, open, close, success, error
- Transition whoosh/warp sound
- Notification chime

#### Technical Approach
- Use Web Audio API via Howler.js or Tone.js
- Create `AudioManager` singleton class
- Preload audio on first user interaction (browser requirement)
- Crossfade between tracks during system transitions

#### Accessibility
- Respect `reducedMotion` setting (disable dynamic audio changes)
- Visual indicators for audio-only events
- Captions for any spoken content

#### Acceptance Criteria
- [ ] Background music plays when `audioEnabled` is true
- [ ] Volume adjustable from 0-100%
- [ ] Audio stops immediately when muted
- [ ] No audio autoplay before user interaction

---

### 1.4 Smooth System Transitions

#### Overview
Implement animated transitions when switching between star systems. State tracking (`systemTransition`) already exists in the store.

#### User Stories
- As a user, I want a visually exciting "warp" effect when traveling to new systems
- As a user, I want to see my progress during longer transitions
- As a user, I want transitions to feel fast but not jarring

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| T-01 | Warp/hyperspace visual effect during transition | Must Have |
| T-02 | Progress indicator during transition | Must Have |
| T-03 | Camera fly-out from current system | Should Have |
| T-04 | Camera fly-in to destination system | Should Have |
| T-05 | Particle streak effect (star trails) | Should Have |
| T-06 | Transition sound effect (if audio enabled) | Should Have |
| T-07 | Skippable transitions option in settings | Nice to Have |
| T-08 | Unique transitions per destination type | Nice to Have |

#### Animation Sequence
1. Fade out UI elements (200ms)
2. Camera pulls back from current system (500ms)
3. Warp tunnel effect with particle streaks (1000ms)
4. Camera approaches new system (500ms)
5. Fade in UI elements (200ms)

#### Technical Approach
- Create `TransitionManager` class
- Use Three.js post-processing for warp effect
- Leverage existing `startSystemTransition()` and `completeSystemTransition()` actions
- Implement with requestAnimationFrame for smooth 60fps

#### Acceptance Criteria
- [ ] Transitions complete in under 3 seconds
- [ ] Progress updates via `updateSystemTransitionProgress()`
- [ ] No visual glitches during transition
- [ ] Respects `reducedMotion` (instant cut if enabled)

---

## 2. Medium-Impact Features

### 2.1 Time Controls

#### Overview
Allow users to control the passage of time in the simulation, affecting orbital speeds and rotations.

#### User Stories
- As a user, I want to pause the simulation to examine positions
- As a user, I want to speed up time to see orbital patterns
- As an educator, I want to demonstrate planetary alignments

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| TC-01 | Play/pause toggle for all animations | Must Have |
| TC-02 | Time speed multiplier (1x, 10x, 100x, 1000x) | Must Have |
| TC-03 | Visual indicator of current time speed | Must Have |
| TC-04 | Keyboard shortcuts (Space=pause, +/-=speed) | Should Have |
| TC-05 | "Jump to date" feature | Nice to Have |
| TC-06 | Real-time mode synced to actual date | Nice to Have |

#### UI Design
- Compact control bar below main view
- Play/pause button with speed indicator
- Slider or discrete buttons for speed selection

#### Technical Approach
- Add `timeMultiplier` and `isPaused` to game state
- Multiply delta time in render loop by multiplier
- Update `OrbitSpeedControl` component or create new `TimeControls.svelte`

#### Acceptance Criteria
- [ ] Pause stops all orbital motion
- [ ] Speed multiplier affects all orbiting bodies uniformly
- [ ] UI clearly shows current time state

---

### 2.2 Comparative Planetology Mode

#### Overview
Enable side-by-side comparison of two celestial bodies with visual and statistical comparisons.

#### User Stories
- As a student, I want to compare Earth and Mars to understand their differences
- As a user, I want to see size comparisons visually
- As an educator, I want to highlight specific attributes

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| CP-01 | Select two bodies for comparison | Must Have |
| CP-02 | Side-by-side stat table | Must Have |
| CP-03 | Visual size comparison with Earth reference | Must Have |
| CP-04 | Highlight differences (larger/smaller/hotter) | Should Have |
| CP-05 | Compare bodies across different systems | Should Have |
| CP-06 | Export comparison as image | Nice to Have |

#### UI Design
- Split-screen view with body on each side
- Central comparison table
- "Add to compare" button in info modals

#### Technical Approach
- Create `ComparisonView.svelte` component
- Store comparison selection in game state
- Render miniature 3D models in comparison view

#### Acceptance Criteria
- [ ] Any two bodies can be compared
- [ ] At least 6 attributes shown in comparison
- [ ] Visual scaling is accurate

---

### 2.3 Discovery Journal / Progress Tracking

#### Overview
Track user exploration progress with achievements and unlockable content.

#### User Stories
- As a user, I want to see which planets I've visited
- As a user, I want to earn achievements for exploration milestones
- As a returning user, I want my progress saved

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| DJ-01 | Track visited celestial bodies | Must Have |
| DJ-02 | Persist progress to localStorage | Must Have |
| DJ-03 | Achievement badges for milestones | Should Have |
| DJ-04 | Discovery log with timestamps | Should Have |
| DJ-05 | Unlockable lore entries | Nice to Have |
| DJ-06 | Progress export/import | Nice to Have |

#### Achievement Examples
- "First Steps" - Visit any planet
- "Inner Circle" - Visit all inner planets
- "Gas Giant Explorer" - Visit Jupiter, Saturn, Uranus, Neptune
- "Exoplanet Pioneer" - Visit a planet outside Solar System
- "Completionist" - Visit every celestial body

#### Technical Approach
- Create `ProgressManager` class
- Store data in localStorage with versioning
- Add `JournalPanel.svelte` component
- Trigger achievement checks on body selection

#### Acceptance Criteria
- [ ] Progress persists across browser sessions
- [ ] At least 10 achievements defined
- [ ] Journal accessible from main menu

---

### 2.4 Enhanced Constellation View

#### Overview
Expand the existing constellation view with cultural mythology, animations, and personalization.

#### User Stories
- As a user, I want to learn the stories behind constellations
- As a user, I want to see constellations from different cultures
- As a user, I want to see what's visible from my location tonight

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| CV-01 | Mythology text for each constellation | Must Have |
| CV-02 | Animated constellation line drawing | Should Have |
| CV-03 | Filter by culture (Greek, Chinese, etc.) | Should Have |
| CV-04 | Location-based "tonight's sky" | Should Have |
| CV-05 | Constellation art overlays | Nice to Have |
| CV-06 | Seasonal constellation guide | Nice to Have |

#### Data Requirements
- Mythology entries for 30+ constellations
- Chinese constellation data (Three Enclosures, 28 Mansions)
- Indigenous constellation examples

#### Technical Approach
- Extend existing `ConstellationRenderer`
- Add mythology data to constellation JSON
- Implement geolocation API for user position
- Calculate visible sky based on date/time/location

#### Acceptance Criteria
- [ ] At least 20 constellations have mythology text
- [ ] At least 2 cultural systems available
- [ ] Location-based filtering works accurately

---

### 2.5 Asteroid Belt & Kuiper Belt

#### Overview
Add procedurally generated asteroid fields to the Solar System view.

#### User Stories
- As a user, I want to see the asteroid belt between Mars and Jupiter
- As a user, I want to learn about dwarf planets like Ceres and Pluto
- As a user, I want to click on notable asteroids

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| AB-01 | Render asteroid belt with instanced meshes | Must Have |
| AB-02 | Include dwarf planet Ceres as clickable body | Must Have |
| AB-03 | Render Kuiper Belt beyond Neptune | Should Have |
| AB-04 | Include Pluto, Eris, Makemake, Haumea | Should Have |
| AB-05 | Random asteroid selection for info display | Nice to Have |
| AB-06 | Asteroid density slider in settings | Nice to Have |

#### Performance Considerations
- Use `InstancedMesh` for thousands of asteroids
- LOD system: reduce count at distance
- Culling for off-screen asteroids

#### Technical Approach
- Create `AsteroidBeltManager` class
- Procedural distribution in belt region
- Named asteroids as individual `CelestialBodyData` entries

#### Acceptance Criteria
- [ ] Asteroid belt visible between Mars and Jupiter
- [ ] At least 1000 asteroids rendered at 60fps
- [ ] Ceres and Pluto are clickable with info modals

---

## 3. Creative Features

### 3.1 Spacecraft Mission Planner

#### Overview
Visualize spacecraft trajectories and plan hypothetical missions between celestial bodies.

#### User Stories
- As a space enthusiast, I want to see Voyager's trajectory through the solar system
- As a student, I want to understand gravity assists
- As a user, I want to plan my own mission route

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SM-01 | Display historical mission paths (Voyager, etc.) | Must Have |
| SM-02 | Trajectory visualization as 3D lines | Must Have |
| SM-03 | Mission timeline with key events | Should Have |
| SM-04 | Interactive mission planner | Should Have |
| SM-05 | Gravity assist visualization | Nice to Have |
| SM-06 | Delta-v calculations | Nice to Have |

#### Historical Missions to Include
- Voyager 1 & 2
- New Horizons
- Cassini-Huygens
- Juno
- Mars rovers (Curiosity, Perseverance)

#### Technical Approach
- Store mission data as waypoints with timestamps
- Render trajectories as `THREE.Line` or `THREE.TubeGeometry`
- Animate spacecraft position along path based on time controls

#### Acceptance Criteria
- [ ] At least 3 historical missions visualized
- [ ] Trajectories are spatially accurate
- [ ] Timeline shows mission milestones

---

### 3.2 Exoplanet Habitability Analyzer

#### Overview
Analyze and visualize the habitability potential of exoplanets in the game.

#### User Stories
- As a user, I want to see which exoplanets might support life
- As a student, I want to understand habitable zone science
- As a user, I want to compare Earth to potentially habitable exoplanets

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| EH-01 | Habitable zone visualization (green band) | Must Have |
| EH-02 | Earth Similarity Index (ESI) calculation | Must Have |
| EH-03 | Temperature estimation display | Must Have |
| EH-04 | Atmosphere indicator (if known) | Should Have |
| EH-05 | Filter systems by habitability | Should Have |
| EH-06 | "Goldilocks zone" educational content | Nice to Have |

#### Habitability Metrics
- Distance from star relative to habitable zone
- Estimated surface temperature
- Planet size (0.5-2.0 Earth radii ideal)
- Star type and stability

#### Technical Approach
- Calculate habitable zone based on star luminosity
- Render as semi-transparent green torus
- Add ESI to `CelestialBodyData` for exoplanets
- Create `HabitabilityPanel.svelte` component

#### Acceptance Criteria
- [ ] Habitable zones visible for all star systems
- [ ] ESI displayed for applicable planets
- [ ] TRAPPIST-1 system correctly shows multiple planets in zone

---

### 3.3 Photo Mode

#### Overview
Professional screenshot capture with visual enhancements and UI hiding.

#### User Stories
- As a user, I want to capture beautiful screenshots of the cosmos
- As a content creator, I want high-quality images for sharing
- As a user, I want to adjust visual effects for the perfect shot

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| PM-01 | Hide all UI elements | Must Have |
| PM-02 | Free camera positioning | Must Have |
| PM-03 | Capture and download screenshot | Must Have |
| PM-04 | Depth of field effect | Should Have |
| PM-05 | Bloom intensity slider | Should Have |
| PM-06 | Resolution options (1x, 2x, 4x) | Should Have |
| PM-07 | Watermark/metadata overlay option | Nice to Have |
| PM-08 | Social media share buttons | Nice to Have |

#### UI Design
- Enter photo mode via button or keyboard (P)
- Minimal floating control panel
- Effect sliders and capture button
- Preview before save

#### Technical Approach
- Use Three.js `renderer.domElement.toDataURL()`
- Implement post-processing with `EffectComposer`
- Create `PhotoMode.svelte` overlay component

#### Acceptance Criteria
- [ ] Screenshots save as PNG files
- [ ] UI completely hidden in photo mode
- [ ] At least 2 post-processing effects available

---

### 3.4 VR/AR Mode

#### Overview
Immersive virtual and augmented reality experiences using WebXR.

#### User Stories
- As a VR user, I want to explore the solar system in immersive 3D
- As an AR user, I want to place the solar system on my desk
- As an educator, I want to use VR for classroom demonstrations

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| VR-01 | WebXR VR mode for compatible headsets | Must Have |
| VR-02 | Controller-based navigation | Must Have |
| VR-03 | Comfortable locomotion options | Must Have |
| VR-04 | AR mode for mobile devices | Should Have |
| VR-05 | Hand tracking support | Nice to Have |
| VR-06 | Multiplayer VR presence | Nice to Have |

#### Supported Devices
- Meta Quest 2/3/Pro
- Valve Index
- HTC Vive
- Apple Vision Pro (AR)
- Mobile AR (ARCore/ARKit)

#### Technical Approach
- Use Three.js WebXR support (`renderer.xr.enabled = true`)
- Implement `VRButton` and `ARButton` from Three.js examples
- Create comfort options (teleport, snap turn)
- Adapt UI to 3D panels in VR

#### Performance Requirements
- Maintain 72fps minimum in VR
- Reduce particle counts and LOD for VR mode
- Foveated rendering if supported

#### Acceptance Criteria
- [ ] VR mode launches on compatible headsets
- [ ] Navigation possible with controllers
- [ ] No motion sickness from default settings

---

## 4. Quick Wins

These features require minimal effort but provide noticeable improvements.

| Feature | Description | Effort | Impact |
|---------|-------------|--------|--------|
| Orbit trail visualization | Faint line showing orbital path | Low | Medium |
| Distance measurement tool | Click two bodies to see distance | Low | Medium |
| Fullscreen mode toggle | Button to enter fullscreen | Low | Low |
| Body size comparison overlay | Earth silhouette reference | Low | High |
| Random "fun fact" toasts | Periodic educational pop-ups | Low | Medium |
| Keyboard shortcut cheatsheet | Modal showing all shortcuts | Low | Low |
| Theme toggle (dark/light) | UI theme preference | Low | Low |
| FPS counter toggle | Show/hide performance stats | Low | Low |
| Reset view button | Return camera to default | Low | Medium |
| Body search/filter | Quick-find by name | Low | High |

---

## 5. Technical Considerations

### Performance Budget
- Target: 60fps on desktop, 30fps on mobile
- Memory: < 500MB for base experience
- Initial load: < 5 seconds on broadband

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Android)

### Accessibility Requirements
All features must:
- Support keyboard navigation
- Respect `reducedMotion` setting
- Provide screen reader announcements
- Maintain WCAG 2.1 AA compliance

### Internationalization
All new UI text must support:
- English (en)
- Chinese Simplified (zh)
- Japanese (ja)

### Testing Requirements
- Unit test coverage: 70% minimum
- E2E tests for critical user journeys
- Performance benchmarks for new renderers

---

## 6. Success Metrics

### Engagement Metrics
- Average session duration increase
- Return visitor rate
- Bodies visited per session
- Feature adoption rates

### Technical Metrics
- Frame rate consistency
- Load time performance
- Error rate reduction
- Accessibility audit scores

### Educational Impact
- Quiz/assessment completion rates (if implemented)
- Guided tour completion rates
- Chatbot question volume and satisfaction

---

## Appendix A: Feature Dependencies

```
Moon System ─────────────────────────────────> (standalone)

AI Chatbot ──────────────────────────────────> (standalone)

Audio System ────────────────────────────────> (standalone)
                    │
                    ▼
System Transitions ──────────────────────────> Audio System (optional)

Time Controls ───────────────────────────────> (standalone)
       │
       ▼
Mission Planner ─────────────────────────────> Time Controls

Habitability Analyzer ───────────────────────> (standalone)

Photo Mode ──────────────────────────────────> (standalone)

VR/AR Mode ──────────────────────────────────> (standalone, high effort)
```

---

## Appendix B: Suggested Implementation Order

### Phase 1: Foundation (Weeks 1-4)
1. Time Controls
2. Moon System Visualization
3. Quick Wins batch

### Phase 2: Immersion (Weeks 5-8)
4. Ambient Soundscape System
5. Smooth System Transitions
6. Discovery Journal

### Phase 3: Education (Weeks 9-12)
7. AI Space Guide / Chatbot
8. Enhanced Constellation View
9. Comparative Planetology Mode

### Phase 4: Advanced (Weeks 13-16)
10. Asteroid Belt & Kuiper Belt
11. Exoplanet Habitability Analyzer
12. Spacecraft Mission Planner

### Phase 5: Future (TBD)
13. Photo Mode
14. VR/AR Mode

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Claude | Initial draft |
