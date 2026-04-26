$path = "c:\Users\Equipo\.gemini\antigravity\scratch\ERP_Construccion\erp-construccion\src\components\ProgressView.js"
$bytes = [System.IO.File]::ReadAllBytes($path)
$newBytes = New-Object byte[] $bytes.Length
for ($i = 0; $i -lt $bytes.Length; $i++) {
    if ($bytes[$i] -eq 237) { # 0xED is í in 1252
        $newBytes[$i] = 105   # Replace with 'i' (0x69)
    } else {
        $newBytes[$i] = $bytes[$i]
    }
}
[System.IO.File]::WriteAllBytes($path, $newBytes)
Write-Host "Replaced all 0xED bytes with 'i' in $path"
