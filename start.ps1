# PowerShell Local HTTP Server for Beautiful Yongjiang Project
# Supports 206 Partial Content (Range requests) for smooth video seeking.
# Written in pure ASCII to ensure 100% compatibility with older PowerShell versions.

$port = 8026
$url = "http://127.0.0.1:$port/"

# Get root directory of the project
$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrEmpty($rootPath)) {
    $rootPath = Get-Location
}

# Try to find Node.js or Python to run a server
$hasNode = $false
$hasPython = $false

if (Get-Command node -ErrorAction SilentlyContinue) { $hasNode = $true }
if (Get-Command python -ErrorAction SilentlyContinue) { $hasPython = $true }

if ($hasPython) {
    Write-Host "Python detected. Starting Python HTTP Server..." -ForegroundColor Green
    Write-Host "URL: $url" -ForegroundColor Green
    Start-Process $url
    python -m http.server $port --directory $rootPath
    exit
}
elseif ($hasNode) {
    Write-Host "Node.js detected. Starting http-server..." -ForegroundColor Green
    Write-Host "URL: $url" -ForegroundColor Green
    Start-Process $url
    npx -y http-server "$rootPath" -p $port -c-1
    exit
}

# Fallback: Custom PowerShell HTTP Server
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Yongjiang River Project - Local HTTP Server" -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "Root Path: $rootPath" -ForegroundColor Yellow

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)

try {
    $listener.Start()
} catch {
    Write-Host "Port $port failed to start. Searching for an alternative port..." -ForegroundColor Red
    $random = New-Object System.Random
    $port = $random.Next(8000, 9000)
    $url = "http://127.0.0.1:$port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($url)
    $listener.Start()
}

Write-Host "Server started successfully!" -ForegroundColor Green
Write-Host "Please visit: $url" -ForegroundColor Cyan
Write-Host "Close this window or press [Ctrl + C] to stop the server." -ForegroundColor Yellow

# Open default browser
Start-Process $url

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # Local file path resolution
        $reqPath = $request.Url.LocalPath
        if ($reqPath -eq "/") {
            $reqPath = "/index.html"
        }
        
        $filePath = Join-Path $rootPath $reqPath.Replace("/", "\").TrimStart("\")
        
        if (Test-Path $filePath -PathType Leaf) {
            # MIME type resolution
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html"    { "text/html; charset=utf-8" }
                ".htm"     { "text/html; charset=utf-8" }
                ".css"     { "text/css" }
                ".js"      { "application/javascript; charset=utf-8" }
                ".json"    { "application/json; charset=utf-8" }
                ".geojson" { "application/json; charset=utf-8" }
                ".png"     { "image/png" }
                ".jpg"     { "image/jpeg" }
                ".jpeg"    { "image/jpeg" }
                ".gif"     { "image/gif" }
                ".mp4"     { "video/mp4" }
                default    { "application/octet-stream" }
            }
            
            $response.ContentType = $mime
            
            # Open file stream
            $fileStream = [System.IO.File]::OpenRead($filePath)
            $fileLength = $fileStream.Length
            
            # Support Range requests (HTTP 206) for video seeking/chunk loading
            $rangeHeader = $request.Headers["Range"]
            if ($rangeHeader -and $rangeHeader -match "bytes=(\d+)-(\d*)") {
                $start = [int64]$Matches[1]
                $end = $fileLength - 1
                if ($Matches[2] -ne "") {
                    $end = [int64]$Matches[2]
                }
                
                # Boundary check
                if ($start -ge $fileLength) {
                    $response.StatusCode = 416 # Range Not Satisfiable
                    $response.Close()
                    $fileStream.Close()
                    continue
                }
                
                $length = $end - $start + 1
                $response.StatusCode = 206 # Partial Content
                $response.Headers.Add("Content-Range", "bytes $start-$end/$fileLength")
                $response.Headers.Add("Accept-Ranges", "bytes")
                $response.ContentLength64 = $length
                
                [void]$fileStream.Seek($start, [System.IO.SeekOrigin]::Begin)
                
                # Copy segment to response output
                $buffer = New-Object byte[] 65536 # 64KB chunks
                $bytesRemaining = $length
                try {
                    while ($bytesRemaining -gt 0) {
                        $chunkSize = [Math]::Min(65536, $bytesRemaining)
                        $bytesRead = $fileStream.Read($buffer, 0, $chunkSize)
                        if ($bytesRead -le 0) { break }
                        $response.OutputStream.Write($buffer, 0, $bytesRead)
                        $bytesRemaining -= $bytesRead
                    }
                } catch {
                    # Client disconnected or seek cancelled
                } finally {
                    $fileStream.Close()
                }
            } else {
                # Regular HTTP 200 response
                $response.StatusCode = 200
                $response.Headers.Add("Accept-Ranges", "bytes")
                $response.ContentLength64 = $fileLength
                try {
                    $fileStream.CopyTo($response.OutputStream)
                } catch {
                    # Client disconnected
                } finally {
                    $fileStream.Close()
                }
            }
        } else {
            # 404 Not Found
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 Not Found</h1><p>The requested file could not be found.</p>")
            $response.ContentLength64 = $buffer.Length
            $response.ContentType = "text/html; charset=utf-8"
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        
        $response.Close()
    } catch {
        # Catch any unexpected requests or exceptions gracefully
    }
}
