$ErrorActionPreference = 'Stop'

$roots = @(
    'reference\qloapps',
    'reference\hotel-mgmt-system',
    'reference\Hotel-Management-System',
    'reference\gssoc2021-HotelOnTouch'
)

$rules = @(
    @{ pat = 'QloApps';            rep = 'Arynox_Hotel_ERP' },
    @{ pat = 'Qloapps';            rep = 'Arynox_Hotel_ERP' },
    @{ pat = 'QLOAPPS';            rep = 'ARYNOX_HOTEL_ERP' },
    @{ pat = 'qloapps.com';        rep = 'arynoxhotelerp.com' },
    @{ pat = 'HotelOnTouch';       rep = 'Arynox_Hotel_ERP' },
    @{ pat = 'Hotel On Touch';     rep = 'Arynox Hotel ERP' },
    @{ pat = 'Hotel blue bird';    rep = 'Arynox_Hotel_ERP' },
    @{ pat = 'Bluebird Hotel';     rep = 'Arynox_Hotel_ERP' },
    @{ pat = 'BLUEBIRD';           rep = 'ARYNOX_HOTEL_ERP' },
    @{ pat = 'Bluebird';           rep = 'Arynox_Hotel_ERP' },
    @{ pat = 'Hotel Management System'; rep = 'Arynox_Hotel_ERP' },
    @{ pat = 'Hotel Management';   rep = 'Arynox Hotel' }
)

$latin1 = [System.Text.Encoding]::GetEncoding(28591)
$changed = 0
$ruleHits = New-Object 'System.Collections.Generic.Dictionary[string,int]'
foreach ($r in $rules) { $ruleHits[$r.pat] = 0 }

foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) { Write-Host "SKIP (missing): $root"; continue }
    $files = Get-ChildItem -LiteralPath $root -Recurse -File -Force
    Write-Host "Processing $root ($($files.Count) files)..."
    foreach ($f in $files) {
        $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
        if ($bytes.Length -eq 0) { continue }
        $hasNul = $false
        foreach ($b in $bytes) { if ($b -eq 0) { $hasNul = $true; break } }
        if ($hasNul) { continue }
        $text = $latin1.GetString($bytes)
        $new = $text
        foreach ($r in $rules) {
            if ($new.Contains($r.pat)) {
                $before = $new
                $new = $new.Replace($r.pat, $r.rep)
                $ruleHits[$r.pat] += ([regex]::Matches($before, [regex]::Escape($r.pat))).Count
            }
        }
        if ($new -ne $text) {
            [System.IO.File]::WriteAllBytes($f.FullName, $latin1.GetBytes($new))
            $changed++
        }
    }
}

Write-Host "`nChanged files: $changed"
foreach ($r in $rules) { Write-Host ("{0,-28} -> {1}" -f $r.pat, $ruleHits[$r.pat]) }