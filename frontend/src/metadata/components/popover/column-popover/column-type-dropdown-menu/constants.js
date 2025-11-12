import { gettext } from '../../../../../utils/constants';
import { CellType, COLUMNS_ICON_CONFIG, DEFAULT_DATE_FORMAT, DEFAULT_RATE_DATA, DEFAULT_SHOOTING_TIME_FORMAT, PRIVATE_COLUMN_KEY } from '../../../../constants';
import { getColumnDisplayName } from '../../../../utils/column';
import { DEFAULT_FILE_STATUS_OPTIONS } from '../../../../constants/column/format';

const COLUMNS = [
  {
    icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR],
    type: CellType.COLLABORATOR,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_COLLABORATORS),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_COLLABORATORS,
    canChangeName: false,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR],
    type: CellType.COLLABORATOR,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_REVIEWER),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_REVIEWER,
    canChangeName: false,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR],
    type: CellType.COLLABORATOR,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.OWNER),
    unique: true,
    key: PRIVATE_COLUMN_KEY.OWNER,
    canChangeName: false,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.DATE],
    type: CellType.DATE,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME,
    canChangeName: false,
    data: { format: DEFAULT_DATE_FORMAT },
    groupby: 'predefined',
    canSetData: true,
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.SINGLE_SELECT],
    type: CellType.SINGLE_SELECT,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_STATUS),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_STATUS,
    canChangeName: false,
    data: { options: DEFAULT_FILE_STATUS_OPTIONS },
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.DATE],
    type: CellType.DATE,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.CAPTURE_TIME),
    unique: true,
    key: PRIVATE_COLUMN_KEY.CAPTURE_TIME,
    canChangeName: false,
    data: { format: DEFAULT_SHOOTING_TIME_FORMAT },
    groupby: 'predefined',
    canSetData: true,
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.RATE],
    type: CellType.RATE,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_RATE),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_RATE,
    canChangeName: false,
    data: DEFAULT_RATE_DATA,
    groupby: 'predefined',
    canSetData: true,
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.TEXT],
    type: CellType.TEXT,
    name: gettext('Text'),
    canChangeName: true,
    key: CellType.TEXT,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.LONG_TEXT],
    type: CellType.LONG_TEXT,
    name: gettext('Long text'),
    canChangeName: true,
    key: CellType.LONG_TEXT,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.NUMBER],
    type: CellType.NUMBER,
    name: gettext('Number'),
    canChangeName: true,
    key: CellType.NUMBER,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR],
    type: CellType.COLLABORATOR,
    name: gettext('Collaborator'),
    canChangeName: true,
    key: CellType.COLLABORATOR,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.CHECKBOX],
    type: CellType.CHECKBOX,
    name: gettext('Checkbox'),
    canChangeName: true,
    key: CellType.CHECKBOX,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.DATE],
    type: CellType.DATE,
    name: gettext('Date'),
    canChangeName: true,
    key: CellType.DATE,
    data: { format: DEFAULT_DATE_FORMAT },
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.SINGLE_SELECT],
    type: CellType.SINGLE_SELECT,
    name: gettext('Single select'),
    canChangeName: true,
    key: CellType.SINGLE_SELECT,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.MULTIPLE_SELECT],
    type: CellType.MULTIPLE_SELECT,
    name: gettext('Multiple select'),
    canChangeName: true,
    key: CellType.MULTIPLE_SELECT,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.RATE],
    type: CellType.RATE,
    name: gettext('Rate'),
    canChangeName: true,
    key: CellType.RATE,
    data: DEFAULT_RATE_DATA,
    groupby: 'basics',
  },
];

export { COLUMNS };
