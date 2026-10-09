# extension 폴더를 스토어 업로드용 zip으로 묶는다. 사용법: powershell -File scripts/pack.ps1
# Compress-Archive(Windows PowerShell 5.1)는 zip 안 경로를 역슬래시로 써서 쓰지 않는다.
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'extension'
$version = (Get-Content (Join-Path $source 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$out = Join-Path $root "eng2kor-flow-$version.zip"
if (Test-Path $out) { Remove-Item $out }

$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
try {
  Get-ChildItem $source -Recurse -File | Where-Object { $_.Extension -ne '.svg' } | ForEach-Object {
    $entry = $_.FullName.Substring($source.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entry, 'Optimal') | Out-Null
  }
} finally {
  $zip.Dispose()
}
Write-Output $out
