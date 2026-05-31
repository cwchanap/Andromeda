import * as THREE from "three";
import type { CelestialBodyData } from "@/types/game";
import type { OrbitAnchorData } from "@/lib/planetary-system/types";
import {
    positionFromOrbitalElements,
    sampleOrbitLinePositions,
} from "./orbitalElements";

interface RegisteredBody {
    data: CelestialBodyData;
    object: THREE.Object3D;
    fallbackPosition: THREE.Vector3;
}

interface RegisteredAnchor {
    data: OrbitAnchorData;
    position: THREE.Vector3;
    fallbackPosition: THREE.Vector3;
    marker?: THREE.Object3D;
}

interface ResolvedPosition {
    position: THREE.Vector3;
    valid: boolean;
}

interface ResolutionContext {
    anchors: Map<string, ResolvedPosition>;
    bodies: Map<string, ResolvedPosition>;
    resolving: Set<string>;
}

export class OrbitResolver {
    private anchors = new Map<string, RegisteredAnchor>();
    private bodies = new Map<string, RegisteredBody>();
    private elapsedSeconds = 0;
    private warnedMissingCenters = new Set<string>();
    private warnedCycles = new Set<string>();
    private anchorOverlayVisibleOverride: boolean | null = null;

    registerAnchors(anchors: OrbitAnchorData[] = []): void {
        anchors.forEach((anchor) => {
            const fallbackPosition =
                anchor.position?.clone() ?? new THREE.Vector3(0, 0, 0);
            this.anchors.set(anchor.id, {
                data: anchor,
                position: fallbackPosition.clone(),
                fallbackPosition,
            });
        });
    }

    registerAnchorMarker(anchorId: string, marker: THREE.Object3D): void {
        const anchor = this.anchors.get(anchorId);
        if (!anchor) return;
        anchor.marker = marker;
        marker.position.copy(anchor.position);
        marker.visible =
            this.anchorOverlayVisibleOverride ??
            anchor.data.overlay?.visibleByDefault ??
            false;
    }

    registerBody(data: CelestialBodyData, object: THREE.Object3D): void {
        const fallbackPosition = data.position.clone();
        this.bodies.set(data.id, {
            data,
            object,
            fallbackPosition,
        });
    }

    hasAnchors(): boolean {
        return this.anchors.size > 0;
    }

    setAnchorOverlayVisible(visible: boolean): void {
        this.anchorOverlayVisibleOverride = visible;
        this.anchors.forEach((anchor) => {
            if (anchor.marker) {
                anchor.marker.visible = visible;
            }
        });
    }

    update(deltaTime: number, orbitSpeedMultiplier: number): void {
        this.elapsedSeconds += deltaTime * orbitSpeedMultiplier;
        const context: ResolutionContext = {
            anchors: new Map(),
            bodies: new Map(),
            resolving: new Set(),
        };

        this.anchors.forEach((anchor) => {
            this.resolveAnchorPosition(anchor.data.id, context);
        });

        this.bodies.forEach((body) => {
            this.resolveBodyPosition(body.data.id, context);
        });

        this.anchors.forEach((anchor) => {
            const resolved = context.anchors.get(anchor.data.id);
            anchor.position.copy(resolved?.position ?? anchor.fallbackPosition);
            if (anchor.marker) {
                anchor.marker.position.copy(anchor.position);
            }
        });

        this.bodies.forEach((body) => {
            if (!body.data.orbit) return;
            const resolved = context.bodies.get(body.data.id);
            body.object.position.copy(
                resolved?.position ?? body.fallbackPosition,
            );
        });
    }

    getCenterPosition(centerId: string): THREE.Vector3 | null {
        const anchor = this.anchors.get(centerId);
        if (anchor) {
            return anchor.position.clone();
        }

        const body = this.bodies.get(centerId);
        if (body) {
            return body.object.position.clone();
        }

        return null;
    }

    getOrbitLinePositions(bodyId: string, segments = 128): number[] {
        const body = this.bodies.get(bodyId);
        if (!body?.data.orbit) return [];
        return sampleOrbitLinePositions(body.data.orbit, segments);
    }

    private resolveAnchorPosition(
        anchorId: string,
        context: ResolutionContext,
    ): ResolvedPosition | null {
        const cached = context.anchors.get(anchorId);
        if (cached) return cached;

        const anchor = this.anchors.get(anchorId);
        if (!anchor) {
            return null;
        }

        const resolverKey = `anchor:${anchorId}`;
        if (context.resolving.has(resolverKey)) {
            this.warnCycle(resolverKey);
            const resolved = this.fallbackResolution(anchor.fallbackPosition);
            context.anchors.set(anchorId, resolved);
            return resolved;
        }

        if (!anchor.data.orbit) {
            const resolved = this.fallbackResolution(
                anchor.fallbackPosition,
                true,
            );
            context.anchors.set(anchorId, resolved);
            return resolved;
        }

        context.resolving.add(resolverKey);
        const center = this.resolveCenterPosition(
            anchor.data.orbit.centerId,
            context,
        );
        context.resolving.delete(resolverKey);

        if (!center) {
            this.warnMissingCenter(anchorId, anchor.data.orbit.centerId);
            const resolved = this.fallbackResolution(anchor.fallbackPosition);
            context.anchors.set(anchorId, resolved);
            return resolved;
        }

        if (!center.valid) {
            const resolved = this.fallbackResolution(anchor.fallbackPosition);
            context.anchors.set(anchorId, resolved);
            return resolved;
        }

        const resolved = {
            position: positionFromOrbitalElements(
                anchor.data.orbit,
                this.elapsedSeconds,
                center.position,
            ),
            valid: true,
        };
        context.anchors.set(anchorId, resolved);
        return resolved;
    }

    private resolveBodyPosition(
        bodyId: string,
        context: ResolutionContext,
    ): ResolvedPosition | null {
        const cached = context.bodies.get(bodyId);
        if (cached) return cached;

        const body = this.bodies.get(bodyId);
        if (!body) {
            return null;
        }

        const resolverKey = `body:${bodyId}`;
        if (context.resolving.has(resolverKey)) {
            this.warnCycle(resolverKey);
            const resolved = this.fallbackResolution(body.fallbackPosition);
            context.bodies.set(bodyId, resolved);
            return resolved;
        }

        if (!body.data.orbit) {
            const resolved = {
                position: body.object.position.clone(),
                valid: true,
            };
            context.bodies.set(bodyId, resolved);
            return resolved;
        }

        context.resolving.add(resolverKey);
        const center = this.resolveCenterPosition(
            body.data.orbit.centerId,
            context,
        );
        context.resolving.delete(resolverKey);

        if (!center) {
            this.warnMissingCenter(bodyId, body.data.orbit.centerId);
            const resolved = this.fallbackResolution(body.fallbackPosition);
            context.bodies.set(bodyId, resolved);
            return resolved;
        }

        if (!center.valid) {
            const resolved = this.fallbackResolution(body.fallbackPosition);
            context.bodies.set(bodyId, resolved);
            return resolved;
        }

        const resolved = {
            position: positionFromOrbitalElements(
                body.data.orbit,
                this.elapsedSeconds,
                center.position,
            ),
            valid: true,
        };
        context.bodies.set(bodyId, resolved);
        return resolved;
    }

    private resolveCenterPosition(
        centerId: string,
        context: ResolutionContext,
    ): ResolvedPosition | null {
        if (this.anchors.has(centerId)) {
            return this.resolveAnchorPosition(centerId, context);
        }

        if (this.bodies.has(centerId)) {
            return this.resolveBodyPosition(centerId, context);
        }

        return null;
    }

    private fallbackResolution(
        fallbackPosition: THREE.Vector3,
        valid = false,
    ): ResolvedPosition {
        return {
            position: fallbackPosition.clone(),
            valid,
        };
    }

    private warnMissingCenter(objectId: string, centerId: string): void {
        const warningKey = `${objectId}:${centerId}`;
        if (this.warnedMissingCenters.has(warningKey)) return;
        this.warnedMissingCenters.add(warningKey);
        console.warn(
            `Orbit center '${centerId}' not found for '${objectId}'. Keeping authored fallback position.`,
        );
    }

    private warnCycle(resolverKey: string): void {
        if (this.warnedCycles.has(resolverKey)) return;
        this.warnedCycles.add(resolverKey);
        console.warn(
            `Orbit cycle detected while resolving '${resolverKey}'. Keeping authored fallback position.`,
        );
    }
}
