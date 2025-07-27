// Test setup file
import { vi } from "vitest";
import { cleanup } from "@testing-library/svelte";
import { afterEach, beforeAll } from "vitest";

// Mock Three.js
vi.mock("three", () => ({
    Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
        x,
        y,
        z,
        set: vi.fn(),
        copy: vi.fn(),
        setScalar: vi.fn(),
        clone: vi.fn(() => ({ x, y, z })),
    })),
    Scene: vi.fn().mockImplementation(() => ({
        add: vi.fn(),
        remove: vi.fn(),
        children: [],
    })),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
        position: { set: vi.fn(), copy: vi.fn() },
        lookAt: vi.fn(),
        updateProjectionMatrix: vi.fn(),
    })),
    WebGLRenderer: vi.fn().mockImplementation(() => ({
        setSize: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
        domElement: document.createElement("canvas"),
        shadowMap: { enabled: false },
    })),
    SphereGeometry: vi.fn().mockImplementation(() => ({
        dispose: vi.fn(),
    })),
    MeshStandardMaterial: vi.fn().mockImplementation(() => ({
        dispose: vi.fn(),
    })),
    MeshBasicMaterial: vi.fn().mockImplementation(() => ({
        dispose: vi.fn(),
    })),
    Mesh: vi.fn().mockImplementation(() => ({
        position: { copy: vi.fn(), set: vi.fn() },
        scale: { setScalar: vi.fn() },
        rotation: { y: 0 },
        userData: {},
        name: "",
        castShadow: false,
        receiveShadow: false,
    })),
    Group: vi.fn().mockImplementation(() => ({
        add: vi.fn(),
        remove: vi.fn(),
        position: { copy: vi.fn() },
        children: [],
    })),
    DirectionalLight: vi.fn().mockImplementation(() => ({
        position: { set: vi.fn() },
        castShadow: false,
    })),
    AmbientLight: vi.fn().mockImplementation(() => ({
        intensity: 1,
    })),
    Raycaster: vi.fn().mockImplementation(() => ({
        setFromCamera: vi.fn(),
        intersectObjects: vi.fn(() => []),
    })),
}));

// Mock browser APIs
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
});

// Mock canvas methods
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
}));

// Clean up after each test
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

// Global test setup
beforeAll(() => {
    // Suppress console.log during tests unless explicitly needed
    vi.spyOn(console, "log").mockImplementation(() => {});
});
