const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { app, shell, net } = require('electron');

const execFileAsync = promisify(execFile);
const VERSION_FILE = '.version';
const PROTECTED_BUILTIN_SKILLS = new Set(['find-skills', 'skill-creator']);

const SKILLS_GUIDANCE = `## 技能 (Skills)

下方目录列出当前已启用的技能（仅名称与简介）。需要执行某技能时，先调用 \`Skill\` 工具加载其 SKILL.md 全文，再按说明操作。

使用 \`Skills\` 工具管理技能库：\`list\` 查看已安装技能，\`search\` 搜索市场，\`install\` 安装，\`init\`/\`register\` 创建并注册本地技能（安装/删除前须征得用户确认）。

当用户需要的能力可能已有现成技能时，优先 \`Skills\` search，不要从零摸索。安装后通过 \`Skill\` 按需加载完整说明。`;

function getSkillsDir() {
  const dir = path.join(app.getPath('userData'), 'agent-skills');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function parseFrontmatter(content) {
  const match = String(content || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const block = match[1];
  const meta = {};
  for (const line of block.split('\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }
  return meta;
}

function scanSkills() {
  const root = getSkillsDir();
  const builtinIds = new Set(['find-skills', 'skill-creator']);
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(root, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    let content = '';
    try {
      content = fs.readFileSync(skillPath, 'utf8');
    } catch {
      continue;
    }
    const meta = parseFrontmatter(content);
    const id = entry.name;
    skills.push({
      id,
      folderName: entry.name,
      name: meta.name || entry.name,
      description: meta.description || '',
      isBuiltin: builtinIds.has(id) || fs.existsSync(path.join(root, entry.name, VERSION_FILE)),
      body: content.replace(/^---[\s\S]*?---\r?\n?/, '').trim(),
    });
  }
  return skills;
}

function getEnabledSkillSet(enabledSkillIds, sessionEnabledSkillIds) {
  const ids = sessionEnabledSkillIds || enabledSkillIds;
  if (ids instanceof Set) return ids;
  return new Set(Array.isArray(ids) ? ids : []);
}

function resolveSkill(skillRef, enabledSkillIds, sessionEnabledSkillIds) {
  const enabled = getEnabledSkillSet(enabledSkillIds, sessionEnabledSkillIds);
  const needle = String(skillRef || '').trim().toLowerCase();
  if (!needle) return null;
  return (
    scanSkills().find(
      (s) =>
        enabled.has(s.id) &&
        (s.id.toLowerCase() === needle ||
          s.name.toLowerCase() === needle ||
          s.folderName.toLowerCase() === needle)
    ) || null
  );
}

function buildSkillsCatalog(enabledSkillIds) {
  if (!Array.isArray(enabledSkillIds) || enabledSkillIds.length === 0) return '';
  const enabled = new Set(enabledSkillIds);
  const skills = scanSkills().filter((s) => enabled.has(s.id));
  if (skills.length === 0) return '';

  const lines = ['## 已启用技能目录', ''];
  for (const skill of skills) {
    const desc = skill.description ? `: ${skill.description}` : '';
    lines.push(`- **${skill.name}** (\`${skill.id}\`)${desc}`);
  }
  lines.push('');
  lines.push('完整说明请通过 `Skill` 工具按需加载。');
  return lines.join('\n').trim();
}

function buildSkillsPrompt(enabledSkillIds) {
  const catalog = buildSkillsCatalog(enabledSkillIds);
  if (!catalog) return '';
  return `${SKILLS_GUIDANCE}\n\n${catalog}`;
}

function ok(data) {
  return JSON.stringify({ ok: true, ...data });
}

function fail(message) {
  return JSON.stringify({ ok: false, error: message });
}

function executeSkillTool(args, deps = {}) {
  const skill = resolveSkill(args?.skill, deps.enabledSkillIds, deps.sessionEnabledSkillIds);
  if (!skill) {
    return fail(`Skill not found or not enabled: ${args?.skill || ''}`);
  }

  let content = skill.body || '';
  if (args?.args) {
    content += `\n\n## Invocation context\n${String(args.args)}`;
  }

  return ok({
    skill: skill.id,
    name: skill.name,
    description: skill.description,
    content,
  });
}

function buildSkillIdentifier(skill) {
  const { name, namespace, metadata } = skill;
  const repoOwner = metadata?.repoOwner;
  const repoName = metadata?.repoName;
  if (repoOwner && repoName) return `${repoOwner}/${repoName}/${name}`;
  if (namespace) {
    const clean = String(namespace).replace(/^@/, '');
    const parts = clean.split('/').filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}/${name}`;
    return `${clean}/${name}`;
  }
  return name;
}

async function searchMarketplace(query) {
  const url = new URL(`${CLAUDE_PLUGINS_API}/api/skills`);
  url.searchParams.set('q', String(query).replace(/[-_]+/g, ' ').trim());
  url.searchParams.set('limit', '20');
  url.searchParams.set('offset', '0');

  const response = await net.fetch(url.toString(), { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Marketplace API returned ${response.status}`);
  }
  const json = await response.json();
  const skills = json?.skills || [];
  if (skills.length === 0) {
    return ok({ query, results: [], message: `No skills found for "${query}".` });
  }

  const results = skills.map((s) => ({
    name: s.name,
    description: s.description ?? null,
    author: s.author ?? null,
    identifier: buildSkillIdentifier(s),
    installs: s.installs ?? 0,
  }));

  return ok({
    query,
    results,
    message: `Found ${results.length} skill(s). Use Skills install with identifier.`,
  });
}

async function moveInstalledSkillFolder(skillName) {
  const skillsDir = getSkillsDir();
  const userDataDir = path.dirname(skillsDir);
  const claudeSkillsRoot = path.join(userDataDir, '.claude', 'skills');
  const src = path.join(claudeSkillsRoot, skillName);
  const dest = path.join(skillsDir, skillName);

  if (fs.existsSync(src)) {
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
    return dest;
  }

  if (!fs.existsSync(claudeSkillsRoot)) {
    throw new Error('skills CLI did not create .claude/skills output');
  }

  const entries = fs.readdirSync(claudeSkillsRoot, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (dirs.length === 1) {
    const onlySrc = path.join(claudeSkillsRoot, dirs[0]);
    const onlyDest = path.join(skillsDir, dirs[0]);
    if (fs.existsSync(onlyDest)) fs.rmSync(onlyDest, { recursive: true, force: true });
    fs.renameSync(onlySrc, onlyDest);
    return onlyDest;
  }

  throw new Error(`Expected installed skill folder at ${src}`);
}

async function installSkillFromIdentifier(identifier) {
  const parts = String(identifier || '').split('/').filter(Boolean);
  if (parts.length < 3) {
    throw new Error("identifier must be owner/repo/skill-name");
  }
  const owner = parts[0];
  const repo = parts[1];
  const skillName = parts.slice(2).join('/');
  const packageSpec = `${owner}/${repo}@${skillName}`;
  const skillsDir = getSkillsDir();
  const userDataDir = path.dirname(skillsDir);

  await execFileAsync('npx', ['--yes', 'skills', 'add', packageSpec, '-y'], {
    cwd: userDataDir,
    env: { ...process.env, DESKTOP_FAIRY_SKILLS_DIR: skillsDir },
    timeout: 120000,
    maxBuffer: 4 * 1024 * 1024,
  });

  const installedPath = await moveInstalledSkillFolder(skillName);
  const folderName = path.basename(installedPath);
  const skillPath = path.join(installedPath, 'SKILL.md');
  const meta = fs.existsSync(skillPath)
    ? parseFrontmatter(fs.readFileSync(skillPath, 'utf8'))
    : {};

  return {
    id: folderName,
    folderName,
    name: meta.name || folderName,
    description: meta.description || '',
    path: installedPath,
  };
}

async function initSkillFolder(name) {
  const folderName = String(name || '').trim();
  if (!folderName) throw new Error("'name' is required for init");
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(folderName)) {
    throw new Error('Skill folder name must be alphanumeric with hyphens/underscores');
  }

  const skillDir = path.join(getSkillsDir(), folderName);
  if (fs.existsSync(skillDir)) {
    const entries = fs.readdirSync(skillDir);
    if (entries.length > 0) {
      throw new Error(
        `Directory "${skillDir}" already exists and is non-empty. Choose a different name or remove it first.`
      );
    }
  } else {
    fs.mkdirSync(skillDir, { recursive: true });
  }

  return {
    folderName,
    path: skillDir,
    message: [
      `Skill directory ready at: ${skillDir}`,
      'Write SKILL.md and supporting files (scripts/, references/, assets/) into this directory.',
      `When ready, call Skills with action "register" and name "${folderName}".`,
    ].join('\n'),
  };
}

async function registerSkillFolder(name, deps = {}) {
  const folderName = String(name || '').trim();
  if (!folderName) throw new Error("'name' is required for register");

  const skillDir = path.join(getSkillsDir(), folderName);
  const skillMd = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) {
    throw new Error(`No SKILL.md found in "${skillDir}". Call init first and write SKILL.md.`);
  }

  const meta = parseFrontmatter(fs.readFileSync(skillMd, 'utf8'));
  if (deps.sessionEnabledSkillIds instanceof Set) {
    deps.sessionEnabledSkillIds.add(folderName);
  }
  deps.persistEnabledSkillId?.(folderName);

  return {
    id: folderName,
    folderName,
    name: meta.name || folderName,
    description: meta.description || '',
    path: skillDir,
    enabled: true,
    message: `Skill "${meta.name || folderName}" registered and enabled for this agent.`,
  };
}

async function executeSkillsTool(args, deps = {}) {
  const action = args?.action;
  const enabled = getEnabledSkillSet(deps.enabledSkillIds, deps.sessionEnabledSkillIds);

  switch (action) {
    case 'list': {
      const all = scanSkills();
      const items = all.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        path: path.join(getSkillsDir(), s.folderName),
        enabled: enabled.has(s.id),
        isBuiltin: !!s.isBuiltin,
      }));
      return ok({ skills: items, skillsDir: getSkillsDir() });
    }
    case 'search':
      if (!args?.query) return fail("'query' is required for search");
      return searchMarketplace(args.query);
    case 'install': {
      if (!args?.identifier) return fail("'identifier' is required for install");
      const installed = await installSkillFromIdentifier(args.identifier);
      if (deps.sessionEnabledSkillIds instanceof Set) {
        deps.sessionEnabledSkillIds.add(installed.id);
      }
      deps.persistEnabledSkillId?.(installed.id);
      return ok({
        ...installed,
        enabled: true,
        message: `Skill installed to ${installed.path} and enabled for this agent.`,
      });
    }
    case 'remove': {
      const id = String(args?.name || args?.identifier || '').trim();
      if (!id) return fail("'name' (skill folder id) is required for remove");
      if (PROTECTED_BUILTIN_SKILLS.has(id)) {
        return fail(`Built-in skill "${id}" cannot be removed`);
      }
      const target = path.join(getSkillsDir(), id);
      if (!fs.existsSync(target)) return fail(`Skill folder not found: ${id}`);
      fs.rmSync(target, { recursive: true, force: true });
      if (deps.sessionEnabledSkillIds instanceof Set) {
        deps.sessionEnabledSkillIds.delete(id);
      }
      return ok({ removed: id, message: `Skill ${id} removed.` });
    }
    case 'init': {
      if (!args?.name) return fail("'name' is required for init");
      try {
        const result = await initSkillFolder(args.name);
        return ok(result);
      } catch (err) {
        return fail(String(err?.message || err));
      }
    }
    case 'register': {
      if (!args?.name) return fail("'name' is required for register");
      try {
        const result = await registerSkillFolder(args.name, deps);
        return ok(result);
      } catch (err) {
        return fail(String(err?.message || err));
      }
    }
    default:
      return fail('Unknown action; use list/search/install/remove/init/register');
  }
}

function registerAgentSkillHandlers(ipcMain) {
  ipcMain.handle('agent:skills:scan', async () => {
    return scanSkills().map(({ id, name, description, folderName, isBuiltin }) => ({
      id,
      name,
      description,
      folderName,
      isBuiltin: !!isBuiltin,
    }));
  });

  ipcMain.handle('agent:skills:open_dir', async () => {
    const dir = getSkillsDir();
    await shell.openPath(dir);
    return dir;
  });
}

module.exports = {
  registerAgentSkillHandlers,
  scanSkills,
  buildSkillsPrompt,
  buildSkillsCatalog,
  getSkillsDir,
  executeSkillTool,
  executeSkillsTool,
  resolveSkill,
};
