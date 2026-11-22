# Pushes the Space folder to Hugging Face. Run it yourself in PowerShell (the token is typed here, never into chat).
#
#   .\scripts\push_to_hf.ps1 -User YOUR_HF_USERNAME
#
# When git asks for a password, paste your Hugging Face WRITE token (it will not show as you paste). The username it asks
# for is your Hugging Face username.
param([Parameter(Mandatory = $true)][string]$User, [string]$Space = "sahara-relief")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
python "$root\scripts\make_hf_space.py"
Set-Location "$root\deploy\hf_space"
if (-not (Test-Path ".git")) { git init -b main | Out-Null }
git lfs install | Out-Null
git add -A
git -c user.name="$User" -c user.email="$User@users.noreply.huggingface.co" commit -q -m "Sahara Relief prototype" 2>$null
if (-not (git remote | Select-String "space")) { git remote add space "https://huggingface.co/spaces/$User/$Space" }
git push --force space HEAD:main
Write-Host ""
Write-Host "Pushed. Open https://huggingface.co/spaces/$User/$Space and watch the Logs tab while it builds (about 5 to 10 minutes)."
