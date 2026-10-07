# Tiny static file server for local preview (Windows PowerShell).
# Usage:  powershell -ExecutionPolicy Bypass -File serve.ps1  [port]  [root]
param([int]$Port = 8137, [string]$Root = "")

if ($Root -eq "") { $Root = Split-Path -Parent $MyInvocation.MyCommand.Path }
$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".pdf"  = "application/pdf"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://127.0.0.1:$Port/"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $path = $ctx.Request.Url.LocalPath.TrimStart('/')
      if ($path -eq '' -or $path.EndsWith('/')) { $path = $path + 'index.html' }

      $full = [IO.Path]::GetFullPath((Join-Path $Root $path))
      if (-not $full.StartsWith([IO.Path]::GetFullPath($Root), [StringComparison]::OrdinalIgnoreCase)) {
        $ctx.Response.StatusCode = 403
      }
      elseif (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        $ctx.Response.StatusCode = 404
      }
      else {
        $bytes = [IO.File]::ReadAllBytes($full)
        $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
        if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
        $ctx.Response.StatusCode = 200
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    }
    catch {
      $ctx.Response.StatusCode = 500
    }
    finally {
      $ctx.Response.Close()
    }
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
