export const getSkillOptions = (value, skills) => {
  const match = value.match(/^\s*\/([a-z0-9-]*)$/);
  if (!match) return [];
  return skills.filter((skill) => skill.name.startsWith(match[1]));
};

export const hasTaskInput = (value, skills) => {
  const match = value.match(/^\s*\/([a-z0-9-]+)(?=\s|$)/);
  if (match && skills.some((skill) => skill.name === match[1])) {
    return Boolean(value.slice(match[0].length).trim());
  }
  return Boolean(value.trim());
};
