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

## API-02 Java verification

```powershell
$buildDir = Join-Path $env:TEMP 'gym-vscode-api02-classes'; New-Item -ItemType Directory -Force -Path $buildDir | Out-Null; javac --add-modules jdk.httpserver -d $buildDir server\GymCatalogue.java server\GymReservationDomain.java server\ReservationStateStore.java server\GymReservationServer.java tests\java\GymReservationDomainTest.java tests\java\ReservationStateStoreTest.java; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; java --add-modules jdk.httpserver -cp $buildDir GymReservationDomainTest; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; java --add-modules jdk.httpserver -cp $buildDir ReservationStateStoreTest
```

Compiled the server and Java tests, then ran the API-01 domain suite (58 assertions) and API-02 persistence suite (21 assertions); both passed.

```powershell
java --add-modules jdk.httpserver -cp $buildDir GymReservationServer
```

Started the server to verify initialization of `data/reservations.json` and frontend serving on port 3000. The first attempt found port 3000 occupied by an earlier project test server; that previously launched server was stopped, after which the updated server started and was verified. The API-02 verification server was stopped afterwards.

## API-03 Java verification

```powershell
$buildDir = Join-Path $env:TEMP 'gym-vscode-api03-classes'; New-Item -ItemType Directory -Force -Path $buildDir | Out-Null; javac --add-modules jdk.httpserver -d $buildDir server\GymCatalogue.java server\GymReservationDomain.java server\ReservationStateStore.java server\ReservationCodeGenerator.java server\ReservationApiHandler.java server\GymReservationServer.java tests\java\GymReservationDomainTest.java tests\java\ReservationStateStoreTest.java tests\java\ReservationApiHandlerTest.java; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; java --add-modules jdk.httpserver -cp $buildDir GymReservationDomainTest; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; java --add-modules jdk.httpserver -cp $buildDir ReservationStateStoreTest; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; java --add-modules jdk.httpserver -cp $buildDir ReservationApiHandlerTest
```

Compiled the server and Java tests, then ran API-01 (58 assertions), API-02 (21 assertions), and API-03 (51 assertions); all passed.

The same suites were rerun during the documentation update:

```powershell
$buildDir = Join-Path $env:TEMP 'gym-vscode-api03-doc-check'; New-Item -ItemType Directory -Force -Path $buildDir | Out-Null; javac --add-modules jdk.httpserver -d $buildDir server\GymCatalogue.java server\GymReservationDomain.java server\ReservationStateStore.java server\ReservationCodeGenerator.java server\ReservationApiHandler.java server\GymReservationServer.java tests\java\GymReservationDomainTest.java tests\java\ReservationStateStoreTest.java tests\java\ReservationApiHandlerTest.java; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; java --add-modules jdk.httpserver -cp $buildDir GymReservationDomainTest; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; java --add-modules jdk.httpserver -cp $buildDir ReservationStateStoreTest; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; java --add-modules jdk.httpserver -cp $buildDir ReservationApiHandlerTest; $testExit = $LASTEXITCODE; Remove-Item -LiteralPath $buildDir -Recurse; exit $testExit
```

Observed output: API-01 **58 assertions passed**, API-02 **21 assertions passed**, and API-03 **51 assertions passed**.

## API-04 Java verification

```powershell
$buildDir = Join-Path $env:TEMP 'gym-vscode-api04-build'; New-Item -ItemType Directory -Force -Path $buildDir | Out-Null; javac -d $buildDir server\*.java tests\java\*.java; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; $testClasses = @('GymReservationDomainTest', 'ReservationStateStoreTest', 'ReservationApiHandlerTest', 'ClassesApiHandlerTest'); foreach ($testClass in $testClasses) { java -cp $buildDir $testClass; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

Compiled all Java server and test sources, then ran the API-01, API-02, API-03, and API-04 test mains. Final observed results: **58, 21, 51, and 250 assertions passed**, respectively. The initial API-04 test run failed because the new test fixture expected an initial availability value for capacity; the test was corrected and the final full run passed.

```powershell
git diff --check; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; git status --short
```

Checked whitespace and listed changed files after API-04 implementation.

## API-05 verification

```powershell
$buildDir = Join-Path $env:TEMP 'gym-vscode-api05-verify'; New-Item -ItemType Directory -Force -Path $buildDir | Out-Null; javac -d $buildDir server\*.java tests\java\*.java; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; $testClasses = @('GymReservationDomainTest', 'ReservationStateStoreTest', 'ReservationApiHandlerTest', 'ClassesApiHandlerTest'); foreach ($testClass in $testClasses) { java -cp $buildDir $testClass; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

Recompiled all Java sources and ran the existing Java test mains to verify API-05 without changing source or tests. Observed: API-01 **58**, API-02 **21**, API-03 **51**, and API-04 **250** assertions passed.

```powershell
git status --short; git diff --check; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; Write-Output 'No worktree changes detected.'
```

Checked the worktree and whitespace after API-05 verification; no worktree changes were present at that point.

## API-06 Java verification

```powershell
$buildDir = Join-Path $env:TEMP 'gym-vscode-api06-build'; New-Item -ItemType Directory -Force -Path $buildDir | Out-Null; javac -d $buildDir server\*.java tests\java\*.java; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; $testClasses = @('GymReservationDomainTest', 'ReservationStateStoreTest', 'ReservationApiHandlerTest', 'ClassesApiHandlerTest'); foreach ($testClass in $testClasses) { java -cp $buildDir $testClass; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

Compiled all Java server and test sources, then ran the API-01, API-02, combined reservation endpoint (API-03/API-06), and API-04 test mains. Observed: **58, 21, 74, and 250 assertions passed**, respectively.

```powershell
git diff --check; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; git status --short; git diff --stat; git diff -- server\ReservationApiHandler.java tests\java\ReservationApiHandlerTest.java
```

Checked whitespace and reviewed the API-06 source/test diff.

## API-07 Java verification

```powershell
$buildDir = Join-Path $env:TEMP 'gym-vscode-api07-build'; New-Item -ItemType Directory -Force -Path $buildDir | Out-Null; javac -d $buildDir server\*.java tests\java\*.java; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; $testClasses = @('GymReservationDomainTest', 'ReservationStateStoreTest', 'ReservationApiHandlerTest', 'ClassesApiHandlerTest'); foreach ($testClass in $testClasses) { java -cp $buildDir $testClass; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

Compiled all Java server and test sources, then ran the API-01, API-02, combined reservation endpoint (API-03/API-06/API-07), and API-04 test mains. Observed: **58, 21, 95, and 250 assertions passed**, respectively.

```powershell
git diff --check; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; git status --short; git diff --stat; git diff -- server\ReservationApiHandler.java tests\java\ReservationApiHandlerTest.java
```

Checked whitespace and reviewed the API-07 source/test diff.

## API-08 Java verification

```powershell
$buildDir = Join-Path $env:TEMP 'gym-vscode-api08-build'; New-Item -ItemType Directory -Force -Path $buildDir | Out-Null; javac -d $buildDir server\*.java tests\java\*.java; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; $testClasses = @('GymReservationDomainTest', 'ReservationStateStoreTest', 'ReservationApiHandlerTest', 'ClassesApiHandlerTest'); foreach ($testClass in $testClasses) { java -cp $buildDir $testClass; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

Compiled all Java server and test sources, then ran all four Java test mains. Final observed results: API-01 **58**, API-02 **21**, combined reservation endpoints (API-03/API-06/API-07) **162**, and API-04 **250** assertions passed.

```powershell
git diff --check; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; git status --short; git diff --stat; git diff -- tests\java\ReservationApiHandlerTest.java
```

Checked whitespace, worktree status, and the API-08 test diff.
