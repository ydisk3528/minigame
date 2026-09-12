param([string]$Creator = 'C:\ProgramData\cocos\editors\Creator\3.8.6\CocosCreator.exe')
$ErrorActionPreference='Stop'
$cloverArgs=@('--project',('"'+$PSScriptRoot+'"'),'--build',('"configPath='+(Join-Path $PSScriptRoot 'build-config.json')+'"'))
$cloverBuild=Start-Process -FilePath $Creator -ArgumentList $cloverArgs -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'build.log') -RedirectStandardError (Join-Path $PSScriptRoot 'build-error.log') -Wait -PassThru
if(-not (Select-String -LiteralPath (Join-Path $PSScriptRoot 'build.log') -Pattern 'build success' -Quiet)){throw 'Build failed: see build.log'}
