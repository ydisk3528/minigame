param([string]$Creator = 'C:\ProgramData\cocos\editors\Creator\3.8.6\CocosCreator.exe')
$ErrorActionPreference='Stop'
$cloverArgs=@('--project',('"'+$PSScriptRoot+'"'),'--build',('"configPath='+(Join-Path $PSScriptRoot 'build-config.json')+'"'))
$cloverBuild=Start-Process -FilePath $Creator -ArgumentList $cloverArgs -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'build.log') -RedirectStandardError (Join-Path $PSScriptRoot 'build-error.log') -Wait -PassThru
if(-not (Select-String -LiteralPath (Join-Path $PSScriptRoot 'build.log') -Pattern 'build success' -Quiet) -or
   (Select-String -LiteralPath (Join-Path $PSScriptRoot 'build-error.log') -Pattern 'Importer exec failed|run build task .*failed|TypeError:|SyntaxError:' -Quiet) -or
   -not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'build/web-mobile/assets/clover'))){throw 'Build failed: see build.log and build-error.log'}
