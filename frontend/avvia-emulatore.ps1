# Avvia l'emulatore Android Pixel_8 senza dover aprire Android Studio.
# Uso: doppio click sul file, oppure da PowerShell: .\avvia-emulatore.ps1

$emulatorPath = "D:\android\Sdk\emulator\emulator.exe"
$avdName = "Pixel_8"

if (-not (Test-Path $emulatorPath)) {
    Write-Host "Emulatore non trovato in $emulatorPath" -ForegroundColor Red
    Write-Host "Controlla che il percorso dell'SDK Android sia corretto." -ForegroundColor Red
    Read-Host "Premi INVIO per uscire"
    exit 1
}

Write-Host "Avvio dell'emulatore '$avdName'..." -ForegroundColor Green
& $emulatorPath -avd $avdName
