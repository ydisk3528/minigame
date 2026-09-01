param(
    [string]$SourceRoot = (Join-Path $PSScriptRoot 'art-source\tile-faces-ai'),
    [string]$OutputRoot = (Join-Path $PSScriptRoot '..\assets\resources\images\tiles')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Remove-ConnectedBackdrop([Drawing.Bitmap]$bitmap, [Drawing.Rectangle]$seedRect) {
    $width = $bitmap.Width; $height = $bitmap.Height
    $visited = [bool[]]::new($width * $height)
    $queue = [Collections.Generic.Queue[Drawing.Point]]::new()
    $isBackdrop = {
        param([Drawing.Color]$color)
        $max = [Math]::Max($color.R, [Math]::Max($color.G, $color.B))
        $min = [Math]::Min($color.R, [Math]::Min($color.G, $color.B))
        return $color.A -gt 10 -and $max - $min -le 28 -and $max -ge 155
    }
    for ($x = $seedRect.Left; $x -lt $seedRect.Right; $x++) { $queue.Enqueue([Drawing.Point]::new($x, $seedRect.Top)); $queue.Enqueue([Drawing.Point]::new($x, $seedRect.Bottom - 1)) }
    for ($y = $seedRect.Top + 1; $y -lt $seedRect.Bottom - 1; $y++) { $queue.Enqueue([Drawing.Point]::new($seedRect.Left, $y)); $queue.Enqueue([Drawing.Point]::new($seedRect.Right - 1, $y)) }
    while ($queue.Count) {
        $point = $queue.Dequeue(); $index = $point.Y * $width + $point.X
        if ($visited[$index]) { continue }; $visited[$index] = $true
        if (-not (& $isBackdrop $bitmap.GetPixel($point.X, $point.Y))) { continue }
        $bitmap.SetPixel($point.X, $point.Y, [Drawing.Color]::Transparent)
        if ($point.X -gt 0) { $queue.Enqueue([Drawing.Point]::new($point.X - 1, $point.Y)) }
        if ($point.X + 1 -lt $width) { $queue.Enqueue([Drawing.Point]::new($point.X + 1, $point.Y)) }
        if ($point.Y -gt 0) { $queue.Enqueue([Drawing.Point]::new($point.X, $point.Y - 1)) }
        if ($point.Y + 1 -lt $height) { $queue.Enqueue([Drawing.Point]::new($point.X, $point.Y + 1)) }
    }
}

function Save-ResizedPng([string]$sourcePath, [string]$targetPath, [Drawing.Rectangle]$sourceRect, [bool]$removeBackdrop = $false) {
    $source = [Drawing.Bitmap]::FromFile($sourcePath)
    $bitmap = [Drawing.Bitmap]::new(184, 244, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([Drawing.Color]::Transparent)
    $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $targetRect = [Drawing.Rectangle]::new(0, 0, 184, 244)
    if ($removeBackdrop) {
        $scale = [Math]::Min(184 / $sourceRect.Width, 244 / $sourceRect.Height)
        $targetWidth = [Math]::Max(1, [int][Math]::Round($sourceRect.Width * $scale))
        $targetHeight = [Math]::Max(1, [int][Math]::Round($sourceRect.Height * $scale))
        $targetRect = [Drawing.Rectangle]::new([int]((184 - $targetWidth) / 2), [int]((244 - $targetHeight) / 2), $targetWidth, $targetHeight)
    }
    $graphics.DrawImage($source, $targetRect, $sourceRect, [Drawing.GraphicsUnit]::Pixel)
    if ($removeBackdrop) { Remove-ConnectedBackdrop $bitmap $targetRect }
    $bitmap.Save($targetPath, [Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose(); $bitmap.Dispose(); $source.Dispose()
}

$baseSource = Join-Path $PSScriptRoot 'art-source\tile_blank_ai.png'
Save-ResizedPng $baseSource (Join-Path $OutputRoot 'tile_base.png') ([Drawing.Rectangle]::new(220, 54, 780, 1180))

$types = @(
    1..9 | ForEach-Object { "wan_$_" }
    1..9 | ForEach-Object { "tong_$_" }
    1..9 | ForEach-Object { "tiao_$_" }
    'honor_dong','honor_nan','honor_xi','honor_bei','honor_zhong','honor_fa','honor_bai'
)
foreach ($type in $types) {
    $sourcePath = Join-Path $SourceRoot "$type.png"
    $source = [Drawing.Bitmap]::FromFile($sourcePath)
    $rect = [Drawing.Rectangle]::new(0, 0, $source.Width, $source.Height)
    $source.Dispose()
    Save-ResizedPng $sourcePath (Join-Path $OutputRoot "$type.png") $rect $true
}

Write-Output "Prepared one shared tile base and $($types.Count) transparent face images"
