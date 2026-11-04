import { getSkillOptions, hasTaskInput } from './skill-commands';

const skills = [{ name: 'sdoc-create', description: 'Create an SDoc' }];

test('matches leading slash commands, not commands embedded in tasks', () => {
  expect(getSkillOptions('/sd', skills)).toEqual(skills);
  expect(getSkillOptions('text /sd', skills)).toEqual([]);
  expect(getSkillOptions('/sdoc-create task', skills)).toEqual([]);
});

test('requires task content after a selected skill', () => {
  expect(hasTaskInput('/sdoc-create ', skills)).toBe(false);
  expect(hasTaskInput('/sdoc-create task', skills)).toBe(true);
  expect(hasTaskInput('ordinary chat', skills)).toBe(true);
});
