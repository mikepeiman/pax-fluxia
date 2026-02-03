---
trigger: always_on
---

# Git Policy

**Rule:** Only create git commits if the user explicitly asks for them OR if the task requires atomic checkpoints and the repo is active.

- If the current directory is NOT a git repo, do not attempt git commands.
- If the user asks for a commit, use `git add .` and `git commit -m "message"`.
- Do NOT use `git ac` alias unless you are sure it exists (prefer standard commands).
- **PowerShell Note:** Use `;` to separate commands (e.g., `git add .; git commit -m "msg"`), never `&&`.
