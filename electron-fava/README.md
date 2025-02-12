# Electron Fava

A desktop application for [Fava](https://github.com/beancount/fava), built with Electron.

## Prerequisites

- Python 3.9 or higher
- [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager)
- Node.js and yarn
- Git

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd electron-fava
   ```

2. Make the initialization script executable:
   ```bash
   chmod +x init.sh
   ```

3. Run the initialization script:
   ```bash
   ./init.sh
   ```
   This script will:
   - Install and use Node.js 18 via nvm
   - Install yarn if not present
   - Create a Python virtual environment
   - Install all required Python dependencies
   - Install all required Node.js dependencies
   - Handle architecture-specific requirements (e.g., for Apple Silicon Macs)

4. Install Node.js dependencies:
   ```bash
   yarn install
   ```

## Development

To start the application in development mode:
```bash
yarn start
```

This will:
1. Start the Fava server using the local Python environment
2. Launch the Electron application that connects to the Fava server

## Building

To build the application:
```bash
yarn build
```

## Architecture Notes

- The application uses Node.js 18 and Electron for the desktop wrapper
- Python 3.9+ powers the Fava server running locally
- Communication between Electron and Fava happens via HTTP on localhost:5000
- On Apple Silicon (M1/M2) Macs, the application ensures all Python packages are compiled for arm64 architecture
