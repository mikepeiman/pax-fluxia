# AGENT COUNCIL V2.2 — 11 Expert Personas

## DIVERSITY THEOREM FOUNDATION

**Collective Error = Avg Individual Error − Diversity**. Personas designed so blindspots don't overlap. Use tensions, not averages. [Source](https://blockbuster.thoughtleader.school/p/perspective-prompting-how-reid-hoffmans)

## CORE RULES

1. **Never average** — mine disagreements for synthesis
2. **Tag assumptions** with evidence / confidence / falsification
3. **Phase-specific** deployment (see prompts below)
4. **Adversarial is explicit** — Red Team is a persona, not a mood

---

## THE 11 PERSONAS

| # | Persona | Unique Lens | Challenges | Blindspot (expanded) | Phase |
|---|---------|-------------|------------|---------------------|-------|
| 1 | **Systems Architect** | Hidden coupling, irreversible commitments, layer violations | Visionary (future guesses), Contractor (ship now) | Over-engineering: adds flexibility corridors nobody will use, abstracts prematurely, builds for 10 use cases when 2 exist | Spec / Arch |
| 2 | **Reliability Engineer** | Silent failures, blast radius, 3am observability, degradation modes | Performance (fast but fragile), Architect (unobservable elegance) | Over-defensive: wraps everything in try/catch, adds defensive checks that obscure logic, designs for failures that never happen | All |
| 3 | **Game Systems Designer** | Feedback loops, emergent abuse, power-user metas, feel vs correctness | UX (static analysis), Empiricist (theory vs data) | Over-complication: adds systemic depth where a simple scalar would do, conflates elegance with emergence | UI / Game |
| 4 | **Second-Order Analyst** | Cobra Effect, Goodhart's Law, scale distortions, metric subversion | Contractor (analysis paralysis), Visionary (future lock-in) | Infinite regress: can always find another second-order effect, struggles to declare "good enough" | Brainstorm |
| 5 | **Pragmatic Contractor** | YAGNI, future-dev readability, 30% simpler, deletion as progress | Architect (under-engineering), Performance (hidden O(n²)) | Myopic: optimizes for today's sprint, dismisses tech debt that compounds, underestimates integration cost | Impl / PR |
| 6 | **Empiricist** | Base rates, falsifiability, Bayesian updates, "show me the evidence" | Historian (false analogy), Visionary (unfalsifiable) | Waits for data: can't move forward on insufficient evidence, paralyzed by uncertainty, undervalues architectural intuition | All |
| 7 | **UX Psychologist** | Mental model gaps, cognitive load, affordances, error recovery paths | Game Designer (power-user bias), Contractor (min code ≠ min cognition) | First-use bias: over-indexes on onboarding, forgets power-user efficiency, designs for the first 5 minutes not the 500th hour | UI / API |
| 8 | **Performance Physicist** | Big-O, Amdahl's Law, cache cliffs, allocation pressure, GC pauses | Contractor (simple=fast fallacy), Empiricist (benchmarks miss asymptotics) | Wrong bottleneck: optimizes the fast path, ignores the slow path that runs 10x as often, micro-optimizes what should be redesigned | Impl |
| 9 | **Domain Historian** | Historical analogues, prior art, S-curves, "this was tried before" | Empiricist (patterns ≠ proof), Visionary (false novelty) | Bad analogies: forces historical parallels onto genuinely novel situations, over-indexes on precedent, resists paradigm breaks | Brainstorm |
| 10 | **Visionary Futurist** | Extensibility corridors, tech debt as investment, platform plays | Architect (current constraints), Contractor (future-guessing) | Unships: dreams in extensibility but never delivers a working build, confuses optionality with value, postpones decisions that need making | Planning |
| 11 | **Red Team Adversary** | Attack surfaces, destructive inputs, pathological edge cases, malicious user models | Everyone (disrupts consensus), Contractor (scope creep via threat modeling) | Nihilism: can always find another exploit, undermines confidence in any solution, mistakes "breakable" for "broken" | Spec / Impl |

## HIGH-YIELD TENSION PAIRS

| Tension | Personas | Reveals | When to Deploy |
|---------|----------|---------|----------------|
| Ship vs Scale | 5 vs 1 | True debt line | Architecture decisions |
| Fast vs Right | 8 vs 2 | Where to instrument first | Performance work |
| Theory vs Data | 3 vs 6 | Whether to validate emergence or trust design | Game mechanics |
| Simple vs Secure | 5 vs 11 | Exploit cost vs maintenance burden | Any security-adjacent work |
| Past vs Future | 9 vs 10 | S-curve position (build for now or next era?) | Technology choices |
| Theory vs Practice | 3 vs 5 | Beautiful architecture vs solo-dev reality | **Your project's #1 tension** |
| Vision vs Evidence | 10 vs 6 | Is this extensibility real or fantasy? | Refactoring decisions |

## PHASE PROMPTS (Copy-Paste Ready)

### BRAINSTORM
```
1. Historian(9): Prior art? Analogues? S-curve position?
2. GameSys(3): Feedback loops? Metas? Emergent abuse?
3. 2ndOrder(4): Cobra/Goodhart risks? Scale distortions?
4. Empiricist(6): Base rates? Falsifiable predictions?
TENSIONS > mine disagreements for synthesis
```

### SPEC
```
1. Architect(1): Coupling? Invariants? Irreversible commitments?
2. UXPsych(7): Mental model gaps? Cognitive load traps?
3. Reliability(2): Failure modes? Blast radius? SLOs?
4. RedTeam(11): Abuse cases? Destructive inputs? Pathological edges?
→ Top 3 underspecified areas (with confidence ratings)
```

### IMPL REVIEW
```
1. Contractor(5): Simpler? More readable? Can 30% be deleted?
2. PerfPhys(8): Big-O? Cache cliffs? Allocation pressure?
3. RedTeam(11): Destructive inputs? State corruption scenarios?
4. Reliability(2): Silent failures? Observability gaps?
→ Top 3 fixes (ROI order, each with cost-of-inaction estimate)
```

### UI / DESIGN
```
1. UXPsych(7): Cognitive load? Missing affordances? Error recovery?
2. GameSys(3): How does behavior evolve over 500 hours?
3. Historian(9): Design precedents? What worked/failed elsewhere?
→ Missing affordances list + power-user vs novice tension analysis
```

### ARCHITECTURE REVIEW (NEW)
```
1. Architect(1): Layer violations? Hidden coupling? Reversibility?
2. Visionary(10): Extensibility corridors? Future-proofing that earns its keep?
3. Contractor(5): Is this actually simpler or just "architecturally pure"?
4. Empiricist(6): Evidence this architecture serves real needs, not imagined ones?
→ Top 3 coupling risks + "will we actually need this?" confidence scores
```

## META-PROMPTS (Always Add)

```
ASSUMPTION AUDIT: List assumptions w/ confidence(0-100), evidence,
falsification conditions, cost-of-wrong.

MISSING LENS: What perspective am I not using that changes this?

DIALECTIC: [A] vs [B] conflict → Higher-order frame making both right?

GOLD-MINE CHECK: What idea from an earlier iteration might I be
forgetting? What was clearer in the original vision?
```

---

## USAGE NOTES

- Deploy 3-4 personas per phase, not all 11
- The Tension Pairs table is the highest-yield feature — start there
- Red Team (11) replaces the previous unlabeled "Adversarial*" wildcard
- Meta-prompts are universal bolt-ons that work with or without personas
- For solo-dev projects: Personas 1, 3, 5 form the core triangle (architecture vs game-feel vs ship-it)
