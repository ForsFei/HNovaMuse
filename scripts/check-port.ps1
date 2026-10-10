for ($port = 43120; $port -le 43129; $port++) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $listener) {
        Write-Output $port
        exit 0
    }
}
Write-Error 'Ports 43120-43129 are all in use.'
exit 1
