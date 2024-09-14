/**
 * Get collaborator by email
 * @param {array} collaborators e.g. [{ email, name, ... }, ...]
 * @param {string} email
 * @returns collaborator, object
 */
const getCollaborator = (collaborators, email) => {
  if (!Array.isArray(collaborators) || !email) return null;

  return collaborators.find((collaborator) => collaborator.email === email);
};

/**
 * Get collaborators name list of given emails
 * @param {array} emails e.g. ['email', ...]
 * @param {array} collaborators e.g. [{ email, name, ... }, ...]
 * @returns name list, array. e.g. ['name1', 'name2']
 */
const getCollaboratorsNames = (emails, collaborators) => {
  if (!Array.isArray(emails) || !Array.isArray(collaborators)) {
    return [];
  }
  let emailCollaboratorMap = {};
  collaborators.forEach((collaborator) => {
    emailCollaboratorMap[collaborator.email] = collaborator;
  });
  return emails.map((email) => {
    const collaborator = emailCollaboratorMap[email];
    return collaborator && collaborator.name;
  }).filter(Boolean);
};

/**
 * Get concatenated collaborators names of given emails.
 * @param {array} collaborators e.g. [{ email, name, ... }, ...]
 * @param {array} emails e.g. ['email', ...]
 * @returns concatenated collaborators names, string. e.g. 'name1, name2'
 */
const getCollaboratorsName = (collaborators, emails) => {
  const collaboratorsNames = getCollaboratorsNames(emails, collaborators);
  if (!Array.isArray(collaboratorsNames) || collaboratorsNames.length === 0) return '';
  return collaboratorsNames.join(', ');
};

const getCollaboratorEmailsByNames = (names, collaborators) => {
  if (!Array.isArray(names) || !Array.isArray(collaborators)) return [];
  const emails = [];
  names.forEach((name) => {
    const collaborator = collaborators.find((collaboratorItem) => collaboratorItem.name === name);
    if (collaborator) {
      emails.push(collaborator.email);
    }
  });
  return emails;
};

export {
  getCollaborator,
  getCollaboratorsNames,
  getCollaboratorsName,
  getCollaboratorEmailsByNames,
};
