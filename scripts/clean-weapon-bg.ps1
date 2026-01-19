param(
  [string]$Root = "dnd-console\\backend\\app\\static\\items\\weapons\\mainhand"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $Root)) {
  Write-Output "Missing root: $Root"
  exit 1
}

$files = Get-ChildItem -Path $Root -Recurse -Filter *.png
$updated = 0

foreach ($file in $files) {
  $path = $file.FullName
  $bmpCheck = [System.Drawing.Bitmap]::FromFile($path)
  $a = $bmpCheck.GetPixel(0, 0).A
  $bmpCheck.Dispose()
  if ($a -le 0) { continue }

  $bytes = [System.IO.File]::ReadAllBytes($path)
  $ms = New-Object System.IO.MemoryStream -ArgumentList (, $bytes)
  $orig = [System.Drawing.Bitmap]::FromStream($ms)
  $bmp = New-Object System.Drawing.Bitmap($orig.Width, $orig.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage($orig, 0, 0, $orig.Width, $orig.Height)
  $g.Dispose()
  $orig.Dispose()
  $ms.Dispose()

  $bg = $bmp.GetPixel(0, 0)
  $bmp.MakeTransparent($bg)
  $tmp = "$path.tmp"
  $bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Move-Item -Force $tmp $path
  $updated++
}

Write-Output "Removed background from $updated file(s)."
