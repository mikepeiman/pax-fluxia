import { describe, it, expect } from "vitest";
import { createInteractionCaches } from "./interactionCaches";
import { GAME_CONFIG } from "$lib/config/game.config";
import type { StarState, StarConnection } from "$lib/types/game.types";

const CELL_PX = 96;

function star(id: string, x: number, y: number, radius = 10): StarState {
    return { id, x, y, radius } as unknown as StarState;
}

function lane(sourceId: string, targetId: string): StarConnection {
    return { sourceId, targetId } as unknown as StarConnection;
}

/** A caches instance fed from a mutable source, like the component's store read. */
function withSource(stars: StarState[], connections: StarConnection[] = []) {
    const source = { stars, connections };
    const caches = createInteractionCaches(() => source);
    return { caches, source };
}

describe("interactionCaches", () => {
    describe("star lookup", () => {
        it("indexes stars by id from the injected source", () => {
            const { caches } = withSource([star("a", 10, 10), star("b", 20, 20)]);
            expect(caches.getStarById("a")?.id).toBe("a");
            expect(caches.getStarById("missing")).toBeNull();
        });

        it("picks up a new stars array without an explicit rebuild", () => {
            const { caches, source } = withSource([star("a", 10, 10)]);
            expect(caches.getStarById("a")).not.toBeNull();

            // A tick replaces the array identity — the gate must notice.
            source.stars = [star("c", 30, 30)];
            expect(caches.getStarById("a")).toBeNull();
            expect(caches.getStarById("c")?.id).toBe("c");
        });

        it("does not rebuild while the array identity is unchanged", () => {
            const stars = [star("a", 10, 10)];
            const { caches } = withSource(stars);
            caches.ensure();

            // Mutating in place is invisible by design: the gate is identity.
            stars.push(star("b", 20, 20));
            expect(caches.getStarById("b")).toBeNull();
        });
    });

    describe("hit index", () => {
        it("returns a star whose own cell contains the point", () => {
            const { caches } = withSource([star("a", 10, 10)]);
            caches.ensure();
            expect(caches.getHitCandidates(10, 10).map((s) => s.id)).toEqual([
                "a",
            ]);
        });

        it("returns a star from a neighbouring cell when its hit radius reaches in", () => {
            // Sits just left of the x=96 cell boundary; its hit radius spans it.
            const s = star("edge", CELL_PX - 2, 10);
            const { caches } = withSource([s]);
            caches.ensure();

            const radius = caches.resolveHitRadius(s);
            expect(radius).toBeGreaterThan(2); // precondition: it does reach over

            // Point is in cell 1; the star's centre is in cell 0.
            expect(caches.getHitCandidates(CELL_PX + 1, 10).map((x) => x.id)).toEqual(
                ["edge"],
            );
        });

        it("returns an empty list for an empty cell", () => {
            const { caches } = withSource([star("a", 10, 10)]);
            caches.ensure();
            expect(caches.getHitCandidates(100_000, 100_000)).toEqual([]);
        });

        it("resolveHitRadius honours the configured override", () => {
            const previous = GAME_CONFIG.STAR_HIT_RADIUS;
            try {
                GAME_CONFIG.STAR_HIT_RADIUS = 55;
                const { caches } = withSource([]);
                expect(caches.resolveHitRadius(star("a", 0, 0, 10))).toBe(55);

                // Unset: falls back to the per-star size, floored at 40.
                (GAME_CONFIG as { STAR_HIT_RADIUS?: number }).STAR_HIT_RADIUS =
                    undefined;
                expect(caches.resolveHitRadius(star("a", 0, 0, 100))).toBe(200);
                expect(caches.resolveHitRadius(star("a", 0, 0, 1))).toBe(40);
            } finally {
                GAME_CONFIG.STAR_HIT_RADIUS = previous;
            }
        });
    });

    describe("lane keys", () => {
        it("is symmetric — the key does not depend on argument order", () => {
            const { caches } = withSource([]);
            expect(caches.getLaneKeyForPair("a", "b")).toBe(
                caches.getLaneKeyForPair("b", "a"),
            );
        });

        it("finds a connection regardless of the order it was declared in", () => {
            const { caches } = withSource(
                [star("a", 0, 0), star("b", 10, 10)],
                [lane("b", "a")],
            );
            const key = caches.getLaneKeyForPair("a", "b");
            expect(caches.findConnectionByLaneKey(key)).not.toBeNull();
        });

        it("returns null for an unknown lane key", () => {
            const { caches } = withSource([], []);
            expect(caches.findConnectionByLaneKey("nope|nope")).toBeNull();
        });
    });

    describe("adjacency", () => {
        it("reports a connection in its declared direction", () => {
            const { caches } = withSource(
                [star("a", 0, 0), star("b", 10, 10)],
                [lane("a", "b")],
            );
            expect(caches.areStarsConnected("a", "b")).toBe(true);
        });

        it("adjacency is directional — the reverse is not reported", () => {
            // Locks in current behaviour: rebuild() only records source -> target.
            // Callers pass the lane in its declared direction; this test exists so
            // a future symmetric adjacency is a deliberate change, not a surprise.
            const { caches } = withSource(
                [star("a", 0, 0), star("b", 10, 10)],
                [lane("a", "b")],
            );
            expect(caches.areStarsConnected("b", "a")).toBe(false);
        });

        it("reports unconnected stars as unconnected", () => {
            const { caches } = withSource(
                [star("a", 0, 0), star("b", 10, 10)],
                [],
            );
            expect(caches.areStarsConnected("a", "b")).toBe(false);
        });
    });

    describe("clear", () => {
        it("drops every cache and forces a rebuild on next use", () => {
            const stars = [star("a", 10, 10)];
            const { caches } = withSource(stars, [lane("a", "a")]);
            caches.ensure();
            expect(caches.getStarsById().size).toBe(1);

            caches.clear();
            expect(caches.getStarsById().size).toBe(0);
            expect(caches.getHitCandidates(10, 10)).toEqual([]);

            // Same array identity as before clear(): the rebuild must still run,
            // i.e. clear() has to reset the identity gate, not just the maps.
            expect(caches.getStarById("a")?.id).toBe("a");
        });
    });
});
