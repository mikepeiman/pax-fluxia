// ============================================================================
// Map Types - Authoritative authored maps live in @pax/common/maps
// ============================================================================

export type {
  AuthoredFactionSlot,
  AuthoredLane as MapConnectionDefinition,
  AuthoredMapDefinition as MapDefinition,
  AuthoredMeasurement,
  AuthoredMeasurementAnchor,
  AuthoredMeasurementMode,
  AuthoredMeasurementPreset,
  AuthoredMeasurementSnapKind,
  AuthoredStar as MapStarDefinition,
  MapValidationIssue,
} from "@pax/common/maps";

import type { AuthoredMapDefinition } from "@pax/common/maps";
import type { StarId, PlayerId } from "./game.types";

/**
 * Template-based map definition (legacy placeholder).
 * Kept for backward compatibility with older menu/data code.
 */
export interface MapTemplate {
  template: string;
  params: {
    players: number;
    size: "small" | "medium" | "large" | "huge";
    density: "sparse" | "normal" | "dense";
    features?: string[];
    symmetry?: "none" | "radial" | "bilateral";
    specialZones?: string[];
  };
}

/**
 * In-progress game snapshot.
 * References a named authored map definition and embeds a full authored copy.
 */
export interface SavedGame {
  id: string;
  name: string;
  createdAt: string;
  tick: number;
  mapName: string;
  mapSnapshot: AuthoredMapDefinition;
  stars: Array<{
    id: StarId;
    ownerId: PlayerId;
    activeShips: number;
    damagedShips: number;
    targetId: string;
  }>;
  thumbnail?: string;
}

export type MapInput = string | MapTemplate | AuthoredMapDefinition;

export const PREDEFINED_TEMPLATES: Record<string, Partial<MapTemplate["params"]>> = {
  balanced_galaxy: {
    size: "medium",
    density: "normal",
    symmetry: "radial",
    features: [],
  },
  dense_cluster: {
    size: "small",
    density: "dense",
    symmetry: "none",
    features: ["nebula_zones"],
  },
  sparse_frontier: {
    size: "large",
    density: "sparse",
    symmetry: "none",
    features: ["asteroid_fields"],
  },
  symmetric_warfare: {
    size: "medium",
    density: "normal",
    symmetry: "bilateral",
    features: [],
  },
};

export function isMapTemplate(input: MapInput): input is MapTemplate {
  return typeof input === "object" && input !== null && "template" in input && "params" in input;
}

export function isMapDefinition(input: MapInput): input is AuthoredMapDefinition {
  return typeof input === "object" && input !== null && "metadata" in input && "stars" in input && "connections" in input;
}

export function isStringMap(input: MapInput): input is string {
  return typeof input === "string";
}
