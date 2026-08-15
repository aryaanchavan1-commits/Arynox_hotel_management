$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$navy  = [System.Drawing.Color]::FromArgb(255, 15, 27, 51)
$navy2 = [System.Drawing.Color]::FromArgb(255, 30, 58, 102)
$gold  = [System.Drawing.Color]::FromArgb(255, 212, 175, 55)
$white = [System.Drawing.Color]::White

function New-SquareLogo {
    param([int]$size, [string]$path)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear($navy)
    $u = [double]$size / 512.0
    $penGold = New-Object System.Drawing.Pen($gold, [float](9 * $u))
    $brushGold = New-Object System.Drawing.SolidBrush($gold)
    $brushNavy2 = New-Object System.Drawing.SolidBrush($navy2)
    $brushWhite = New-Object System.Drawing.SolidBrush($white)

    $g.DrawLine($penGold, [float](256 * $u), [float](60 * $u), [float](256 * $u), [float](142 * $u))
    $flag = New-Object System.Drawing.Drawing2D.GraphicsPath
    $flag.AddPolygon([System.Drawing.PointF[]]@(
        (New-Object System.Drawing.PointF([float](257 * $u), [float](60 * $u))),
        (New-Object System.Drawing.PointF([float](297 * $u), [float](74 * $u))),
        (New-Object System.Drawing.PointF([float](257 * $u), [float](88 * $u)))
    ))
    $g.FillPath($brushGold, $flag)
    $g.FillRectangle($brushGold, [float](150 * $u), [float](142 * $u), [float](212 * $u), [float](34 * $u))
    $g.FillRectangle($brushNavy2, [float](150 * $u), [float](170 * $u), [float](212 * $u), [float](200 * $u))
    $g.DrawRectangle($penGold, [float](150 * $u), [float](170 * $u), [float](212 * $u), [float](200 * $u))
    foreach ($wx in 178, 282) { foreach ($wy in 214, 294) {
        $g.FillRectangle($brushGold, [float]($wx * $u), [float]($wy * $u), [float](52 * $u), [float](52 * $u))
    } }
    $g.FillRectangle($brushGold, [float](218 * $u), [float](330 * $u), [float](76 * $u), [float](40 * $u))

    if ($size -ge 128) {
        $f1 = New-Object System.Drawing.Font('Segoe UI', [float](58 * $u), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $f2 = New-Object System.Drawing.Font('Segoe UI', [float](30 * $u), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $s1 = $g.MeasureString('ARYNOX', $f1)
        $s2 = $g.MeasureString('HOTEL ERP', $f2)
        $g.DrawString('ARYNOX', $f1, $brushWhite, [float](($size - $s1.Width) / 2), [float](402 * $u))
        $g.DrawString('HOTEL ERP', $f2, $brushGold, [float](($size - $s2.Width) / 2), [float](462 * $u))
        $f1.Dispose(); $f2.Dispose()
    } else {
        $fA = New-Object System.Drawing.Font('Arial', [float](0.62 * $size), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $sA = $g.MeasureString('A', $fA)
        $g.DrawString('A', $fA, $brushGold, [float](($size - $sA.Width) / 2), [float](($size - $sA.Height) / 2 - 3 * $u))
        $fA.Dispose()
    }

    $g.Dispose(); $penGold.Dispose(); $brushGold.Dispose(); $brushNavy2.Dispose(); $brushWhite.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function New-WideLogo {
    param([int]$w, [int]$h, [string]$path, [System.Drawing.Imaging.ImageFormat]$format)
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear($navy)
    $penGold = New-Object System.Drawing.Pen($gold, 5)
    $brushGold = New-Object System.Drawing.SolidBrush($gold)
    $brushWhite = New-Object System.Drawing.SolidBrush($white)

    $g.DrawLine($penGold, 56, 16, 56, 40)
    $flag = New-Object System.Drawing.Drawing2D.GraphicsPath
    $flag.AddPolygon([System.Drawing.PointF[]]@(
        (New-Object System.Drawing.PointF(57, 16)),
        (New-Object System.Drawing.PointF(83, 26)),
        (New-Object System.Drawing.PointF(57, 36))
    ))
    $g.FillPath($brushGold, $flag)
    $g.FillRectangle($brushGold, 12, 40, 88, 14)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush($navy2)), 12, 50, 88, 62)
    $g.DrawRectangle($penGold, 12, 50, 88, 62)
    $g.FillRectangle($brushGold, 24, 60, 22, 22)
    $g.FillRectangle($brushGold, 66, 60, 22, 22)
    $g.FillRectangle($brushGold, 40, 92, 32, 20)

    $f1 = New-Object System.Drawing.Font('Segoe UI', 38, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $f2 = New-Object System.Drawing.Font('Segoe UI', 38, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $s1 = $g.MeasureString('ARYNOX', $f1)
    $s2 = $g.MeasureString(' HOTEL ERP', $f2)
    $textW = $s1.Width + $s2.Width
    $x = (($w - $textW) / 2) + 10
    $y = ($h - [Math]::Max($s1.Height, $s2.Height)) / 2
    $g.DrawString('ARYNOX', $f1, $brushWhite, $x, $y)
    $g.DrawString(' HOTEL ERP', $f2, $brushGold, $x + $s1.Width, $y)
    $f1.Dispose(); $f2.Dispose()

    $g.Dispose(); $penGold.Dispose(); $brushGold.Dispose(); $brushWhite.Dispose()
    $bmp.Save($path, $format)
    $bmp.Dispose()
}

function New-Ico {
    param([int]$size, [string]$path)
    $tmp = Join-Path $env:TEMP 'arynox_logo_tmp.png'
    New-SquareLogo $size $tmp
    $bmp = [System.Drawing.Bitmap]::FromFile($tmp)
    $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
    $fs = [System.IO.File]::Create($path)
    $icon.Save($fs)
    $fs.Close()
    $icon.Dispose(); $bmp.Dispose()
    Remove-Item $tmp -Force
}

function New-Svg {
    param([string]$path, [string]$accent)
    $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" font-family="Segoe UI, Arial, sans-serif">
  <rect width="512" height="512" rx="110" fill="#0F1B33"/>
  <rect x="247" y="60" width="9" height="92" fill="$accent"/>
  <polygon points="257,60 297,74 257,88" fill="$accent"/>
  <rect x="150" y="142" width="212" height="34" rx="6" fill="$accent"/>
  <rect x="150" y="170" width="212" height="200" rx="8" fill="#1E3A66" stroke="$accent" stroke-width="7"/>
  <rect x="178" y="214" width="52" height="52" rx="4" fill="$accent"/>
  <rect x="282" y="214" width="52" height="52" rx="4" fill="$accent"/>
  <rect x="178" y="294" width="52" height="52" rx="4" fill="$accent"/>
  <rect x="282" y="294" width="52" height="52" rx="4" fill="$accent"/>
  <rect x="218" y="330" width="76" height="40" rx="4" fill="$accent"/>
  <text x="256" y="430" text-anchor="middle" font-size="58" font-weight="bold" fill="#FFFFFF">ARYNOX</text>
  <text x="256" y="478" text-anchor="middle" font-size="32" font-weight="bold" fill="$accent">HOTEL ERP</text>
</svg>
"@
    [System.IO.File]::WriteAllText($path, $svg, (New-Object System.Text.UTF8Encoding($false)))
}

$ref = 'D:\Arynoxtech\Arynoxtech_hotel_management\reference'
$png = [System.Drawing.Imaging.ImageFormat]::Png
$jpg = [System.Drawing.Imaging.ImageFormat]::Jpeg
$gif = [System.Drawing.Imaging.ImageFormat]::Gif

New-SquareLogo 512 "$ref\Hotel-Management-System\image\bluebirdlogo.png"
New-WideLogo 400 120 "$ref\Hotel-Management-System\image\logo.jpg" $jpg

New-Ico 32 "$ref\hotel-mgmt-system\image\favicon\favicon.ico"
New-SquareLogo 32 "$ref\hotel-mgmt-system\image\favicon\favicon-32x32.png"
New-SquareLogo 16 "$ref\hotel-mgmt-system\image\favicon\favicon-16x16.png"
New-SquareLogo 192 "$ref\hotel-mgmt-system\image\favicon\apple-touch-icon.png"

foreach ($app in 'hotel-admin-frontend', 'hotelontouch', 'hotel-restraunt-frontend') {
    New-SquareLogo 512 "$ref\gssoc2021-HotelOnTouch\$app\public\logo512.png"
    New-SquareLogo 192 "$ref\gssoc2021-HotelOnTouch\$app\public\logo192.png"
    New-Ico 32 "$ref\gssoc2021-HotelOnTouch\$app\public\favicon_logo.ico"
    New-Svg "$ref\gssoc2021-HotelOnTouch\$app\src\logo.svg" '#D4AF37'
}
New-Svg "$ref\gssoc2021-HotelOnTouch\hotelontouch\src\assets\logo1.svg" '#D4AF37'
New-Svg "$ref\gssoc2021-HotelOnTouch\hotelontouch\src\assets\logo2.svg" '#7FB3D5'
New-Svg "$ref\gssoc2021-HotelOnTouch\hotelontouch\src\assets\logo3.svg" '#E67E22'
New-SquareLogo 512 "$ref\gssoc2021-HotelOnTouch\hotelontouch\src\assets\logo.png"

New-WideLogo 400 120 "$ref\qloapps\img\logo.jpg" $jpg
New-WideLogo 400 120 "$ref\qloapps\img\logo_invoice.jpg" $jpg
New-WideLogo 400 120 "$ref\qloapps\img\logo_mail.jpg" $jpg
New-WideLogo 400 120 "$ref\qloapps\img\logo_stores.png" $png
New-WideLogo 400 120 "$ref\qloapps\img\logo_stores.gif" $gif
New-Ico 32 "$ref\qloapps\img\favicon.ico"
New-SquareLogo 512 "$ref\qloapps\install\theme\img\logo.png"
New-Ico 32 "$ref\qloapps\install\theme\img\favicon.ico"
New-SquareLogo 192 "$ref\qloapps\admin\filemanager\img\logo.png"
New-Ico 32 "$ref\qloapps\admin\filemanager\img\ico\favicon.ico"
New-Ico 32 "$ref\qloapps\admin\filemanager\img\ico_dark\favicon.ico"

Write-Host 'All reference logos regenerated.'