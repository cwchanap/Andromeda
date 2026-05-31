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

export class OrbitResolver {
    private anchors = new Map<string, RegisteredAnchor>();
    private bodies = new Map<string, RegisteredBody>();
    private elapsedSeconds = 0;
    private warnedMissingCenters = new Set<string>();

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
        marker.visible = anchor.data.overlay?.visibleByDefault ?? false;
    }

    registerBody(data: CelestialBodyData, object: THREE.Object3D): void {
        const fallbackPosition = data.position.clone();
        this.bodies.set(data.id, {
            data,
            object,
            fallbackPosition,
        });

        if (data.orbit) {
            const position = this.resolveBodyPosition(data.id, new Set());
            object.position.copy(position);
        }
    }

    hasAnchors(): boolean {
        return this.anchors.size > 0;
    }

    setAnchorOverlayVisible(visible: boolean): void {
        this.anchors.forEach((anchor) => {
            if (anchor.marker) {
                anchor.marker.visible = visible;
            }
        });
    }

    update(deltaTime: number, orbitSpeedMultiplier: number): void {
        this.elapsedSeconds += deltaTime * orbitSpeedMultiplier;

        this.anchors.forEach((anchor) => {
            anchor.position.copy(this.resolveAnchorPosition(anchor.data.id));
            if (anchor.marker) {
                anchor.marker.position.copy(anchor.position);
            }
        });

        this.bodies.forEach((body) => {
            if (!body.data.orbit) return;
            body.object.position.copy(
                this.resolveBodyPosition(body.data.id, new Set()),
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

    private resolveAnchorPosition(anchorId: string): THREE.Vector3 {
        const anchor = this.anchors.get(anchorId);
        if (!anchor) {
            return new THREE.Vector3(0, 0, 0);
        }

        if (!anchor.data.orbit) {
            return anchor.fallbackPosition.clone();
        }

        const center = this.getCenterPosition(anchor.data.orbit.centerId);
        if (!center) {
            this.warnMissingCenter(anchorId, anchor.data.orbit.centerId);
            return anchor.fallbackPosition.clone();
        }

        return positionFromOrbitalElements(
            anchor.data.orbit,
            this.elapsedSeconds,
            center,
        );
    }

    private resolveBodyPosition(
        bodyId: string,
        visited: Set<string>,
    ): THREE.Vector3 {
        const body = this.bodies.get(bodyId);
        if (!body) {
            return new THREE.Vector3(0, 0, 0);
        }

        if (!body.data.orbit) {
            return body.object.position.clone();
        }

        if (visited.has(bodyId)) {
            console.warn(`Orbit cycle detected while resolving '${bodyId}'.`);
            return body.fallbackPosition.clone();
        }
        visited.add(bodyId);

        let center = this.anchors.get(body.data.orbit.centerId)?.position;
        const centerBody = this.bodies.get(body.data.orbit.centerId);
        if (!center && centerBody) {
            center = centerBody.data.orbit
                ? this.resolveBodyPosition(centerBody.data.id, visited)
                : centerBody.object.position.clone();
        }

        if (!center) {
            this.warnMissingCenter(bodyId, body.data.orbit.centerId);
            return body.fallbackPosition.clone();
        }

        return positionFromOrbitalElements(
            body.data.orbit,
            this.elapsedSeconds,
            center,
        );
    }

    private warnMissingCenter(objectId: string, centerId: string): void {
        const warningKey = `${objectId}:${centerId}`;
        if (this.warnedMissingCenters.has(warningKey)) return;
        this.warnedMissingCenters.add(warningKey);
        console.warn(
            `Orbit center '${centerId}' not found for '${objectId}'. Keeping authored fallback position.`,
        );
    }
}
