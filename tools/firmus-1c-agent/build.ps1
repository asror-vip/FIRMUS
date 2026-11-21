$ErrorActionPreference = "Stop"

$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $csc)) {
    throw "csc.exe topilmadi (.NET Framework 4.x kerak)."
}

$root = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $root
$src = Join-Path $PSScriptRoot "Firmus1CAgent.cs"
$outDir = Join-Path $repoRoot "public\downloads"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}
$outExe = Join-Path $outDir "FIRMUS_1C_Agent.exe"

& $csc /nologo /target:winexe /platform:anycpu /optimize+ `
    /r:System.dll `
    /r:System.Drawing.dll `
    /r:System.Windows.Forms.dll `
    /r:System.Web.Extensions.dll `
    /out:$outExe `
    $src

if ($LASTEXITCODE -ne 0) {
    throw "Kompilyatsiya xatosi (exit code $LASTEXITCODE)"
}

$info = Get-Item $outExe
Write-Output "Tayyor: $($info.FullName) ($($info.Length) bayt)"
