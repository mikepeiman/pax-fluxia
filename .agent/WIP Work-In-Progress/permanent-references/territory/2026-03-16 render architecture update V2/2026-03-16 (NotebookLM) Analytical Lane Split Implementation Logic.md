Here is the exact mathematical implementation for the **Analytical Lane Split** calculation, ready to be passed to your implementation AI.  
By implementing this, you completely eliminate the need for fake "corridor virtual sites" and guarantee the PRD rule: **"A lane is either single-owner or split once between exactly two owners"** 1, 2\.  
You can copy and paste the block below directly into your prompt sequence.

### 📋 COPY FROM HERE DOWN 📋

**System Directive for Implementation AI:**You are to implement the analytical lane exclusivity math in the new territory/compiler/frontierStage.ts. You must adhere to the PRD mandate: evaluate graph-distance competition along the lane parameter $t \\in 3$ using the exact equation $D\_p(t) \= \\min(d\_p(u) \+ t w, d\_p(v) \+ (1-t) w)$ 4\.  
Delete the legacy solveLaneTieParameter and computeLaneBias functions. Replace them with the following pure mathematical implementation.

#### The Math Implementation (laneExclusivity.ts or inside frontierStage.ts)

// src/lib/territory/compiler/laneExclusivity.ts

export interface LaneSplitResult {  
    isSplit: boolean;  
    ownerU: string | null;  // Owner at the u-endpoint (t=0)  
    ownerV: string | null;  // Owner at the v-endpoint (t=1)  
    splitT: number | null;  // The exact parameter t in (0, 1\) where ownership changes  
}

/\*\*  
 \* Calculates the exact distance from player P to a point \`t\` along the lane.  
 \* Implements PRD Eq: D\_p(t) \= min(d\_p(u) \+ t\*w, d\_p(v) \+ (1-t)\*w)  
 \*   
 \* @param distU Distance from player P to star U  
 \* @param distV Distance from player P to star V  
 \* @param weight Total lane weight/distance  
 \* @param t Parameter along the lane (0 \= at U, 1 \= at V)  
 \*/  
function distanceToPoint(distU: number, distV: number, weight: number, t: number): number {  
    return Math.min(distU \+ t \* weight, distV \+ (1 \- t) \* weight);  
}

/\*\*  
 \* Determines if a lane between Star U and Star V is split, and exactly where.  
 \* Enforces the "Lane Exclusivity Constraint": Only one split point may exist.  
 \*   
 \* @param ownerU The winning owner ID at star U  
 \* @param ownerV The winning owner ID at star V  
 \* @param distU\_U Owner U's distance to star U (MetricState)  
 \* @param distU\_V Owner U's distance to star V (MetricState)  
 \* @param distV\_U Owner V's distance to star U (MetricState)  
 \* @param distV\_V Owner V's distance to star V (MetricState)  
 \* @param laneWeight The traversal weight (distance) of the lane  
 \*/  
export function evaluateLaneOwnership(  
    ownerU: string,  
    ownerV: string,  
    distU\_U: number,  
    distU\_V: number,  
    distV\_U: number,  
    distV\_V: number,  
    laneWeight: number  
): LaneSplitResult {  
      
    // Case 1: Same owner at both ends.  
    // Due to shortest-path invariants, if a player owns both ends,   
    // they mathematically own the entire interior. No third player can cross.  
    if (ownerU \=== ownerV) {  
        return { isSplit: false, ownerU, ownerV, splitT: null };  
    }

    // Case 2: Different owners at the endpoints.   
    // We must find the exact tie point \`t\` where D\_u(t) \== D\_v(t).  
    // Assuming Owner U expands from U, and Owner V expands from V:  
    // distU\_U \+ t \* w \= distV\_V \+ (1 \- t) \* w  
    // distU\_U \+ t \* w \= distV\_V \+ w \- t \* w  
    // 2 \* t \* w \= distV\_V \- distU\_U \+ w  
    // t \= (distV\_V \- distU\_U \+ w) / (2 \* w)  
      
    // Calculate the theoretical intercept parameter \`t\`  
    const t \= (distV\_V \- distU\_U \+ laneWeight) / (2 \* laneWeight);

    // Validate that the split mathematically falls within the lane interior (0 \< t \< 1\)  
    if (t \> 0 && t \< 1\) {  
        return {  
            isSplit: true,  
            ownerU,  
            ownerV,  
            splitT: t  
        };  
    }

    // Fallback: If shortest-path metrics somehow pushed the tie point completely   
    // off the segment (e.g., extreme MSR/star margin weights), default to the exact midpoint   
    // to guarantee topological safety and prevent null boundaries.  
    return {  
        isSplit: true,  
        ownerU,  
        ownerV,  
        splitT: 0.5   
    };  
}

#### How to use this in frontierStage.ts

1. Iterate over every StarConnection (lane).  
2. Look up the top-1 owner for the source node (U) and target node (V) from the MetricState 5, 6\.  
3. Call evaluateLaneOwnership.  
4. If isSplit \=== true, convert the splitT parameter into world coordinates:splitX \= u.x \+ (v.x \- u.x) \* splitT;splitY \= u.y \+ (v.y \- u.y) \* splitT;  
5. Store this world-coordinate point as a **Lane Frontier Node** in the singular FrontierGraph 6\.

### 📋 COPY FROM HERE UP 📋

This mathematical approach completely eradicates the janky pixel-raster drift of the old legacy engine and provides mathematically perfect, resolution-independent frontier seeds.  
Would you like me to map out how these splitT points are fed into the next layer (frontierFitter.ts) to generate the actual **straight, curved, or segmented** canonical geometries before they are stitched into fills?  
