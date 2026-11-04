# Offline loopback-only web server for Medovik (Windows PowerShell 5.1+).
# No admin access, internet, third-party modules or execution of user data required.
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd([char]'\')
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 18483)
$listener.Start()
$port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$url = "http://127.0.0.1:$port/"
Write-Host "Medovik ready: $url"
Write-Host "Local only. Keep this window open; Ctrl+C to stop."
try { Start-Process $url } catch { Write-Host "Open this address manually: $url" }
$mime = @{'.html'='text/html; charset=utf-8';'.css'='text/css; charset=utf-8';'.js'='application/javascript; charset=utf-8';'.json'='application/json; charset=utf-8';'.svg'='image/svg+xml';'.png'='image/png';'.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.ico'='image/x-icon'}
try {
 while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
   $client.ReceiveTimeout = 5000
   $client.SendTimeout = 5000
   $stream = $client.GetStream()
   $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
   $request = $reader.ReadLine()
   if ([string]::IsNullOrWhiteSpace($request)) { continue }
   # Read request headers; this server never reads or stores POST bodies.
   while ($true) {
    $line = $reader.ReadLine()
    if (($null -eq $line) -or ($line.Length -eq 0)) { break }
   }
   $parts = $request.Split(' ')
   $status = '200 OK'
   $bytes = [byte[]]@()
   $contentType = 'text/plain; charset=utf-8'
   if (($parts.Count -lt 2) -or ($parts[0] -ne 'GET' -and $parts[0] -ne 'HEAD')) { $status='405 Method Not Allowed' }
   else {
    $urlPath = $parts[1].Split('?')[0].Split('#')[0]
    $urlPath = [System.Uri]::UnescapeDataString($urlPath)
    $urlPath = $urlPath.Replace('/', '\').TrimStart([char]'\')
    if ([string]::IsNullOrWhiteSpace($urlPath)) { $urlPath='index.html' }
    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $urlPath))
    if (-not $fullPath.StartsWith($root + '\', [System.StringComparison]::OrdinalIgnoreCase)) { $status='403 Forbidden' }
    elseif (-not [System.IO.File]::Exists($fullPath)) { $status='404 Not Found' }
    else {
     $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
     if ($mime.ContainsKey($ext)) { $contentType=$mime[$ext] }
     $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    }
   }
   if ($status -ne '200 OK') { $bytes=[System.Text.Encoding]::UTF8.GetBytes($status) }
   $headers = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n"
   $h=[System.Text.Encoding]::ASCII.GetBytes($headers)
   $stream.Write($h, 0, $h.Length)
   if ($parts.Count -ge 1 -and $parts[0] -ne 'HEAD') { $stream.Write($bytes, 0, $bytes.Length) }
   $stream.Flush()
  } catch { Write-Host "Request error: $($_.Exception.Message)" }
  finally { $client.Dispose() }
 }
} finally { $listener.Stop() }
