/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
// Extend the Three.js mock with additional classes, constants and helpers needed by graphics tests
import * as THREE from "three";

// Constants
(THREE as any).ClampToEdgeWrapping = "ClampToEdgeWrapping";
(THREE as any).LinearMipmapLinearFilter = "LinearMipmapLinearFilter";
(THREE as any).LinearFilter = "LinearFilter";
(THREE as any).AdditiveBlending = "AdditiveBlending";
(THREE as any).PCFShadowMap = "PCFShadowMap";
(THREE as any).SRGBColorSpace = "sRGB";
(THREE as any).MOUSE = { PAN: 0, ROTATE: 1 };
(THREE as any).DoubleSide = "DoubleSide";
(THREE as any).Vector2 = vi
    .fn()
    .mockImplementation((x = 0, y = 0) => ({ x, y }));

// Vector3 enhancements used by camera and animations
const enhanceVector3 = (v: any) => {
    v.set = vi.fn((x: number, y: number, z: number) => {
        v.x = x;
        v.y = y;
        v.z = z;
        return v;
    });
    v.copy = vi.fn((o: any) => {
        v.x = o.x ?? v.x;
        v.y = o.y ?? v.y;
        v.z = o.z ?? v.z;
        return v;
    });
    v.setScalar = vi.fn((s: number) => {
        v.x = s;
        v.y = s;
        v.z = s;
        return v;
    });
    v.clone = vi.fn(() => {
        const c = { x: v.x, y: v.y, z: v.z };
        enhanceVector3(c);
        return c;
    });
    v.subVectors = vi.fn((a: any, b: any) => {
        v.x = (a.x ?? 0) - (b.x ?? 0);
        v.y = (a.y ?? 0) - (b.y ?? 0);
        v.z = (a.z ?? 0) - (b.z ?? 0);
        return v;
    });
    v.add = vi.fn((o: any) => {
        v.x += o.x ?? 0;
        v.y += o.y ?? 0;
        v.z += o.z ?? 0;
        return v;
    });
    v.multiplyScalar = vi.fn((s: number) => {
        v.x *= s;
        v.y *= s;
        v.z *= s;
        return v;
    });
    v.normalize = vi.fn(() => {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
        v.x /= len;
        v.y /= len;
        v.z /= len;
        return v;
    });
    v.lerpVectors = vi.fn((a: any, b: any, t: number) => {
        v.x = (a.x ?? 0) + ((b.x ?? 0) - (a.x ?? 0)) * t;
        v.y = (a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * t;
        v.z = (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t;
        return v;
    });
    v.distanceTo = vi.fn((o: any) => {
        const dx = v.x - (o.x ?? 0);
        const dy = v.y - (o.y ?? 0);
        const dz = v.z - (o.z ?? 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    });
    return v;
};
// Patch existing mocked Vector3 factory to include methods when constructed in tests
const OrigVector3 = (THREE as any).Vector3;
(THREE as any).Vector3 = vi
    .fn()
    .mockImplementation((x = 0, y = 0, z = 0) => enhanceVector3({ x, y, z }));

// Color
(THREE as any).Color = vi.fn().mockImplementation((_c?: any) => ({
    setHex: vi.fn(),
    copy: vi.fn(),
}));

// LoadingManager
(THREE as any).LoadingManager = vi
    .fn()
    .mockImplementation(
        (onLoad?: () => void, _onProgress?: any, _onError?: any) => ({
            onLoad,
        }),
    );

// Texture class and TextureLoader with controllable outcomes
(THREE as any).Texture = vi.fn().mockImplementation(() => ({
    wrapS: undefined,
    wrapT: undefined,
    minFilter: undefined,
    magFilter: undefined,
    anisotropy: 1,
    generateMipmaps: false,
    colorSpace: undefined,
    flipY: false,
    image: { width: 512, height: 512 },
    dispose: vi.fn(),
}));

declare global {
    var __threeTextureLoadOutcome: Record<string, "ok" | "error"> | undefined;
}
(THREE as any).TextureLoader = vi.fn().mockImplementation((_manager?: any) => ({
    load: vi.fn(
        (
            url: string,
            onLoad?: (t: any) => void,
            _onProgress?: any,
            onError?: (e: any) => void,
        ) => {
            const outcome = globalThis.__threeTextureLoadOutcome?.[url] ?? "ok";
            if (outcome === "ok") {
                const tex = new (THREE as any).Texture();
                onLoad?.(tex);
            } else {
                onError?.(new Error(`Failed ${url}`));
            }
        },
    ),
}));

// CanvasTexture
(THREE as any).CanvasTexture = vi.fn().mockImplementation((_canvas: any) => ({
    dispose: vi.fn(),
}));

// Geometry and attributes
(THREE as any).BufferAttribute = vi
    .fn()
    .mockImplementation((array: Float32Array | number[], itemSize: number) => {
        const arr =
            array instanceof Float32Array ? array : new Float32Array(array);
        return {
            array: arr,
            itemSize,
            get count() {
                return Math.floor(arr.length / itemSize);
            },
            needsUpdate: false,
        };
    });

(THREE as any).BufferGeometry = vi.fn().mockImplementation(() => {
    const attributes: Record<string, any> = {};
    return {
        setAttribute: vi.fn((name: string, attr: any) => {
            attributes[name] = attr;
        }),
        getAttribute: vi.fn((name: string) => attributes[name]),
        dispose: vi.fn(),
    };
});

(THREE as any).SphereGeometry = vi
    .fn()
    .mockImplementation((_r?: number, _w?: number, _h?: number) => ({
        dispose: vi.fn(),
        getAttribute: vi.fn(() => ({ array: new Float32Array(0) })),
    }));

(THREE as any).RingGeometry = vi
    .fn()
    .mockImplementation(
        (_inner?: number, _outer?: number, _theta?: number, _seg?: number) => ({
            dispose: vi.fn(),
        }),
    );

// Materials
const makeStdMaterial = () => ({
    dispose: vi.fn(),
    userData: {},
    emissive: new (THREE as any).Color(),
    opacity: 1,
});
(THREE as any).MeshStandardMaterial = vi
    .fn()
    .mockImplementation((_cfg?: any) => ({
        ...makeStdMaterial(),
        ...(_cfg ?? {}),
    }));
(THREE as any).MeshBasicMaterial = vi
    .fn()
    .mockImplementation((_cfg?: any) => ({
        ...makeStdMaterial(),
        ...(_cfg ?? {}),
    }));
(THREE as any).MeshPhongMaterial = vi
    .fn()
    .mockImplementation((_cfg?: any) => ({
        ...makeStdMaterial(),
        ...(_cfg ?? {}),
    }));

// Objects
(THREE as any).Mesh = vi
    .fn()
    .mockImplementation((geometry?: any, material?: any) => {
        const children: any[] = [];
        const obj: any = {
            geometry,
            material,
            position: enhanceVector3({ x: 0, y: 0, z: 0 }),
            scale: { setScalar: vi.fn() },
            rotation: { x: 0, y: 0, z: 0 },
            userData: {},
            name: "",
            castShadow: false,
            receiveShadow: false,
            add: vi.fn((c: any) => children.push(c)),
            getObjectByName: vi.fn(
                (n: string) => children.find((c) => c.name === n) || null,
            ),
            children,
        };
        return obj;
    });

(THREE as any).Group = vi.fn().mockImplementation(() => {
    const children: any[] = [];
    const group: any = {
        add: vi.fn((c: any) => children.push(c)),
        remove: vi.fn((c: any) => {
            const i = children.indexOf(c);
            if (i >= 0) children.splice(i, 1);
        }),
        position: enhanceVector3({ x: 0, y: 0, z: 0 }),
        scale: { setScalar: vi.fn() },
        rotation: { x: 0, y: 0, z: 0 },
        userData: {},
        name: "",
        castShadow: false,
        receiveShadow: false,
        children,
        getObjectByName: vi.fn(
            (n: string) => children.find((c) => c.name === n) || null,
        ),
    };
    return group;
});

// Lights
(THREE as any).PointLight = vi
    .fn()
    .mockImplementation((_c?: any, _i?: number, _d?: number) => ({
        position: { set: vi.fn() },
        castShadow: false,
    }));
(THREE as any).DirectionalLight = vi
    .fn()
    .mockImplementation((_c?: any, _i?: number) => ({
        position: { set: vi.fn() },
        castShadow: false,
        intensity: _i ?? 1,
    }));
(THREE as any).AmbientLight = vi
    .fn()
    .mockImplementation((_c?: any, i?: number) => ({
        intensity: i ?? 1,
    }));

// Scene with userData and background support
(THREE as any).Scene = vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    children: [],
    userData: {},
    background: undefined,
}));

// Camera
(THREE as any).PerspectiveCamera = vi
    .fn()
    .mockImplementation(
        (_fov?: number, aspect?: number, _near?: number, _far?: number) => ({
            position: enhanceVector3({ x: 0, y: 0, z: 0 }),
            aspect: aspect ?? 1,
            updateProjectionMatrix: vi.fn(),
        }),
    );

// Renderer with capabilities and info
(THREE as any).WebGLRenderer = vi.fn().mockImplementation((_opts?: any) => ({
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
    domElement: document.createElement("canvas"),
    shadowMap: { enabled: false, type: (THREE as any).PCFShadowMap },
    capabilities: { getMaxAnisotropy: vi.fn(() => 4) },
    info: {
        render: { triangles: 0 },
        memory: { geometries: 0, textures: 0 },
    },
}));

// LOD
(THREE as any).LOD = vi.fn().mockImplementation(() => {
    const levels: any[] = [];
    return {
        addLevel: vi.fn((mesh: any, distance: number) =>
            levels.push({ mesh, distance }),
        ),
        update: vi.fn(),
        position: enhanceVector3({ x: 0, y: 0, z: 0 }),
        scale: { setScalar: vi.fn() },
        userData: {},
        name: "",
    };
});

// Points and materials
(THREE as any).PointsMaterial = vi.fn().mockImplementation((_cfg?: any) => ({
    dispose: vi.fn(),
}));
(THREE as any).Points = vi
    .fn()
    .mockImplementation((geometry?: any, material?: any) => ({
        geometry,
        material,
        rotation: { x: 0, y: 0 },
        castShadow: false,
        receiveShadow: false,
    }));

// Raycaster with overridable intersects
declare global {
    var __threeRaycasterIntersects: any[] | undefined;
}
(THREE as any).Raycaster = vi.fn().mockImplementation(() => ({
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn(
        (_objs: any[]) => globalThis.__threeRaycasterIntersects ?? [],
    ),
}));

// Mock OrbitControls and thick line modules from three/examples
vi.mock("three/examples/jsm/controls/OrbitControls.js", () => {
    class OrbitControls {
        enabled = true;
        enableDamping = false;
        dampingFactor = 0.05;
        enableZoom = true;
        enableRotate = true;
        enablePan = true;
        mouseButtons = { LEFT: 0, RIGHT: 2 };
        target = enhanceVector3({ x: 0, y: 0, z: 0 });
        constructor(_camera: any, _dom: any) {}
        addEventListener = vi.fn();
        update = vi.fn();
        dispose = vi.fn();
        maxDistance = 25000;
        minDistance = 5;
        maxPolarAngle = Math.PI;
    }
    return { OrbitControls };
});

vi.mock("three/examples/jsm/lines/LineGeometry.js", () => {
    class LineGeometry {
        setPositions = vi.fn((_arr: number[]) => {});
        dispose = vi.fn();
    }
    return { LineGeometry };
});
vi.mock("three/examples/jsm/lines/LineMaterial.js", () => {
    class LineMaterial {
        resolution = { set: vi.fn((_w: number, _h: number) => {}) };
        opacity = 1;
        dispose = vi.fn();
        constructor(_cfg?: any) {}
    }
    return { LineMaterial };
});
vi.mock("three/examples/jsm/lines/Line2.js", () => {
    class Line2 {
        geometry: any;
        material: any;
        name = "";
        visible = true;
        constructor(geometry: any, material: any) {
            this.geometry = geometry;
            this.material = material;
        }
    }
    return { Line2 };
});

// Override canvas getContext to handle both 2d and webgl
HTMLCanvasElement.prototype.getContext = vi.fn((type: string) => {
    if (type === "webgl" || type === "experimental-webgl") {
        return {
            getExtension: (name: string) => {
                if (name.includes("anisotropic")) {
                    return { MAX_TEXTURE_MAX_ANISOTROPY_EXT: 4 };
                }
                return null;
            },
            getParameter: (param: any) => {
                if (
                    typeof param === "object" &&
                    "MAX_TEXTURE_MAX_ANISOTROPY_EXT" in param
                ) {
                    return 4;
                }
                return 0;
            },
        } as any;
    }
    // Fallback 2d context mock
    return {
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
        createRadialGradient: vi.fn(() => ({
            addColorStop: vi.fn(),
        })),
    } as any;
});

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
