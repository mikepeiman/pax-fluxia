# Territory Conquest Screenshots — Reference Index

## Set 1: Green conquest around #7/#21 (2026-03-10 ~14:19)
| File | Description |
|------|-------------|
| `conquest1_01_underway_instant_borders_fill.png` | Left/top borders appeared instantly with fill. Only right arm animating. |
| `conquest1_02_continuing.png` | Right arm still mid-morph, fill already at final extent. |
| `conquest1_03_right_arm_still_moving.png` | Right arm continuing to morph. |
| `conquest1_04_final_misalignment.png` | Borders settled but don't align with fill polygon edges. |

## Set 2: Two simultaneous conquests (2026-03-10 ~15:02)
Blue #23 → Red #42, Blue → Teal #43

| File | Description |
|------|-------------|
| `conquest2_01_before_two_conquests.png` | Pre-conquest state. #23 about to conquer #42, blue about to conquer teal #43. |
| `conquest2_02_just_happened_instant_fill_stray_green.png` | Conquest just happened. Fill instant. Green border piece flying rightward (unrelated, chaotic). Blue conquest near #43 shows good morphing (positive example). |
| `conquest2_03_mid_rigid_red_border_good_blue_morph.jpg` | Mid-transition. Red frontier moving as rigid object (bad). Blue frontier morphing correctly (good). Fill does not match border location/shape. Stray green piece still travelling. |
| `conquest2_04_near_final_stray_green_still_moving.png` | Red border near final position. Stray green piece still moving. Blue border nearly settled. |
| `conquest2_05_final_border_layering_color_errors.jpg` | Final state. Old borders layered underneath new ones. Green border coloring persists on left side incorrectly. Stray green piece settled far away on right. Pink circle: "would meet spec if backfill followed frontier." |

## Key Observations
1. **Positive example**: Blue conquest near #43 shows GOOD morphing — smooth, local movement
2. **Negative example**: Red border near #42 moves as rigid body, not point-by-point morph
3. **Stray green piece**: Flies completely across the map — broken matching
4. **Fill always instant**: Territory color snaps to final state immediately
5. **Border layering**: Old borders persist underneath new ones after transition
6. **Multi-frontier**: Conquest of #42 affects not just blue-red frontier, but also nearby green-red frontiers
