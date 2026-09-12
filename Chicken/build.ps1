param([string]$Creator = 'C:\ProgramData\cocos\editors\Creator\3.8.6\CocosCreator.exe')
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Creator)) { throw "Cocos Creator not found: $Creator" }
$chickenProject = $PSScriptRoot
$chickenLog = Join-Path $chickenProject 'build-client.log'
$chickenErrorLog = Join-Path $chickenProject 'build-client-error.log'
$chickenArguments = @('--project', ('"' + $chickenProject + '"'), '--build', ('"configPath=' + (Join-Path $chickenProject 'build-config.json') + '"'))
$chickenBuild = Start-Process -FilePath $Creator -ArgumentList $chickenArguments -WindowStyle Hidden -RedirectStandardOutput $chickenLog -RedirectStandardError $chickenErrorLog -PassThru
# Wait for the CLI process, not persistent Electron helper descendants.
$chickenBuild.WaitForExit()
$chickenFailed = Select-String -LiteralPath @($chickenLog, $chickenErrorLog) -Pattern 'run build task .* failed|CCON Format error|error:.*build.*failed' -Quiet
# Creator's BuildExitCode declares BUILD_SUCCESS = 36; some launches return 0.
if ($chickenBuild.ExitCode -notin @(0, 36) -or ($chickenFailed -contains $true) -or -not (Select-String -LiteralPath $chickenLog -Pattern 'build success' -Quiet)) { throw "Build failed; see $chickenLog and $chickenErrorLog (exit $($chickenBuild.ExitCode))." }
Write-Host "Build ready: $(Join-Path $chickenProject 'build\web-mobile')"
