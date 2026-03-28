# SafePath Installation Guide

This guide provides official download links and instructions for the software required to develop and run SafePath.

## 🛠️ Required Software

| Software | Version | Purpose | Download Source |
| :--- | :--- | :--- | :--- |
| **Node.js** | 20.x (LTS) | Runtime | **[Included (MSI)](./node-v20.11.1-x64.msi)** |
| **Git** | Latest | Version Control | **[Included (EXE)](./Git-2.44.0-64-bit.exe)** |
| **Docker Desktop** | Latest | Containers | [Official Download](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe) |
| **PNPM** | 9.x | Package Manager | [Installation Guide](https://pnpm.io/installation) |
| **PostgreSQL** | 16.x | Database | [Official Download](https://get.enterprisedb.com/postgresql/postgresql-16.2-1-windows-x64.exe) |

> [!NOTE]
> Node.js and Git installers are included in this folder for your convenience. Docker Desktop is not included because it exceeds GitHub's 100MB file limit (it is ~600MB). Please use the official link provided above.

## 🚀 Easy Setup (Windows Only)

To install everything automatically using the Windows Package Manager (`winget`), you can run our setup script from a PowerShell terminal (as Administrator):

1. Right-click the **Start** button and select **Terminal (Admin)** or **PowerShell (Admin)**.
2. Navigate to this folder:
   ```powershell
   cd path/to/SafePath/prerequisites
   ```
3. Run the script:
   ```powershell
   .\setup_prerequisites.ps1
   ```

## 📋 Post-Installation Checklist

After installing the software:

1. **Verify Node.js**: Run `node -v` (should be v20+)
2. **Verify PNPM**: Run `pnpm -v` (should be v9+)
3. **Start Docker**: Open Docker Desktop and ensure it is running.
4. **Environment Setup**: Follow the instructions in [README.md](../README.md) to set up your `.env` files.

---
**Happy Mapping!** 🗺️
