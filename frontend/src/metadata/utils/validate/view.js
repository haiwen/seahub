import { gettext } from '../../../utils/constants';

export const validateName = (name, names) => {
  if (typeof name !== 'string') {
    return { isValid: false, message: gettext('Name should be string') };
  }
  name = name.trim();
  if (name === '') {
    return { isValid: false, message: gettext('Name is required') };
  }
  if (name.includes('/')) {
    return { isValid: false, message: gettext('Name cannot contain slash') };
  }
  if (name.includes('\\')) {
    return { isValid: false, message: gettext('Name cannot contain backslash') };
  }
  if (names.includes(name)) {
    return { isValid: false, message: gettext('Name already exists') };
  }
  return { isValid: true, message: name };
};
