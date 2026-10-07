# Generates the PWA icon PNGs using .NET System.Drawing (no Node/Python).
# Usage: powershell -ExecutionPolicy Bypass -File make-icons.ps1
param([string]$Out = "")

if ($Out -eq "") { $Out = $PSScriptRoot }
Add-Type -AssemblyName System.Drawing

# Pick a Korean-capable font that actually exists on this machine.
# NOTE: FontFamily lives in System.Drawing, NOT System.Drawing.Text.
$candidates = @("Malgun Gothic", "Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI")
$family = $null
foreach ($name in $candidates) {
  try {
    $f = New-Object System.Drawing.FontFamily($name)
    if ($f.Name -eq $name) { $family = $f; break }
  } catch { }
}
if ($null -eq $family) { $family = [System.Drawing.FontFamily]::GenericSansSerif }
Write-Host "Using font: $($family.Name)"

# Coverage check: render 한 with the chosen font. If it looks identical to a
# .notdef (tofu box) render of a Private Use Area char, the font has no Hangul.
function Get-GlyphHash($fam, [string]$ch) {
  $font = New-Object System.Drawing.Font($fam, 100,
    [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $bmp = New-Object System.Drawing.Bitmap(300, 240)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = "Center"
  $fmt.LineAlignment = "Center"
  $g.DrawString($ch, $font, [System.Drawing.Brushes]::Black,
    (New-Object System.Drawing.RectangleF(0, 0, 300, 240)), $fmt)
  $g.Dispose()
  $font.Dispose()
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $sha = [System.Security.Cryptography.SHA1]::Create()
  $hash = [BitConverter]::ToString($sha.ComputeHash($ms.ToArray()))
  $ms.Dispose()
  return $hash
}

$hangul = [string][char]0xD55C
$tofu = [string][char]0xE000   # Private Use Area -> always .notdef/box
$hHangul = Get-GlyphHash $family $hangul
$hTofu = Get-GlyphHash $family $tofu
if ($hHangul -eq $hTofu) {
  throw "Font '$($family.Name)' cannot render 한 (same pixels as .notdef box)"
}
Write-Host "Glyph coverage OK: 한 renders differently from .notdef"

$blue = [System.Drawing.Color]::FromArgb(255, 47, 111, 237)
$indigo = [System.Drawing.Color]::FromArgb(255, 108, 99, 255)

function New-Base([int]$size, [bool]$rounded, [double]$radiusFrac) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"
  $g.TextRenderingHint = "ClearTypeGridFit"
  $g.PixelOffsetMode = "HighQuality"
  $g.InterpolationMode = "HighQualityBicubic"

  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect, $blue, $indigo, 45)

  if ($rounded) {
    $r = [int]($size * $radiusFrac)
    $d = $r * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($size - $d, 0, $d, $d, 270, 90)
    $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
    $path.AddArc(0, $size - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($grad, $path)
    $path.Dispose()
  } else {
    $g.FillRectangle($grad, $rect)
  }
  return @($bmp, $g)
}

function Add-Glyph($bmp, $g, [int]$size, [double]$emFrac) {
  $em = [float]($size * $emFrac)
  $font = New-Object System.Drawing.Font($family, $em,
    [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = "Center"
  $fmt.LineAlignment = "Center"
  $fmt.FormatFlags = [System.Drawing.StringFormatFlags]::NoClip
  $bounds = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
  $g.DrawString([char]0xD55C, $font, [System.Drawing.Brushes]::White, $bounds, $fmt)  # 한
  $font.Dispose()
  $fmt.Dispose()
}

function Save-Png($bmp, $g, [string]$name) {
  $g.Dispose()
  $path = Join-Path $Out $name
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $len = (Get-Item $path).Length
  Write-Host ("Wrote {0}  ({1} bytes)" -f $name, $len)
}

# Store icons (rounded square)
$a = New-Base 192 $true 0.20; Add-Glyph $a[0] $a[1] 192 0.52; Save-Png $a[0] $a[1] "icon-192.png"
$a = New-Base 512 $true 0.20; Add-Glyph $a[0] $a[1] 512 0.52; Save-Png $a[0] $a[1] "icon-512.png"

# Maskable icon (full bleed, glyph inside the safe zone)
$a = New-Base 512 $false 0; Add-Glyph $a[0] $a[1] 512 0.34; Save-Png $a[0] $a[1] "icon-maskable-512.png"

# iOS home-screen icon (full bleed — iOS rounds it itself)
$a = New-Base 180 $false 0; Add-Glyph $a[0] $a[1] 180 0.52; Save-Png $a[0] $a[1] "apple-touch-icon.png"

# Favicon
$a = New-Base 64 $true 0.18; Add-Glyph $a[0] $a[1] 64 0.52; Save-Png $a[0] $a[1] "favicon.png"

Write-Host "Done."
