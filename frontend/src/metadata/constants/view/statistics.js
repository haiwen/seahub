import { gettext } from '../../../utils/constants';
import { PREDEFINED_FILE_TYPE_OPTION_KEY } from '../column/predefined';

export const FILE_TYPE_NAMES = {
  [PREDEFINED_FILE_TYPE_OPTION_KEY.PICTURE]: gettext('Picture'),
  [PREDEFINED_FILE_TYPE_OPTION_KEY.DOCUMENT]: gettext('Document'),
  [PREDEFINED_FILE_TYPE_OPTION_KEY.VIDEO]: gettext('Video'),
  [PREDEFINED_FILE_TYPE_OPTION_KEY.AUDIO]: gettext('Audio'),
  [PREDEFINED_FILE_TYPE_OPTION_KEY.CODE]: gettext('Code'),
  [PREDEFINED_FILE_TYPE_OPTION_KEY.COMPRESSED]: gettext('Compressed'),
  [PREDEFINED_FILE_TYPE_OPTION_KEY.DIAGRAM]: gettext('Diagram'),
  other: gettext('Others'),
};

export const FILE_TYPE_COLORS = {
  [PREDEFINED_FILE_TYPE_OPTION_KEY.PICTURE]: '#9867ba',
  [PREDEFINED_FILE_TYPE_OPTION_KEY.DOCUMENT]: '#4ecdc4',
  [PREDEFINED_FILE_TYPE_OPTION_KEY.VIDEO]: '#93c4fd',
  [PREDEFINED_FILE_TYPE_OPTION_KEY.AUDIO]: '#79ddcb',
  [PREDEFINED_FILE_TYPE_OPTION_KEY.CODE]: '#f6c038',
  [PREDEFINED_FILE_TYPE_OPTION_KEY.COMPRESSED]: '#9397fd',
  [PREDEFINED_FILE_TYPE_OPTION_KEY.DIAGRAM]: '#74b9ff',
  other: '#636e72',
};

export const TIME_GROUPING_OPTIONS = [
  { value: 'created', label: gettext('Created time') },
  { value: 'modified', label: gettext('Modified time') },
];

export const CREATOR_SORT_OPTIONS = [
  { value: 'count-asc', text: gettext('Ascending by count') },
  { value: 'count-desc', text: gettext('Descending by count') },
  { value: 'name-asc', text: gettext('Ascending by name') },
  { value: 'name-desc', text: gettext('Descending by name') }
];
