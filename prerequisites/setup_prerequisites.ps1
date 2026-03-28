# SafePath Prerequisites Setup Script
# This script uses 'winget' (Windows Package Manager) to install required tools.
# Run this script as Administrator.

$ErrorActionPreference = "Stop"

function Write-Host-Section ($Title) {
    Write-Host "`n=== $Title ===" -ForegroundColor Cyan
}

if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: Please run this script as Administrator!" -ForegroundColor Red
    exit
}

Write-Host-Section "Checking for Windows Package Manager (winget)..."
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "winget not found. Please install it from the Microsoft Store (App Installer)." -ForegroundColor Red
    exit
} else {
    Write-Host "winget found." -ForegroundColor Green
}

# 1. Install Node.js
Write-Host-Section "Installing Node.js (LTS)..."
winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements

# 2. Install Git
Write-Host-Section "Installing Git..."
winget install Git.Git --silent --accept-package-agreements --accept-source-agreements

# 3. Install Docker Desktop
Write-Host-Section "Installing Docker Desktop..."
# Note: Docker Desktop might require a reboot after installation
winget install Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements

# 4. Install PNPM via Corepack (Native Node.js tool)
Write-Host-Section "Enabling Corepack and Installing PNPM..."
corepack enable
npm install -g pnpm@latest

Write-Host-Section "Setup Complete!"
Write-Host "Please RESTART your terminal or computer to apply changes." -ForegroundColor Yellow
Write-Host "Check the documentation in README.md to start development." -ForegroundColor Green
