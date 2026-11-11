const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadSelectedSkills } = require('./agentSkillService.cjs');

let root;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'selected-skills-')); });
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));
function skill(id, content) {
  fs.mkdirSync(path.join(root, id), { recursive: true });
  fs.writeFileSync(path.join(root, id, 'SKILL.md'), content);
}

it('loads every explicitly selected skill regardless of automatic discovery settings', () => {
  skill('review', '---\nname: Review\ndescription: Review code\n---\nReview instructions');
  skill('pdf', 'PDF instructions');
  const result = loadSelectedSkills(['review', 'pdf', 'review'], root);
  expect(result.errors).toEqual({});
  expect(result.ids).toEqual(['review', 'pdf']);
  expect(result.prompt).toContain('Review instructions');
  expect(result.prompt).toContain('PDF instructions');
  expect(result.prompt).toContain(path.join(root, 'review', 'SKILL.md'));
  expect(result.prompt).not.toContain('description: Review code');
});

it('rejects the whole selection if any file is missing, unreadable, or empty', () => {
  skill('good', 'Good instructions');
  skill('empty', '---\nname: empty\n---\n');
  fs.mkdirSync(path.join(root, 'unreadable', 'SKILL.md'), { recursive: true });
  const result = loadSelectedSkills(['good', 'missing', 'empty', 'unreadable'], root);
  expect(Object.keys(result.errors)).toEqual(['missing', 'empty', 'unreadable']);
  expect(result.prompt).toBe('');
});

it('rejects traversal and malformed selections without reading outside the skill directory', () => {
  const result = loadSelectedSkills(['../outside', '..', '/tmp/x', 'foo\\bar', 'bad\0id', '__proto__'], root);
  expect(Object.keys(result.errors)).toHaveLength(6);
  expect(result.prompt).toBe('');
  expect(loadSelectedSkills('review', root).errors.selection).toBeTruthy();
  expect(loadSelectedSkills([4], root).errors.selection).toBeTruthy();
});

it('reads fresh contents and never carries selection into the next request', () => {
  skill('review', 'First version');
  expect(loadSelectedSkills(['review'], root).prompt).toContain('First version');
  skill('review', 'Second version');
  expect(loadSelectedSkills(['review'], root).prompt).toContain('Second version');
  expect(loadSelectedSkills(undefined, root)).toEqual({ ids: [], errors: {}, prompt: '' });
  fs.rmSync(path.join(root, 'review'), { recursive: true });
  expect(loadSelectedSkills(['review'], root).errors.review).toContain('文件已不存在');
});
