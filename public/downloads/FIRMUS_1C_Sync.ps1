<#
.SYNOPSIS
  FIRMUS <-> 1C:Buxgalteriya Windows Auto-Sync Bridge (PowerShell)
.DESCRIPTION
  1. FIRMUS saytida "Sozlamalar -> Integratsiyalar -> Lokal 1C (.epf)" dan 8 belgili kod oling (5 daqiqa amal qiladi).
  2. Ushbu faylni o'ng tugma -> "Run with PowerShell" bilan ishga tushiring.
  3. Sayt manzilini va 8 belgili kodni kiriting — skript shifrlangan tokenni saqlaydi va
     FIRMUS'da tasdiqlangan qoralama hujjatlarni C:\FIRMUS_1C\ papkasiga avtomatik yuklab boradi.
#>

param(
  [string]$ServerUrl = "https://firmusv1.netlify.app",
  [string]$OutDir = "C:\FIRMUS_1C"
)

$ErrorActionPreference = "Stop"
$ConfigPath = Join-Path $env:APPDATA "firmus-1c-bridge.json"

if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

function Load-Config {
  if (Test-Path $ConfigPath) {
    try { return (Get-Content $ConfigPath -Raw | ConvertFrom-Json) } catch { return $null }
  }
  return $null
}

function Save-Config($cfg) {
  $cfg | ConvertTo-Json -Depth 4 | Set-Content -Path $ConfigPath -Encoding UTF8
}

$cfg = Load-Config
if (-not $cfg -or -not $cfg.token) {
  Write-Host "=== FIRMUS <-> 1C Windows Bridge ===" -ForegroundColor Cyan
  $inputUrl = Read-Host "FIRMUS manzili [Enter = $ServerUrl]"
  if ($inputUrl.Trim()) { $ServerUrl = $inputUrl.Trim().TrimEnd("/") }

  $code = Read-Host "FIRMUS 8 belgili ulash kodini kiriting"
  $body = @{ code = $code.Trim() } | ConvertTo-Json

  Write-Host "Server bilan ulanilmoqda ($ServerUrl/api/1c/pair)..." -ForegroundColor Yellow
  $pairRes = Invoke-RestMethod -Method POST -Uri "$ServerUrl/api/1c/pair" -ContentType "application/json" -Body $body

  if (-not $pairRes.bridgeToken -and -not $pairRes.token) {
    throw "Token olinmadi. Kod to'g'riligini va 5 daqiqa o'tmaganini tekshiring."
  }

  $tokenValue = if ($pairRes.bridgeToken) { $pairRes.bridgeToken } else { $pairRes.token }
  $cfg = [PSCustomObject]@{
    serverUrl = $ServerUrl
    token = $tokenValue
    pairedAt = (Get-Date).ToString("o")
  }
  Save-Config $cfg
  Write-Host "Muvaffaqiyatli ulandi! Token saqlandi: $ConfigPath" -ForegroundColor Green
}

$headers = @{
  "Authorization" = "Bearer $($cfg.token)"
  "Accept" = "application/json"
}

Write-Host "Chiqish navbati tekshirilmoqda ($($cfg.serverUrl)/api/1c/outbox)..." -ForegroundColor Cyan
$outbox = Invoke-RestMethod -Method GET -Uri "$($cfg.serverUrl)/api/1c/outbox" -Headers $headers
$items = if ($outbox.items) { $outbox.items } elseif ($outbox.jobs) { $outbox.jobs } else { @() }

if ($items.Count -eq 0) {
  Write-Host "Yangi tasdiqlangan hujjatlar yo'q." -ForegroundColor Gray
  exit 0
}

foreach ($item in $items) {
  $jobId = $item.id
  $stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
  $outFile = Join-Path $OutDir "firmus_draft_${stamp}_${jobId}.json"
  $item | ConvertTo-Json -Depth 10 | Set-Content -Path $outFile -Encoding UTF8
  Write-Host "Saqlandi: $outFile" -ForegroundColor Green

  try {
    $ackBody = @{ jobId = $jobId; status = "pushed_to_1c_draft" } | ConvertTo-Json
    Invoke-RestMethod -Method POST -Uri "$($cfg.serverUrl)/api/1c/ack" -Headers $headers -ContentType "application/json" -Body $ackBody | Out-Null
  } catch {
    Write-Warning "ACK yuborishda xatolik ($jobId): $($_.Exception.Message)"
  }
}

Write-Host "Tayyor! Barcha fayllar $OutDir papkasiga yuklandi." -ForegroundColor Green
