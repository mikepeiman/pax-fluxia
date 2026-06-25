import { describe, expect, it } from "bun:test";
import { validateTransitionDiagnosticBundleForBenchmark } from "./transition-diagnostic-benchmark-validation";

function buildCurrentPackage(captureDiagnostics: unknown) {
    return {
        exportKind: "transition_diagnostic_package",
        bundleId: "bundle-1",
        transitionId: "transition-1",
        previousGeometry: { version: "pre" },
        nextGeometry: { version: "post" },
        selectedFrames: [{ progress: 0.5, filename: "frame_01.png", sourceIndex: 1 }],
        captureDiagnostics,
    };
}

describe("validateTransitionDiagnosticBundleForBenchmark", () => {
    it("accepts a legacy step bundle with ordered O01 and passing R04", () => {
        const result = validateTransitionDiagnosticBundleForBenchmark({
            version: "pv-transition-diagnostics-v1",
            steps: [
                { stepId: "O01", failIf: [] },
                {
                    stepId: "R04",
                    text: { withinTolerance: true },
                    failIf: [],
                },
            ],
        });

        expect(result).toMatchObject({
            ok: true,
            contract: "legacy_steps",
        });
    });

    it("rejects a legacy step bundle with triggered failIf entries", () => {
        const result = validateTransitionDiagnosticBundleForBenchmark({
            schemaVersion: "pv-transition-diagnostics-v1",
            steps: [
                { stepId: "O01", failIf: [] },
                {
                    stepId: "R04",
                    text: { withinTolerance: true },
                    failIf: [{ label: "drift", triggered: true }],
                },
            ],
        });

        expect(result.ok).toBe(false);
        expect(result.errors.join("\n")).toContain("failIf triggered");
    });

    it("rejects a legacy step bundle when the final compare is not within tolerance", () => {
        const result = validateTransitionDiagnosticBundleForBenchmark({
            version: "pv-transition-diagnostics-v1",
            steps: [
                { stepId: "O01", failIf: [] },
                {
                    stepId: "R04",
                    finalCompare: { withinTolerance: false },
                    failIf: [],
                },
            ],
        });

        expect(result.ok).toBe(false);
        expect(result.errors.join("\n")).toContain("R04 final compare");
    });

    it("accepts a current perimeter-field diagnostic package", () => {
        const result = validateTransitionDiagnosticBundleForBenchmark(
            buildCurrentPackage({
                kind: "perimeter_field_live_capture",
                totalTransitionFrames: 3,
                previousFrame: { ownerCount: 2 },
                nextFrame: { ownerCount: 2 },
                selectedTransitionFrames: [
                    {
                        frameIndex: 1,
                        progress: 0.5,
                        snapshot: { ownerCount: 2 },
                    },
                ],
            }),
        );

        expect(result).toMatchObject({
            ok: true,
            contract: "transition_diagnostic_package",
        });
    });

    it("accepts a current territory live capture package", () => {
        const result = validateTransitionDiagnosticBundleForBenchmark(
            buildCurrentPackage({
                kind: "territory_live_capture",
                mode: "cell_grid",
                previousFrame: { progress: 0, familyId: "cell_grid" },
                nextFrame: { progress: 1, familyId: "cell_grid" },
                transitionFrames: [
                    {
                        frameIndex: 1,
                        progress: 0,
                        snapshot: { progress: 0 },
                    },
                    {
                        frameIndex: 2,
                        progress: 0.5,
                        snapshot: { progress: 0.5 },
                    },
                    {
                        frameIndex: 3,
                        progress: 0.95,
                        snapshot: { progress: 0.95 },
                    },
                ],
            }),
        );

        expect(result).toMatchObject({
            ok: true,
            contract: "transition_diagnostic_package",
            summary: {
                captureKind: "territory_live_capture",
                transitionFrameCount: 3,
            },
        });
    });

    it("rejects a current diagnostic package without capture diagnostics", () => {
        const result = validateTransitionDiagnosticBundleForBenchmark(
            buildCurrentPackage(undefined),
        );

        expect(result.ok).toBe(false);
        expect(result.errors.join("\n")).toContain("captureDiagnostics is missing");
    });

    it("accepts a current power-voronoi diagnostic package with endpoint samples", () => {
        const result = validateTransitionDiagnosticBundleForBenchmark(
            buildCurrentPackage({
                kind: "power_voronoi_runtime",
                ownershipStage: { stageId: "ownership" },
                geometryStage: { stageId: "geometry" },
                transitionPlanningStage: {
                    stageId: "planning",
                    summary: { transitionFrontCount: 1 },
                },
                frameEvaluationStage: {
                    stageId: "frames",
                    sampledFrames: [
                        {
                            sampleId: "frame-0",
                            progress: 0,
                            matchesPreGeometry: true,
                            matchesPostGeometry: false,
                        },
                        {
                            sampleId: "frame-1",
                            progress: 1,
                            matchesPreGeometry: false,
                            matchesPostGeometry: true,
                        },
                    ],
                },
            }),
        );

        expect(result).toMatchObject({
            ok: true,
            contract: "transition_diagnostic_package",
        });
        expect(result.summary).toMatchObject({
            captureKind: "power_voronoi_runtime",
            matchesPreGeometry: true,
            matchesPostGeometry: true,
        });
    });
});
