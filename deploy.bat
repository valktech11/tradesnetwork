@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM ProGuild Deploy Script — fully automated
REM
REM Usage:   deploy.bat <patch.zip> "commit message"
REM Example: deploy.bat v42-patch.zip "v42: warm cream design"
REM
REM Just download the zip from Claude — script picks it up from Downloads,
REM moves it to the project folder, extracts, copies, pushes, and cleans up.
REM ─────────────────────────────────────────────────────────────────────────────

SET PROJECT=%~dp0
SET PROJECT=%PROJECT:~0,-1%
SET DOWNLOADS=%USERPROFILE%\Downloads
SET ZIPNAME=%~1
SET MSG=%~2

IF "%ZIPNAME%"=="" (
  echo ERROR: Provide zip filename
  echo Usage: deploy.bat v42-patch.zip "commit message"
  exit /b 1
)
IF "%MSG%"=="" SET MSG=patch update

SET DOWNLOADS_ZIP=%DOWNLOADS%\%ZIPNAME%
SET PROJECT_ZIP=%PROJECT%\%ZIPNAME%

REM ── Step 1: Move zip from Downloads to project folder ────────────────────────
IF EXIST "%DOWNLOADS_ZIP%" (
  echo.
  echo ── MOVING %ZIPNAME% from Downloads to project ───────────────────────────────
  move "%DOWNLOADS_ZIP%" "%PROJECT_ZIP%"
  IF ERRORLEVEL 1 ( echo Move failed. & exit /b 1 )
) ELSE IF EXIST "%PROJECT_ZIP%" (
  echo.
  echo ── Found %ZIPNAME% already in project folder ────────────────────────────────
) ELSE (
  echo ERROR: %ZIPNAME% not found in Downloads or project folder.
  echo Download it from Claude first.
  exit /b 1
)

REM ── Step 2: Extract ──────────────────────────────────────────────────────────
SET TEMP_DIR=%TEMP%\proguild_patch_%RANDOM%
echo ── EXTRACTING ───────────────────────────────────────────────────────────────
powershell -Command "Expand-Archive -Path '%PROJECT_ZIP%' -DestinationPath '%TEMP_DIR%' -Force"
IF ERRORLEVEL 1 ( echo Extraction failed. & exit /b 1 )

REM ── Step 3: Find patch folder inside zip ─────────────────────────────────────
FOR /D %%D IN ("%TEMP_DIR%\*") DO SET PATCH_DIR=%%D
echo Patch contents: %PATCH_DIR%
echo.

REM ── Step 4: Dry run preview ───────────────────────────────────────────────────
echo ── FILES THAT WILL BE COPIED ────────────────────────────────────────────────
robocopy "%PATCH_DIR%" "%PROJECT%" /E /IS /IT /L /NJH /NJS
echo.

SET /P CONFIRM=Copy and deploy? (Y/N): 
IF /I NOT "%CONFIRM%"=="Y" (
  echo Cancelled.
  rmdir /S /Q "%TEMP_DIR%"
  exit /b 0
)

REM ── Step 5: Copy files ────────────────────────────────────────────────────────
echo.
echo ── COPYING ──────────────────────────────────────────────────────────────────
robocopy "%PATCH_DIR%" "%PROJECT%" /E /IS /IT /NJH /NJS

REM ── Step 6: Cleanup ──────────────────────────────────────────────────────────
rmdir /S /Q "%TEMP_DIR%"
del "%PROJECT_ZIP%"
echo Cleaned up %ZIPNAME%

REM ── Step 7: Git ───────────────────────────────────────────────────────────────
echo.
echo ── GIT STATUS ───────────────────────────────────────────────────────────────
cd /d "%PROJECT%"
git status
echo.

SET /P GITCONFIRM=Commit and push? (Y/N): 
IF /I NOT "%GITCONFIRM%"=="Y" (
  echo Files copied. Push skipped.
  exit /b 0
)

echo.
git add -A
git commit -m "%MSG%"
git push origin main
echo.
echo ── DONE ─────────────────────────────────────────────────────────────────────
