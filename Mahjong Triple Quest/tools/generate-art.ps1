param([string]$OutputRoot = (Join-Path $PSScriptRoot '..\assets\resources\images'))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$uiRoot = Join-Path $OutputRoot 'ui'
$tileRoot = Join-Path $OutputRoot 'tiles'
New-Item -ItemType Directory -Force -Path $uiRoot, $tileRoot | Out-Null

function New-Bitmap([int]$width, [int]$height) {
    $bitmap = [Drawing.Bitmap]::new($width, $height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bitmap.SetResolution(96, 96)
    return $bitmap
}

function New-RoundRect([Drawing.RectangleF]$rect, [float]$radius) {
    $path = [Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $radius * 2
    $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function Save-Png([Drawing.Bitmap]$bitmap, [string]$path) {
    $bitmap.Save($path, [Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
}

function New-UiPlate([string]$path, [int]$width, [int]$height, [string]$fill, [string]$border, [int]$radius = 24) {
    $bitmap = New-Bitmap $width $height
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([Drawing.Color]::Transparent)
    $shadow = New-RoundRect ([Drawing.RectangleF]::new(5, 8, $width - 10, $height - 12)) $radius
    $graphics.FillPath([Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(35, 61, 73, 62)), $shadow)
    $shape = New-RoundRect ([Drawing.RectangleF]::new(4, 3, $width - 10, $height - 12)) $radius
    $graphics.FillPath([Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($fill)), $shape)
    $graphics.DrawPath([Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml($border), 3), $shape)
    $shadow.Dispose(); $shape.Dispose(); $graphics.Dispose()
    Save-Png $bitmap $path
}

New-UiPlate (Join-Path $uiRoot 'panel.png') 640 220 '#F6F0DE' '#91A68C' 28
New-UiPlate (Join-Path $uiRoot 'panel_large.png') 680 860 '#F7F1E2' '#8EA38A' 34
New-UiPlate (Join-Path $uiRoot 'button_primary.png') 420 126 '#547B69' '#365A4B' 30
New-UiPlate (Join-Path $uiRoot 'button_secondary.png') 220 104 '#F3EBD8' '#6F8D79' 24
New-UiPlate (Join-Path $uiRoot 'slot.png') 92 122 '#E8E2D3' '#AAB5A2' 17
New-UiPlate (Join-Path $uiRoot 'hud_chip.png') 210 76 '#F5EFDF' '#92A78E' 21
New-UiPlate (Join-Path $uiRoot 'board_panel.png') 702 690 '#EEE5D1' '#819984' 36

$icons = @{
    'undo' = '↶'; 'shuffle' = '↝'; 'move' = '⇧'; 'hint' = '?';
    'settings' = '⚙'; 'home' = '⌂'; 'restart' = '↻'; 'coin' = '●'; 'hand' = '☝'
}
$iconFont = [Drawing.Font]::new('Segoe UI Symbol', 54, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
foreach ($entry in $icons.GetEnumerator()) {
    $bitmap = New-Bitmap 104 104
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.Clear([Drawing.Color]::Transparent)
    $path = New-RoundRect ([Drawing.RectangleF]::new(4, 3, 94, 94)) 24
    $graphics.FillPath([Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#F3EBD8')), $path)
    $graphics.DrawPath([Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#6F8D79'), 3), $path)
    $format = [Drawing.StringFormat]::new()
    $format.Alignment = [Drawing.StringAlignment]::Center
    $format.LineAlignment = [Drawing.StringAlignment]::Center
    $graphics.DrawString($entry.Value, $iconFont, [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#3F6555')), [Drawing.RectangleF]::new(5, 1, 92, 92), $format)
    $format.Dispose(); $path.Dispose(); $graphics.Dispose()
    Save-Png $bitmap (Join-Path $uiRoot ("icon_{0}.png" -f $entry.Key))
}
$iconFont.Dispose()

Write-Output "Generated UI art at $OutputRoot (Mahjong faces are prepared by prepare-tile-assets.ps1)"
