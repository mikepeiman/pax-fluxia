// ============================================================================
// Map Types - Definitions for custom map formats
// ============================================================================

import type { StarId, PlayerId, StarType } from './game.types';

/**
 * Template-based map definition (parametric)
 * Used for URL sharing and procedural generation with parameters
 */
export interface MapTemplate {
  template: string;
  params: {
    players: number;
    size: 'small' | 'medium' | 'large' | 'huge';
    density: 'sparse' | 'normal' | 'dense';
    features?: string[]; // e.g., ['nebula_zones', 'asteroid_fields']
    symmetry?: 'none' | 'radial' | 'bilateral';
    specialZones?: string[];
  };
}

/**
 * Full JSON map definition (explicit)
 * Used for hand-crafted maps with complete control
 */
export interface MapDefinition {
  metadata: {
    name: string;
    author?: string;
    description?: string;
    version?: number;
    createdAt?: string;
  };
  stars: Array<{
    id: StarId;
    x: number;
    y: number;
    ownerId: PlayerId;
    starType: StarType;
    activeShips?: number;
    damagedShips?: number;
    productionRate?: number;
    specialTraits?: string[];
  }>;
  connections: Array<{
    sourceId: StarId;
    targetId: StarId;
    distance?: number;
  }>;
  customRules?: Record<string, any>;
}

/**
 * Union type for map input to generateMap function
 */
export type MapInput = string | MapTemplate | MapDefinition;

/**
 * Predefined template configurations
 */
export const PREDEFINED_TEMPLATES: Record<string, Partial<MapTemplate['params']>> = {
  'balanced_galaxy': {
    size: 'medium',
    density: 'normal',
    symmetry: 'radial',
    features: []
  },
  'dense_cluster': {
    size: 'small',
    density: 'dense',
    symmetry: 'none',
    features: ['nebula_zones']
  },
  'sparse_frontier': {
    size: 'large',
    density: 'sparse',
    symmetry: 'none',
    features: ['asteroid_fields']
  },
  'symmetric_warfare': {
    size: 'medium',
    density: 'normal',
    symmetry: 'bilateral',
    features: []
  }
};

/**
 * Type guards for map input validation
 */
export function isMapTemplate(input: MapInput): input is MapTemplate {
  return typeof input === 'object' && 'template' in input && 'params' in input;
}

export function isMapDefinition(input: MapInput): input is MapDefinition {
  return typeof input === 'object' && 'metadata' in input && 'stars' in input && 'connections' in input;
}

export function isStringMap(input: MapInput): input is string {
  return typeof input === 'string';
}