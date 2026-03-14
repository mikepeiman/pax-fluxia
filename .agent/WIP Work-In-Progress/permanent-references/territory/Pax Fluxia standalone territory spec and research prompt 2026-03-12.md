This is a minimal but sufficient standalone description of the problem.

## Problem summary

Design a theoretically correct and practically renderable **static and dynamic territory system** for a star-map RTS.

## World model

- The game world is a 2D map containing **stars** (nodes) and **lanes** (edges).
    
- Ownership exists on **stars only**.
    
- Lanes define **graph connectivity and traversal cost**, not direct ownership.
    
- Distances must be computed on the **star–lane graph**, not by straight-line Euclidean distance in 2D.
    

## Territory truth

- Territory ownership at any point in the world must be derived from **shortest-path distance on the graph** to the nearest star owned by each player.
    
- This is a **non-Euclidean**, graph-native territory system.
    
- Same-player territory that is connected by graph structure should visually merge.
    
- Same-player territory that is **not** connected by graph structure must remain visually disconnected and be separated by enemy territory.
    
- Long lanes must remain fully encompassed by connected territory even if they pass spatially through another player’s region.
    
- There must be tunable constraints affecting territory shape:
    
    - **MSR**: minimum distance from owned stars to frontier / minimum star radius influence.
        
    - **CX**: corridor / connection extension bias so territory properly covers owned connectivity.
        
    - **DX**: disconnect / separation bias so visually disconnected holdings remain separated by enemy pressure.
        

## Static territory deliverable

The static territory system must define:

1. **Frontiers**: a unified set of ownership boundaries in world coordinates.
    
2. **Borders**: rendered vector-like strokes that exactly follow frontiers.
    
3. **Ownerfill**: region fills on each side of the frontiers, perfectly consistent with frontier geometry.
    

## Static visual requirements

- Borders must appear **vector-like, smooth, even-edged**, and tunable between:
    
    - straighter / more angular,
        
    - more rounded / more curved,
        
    - segmented / stylized.
        
- Frontiers should support tunable section length characteristics, e.g. min/max segment lengths.
    
- The system must support unified frontiers:
    
    - either perfectly shared identical coordinates between adjacent territories,
        
    - or a single canonical shared border entity referenced by both adjacent territories.
        

## Dynamic territory requirements

The static system must support a dynamic/animated version where:

- When ownership changes, **frontiers transform smoothly** from old geometry to new geometry over one tick.
    
- **Ownerfill follows the frontier exactly** at all times.
    
- There is **no alpha crossfade** for ownerfill; fill always reflects true instantaneous territory shape.
    
- Border/frontier motion should minimize deformation and travel distance:
    
    - the old frontier should transform into the new frontier with the smallest reasonable geometric motion.
        
- The system should support tuning of animation style and speed.
    

## Performance target

- Must be practical for **2K resolution at 60 FPS**.
    
- Territory recomputation can happen on ownership/topology changes.
    
- Rendering must remain stable and performant in steady state.
    

## Research objective

Identify and compare as many viable methods as possible to generate **unified frontiers** for graph-native territory, including exact, approximate, geometric, field-based, optimization-based, and hybrid methods, with special attention to:

- theoretical correctness,
    
- clean vector-renderable borders,
    
- tunable MSR/CX/DX constraints,
    
- unified shared borders,
    
- smooth dynamic morphing.

CONSTRAINTS:
"Ownership render texture + marching squares / contour extraction" is ruled out. This has been tried, and it is crucial for our spec that all frontier lines are drawn and appear effectively as SVG strokes, whether or not they are technically rendered as SVG. No stair-stepping or jagged edges are acceptable for any angle or shape of line. 