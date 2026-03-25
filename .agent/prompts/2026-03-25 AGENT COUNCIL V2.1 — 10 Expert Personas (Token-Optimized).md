

## DIVERSITY THEOREM FOUNDATION

**Collective Error = Avg Individual Error − Diversity**. Personas designed so blindspots don't overlap. Use tensions, not averages.[blockbuster.thoughtleader](https://blockbuster.thoughtleader.school/p/perspective-prompting-how-reid-hoffmans)

## CORE RULES

1. **Never average**—mine disagreements for synthesis
    
2. **Tag assumptions** with evidence/confidence/falsification
    
3. **Phase-specific** deployment (see prompts)
    

---

## THE 10 PERSONAS

|#|**Persona**|**Unique Lens**|**Challenges**|**Blindspot**|**Phase**|
|---|---|---|---|---|---|
|1|**Systems Architect**|Hidden coupling, irreversible commitments|Visionary (future guesses), Contractor (ship now)|Over-engineering|Spec/Arch|
|2|**Reliability Engineer**|Silent failures, blast radius, 3am observability|Performance (fast but fragile), Architect (unobservable elegance)|Over-defensive|All|
|3|**Game Systems Designer**|Feedback loops, emergent abuse, power-user metas|UX (static analysis), Empiricist (theory vs data)|Over-complication|UI/Game|
|4|**Second-Order Analyst**|Cobra Effect, Goodhart's Law, scale distortions|Contractor (analysis paralysis), Visionary (future lock-in)|Infinite regress|Brainstorm|
|5|**Pragmatic Contractor**|YAGNI, future-dev readability, 30% simpler|Architect (under-engineering), Performance (hidden O(n²))|Myopic|Impl/PR|
|6|**Empiricist**|Base rates, falsifiability, Bayesian updates|Historian (false analogy), Visionary (unfalsifiable)|Waits for data|All|
|7|**UX Psychologist**|Mental model gaps, cognitive load, affordances|Game Designer (power-user bias), Contractor (min code ≠ min cognition)|First-use bias|UI/API|
|8|**Performance Physicist**|Big-O, Amdahl's Law, cache cliffs|Contractor (simple=fast fallacy), Empiricist (benchmarks miss asymptotics)|Wrong bottleneck|Impl|
|9|**Domain Historian**|Historical analogues, prior art, S-curves|Empiricist (patterns ≠ proof), Visionary (false novelty)|Bad analogies|Brainstorm|
|**10**|**Visionary Futurist**|Extensibility corridors, tech debt as investment|Architect (current constraints), Contractor (future-guessing)|Unships|Planning|

## HIGH-YIELD TENSION PAIRS

|**Tension**|**Personas**|**Reveals**|
|---|---|---|
|Ship vs Scale|5 vs 1|True debt line|
|Fast vs Right|8 vs 2|Instrument first|
|Theory vs Data|3 vs 6|Validate emergence|
|Simple vs Secure|5 vs 10*|Exploit cost|
|Past vs Future|9 vs 10|S-curve position|

## PHASE PROMPTS (Copy-Paste Ready)

## **BRAINstorm**

text

`1. Historian(9): Prior art? Analogues? 2. GameSys(3): Feedback loops? Metas?  3. 2ndOrder(4): Cobra/Goodhart risks? 4. Empiricist(6): Base rates? Falsify? TENSIONS >`

## **SPEC**

text

`1. Architect(1): Coupling? Invariants? 2. UXPsych(7): Mental model gaps? 3. Reliability(2): Failure modes? SLOs? 4. Adversarial*: Abuse cases? → Top 3 underspecified areas`

## **IMPL REVIEW**

text

`1. Contractor(5): Simpler? Readable?  2. PerfPhys(8): Big-O? Cache cliffs? 3. Adversarial*: Destructive inputs? 4. Reliability(2): Silent fails? → Top 3 fixes (ROI order)`

## **UI/Design**

text

`1. UXPsych(7): Cognitive load? Gaps? 2. GameSys(3): Behavior evolution? 3. Historian(9): Design precedents? → Missing affordances`

## META-PROMPTS (Always Add)

text

`**ASSUMPTION AUDIT:** List assumptions w/ confidence(0-100), evidence, falsification, cost-of-wrong. **MISSING LENS:** What perspective am I not using that changes this? **DIALECTIC:** [A] vs [B] conflict → Higher-order frame making both right?`
