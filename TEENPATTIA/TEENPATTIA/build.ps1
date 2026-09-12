param([string]$Creator = 'C:\ProgramData\cocos\editors\Creator\3.8.6\CocosCreator.exe')
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Creator)) { throw "Cocos Creator not found: $Creator" }
$teenpattiProject = $PSScriptRoot
$teenpattiLog = Join-Path $teenpattiProject 'build-client.log'
$teenpattiErrorLog = Join-Path $teenpattiProject 'build-client-error.log'
$teenpattiArguments = @('--project', ('"' + $teenpattiProject + '"'), '--build', ('"configPath=' + (Join-Path $teenpattiProject 'build-config.json') + '"'))
$teenpattiBuild = Start-Process -FilePath $Creator -ArgumentList $teenpattiArguments -WindowStyle Hidden -RedirectStandardOutput $teenpattiLog -RedirectStandardError $teenpattiErrorLog -PassThru
# Wait for the CLI process, not persistent Electron helper descendants.
$teenpattiBuild.WaitForExit()
$teenpattiFailed = Select-String -LiteralPath @($teenpattiLog, $teenpattiErrorLog) -Pattern 'run build task .* failed|CCON Format error|error:.*build.*failed' -Quiet
# Creator's BuildExitCode declares BUILD_SUCCESS = 36; some launches return 0.
if ($teenpattiBuild.ExitCode -notin @(0, 36) -or ($teenpattiFailed -contains $true) -or -not (Select-String -LiteralPath $teenpattiLog -Pattern 'build success' -Quiet)) { throw "Build failed; see $teenpattiLog and $teenpattiErrorLog (exit $($teenpattiBuild.ExitCode))." }
Write-Host "Build ready: $(Join-Path $teenpattiProject 'build\web-mobile')"
