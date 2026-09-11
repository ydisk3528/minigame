param([string]$Creator='C:\ProgramData\cocos\editors\Creator\3.8.6\CocosCreator.exe')
$ErrorActionPreference='Stop'
$buildLog=Join-Path $PSScriptRoot 'build-recovery.log'
$errorLog=Join-Path $PSScriptRoot 'build-recovery-error.log'
$buildProcess=Start-Process -FilePath $Creator -ArgumentList @('--project',('"'+$PSScriptRoot+'"'),'--build',('"configPath='+(Join-Path $PSScriptRoot 'build-config.json')+'"')) -WindowStyle Hidden -RedirectStandardOutput $buildLog -RedirectStandardError $errorLog -PassThru
$buildProcess.WaitForExit()
if (!(Select-String -LiteralPath $buildLog -Pattern 'build success' -Quiet)) { throw "Creator build failed; inspect $buildLog" }
if (Select-String -LiteralPath $buildLog,$errorLog -Pattern '(?i)( - error:|TypeError:|无效资源)' -Quiet) { throw "Creator reported asset/script errors; inspect $errorLog" }
Write-Output (Join-Path $PSScriptRoot 'build\web-mobile')
