import CellType from './type';
import { gettext } from '../../../../../utils/constants';

// text value limit
const _TEXT_MAX_LENGTH = 10000;

// long-text value limit
export const _LONG_TEXT_MAX_LENGTH = 10 * 10000;

export const INPUT_LENGTH_LIMIT = {
  [CellType.TEXT]: _TEXT_MAX_LENGTH,
  [CellType.LONG_TEXT]: _LONG_TEXT_MAX_LENGTH
};

export const LONG_TEXT_EXCEED_LIMIT_MESSAGE = gettext('The content of the document has exceeded the limit of 100000 characters, and the content cannot be saved');
export const LONG_TEXT_EXCEED_LIMIT_SUGGEST = gettext('The content of the document has exceeded the limit of 100000 characters, and only the first 100000 characters are saved');
