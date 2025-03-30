# restart-ollama.ps1
Write-Host "Stopping Ollama processes..."
Get-Process | Where-Object {$_.ProcessName -like '*ollama*'} | ForEach-Object { $_.Kill() }

Write-Host "Waiting for cleanup..."
Start-Sleep -Seconds 5

Write-Host "Checking for remaining processes..."
$remaining = Get-Process | Where-Object {$_.ProcessName -like '*ollama*'}
if ($remaining) {
    Write-Host "Found remaining processes, force killing..."
    $remaining | ForEach-Object { $_.Kill() }
}

Write-Host "Checking port 11434..."
$portUse = netstat -ano | findstr "11434"
if ($portUse) {
    $pid = ($portUse -split ' ')[-1]
    Write-Host "Killing process using port 11434: $pid"
    taskkill /F /PID $pid
}

Write-Host "Starting Ollama..."
Start-Process ollama -ArgumentList "serve" -NoNewWindow