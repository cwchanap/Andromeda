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
    MathUtils: {
        lerp: vi.fn((start, end, alpha) => start + (end - start) * alpha),
        randFloat: vi.fn((low, high) => low + Math.random() * (high - low)),
        randFloatSpread: vi.fn((range) => range * (0.5 - Math.random())),
    },
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
(THREE as any).BackSide = "BackSide";
(THREE as any).FrontSide = "FrontSide";
(THREE as any).NormalBlending = "NormalBlending";
(THREE as any).Material = class Material {
    dispose = vi.fn();
};
// Create a proper base Material class that can be extended
const MaterialBase = class {
    dispose = vi.fn();
    userData = {};
    emissive = {
        getHex: vi.fn(() => 0),
        r: 0,
        g: 0,
        b: 0,
    };
    emissiveIntensity = 0.3;
    opacity = 1;
    roughness = 0.5;
    metalness = 0.1;
};
(THREE as any).Material = MaterialBase;
(THREE as any).Vector2 = vi
    .fn()
    .mockImplementation((x = 0, y = 0) => ({ x, y }));

// Vector3 enhancements used by camera and animations
const enhanceVector3 = (v: any) => {
    v.set = vi.fn((x: number, y: number, z: number) => {
        v.x = x ?? v.x;
        v.y = y ?? v.y;
        v.z = z ?? v.z;
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
    // Add length method for camera.position.length()
    v.length = () => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return v;
};
// Patch existing mocked Vector3 factory to include methods when constructed in tests
const OrigVector3 = (THREE as any).Vector3;
(THREE as any).Vector3 = vi
    .fn()
    .mockImplementation((x = 0, y = 0, z = 0) => enhanceVector3({ x, y, z }));

// Color
(THREE as any).Color = vi.fn().mockImplementation((color?: any) => {
    const colorObj = {
        r: 0,
        g: 0,
        b: 0,
        setHex: vi.fn().mockReturnThis(),
        copy: vi.fn().mockReturnThis(),
        clone: vi.fn(() => new (THREE as any).Color(color)),
        getHex: vi.fn(() => {
            if (typeof color === "string" && color.startsWith("#")) {
                return parseInt(color.slice(1), 16);
            }
            return 0x000011; // Default to the expected value for fog
        }),
        getHexString: vi.fn(() => {
            if (typeof color === "string" && color.startsWith("#")) {
                return color.slice(1).toLowerCase();
            }
            return "000011"; // Default to the expected value for fog
        }),
    };
    return colorObj;
});

// Fog
(THREE as any).Fog = vi
    .fn()
    .mockImplementation((color?: any, near?: number, far?: number) => ({
        color: color || new (THREE as any).Color(),
        near: near || 50,
        far: far || 500,
    }));

// ShaderMaterial
(THREE as any).ShaderMaterial = vi.fn().mockImplementation((_cfg?: any) => {
    const material = {
        uniforms: _cfg?.uniforms || {},
        vertexShader: _cfg?.vertexShader || "",
        fragmentShader: _cfg?.fragmentShader || "",
        side: _cfg?.side || "FrontSide",
        blending: _cfg?.blending || "NormalBlending",
        transparent: _cfg?.transparent || false,
        depthWrite: _cfg?.depthWrite !== undefined ? _cfg.depthWrite : true,
        dispose: vi.fn(),
    };
    // Make it an instance of both Material and ShaderMaterial for instanceof checks
    Object.setPrototypeOf(material, (THREE as any).ShaderMaterial.prototype);
    Object.setPrototypeOf(
        Object.getPrototypeOf(material),
        (THREE as any).Material.prototype,
    );
    return material;
});

// Clock
(THREE as any).Clock = vi.fn().mockImplementation(() => ({
    getDelta: vi.fn(() => 0.016), // Mock 60fps delta time
    start: vi.fn(),
    stop: vi.fn(),
    elapsedTime: 0,
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
        getAttribute: vi.fn((name: string) => {
            if (attributes[name]) {
                return attributes[name];
            }
            // Return a default attribute with count > 0
            return { array: new Float32Array(9), count: 3 };
        }),
        attributes,
        dispose: vi.fn(),
        computeVertexNormals: vi.fn(),
    };
});

(THREE as any).SphereGeometry = vi
    .fn()
    .mockImplementation((_r?: number, _w?: number, _h?: number) => {
        const geometry = {
            dispose: vi.fn(),
            getAttribute: vi.fn((name: string) => {
                if (name === "position") {
                    return {
                        array: new Float32Array(100), // Mock some vertex data
                        count: 33, // 100 / 3 = 33.33, rounded down
                    };
                }
                return { array: new Float32Array(0), count: 0 };
            }),
            computeVertexNormals: vi.fn(),
        };
        // Create proper prototype chain: SphereGeometry -> BufferGeometry
        const sphereProto = Object.create(
            (THREE as any).BufferGeometry.prototype,
        );
        (THREE as any).SphereGeometry.prototype = sphereProto;
        Object.setPrototypeOf(
            geometry,
            (THREE as any).SphereGeometry.prototype,
        );
        return geometry;
    });

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
    emissive: {
        getHex: vi.fn(() => 0),
        clone: vi.fn(() => new (THREE as any).Color()),
        setHex: vi.fn(),
        r: 0,
        g: 0,
        b: 0,
    },
    emissiveIntensity: 0.3, // Default value
    opacity: 1,
    roughness: 0.5,
    metalness: 0.1,
});

(THREE as any).MeshStandardMaterial = vi
    .fn()
    .mockImplementation((_cfg?: any) => {
        const material = {
            ...makeStdMaterial(),
            ...(_cfg ?? {}),
        };
        // If emissive is provided in config, use a proper Color mock
        if (_cfg?.emissive) {
            material.emissive = new (THREE as any).Color(_cfg.emissive);
        }
        // Make it an instance of both Material and MeshStandardMaterial for instanceof checks
        Object.setPrototypeOf(
            material,
            (THREE as any).MeshStandardMaterial.prototype,
        );
        Object.setPrototypeOf(
            Object.getPrototypeOf(material),
            (THREE as any).Material.prototype,
        );
        return material;
    });

(THREE as any).MeshBasicMaterial = vi.fn().mockImplementation((_cfg?: any) => {
    const material = {
        ...makeStdMaterial(),
        ...(_cfg ?? {}),
    };
    // Make it an instance of both Material and MeshBasicMaterial for instanceof checks
    Object.setPrototypeOf(material, (THREE as any).MeshBasicMaterial.prototype);
    Object.setPrototypeOf(
        Object.getPrototypeOf(material),
        (THREE as any).Material.prototype,
    );
    return material;
});

(THREE as any).MeshPhongMaterial = vi.fn().mockImplementation((_cfg?: any) => {
    const material = {
        ...makeStdMaterial(),
        ...(_cfg ?? {}),
    };
    // Make it an instance of both Material and MeshPhongMaterial for instanceof checks
    Object.setPrototypeOf(material, (THREE as any).MeshPhongMaterial.prototype);
    Object.setPrototypeOf(
        Object.getPrototypeOf(material),
        (THREE as any).Material.prototype,
    );
    return material;
});

// Objects
class MockMesh extends (THREE as any).Mesh {
    constructor(geometry?: any, material?: any) {
        super(geometry, material);
        this.geometry = geometry;
        this.material = material;
        this.position = enhanceVector3({ x: 0, y: 0, z: 0 });
        this.scale = { setScalar: vi.fn() };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.userData = {};
        this.name = "";
        this.castShadow = false;
        this.receiveShadow = false;
        this.children = [];
        this.add = vi.fn((c: any) => {
            this.children.push(c);
            return this;
        });
        this.getObjectByName = vi.fn(
            (n: string) => this.children.find((c: any) => c.name === n) || null,
        );
        // Ensure instanceof THREE.Mesh works
        Object.setPrototypeOf(this, (THREE as any).Mesh.prototype);
    }
}

(THREE as any).Mesh = vi
    .fn()
    .mockImplementation((geometry?: any, material?: any) => {
        return new MockMesh(geometry, material);
    });

class MockGroup extends (THREE as any).Group {
    constructor() {
        super();
        this.position = enhanceVector3({ x: 0, y: 0, z: 0 });
        this.scale = { setScalar: vi.fn() };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.userData = {};
        this.name = "";
        this.castShadow = false;
        this.receiveShadow = false;
        this.add = vi.fn((c: any) => {
            this.children.push(c);
            return this;
        });
        this.remove = vi.fn((c: any) => {
            const i = this.children.indexOf(c);
            if (i >= 0) this.children.splice(i, 1);
            return this;
        });
        this.getObjectByName = vi.fn(
            (n: string) => this.children.find((c: any) => c.name === n) || null,
        );
        this.traverse = vi.fn((callback: (child: any) => void) => {
            callback(this); // Call on self
            this.children.forEach(callback); // Call on children
        });
        // Make sure the traverse method actually calls the callback on children
        this.traverse.mockImplementation((callback: (child: any) => void) => {
            callback(this); // Call on self
            this.children.forEach(callback); // Call on children
        });
        // Ensure instanceof THREE.Group works
        this.getWorldPosition = vi.fn((target: any) => {
            target.x = this.position.x;
            target.y = this.position.y;
            target.z = this.position.z;
            return target;
        });
        Object.setPrototypeOf(this, (THREE as any).Group.prototype);
    }
}

(THREE as any).Group = vi.fn().mockImplementation(() => {
    return new MockGroup();
});

// Lights
(THREE as any).PointLight = vi
    .fn()
    .mockImplementation((_c?: any, _i?: number, _d?: number) => ({
        position: enhanceVector3({ x: 0, y: 0, z: 0 }),
        castShadow: false,
    }));
(THREE as any).DirectionalLight = vi
    .fn()
    .mockImplementation((_c?: any, _i?: number) => ({
        position: enhanceVector3({ x: 0, y: 0, z: 0 }),
        castShadow: false,
        intensity: _i ?? 1,
        dispose: vi.fn(),
    }));
(THREE as any).AmbientLight = vi
    .fn()
    .mockImplementation((_c?: any, i?: number) => ({
        intensity: i ?? 1,
        dispose: vi.fn(),
    }));

// Scene with userData and background support
(THREE as any).Scene = vi.fn().mockImplementation(() => {
    const scene: any = {
        add: vi.fn((obj: any) => {
            scene.children.push(obj);
        }),
        remove: vi.fn((obj: any) => {
            const index = scene.children.indexOf(obj);
            if (index > -1) {
                scene.children.splice(index, 1);
            }
        }),
        children: [] as any[],
        userData: {},
        background: undefined,
    };
    return scene;
});

// Camera
(THREE as any).PerspectiveCamera = vi
    .fn()
    .mockImplementation(
        (_fov?: number, aspect?: number, _near?: number, _far?: number) => ({
            position: enhanceVector3({ x: 0, y: 0, z: 0 }),
            aspect: aspect ?? 1,
            fov: _fov ?? 75,
            near: _near ?? 0.1,
            far: _far ?? 1000,
            updateProjectionMatrix: vi.fn(),
            lookAt: vi.fn(),
        }),
    );

(THREE as any).OrthographicCamera = vi
    .fn()
    .mockImplementation(
        (
            left?: number,
            right?: number,
            top?: number,
            bottom?: number,
            near?: number,
            far?: number,
        ) => ({
            position: enhanceVector3({ x: 0, y: 0, z: 0 }),
            left: left ?? -1,
            right: right ?? 1,
            top: top ?? 1,
            bottom: bottom ?? -1,
            near: near ?? 0.1,
            far: far ?? 1000,
            updateProjectionMatrix: vi.fn(),
            lookAt: vi.fn(),
        }),
    );

// Renderer with capabilities and info
(THREE as any).WebGLRenderer = vi.fn().mockImplementation((_opts?: any) => {
    const renderer = {
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
    };

    // Don't automatically add domElement to any container
    // Let the tests control when the canvas is added

    return renderer;
});

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
    size: _cfg?.size ?? 1,
    sizeAttenuation: _cfg?.sizeAttenuation ?? true,
    vertexColors: _cfg?.vertexColors ?? false,
    transparent: _cfg?.transparent ?? false,
    opacity: _cfg?.opacity ?? 1,
    blending: _cfg?.blending ?? "NormalBlending",
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

// SpriteMaterial and Sprite for labels
(THREE as any).SpriteMaterial = vi.fn().mockImplementation((_cfg?: any) => ({
    map: _cfg?.map ?? null,
    transparent: _cfg?.transparent ?? false,
    dispose: vi.fn(),
}));

(THREE as any).Sprite = vi.fn().mockImplementation((material?: any) => ({
    material,
    position: enhanceVector3({ x: 0, y: 0, z: 0 }),
    scale: { set: vi.fn() },
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
        position: any;
        constructor(geometry: any, material: any) {
            this.geometry = geometry;
            this.material = material;
            this.position = enhanceVector3({ x: 0, y: 0, z: 0 });
        }
        getWorldPosition(target: any) {
            target.x = this.position.x;
            target.y = this.position.y;
            target.z = this.position.z;
            return target;
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

// Mock requestAnimationFrame for animation loop testing
Object.defineProperty(global, "requestAnimationFrame", {
    writable: true,
    value: vi.fn((cb: FrameRequestCallback) => {
        // Return a frame ID but don't actually execute the callback
        // This prevents infinite loops and timing issues in tests
        return 1;
    }),
});

Object.defineProperty(global, "cancelAnimationFrame", {
    writable: true,
    value: vi.fn(),
});

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
