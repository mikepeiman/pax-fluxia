import { describe, expect, it } from 'vitest';
import {
    blurTerritoryFrontierPhaseField,
    extractTerritoryFrontierContours,
    resolveTerritoryFrontierSurfaceRecipe,
    smoothTerritoryFrontierPolyline,
    type TerritoryFrontierPhaseFieldLayer,
} from './index';

function makeLayer(params: {
    cols: number;
    rows: number;
    values: number[];
    threshold?: number;
}): TerritoryFrontierPhaseFieldLayer {
    return {
        id: 'layer',
        label: 'Layer',
        cols: params.cols,
        rows: params.rows,
        originX: 0,
        originY: 0,
        cellSizePx: 10,
        threshold: params.threshold ?? 0.5,
        values: Float32Array.from(params.values),
        ownerIndexByCell: Int32Array.from(
            params.values.map((value) => (value >= (params.threshold ?? 0.5) ? 1 : 0)),
        ),
    };
}

describe('territory frontier utility', () => {
    it('phase filtering never touches owner ids', () => {
        const layer = makeLayer({
            cols: 2,
            rows: 2,
            values: [0, 1, 1, 0],
        });
        const ownerBefore = [...layer.ownerIndexByCell];
        const blurred = blurTerritoryFrontierPhaseField(
            { layers: [layer] },
            1,
        );
        expect([...blurred.layers[0].ownerIndexByCell]).toEqual(ownerBefore);
    });

    it('3-tap blur matches the expected separable kernel', () => {
        const layer = makeLayer({
            cols: 3,
            rows: 3,
            values: [
                0, 0, 0,
                0, 1, 0,
                0, 0, 0,
            ],
        });
        const blurred = blurTerritoryFrontierPhaseField(
            { layers: [layer] },
            1,
        ).layers[0].values;
        expect(Array.from(blurred).map((value) => Number(value.toFixed(4)))).toEqual([
            0.1111, 0.1667, 0.1111,
            0.1667, 0.25, 0.1667,
            0.1111, 0.1667, 0.1111,
        ]);
    });

    it('marching-squares midpoint and scalar interpolation stay deterministic and distinct', () => {
        const layer = makeLayer({
            cols: 2,
            rows: 2,
            values: [0.2, 0.9, 0.8, 0.1],
        });
        const midpoint = extractTerritoryFrontierContours({
            phaseField: { layers: [layer] },
            technique: 'marching_squares_midpoint',
            triangleDiagonalPolicy: 'fixed',
        });
        const scalar = extractTerritoryFrontierContours({
            phaseField: { layers: [layer] },
            technique: 'marching_squares_scalar',
            triangleDiagonalPolicy: 'fixed',
        });
        expect(midpoint.layers[0].polylines.length).toBe(2);
        expect(scalar.layers[0].polylines.length).toBe(2);
        expect(scalar.layers[0].polylines[0].points).not.toEqual(
            midpoint.layers[0].polylines[0].points,
        );
        expect(extractTerritoryFrontierContours({
            phaseField: { layers: [layer] },
            technique: 'marching_squares_scalar',
            triangleDiagonalPolicy: 'fixed',
        })).toEqual(scalar);
    });

    it('triangle diagonal policies resolve ambiguous cases differently', () => {
        const layer = makeLayer({
            cols: 3,
            rows: 2,
            values: [
                0, 1, 0,
                1, 0, 1,
            ],
        });
        const fixed = extractTerritoryFrontierContours({
            phaseField: { layers: [layer] },
            technique: 'marching_triangles_fixed',
            triangleDiagonalPolicy: 'fixed',
        });
        const checkerboard = extractTerritoryFrontierContours({
            phaseField: { layers: [layer] },
            technique: 'marching_triangles_checkerboard',
            triangleDiagonalPolicy: 'checkerboard',
        });
        expect(fixed.layers[0].polylines.length).toBeGreaterThan(0);
        expect(checkerboard.layers[0].polylines.length).toBeGreaterThan(0);
        expect(checkerboard.layers[0].polylines).not.toEqual(
            fixed.layers[0].polylines,
        );
    });

    it('Chaikin smoothing preserves open vs closed behavior and bounded shrinkage', () => {
        const open = smoothTerritoryFrontierPolyline(
            {
                points: [0, 0, 10, 0, 10, 10],
                closed: false,
            },
            1,
        );
        expect(open.points[0]).toBe(0);
        expect(open.points[1]).toBe(0);
        expect(open.points[open.points.length - 2]).toBe(10);
        expect(open.points[open.points.length - 1]).toBe(10);

        const closed = smoothTerritoryFrontierPolyline(
            {
                points: [0, 0, 10, 0, 10, 10, 0, 10],
                closed: true,
            },
            1,
        );
        const xs = closed.points.filter((_, index) => index % 2 === 0);
        const ys = closed.points.filter((_, index) => index % 2 === 1);
        expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...xs)).toBeLessThanOrEqual(10);
        expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...ys)).toBeLessThanOrEqual(10);
        expect(xs.some((value) => value > 0 && value < 10)).toBe(true);
        expect(ys.some((value) => value > 0 && value < 10)).toBe(true);
    });

    it('surface recipe keeps stable and transition geometry on the same family', () => {
        const sharedEdge = resolveTerritoryFrontierSurfaceRecipe({
            technique: 'control',
            borderGeometryMode: 'shared_edge',
        });
        expect(sharedEdge.geometryFamily).toBe('shared_edge');
        expect(sharedEdge.stableGeometryFamily).toBe('shared_edge');
        expect(sharedEdge.transitionGeometryFamily).toBe('shared_edge');
        expect(sharedEdge.borderSource).toBe('shared_edge');
        expect(sharedEdge.invariantViolation).toBeNull();

        const contourMatched = resolveTerritoryFrontierSurfaceRecipe({
            technique: 'control',
            borderGeometryMode: 'contour_matched',
        });
        expect(contourMatched.geometryFamily).toBe('phase_contour');
        expect(contourMatched.stableGeometryFamily).toBe('phase_contour');
        expect(contourMatched.transitionGeometryFamily).toBe('phase_contour');
        expect(contourMatched.borderSource).toBe('contour');
        expect(contourMatched.invariantViolation).toBeNull();

        const shaderBand = resolveTerritoryFrontierSurfaceRecipe({
            technique: 'shader_frontier_band',
            borderGeometryMode: 'shared_edge',
        });
        expect(shaderBand.geometryFamily).toBe('phase_band');
        expect(shaderBand.stableGeometryFamily).toBe('phase_band');
        expect(shaderBand.transitionGeometryFamily).toBe('phase_band');
        expect(shaderBand.borderSource).toBe('frontier_band');
        expect(shaderBand.invariantViolation).toBeNull();
    });
});
