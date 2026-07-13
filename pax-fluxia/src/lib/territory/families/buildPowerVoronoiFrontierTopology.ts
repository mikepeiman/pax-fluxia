// Transitional shim (cleanup Stage 2): the frontier-topology builder moved DOWN
// into the geometry layer (it IS geometry — geometry must not import up into
// families). This re-export keeps the remaining legacy `families/perimeterField`
// importers working; it is removed when perimeterField is quarantined (Stage 3).
export * from '../geometry/buildPowerVoronoiFrontierTopology';
