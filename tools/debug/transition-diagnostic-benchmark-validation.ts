export interface TransitionDiagnosticValidationResult {
    ok: boolean;
    contract: 'legacy_steps' | 'transition_diagnostic_package' | 'unknown';
    errors: string[];
    warnings: string[];
    summary: Record<string, unknown>;
}

const LEGACY_SCHEMA_VERSION = 'pv-transition-diagnostics-v1';
const PACKAGE_EXPORT_KIND = 'transition_diagnostic_package';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return isRecord(value) ? value : null;
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeGeometryVersionForConquestOwners(
    version: string,
    conquestEvents: readonly Record<string, unknown>[],
): string {
    let normalized = version;
    for (const event of conquestEvents) {
        const starId = String(event.starId ?? '');
        if (!starId) continue;
        const owners = [
            String(event.previousOwner ?? ''),
            String(event.newOwner ?? ''),
        ].filter((owner) => owner.length > 0);
        if (owners.length === 0) continue;
        const ownerPattern = owners.map(escapeRegExp).join('|');
        normalized = normalized.replace(
            new RegExp(`s${escapeRegExp(starId)}:(?:${ownerPattern}):`, 'g'),
            `s${starId}:OWNER:`,
        );
    }
    return normalized;
}

function hasTriggeredFailIf(step: Record<string, unknown>): boolean {
    return asArray(step.failIf).some(
        (entry) => asRecord(entry)?.triggered === true,
    );
}

function readFinalCompareWithinTolerance(step: Record<string, unknown>): boolean | null {
    const text = asRecord(step.text);
    if (typeof text?.withinTolerance === 'boolean') return text.withinTolerance;
    const finalCompare = asRecord(step.finalCompare);
    if (typeof finalCompare?.withinTolerance === 'boolean') {
        return finalCompare.withinTolerance;
    }
    return null;
}

function validateLegacyStepBundle(
    bundle: Record<string, unknown>,
): TransitionDiagnosticValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const version = String(bundle.version ?? bundle.schemaVersion ?? '');
    if (version !== LEGACY_SCHEMA_VERSION) {
        errors.push(`expected legacy schema ${LEGACY_SCHEMA_VERSION}, got ${version || 'missing'}`);
    }

    const steps = asArray(bundle.steps).filter(isRecord);
    if (steps.length === 0) {
        errors.push('legacy diagnostic steps are missing');
    }
    const stepIds = steps.map((step) => String(step.stepId ?? ''));
    const firstO01 = stepIds.indexOf('O01');
    const firstR04 = stepIds.indexOf('R04');
    if (firstO01 < 0) errors.push('legacy diagnostic step O01 is missing');
    if (firstR04 < 0) errors.push('legacy diagnostic step R04 is missing');
    if (firstO01 >= 0 && firstR04 >= 0 && firstO01 > firstR04) {
        errors.push('legacy diagnostic step order is invalid: O01 appears after R04');
    }

    const duplicateStepIds = stepIds.filter(
        (stepId, index) => stepId && stepIds.indexOf(stepId) !== index,
    );
    if (duplicateStepIds.length > 0) {
        errors.push(`legacy diagnostic has duplicate step ids: ${[...new Set(duplicateStepIds)].join(', ')}`);
    }

    const failingStepIds = steps
        .filter(hasTriggeredFailIf)
        .map((step) => String(step.stepId ?? '?'));
    if (failingStepIds.length > 0) {
        errors.push(`legacy diagnostic failIf triggered in steps: ${failingStepIds.join(', ')}`);
    }

    const finalStep = steps.find((step) => String(step.stepId ?? '') === 'R04');
    if (finalStep) {
        const withinTolerance = readFinalCompareWithinTolerance(finalStep);
        if (withinTolerance !== true) {
            errors.push(
                `legacy diagnostic R04 final compare did not pass: withinTolerance=${String(withinTolerance)}`,
            );
        }
    }

    return {
        ok: errors.length === 0,
        contract: 'legacy_steps',
        errors,
        warnings,
        summary: {
            version,
            stepCount: steps.length,
            firstStepId: stepIds[0] ?? null,
            finalStepId: stepIds[stepIds.length - 1] ?? null,
            failingStepIds,
        },
    };
}

function validatePerimeterFieldCaptureDiagnostics(
    captureDiagnostics: Record<string, unknown>,
    errors: string[],
    summary: Record<string, unknown>,
): void {
    const totalTransitionFrames = Number(captureDiagnostics.totalTransitionFrames ?? 0);
    const selectedTransitionFrames = asArray(captureDiagnostics.selectedTransitionFrames);
    summary.captureKind = 'perimeter_field_live_capture';
    summary.totalTransitionFrames = totalTransitionFrames;
    summary.selectedTransitionFrameCount = selectedTransitionFrames.length;
    if (!asRecord(captureDiagnostics.previousFrame)) {
        errors.push('perimeter-field diagnostic previousFrame is missing');
    }
    if (!asRecord(captureDiagnostics.nextFrame)) {
        errors.push('perimeter-field diagnostic nextFrame is missing');
    }
    if (totalTransitionFrames <= 0) {
        errors.push('perimeter-field diagnostic captured no transition frames');
    }
    if (selectedTransitionFrames.length === 0) {
        errors.push('perimeter-field diagnostic selected no transition frames');
    }
}

function validateTerritoryLiveCaptureDiagnostics(
    captureDiagnostics: Record<string, unknown>,
    errors: string[],
    summary: Record<string, unknown>,
): void {
    const transitionFrames = asArray(captureDiagnostics.transitionFrames).filter(
        isRecord,
    );
    const progressValues = transitionFrames
        .map((frame) => Number(frame.progress))
        .filter((progress) => Number.isFinite(progress));
    const minProgress =
        progressValues.length > 0 ? Math.min(...progressValues) : null;
    const maxProgress =
        progressValues.length > 0 ? Math.max(...progressValues) : null;

    summary.captureKind = 'territory_live_capture';
    summary.mode = captureDiagnostics.mode ?? null;
    summary.transitionFrameCount = transitionFrames.length;
    summary.minProgress = minProgress;
    summary.maxProgress = maxProgress;

    if (!asRecord(captureDiagnostics.previousFrame)) {
        errors.push('territory live diagnostic previousFrame is missing');
    }
    if (!asRecord(captureDiagnostics.nextFrame)) {
        errors.push('territory live diagnostic nextFrame is missing');
    }
    if (transitionFrames.length === 0) {
        errors.push('territory live diagnostic captured no transition frames');
    }
    if (progressValues.length !== transitionFrames.length) {
        errors.push('territory live diagnostic has transition frames without numeric progress');
    }
    if (!transitionFrames.every((frame) => asRecord(frame.snapshot))) {
        errors.push('territory live diagnostic has transition frames without snapshots');
    }
    if (minProgress !== null && minProgress > 0.05) {
        errors.push(
            `territory live diagnostic first captured progress is too late: ${minProgress}`,
        );
    }
    if (maxProgress !== null && maxProgress < 0.9) {
        errors.push(
            `territory live diagnostic final captured progress is too early: ${maxProgress}`,
        );
    }
}

function validatePowerVoronoiCaptureDiagnostics(
    captureDiagnostics: Record<string, unknown>,
    errors: string[],
    warnings: string[],
    summary: Record<string, unknown>,
): void {
    const frameEvaluationStage = asRecord(captureDiagnostics.frameEvaluationStage);
    const transitionPlanningStage = asRecord(captureDiagnostics.transitionPlanningStage);
    const sampledFrames = asArray(frameEvaluationStage?.sampledFrames).filter(isRecord);
    const matchesPreGeometry = sampledFrames.some(
        (sample) => sample.matchesPreGeometry === true,
    );
    const matchesPostGeometry = sampledFrames.some(
        (sample) => sample.matchesPostGeometry === true,
    );
    summary.captureKind = 'power_voronoi_runtime';
    summary.sampledFrameCount = sampledFrames.length;
    summary.matchesPreGeometry = matchesPreGeometry;
    summary.matchesPostGeometry = matchesPostGeometry;
    if (!asRecord(captureDiagnostics.ownershipStage)) {
        errors.push('power-voronoi diagnostic ownershipStage is missing');
    }
    if (!asRecord(captureDiagnostics.geometryStage)) {
        errors.push('power-voronoi diagnostic geometryStage is missing');
    }
    if (!transitionPlanningStage) {
        errors.push('power-voronoi diagnostic transitionPlanningStage is missing');
    }
    if (!frameEvaluationStage) {
        errors.push('power-voronoi diagnostic frameEvaluationStage is missing');
    }
    if (sampledFrames.length === 0) {
        errors.push('power-voronoi diagnostic sampled no transition frames');
    }
    if (!matchesPreGeometry) {
        errors.push('power-voronoi diagnostic has no sampled frame matching PRE geometry');
    }
    if (!matchesPostGeometry) {
        errors.push('power-voronoi diagnostic has no sampled frame matching POST geometry');
    }

    const unsupportedSplitModes = asArray(
        asRecord(transitionPlanningStage?.summary)?.unsupportedSplitModes,
    );
    if (unsupportedSplitModes.length > 0) {
        warnings.push(
            `power-voronoi diagnostic reported unsupported split modes: ${unsupportedSplitModes.join(', ')}`,
        );
    }
}

function validateCurrentPackage(
    bundle: Record<string, unknown>,
): TransitionDiagnosticValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const summary: Record<string, unknown> = {
        exportKind: bundle.exportKind,
    };

    if (bundle.exportKind !== PACKAGE_EXPORT_KIND) {
        errors.push(`expected exportKind ${PACKAGE_EXPORT_KIND}, got ${String(bundle.exportKind ?? 'missing')}`);
    }
    if (typeof bundle.bundleId !== 'string' || bundle.bundleId.length === 0) {
        errors.push('diagnostic package bundleId is missing');
    }
    if (typeof bundle.transitionId !== 'string' || bundle.transitionId.length === 0) {
        errors.push('diagnostic package transitionId is missing');
    }
    if (!asRecord(bundle.previousGeometry)) {
        errors.push('diagnostic package previousGeometry is missing');
    }
    if (!asRecord(bundle.nextGeometry)) {
        errors.push('diagnostic package nextGeometry is missing');
    }
    const previousGeometry = asRecord(bundle.previousGeometry);
    const nextGeometry = asRecord(bundle.nextGeometry);
    const conquestEvents = asArray(bundle.conquestEvents).filter(isRecord);
    if (
        conquestEvents.length > 0 &&
        typeof previousGeometry?.version === 'string' &&
        typeof nextGeometry?.version === 'string'
    ) {
        const normalizedPrevious = normalizeGeometryVersionForConquestOwners(
            previousGeometry.version,
            conquestEvents,
        );
        const normalizedNext = normalizeGeometryVersionForConquestOwners(
            nextGeometry.version,
            conquestEvents,
        );
        summary.geometryVersionOwnerOnlyDelta =
            normalizedPrevious === normalizedNext;
        if (normalizedPrevious !== normalizedNext) {
            errors.push(
                'diagnostic package geometry version changed outside conquered owner fields',
            );
        }
    }

    const selectedFrames = asArray(bundle.selectedFrames);
    summary.selectedFrameCount = selectedFrames.length;
    if (selectedFrames.length === 0) {
        warnings.push('diagnostic package selected no intermediate render frames');
    }

    const captureDiagnostics = asRecord(bundle.captureDiagnostics);
    if (!captureDiagnostics) {
        errors.push('diagnostic package captureDiagnostics is missing');
    } else if (captureDiagnostics.kind === 'perimeter_field_live_capture') {
        validatePerimeterFieldCaptureDiagnostics(captureDiagnostics, errors, summary);
    } else if (captureDiagnostics.kind === 'territory_live_capture') {
        validateTerritoryLiveCaptureDiagnostics(captureDiagnostics, errors, summary);
    } else if (captureDiagnostics.kind === 'power_voronoi_runtime') {
        validatePowerVoronoiCaptureDiagnostics(
            captureDiagnostics,
            errors,
            warnings,
            summary,
        );
    } else {
        errors.push(
            `unsupported diagnostic capture kind: ${String(captureDiagnostics.kind ?? 'missing')}`,
        );
    }

    return {
        ok: errors.length === 0,
        contract: 'transition_diagnostic_package',
        errors,
        warnings,
        summary,
    };
}

export function validateTransitionDiagnosticBundleForBenchmark(
    bundle: unknown,
): TransitionDiagnosticValidationResult {
    if (!isRecord(bundle)) {
        return {
            ok: false,
            contract: 'unknown',
            errors: ['transition diagnostic bundle is missing or not an object'],
            warnings: [],
            summary: {},
        };
    }

    if (
        bundle.version === LEGACY_SCHEMA_VERSION ||
        bundle.schemaVersion === LEGACY_SCHEMA_VERSION ||
        Array.isArray(bundle.steps)
    ) {
        return validateLegacyStepBundle(bundle);
    }

    if (bundle.exportKind === PACKAGE_EXPORT_KIND) {
        return validateCurrentPackage(bundle);
    }

    return {
        ok: false,
        contract: 'unknown',
        errors: [
            `unsupported transition diagnostic contract: version=${String(bundle.version ?? bundle.schemaVersion ?? 'missing')} exportKind=${String(bundle.exportKind ?? 'missing')}`,
        ],
        warnings: [],
        summary: {},
    };
}
