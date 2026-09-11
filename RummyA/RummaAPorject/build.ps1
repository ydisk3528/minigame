param([string]$Creator = 'C:\ProgramData\cocos\editors\Creator\3.8.6\CocosCreator.exe')
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Creator)) { throw "Cocos Creator not found: $Creator" }
$rummyProject = $PSScriptRoot
$rummyLog = Join-Path $rummyProject 'build-client.log'
$rummyErrorLog = Join-Path $rummyProject 'build-client-error.log'
$rummyArguments = @('--project', ('"' + $rummyProject + '"'), '--build', ('"configPath=' + (Join-Path $rummyProject 'build-config.json') + '"'))
$rummyBuild = Start-Process -FilePath $Creator -ArgumentList $rummyArguments -WindowStyle Hidden -RedirectStandardOutput $rummyLog -RedirectStandardError $rummyErrorLog -Wait -PassThru
if (-not (Select-String -LiteralPath $rummyLog -Pattern 'build success' -Quiet)) { throw "Build failed; see $rummyLog and $rummyErrorLog (exit $($rummyBuild.ExitCode))." }
Write-Host "Build ready: $(Join-Path $rummyProject 'build\web-mobile')"
