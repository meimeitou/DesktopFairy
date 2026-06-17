const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const VERSION_FILE = '.version';

function getResourceSkillsPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'agent-skills');
  }
  return path.join(app.getAppPath(), 'resources', 'agent-skills');
}

function getSkillsDir() {
  const dir = path.join(app.getPath('userData'), 'agent-skills');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function installBuiltinSkills() {
  const resourceSkillsPath = getResourceSkillsPath();
  const globalSkillsPath = getSkillsDir();
  const appVersion = app.getVersion?.() || '0.2.0';

  try {
    await fs.promises.access(resourceSkillsPath);
  } catch {
    return { installed: 0 };
  }

  const entries = await fs.promises.readdir(resourceSkillsPath, { withFileTypes: true });
  let installed = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const destPath = path.join(globalSkillsPath, entry.name);
    const srcPath = path.join(resourceSkillsPath, entry.name);
    let upToDate = false;
    try {
      const v = (await fs.promises.readFile(path.join(destPath, VERSION_FILE), 'utf8')).trim();
      upToDate = v === appVersion;
    } catch {
      upToDate = false;
    }
    if (!upToDate) {
      await fs.promises.mkdir(destPath, { recursive: true });
      await fs.promises.cp(srcPath, destPath, { recursive: true });
      await fs.promises.writeFile(path.join(destPath, VERSION_FILE), appVersion, 'utf8');
      installed++;
    }
  }

  return { installed };
}

module.exports = { installBuiltinSkills, getResourceSkillsPath };
