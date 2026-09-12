param([string]$Creator = 'C:\ProgramData\cocos\editors\Creator\3.8.6\CocosCreator.exe')
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Creator)) { throw "Cocos Creator not found: $Creator" }
$crownProject = $PSScriptRoot
$crownLog = Join-Path $crownProject 'build-client.log'
$crownErrorLog = Join-Path $crownProject 'build-client-error.log'
$crownArguments = @('--project', ('"' + $crownProject + '"'), '--build', ('"configPath=' + (Join-Path $crownProject 'build-config.json') + '"'))
$crownBuild = Start-Process -FilePath $Creator -ArgumentList $crownArguments -WindowStyle Hidden -RedirectStandardOutput $crownLog -RedirectStandardError $crownErrorLog -PassThru
# Wait for the CLI process, not persistent Electron helper descendants.
$crownBuild.WaitForExit()
$crownFailed = Select-String -LiteralPath @($crownLog, $crownErrorLog) -Pattern 'run build task .* failed|CCON Format error|error:.*build.*failed' -Quiet
# Creator's BuildExitCode declares BUILD_SUCCESS = 36; some launches return 0.
if ($crownBuild.ExitCode -notin @(0, 36) -or ($crownFailed -contains $true) -or -not (Select-String -LiteralPath $crownLog -Pattern 'build success' -Quiet)) { throw "Build failed; see $crownLog and $crownErrorLog (exit $($crownBuild.ExitCode))." }
Write-Host "Build ready: $(Join-Path $crownProject 'build\web-mobile')"
