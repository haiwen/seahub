import { gettext } from '../../../../../utils/constants';

const hasValue = (value) => value !== undefined && value !== null && value !== '';
const JSON_HIGHLIGHT_DETAIL_KEYS = new Set(['tool_arguments', 'observation', 'prompt']);

export const formatDetailsValue = (value) => {
  if (!hasValue(value)) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return String(value);
    }
  }
  return String(value);
};

export const formatDetailsJSONValue = (value) => {
  if (!hasValue(value)) return '';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch (e) {
      return JSON.stringify(value, null, 2);
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (e) {
    return JSON.stringify(String(value), null, 2);
  }
};

export const shouldHighlightDetailsAsJSON = (fieldKey) => JSON_HIGHLIGHT_DETAIL_KEYS.has(fieldKey);

export const THOUGHT_PROCESS_DETAIL_FIELDS = [
  { key: 'tool_arguments', label: gettext('Arguments') },
  { key: 'observation', label: gettext('Observation') },
  { key: 'error', label: gettext('Error') },
];

export const hasToolDetailsContent = (action) => {
  if (!action || typeof action !== 'object') return false;
  return THOUGHT_PROCESS_DETAIL_FIELDS.some((field) => hasValue(action[field.key]));
};
