Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Drawing.Drawing2D
Add-Type -AssemblyName System.Drawing.Imaging

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$OutputDir = Join-Path $ProjectRoot "apps/web/public/icons"

New-Item -ItemType Directory -Force $OutputDir | Out-Null

function New-RoundedRectanglePath {
  param(
    [float] $X,
    [float] $Y,
    [float] $Width,
    [float] $Height,
    [float] $Radius
  )

  $Path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $Diameter = $Radius * 2

  $Path.AddArc($X, $Y, $Diameter, $Diameter, 180, 90)
  $Path.AddArc($X + $Width - $Diameter, $Y, $Diameter, $Diameter, 270, 90)
  $Path.AddArc($X + $Width - $Diameter, $Y + $Height - $Diameter, $Diameter, $Diameter, 0, 90)
  $Path.AddArc($X, $Y + $Height - $Diameter, $Diameter, $Diameter, 90, 90)
  $Path.CloseFigure()

  return $Path
}

function Save-SakuinIcon {
  param(
    [string] $OutputPath,
    [int] $Size,
    [bool] $Maskable
  )

  $Bitmap = New-Object System.Drawing.Bitmap -ArgumentList $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)

  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $Graphics.Clear([System.Drawing.Color]::Transparent)

  $Violet = [System.Drawing.Color]::FromArgb(124, 58, 237)
  $Purple = [System.Drawing.Color]::FromArgb(109, 40, 217)
  $Indigo = [System.Drawing.Color]::FromArgb(79, 70, 229)
  $White = [System.Drawing.Color]::FromArgb(255, 255, 255)

  if ($Maskable) {
    $BackgroundRect = New-Object System.Drawing.Rectangle -ArgumentList 0, 0, $Size, $Size
    $BackgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $BackgroundRect,
      $Violet,
      $Indigo,
      [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )

    $Graphics.FillRectangle($BackgroundBrush, 0, 0, $Size, $Size)
    $BackgroundBrush.Dispose()

    $WalletScale = 0.44
  } else {
    $Padding = [float]($Size * 0.08)
    $BoxSize = [float]($Size - ($Padding * 2))
    $Radius = [float]($Size * 0.18)

    $BackgroundPath = New-RoundedRectanglePath $Padding $Padding $BoxSize $BoxSize $Radius

    $BackgroundRect = New-Object System.Drawing.RectangleF -ArgumentList $Padding, $Padding, $BoxSize, $BoxSize
    $BackgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $BackgroundRect,
      $Violet,
      $Indigo,
      [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )

    $Graphics.FillPath($BackgroundBrush, $BackgroundPath)

    $HighlightBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(45, 255, 255, 255))
    $Graphics.FillEllipse($HighlightBrush, ($Size * 0.12), ($Size * 0.10), ($Size * 0.34), ($Size * 0.34))

    $ShadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(25, 30, 20, 90))
    $Graphics.FillEllipse($ShadowBrush, ($Size * 0.54), ($Size * 0.56), ($Size * 0.34), ($Size * 0.34))

    $HighlightBrush.Dispose()
    $ShadowBrush.Dispose()
    $BackgroundBrush.Dispose()
    $BackgroundPath.Dispose()

    $WalletScale = 0.46
  }

  $WalletWidth = [float]($Size * $WalletScale)
  $WalletHeight = [float]($WalletWidth * 0.68)
  $WalletX = [float](($Size - $WalletWidth) / 2)
  $WalletY = [float](($Size - $WalletHeight) / 2 + ($Size * 0.015))
  $WalletRadius = [float]($Size * 0.035)

  $StrokeWidth = [float]([Math]::Max(5, $Size * 0.045))
  $LineWidth = [float]([Math]::Max(4, $Size * 0.032))

  $WalletPen = New-Object System.Drawing.Pen($White, $StrokeWidth)
  $WalletPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $WalletPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $WalletPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $LinePen = New-Object System.Drawing.Pen($White, $LineWidth)
  $LinePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $LinePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $WalletPath = New-RoundedRectanglePath $WalletX $WalletY $WalletWidth $WalletHeight $WalletRadius
  $Graphics.DrawPath($WalletPen, $WalletPath)

  $LineStartX = [float]($WalletX + ($WalletWidth * 0.18))
  $LineEndX = [float]($WalletX + ($WalletWidth * 0.68))
  $LineY = [float]($WalletY + ($WalletHeight * 0.38))

  $Graphics.DrawLine($LinePen, $LineStartX, $LineY, $LineEndX, $LineY)

  $DotSize = [float]($Size * 0.07)
  $DotX = [float]($WalletX + ($WalletWidth * 0.70))
  $DotY = [float]($WalletY + ($WalletHeight * 0.58))

  $DotBrush = New-Object System.Drawing.SolidBrush($White)
  $Graphics.FillEllipse($DotBrush, $DotX, $DotY, $DotSize, $DotSize)

  $DotBrush.Dispose()
  $WalletPath.Dispose()
  $WalletPen.Dispose()
  $LinePen.Dispose()
  $Graphics.Dispose()

  $Bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $Bitmap.Dispose()
}

Save-SakuinIcon -OutputPath (Join-Path $OutputDir "pwa-192.png") -Size 192 -Maskable $false
Save-SakuinIcon -OutputPath (Join-Path $OutputDir "pwa-512.png") -Size 512 -Maskable $false
Save-SakuinIcon -OutputPath (Join-Path $OutputDir "maskable-192.png") -Size 192 -Maskable $true
Save-SakuinIcon -OutputPath (Join-Path $OutputDir "maskable-512.png") -Size 512 -Maskable $true

$Svg = @"
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sakuinGradient" x1="72" y1="72" x2="440" y2="440" gradientUnits="userSpaceOnUse">
      <stop stop-color="#7C3AED"/>
      <stop offset="0.52" stop-color="#6D28D9"/>
      <stop offset="1" stop-color="#4F46E5"/>
    </linearGradient>
  </defs>
  <rect x="40" y="40" width="432" height="432" rx="96" fill="url(#sakuinGradient)"/>
  <circle cx="150" cy="138" r="96" fill="white" fill-opacity="0.10"/>
  <circle cx="380" cy="382" r="84" fill="#1E145A" fill-opacity="0.16"/>
  <rect x="146" y="172" width="220" height="152" rx="22" stroke="white" stroke-width="24" stroke-linejoin="round"/>
  <path d="M196 238H314" stroke="white" stroke-width="18" stroke-linecap="round"/>
  <circle cx="326" cy="276" r="18" fill="white"/>
</svg>
"@

Set-Content -Path (Join-Path $OutputDir "sakuin-logo.svg") -Value $Svg -Encoding UTF8

Write-Host "Sakuin icons generated successfully:"
Write-Host "- apps/web/public/icons/pwa-192.png"
Write-Host "- apps/web/public/icons/pwa-512.png"
Write-Host "- apps/web/public/icons/maskable-192.png"
Write-Host "- apps/web/public/icons/maskable-512.png"
Write-Host "- apps/web/public/icons/sakuin-logo.svg"
