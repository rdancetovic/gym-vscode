# Executed Commands

Only commands confirmed as executed during the requirements/documentation preparation are listed. No application test command was run in this preparation.

## Worktree checks

```powershell
git status --short -- REQUIREMENTS.md; git status --short
```

Checked the requirements file and worktree before updating the approved document.

```powershell
git status --short; git diff --check -- REQUIREMENTS.md; git diff --stat -- REQUIREMENTS.md
```

Checked changed files, whitespace/errors in the requirements diff, and its change summary.

```powershell
git status --short; Write-Output '--- Runtime commands ---'; Get-Command node,npm,python,py,java,dotnet -ErrorAction SilentlyContinue | Select-Object Name,Source; Write-Output '--- Root entries ---'; Get-ChildItem -Force | Select-Object Mode,Name
```

Checked worktree status, runtime command availability, and root entries.

## Runtime and project setup checks

```powershell
python --version; java -version; Get-Command node,npm,python,java -ErrorAction SilentlyContinue | Select-Object Name,Source
```

Checked runtime versions and availability. Python reported that the Microsoft Store alias could not find Python; Java reported OpenJDK 21.0.12. Node/npm were not returned.

```powershell
Get-Command mvn,gradle,curl,msedge,chrome -ErrorAction SilentlyContinue | Select-Object Name,Source; Get-ChildItem -Force -Name -Include package.json,pom.xml,build.gradle,build.gradle.kts,settings.gradle,settings.gradle.kts,requirements.txt,pyproject.toml
```

Checked for build/browser commands and common project manifests. `curl` was found; Maven, Gradle, and the named browser commands were not returned; no listed manifest was returned.

```powershell
git status --short; git diff --check; git diff --stat
```

Final worktree and whitespace check. The reported diff summary covers tracked changes; newly created untracked files appear in `git status`.
