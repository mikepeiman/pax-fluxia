# No Guessing

**Never assume type signatures, config values, port numbers, API shapes, or enum values. Always read the source definition before writing code that depends on it.**

Before writing any code that references:
- A type or interface → `view_file` or `grep_search` the definition
- A port number → check terminal output or config file
- An enum/union type → read the declaration
- A function signature → read the function
- A config key or its valid values → read the config source

If a lint error says "type X is not assignable to type Y", read the definition of Y before attempting a fix. Do not guess what Y contains.

The 2-second lookup is always cheaper than the rework cycle of guess → fail → debug → fix.
