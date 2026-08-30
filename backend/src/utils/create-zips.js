const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../../..');
const version = 'v8';
const vFolderName = `optionaly-production-${version}`;
const vFolderPath = path.join(rootDir, vFolderName);
const vZipPath = path.join(rootDir, `${vFolderName}.zip`);
const frontendZipPath = path.join(rootDir, `optionaly-frontend-production-${version}.zip`);
const backendZipPath = path.join(rootDir, `optionaly-backend-production-${version}.zip`);

const frontendDistDir = path.join(rootDir, 'frontend/dist');
const backendDir = path.join(rootDir, 'backend');

console.log(`--- CREATING PRODUCTION PACKAGES FOR VERSION ${version} ---`);

// 1. Clean previous build artifacts & rebuild frontend
if (fs.existsSync(frontendDistDir)) {
  console.log('[1/5] Removing old frontend/dist folder...');
  fs.rmSync(frontendDistDir, { recursive: true, force: true });
}

console.log('[2/5] Running fresh frontend production build...');
execSync('npm run build', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' });

// 2. Prepare Versioned Folder Structure
if (fs.existsSync(vFolderPath)) {
  fs.rmSync(vFolderPath, { recursive: true, force: true });
}

fs.mkdirSync(vFolderPath, { recursive: true });
const vFrontendDir = path.join(vFolderPath, 'frontend');
const vBackendDir = path.join(vFolderPath, 'backend');
fs.mkdirSync(vFrontendDir, { recursive: true });
fs.mkdirSync(vBackendDir, { recursive: true });

// Copy Frontend dist to versioned folder
console.log('[3/5] Copying fresh frontend dist...');
const copyFrontendCmd = `powershell -Command "Copy-Item -Path '${frontendDistDir}\\*' -Destination '${vFrontendDir}' -Recurse -Force"`;
execSync(copyFrontendCmd, { stdio: 'inherit' });

// Copy Backend clean files to versioned folder
console.log('[4/5] Copying clean backend files...');
const backendItems = ['src', 'services', 'package.json', 'package-lock.json', 'server.js', 'nodemon.json', '.env.example'];
for (const item of backendItems) {
  const srcP = path.join(backendDir, item);
  const destP = path.join(vBackendDir, item);
  if (fs.existsSync(srcP)) {
    if (fs.statSync(srcP).isDirectory()) {
      execSync(`powershell -Command "Copy-Item -Path '${srcP}' -Destination '${destP}' -Recurse -Force"`, { stdio: 'inherit' });
    } else {
      fs.copyFileSync(srcP, destP);
    }
  }
}

// Write VERSION.txt & DEPLOYMENT_NOTES.txt into versioned folder
const versionContent = `Optionally Production Version
Version: ${version}
Build Date: ${new Date().toISOString()}
Build Type: Production
Authoritative Engine: Internal Persistent Supabase PostgreSQL Market Engine
`;
fs.writeFileSync(path.join(vFolderPath, 'VERSION.txt'), versionContent);
fs.writeFileSync(path.join(rootDir, 'VERSION.txt'), versionContent);

const notesContent = `Optionally Production Version
Version: ${version}
Build Date: ${new Date().toISOString()}

Key Updates & Fixes:
- Authoritative persistent Supabase PostgreSQL market candle engine (priceEngine.js)
- Zero frontend candle generation (client-price-engine.ts stubbed out)
- 30-day historical candle storage in Supabase PostgreSQL table \`candles\`
- Server restart continuation from latest database candle close price
- Zero-reset candle history on browser refresh, login, logout, or navigation
- Exposed GET /api/version and GET /api/price/status debug endpoints
- Lightweight-charts priceFormat precision formatting (digits: 5)

Database Schema Requirements:
- Table \`candles\` with UNIQUE KEY \`idx_sym_tf_ts (symbol, timeframe, timestamp)\`
`;
fs.writeFileSync(path.join(vFolderPath, 'DEPLOYMENT_NOTES.txt'), notesContent);

// 3. Compress Archives (Without Overwriting v1)
console.log('[5/5] Packaging production ZIP archives...');

// Compress Consolidated Versioned Package
const psConsolidatedCmd = `powershell -Command "Compress-Archive -Path '${vFolderPath}' -DestinationPath '${vZipPath}' -Force"`;
execSync(psConsolidatedCmd, { stdio: 'inherit' });
console.log(`✓ Created Consolidated Package: ${vZipPath}`);

// Compress Frontend ZIP (v2)
const psFrontendCmd = `powershell -Command "Get-ChildItem -Path '${frontendDistDir}' -Force | Compress-Archive -DestinationPath '${frontendZipPath}' -Force"`;
execSync(psFrontendCmd, { stdio: 'inherit' });
console.log(`✓ Created Frontend ZIP: ${frontendZipPath}`);

// Compress Backend ZIP (v2)
const backendItemListStr = backendItems.map(i => `'${path.join(backendDir, i)}'`).filter(p => fs.existsSync(p.replace(/'/g, ''))).join(',');
const psBackendCmd = `powershell -Command "Compress-Archive -Path ${backendItemListStr} -DestinationPath '${backendZipPath}' -Force"`;
execSync(psBackendCmd, { stdio: 'inherit' });
console.log(`✓ Created Backend ZIP: ${backendZipPath}`);

console.log(`\n==================================================`);
console.log(`PRODUCTION PACKAGING FOR VERSION ${version} COMPLETE!`);
console.log(`==================================================`);
