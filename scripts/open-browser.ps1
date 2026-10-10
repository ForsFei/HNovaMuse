param([ValidateRange(1, 65535)][int]$Port = 43120)
$url = "http://127.0.0.1:$Port"
for ($attempt = 0; $attempt -lt 120; $attempt++) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200 -and $response.Content -match 'HNova Muse') {
            Start-Process -FilePath $url
            exit 0
        }
    } catch {
        # The server is still starting.
    }
    Start-Sleep -Milliseconds 500
}
exit 1
