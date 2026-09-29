Add-Type -AssemblyName System.Drawing

$sourcePath = "D:\Projects\SentinelKey\media\Gemini_Generated_Image_e55jl0e55jl0e55j-removebg-preview-removebg-preview.png"

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source logo file not found at $sourcePath"
    exit 1
}

# Create output directories if they don't exist
$dirs = @(
    "D:\Projects\SentinelKey\apps\website\public",
    "D:\Projects\SentinelKey\apps\dashboard\public",
    "D:\Projects\SentinelKey\extension\icons"
)
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# 1. Copy exact high-res source logo
Copy-Item -Path $sourcePath -Destination "D:\Projects\SentinelKey\media\logo.png" -Force
Copy-Item -Path $sourcePath -Destination "D:\Projects\SentinelKey\apps\website\public\logo.png" -Force
Copy-Item -Path $sourcePath -Destination "D:\Projects\SentinelKey\apps\dashboard\public\logo.png" -Force
Copy-Item -Path $sourcePath -Destination "D:\Projects\SentinelKey\extension\icons\logo.png" -Force

# 2. Function to resize image into a square canvas with high quality
function Export-SquarePng {
    param(
        [string]$Src,
        [string]$Dst,
        [int]$Size
    )
    $img = [System.Drawing.Image]::FromFile($Src)
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Scale while keeping aspect ratio and center in square
    $ratio = [Math]::Min([double]$Size / $img.Width, [double]$Size / $img.Height)
    $w = [int]($img.Width * $ratio)
    $h = [int]($img.Height * $ratio)
    $x = [int](($Size - $w) / 2)
    $y = [int](($Size - $h) / 2)

    $g.DrawImage($img, $x, $y, $w, $h)

    $bmp.Save($Dst, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()
}

# Function to create PNG-based .ico file
function Export-IcoFromPng {
    param(
        [string]$PngPath,
        [string]$IcoPath
    )
    $pngBytes = [System.IO.File]::ReadAllBytes($PngPath)
    $pngLen = $pngBytes.Length

    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)

    # ICONDIR
    $bw.Write([uint16]0) # Reserved
    $bw.Write([uint16]1) # Type (1 = ICO)
    $bw.Write([uint16]1) # Number of images

    # ICONDIRENTRY
    $bw.Write([byte]32)  # Width
    $bw.Write([byte]32)  # Height
    $bw.Write([byte]0)   # Color count (0 = >=8bpp)
    $bw.Write([byte]0)   # Reserved
    $bw.Write([uint16]1) # Color planes
    $bw.Write([uint16]32)# Bits per pixel
    $bw.Write([uint32]$pngLen) # Size of image data
    $bw.Write([uint32]22)      # Offset of image data

    $bw.Write($pngBytes)
    $bw.Flush()

    [System.IO.File]::WriteAllBytes($IcoPath, $ms.ToArray())
    $bw.Dispose()
    $ms.Dispose()
}

Write-Output "Generating square icon sizes..."

# Extension icons
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\extension\icons\icon16.png" -Size 16
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\extension\icons\icon48.png" -Size 48
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\extension\icons\icon128.png" -Size 128

# Website icons & favicons
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\apps\website\public\favicon.png" -Size 32
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\apps\website\public\favicon-16x16.png" -Size 16
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\apps\website\public\favicon-32x32.png" -Size 32
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\apps\website\public\apple-touch-icon.png" -Size 180
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\apps\website\public\logo192.png" -Size 192
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\apps\website\public\logo512.png" -Size 512
Export-IcoFromPng -PngPath "D:\Projects\SentinelKey\apps\website\public\favicon-32x32.png" -IcoPath "D:\Projects\SentinelKey\apps\website\public\favicon.ico"

# Dashboard icons & favicons
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\apps\dashboard\public\favicon.png" -Size 32
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\apps\dashboard\public\favicon-16x16.png" -Size 16
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\apps\dashboard\public\favicon-32x32.png" -Size 32
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\apps\dashboard\public\apple-touch-icon.png" -Size 180
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\apps\dashboard\public\logo192.png" -Size 192
Export-SquarePng -Src $sourcePath -Dst "D:\Projects\SentinelKey\apps\dashboard\public\logo512.png" -Size 512
Export-IcoFromPng -PngPath "D:\Projects\SentinelKey\apps\dashboard\public\favicon-32x32.png" -IcoPath "D:\Projects\SentinelKey\apps\dashboard\public\favicon.ico"

Write-Output "Successfully generated all logo and icon assets!"
