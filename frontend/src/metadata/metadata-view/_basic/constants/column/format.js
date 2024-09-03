import CellType from './type';

const DATE_COLUMN_OPTIONS = [
  CellType.CTIME,
  CellType.MTIME,
  CellType.DATE,
];
const NUMERIC_COLUMNS_TYPES = [
  CellType.NUMBER,
  CellType.RATE,
];
const COLLABORATOR_COLUMN_TYPES = [
  CellType.CREATOR,
  CellType.LAST_MODIFIER,
  CellType.COLLABORATOR,
];

// date
const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
const UTC_FORMAT_DEFAULT = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
const DATE_UNIT = {
  YEAR: 'year',
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
  HOUR: 'hour',
  HOURS: 'hours',
  MINUTE: 'minute',
  MINUTES: 'minutes',
  SECOND: 'second',
};
const DATE_FORMAT_MAP = {
  YYYY_MM_DD: 'YYYY-MM-DD',
  YYYY_MM_DD_HH_MM: 'YYYY-MM-DD HH:mm',
  YYYY_MM_DD_HH_MM_SS: 'YYYY-MM-DD HH:mm:ss',
};

// number
const DEFAULT_NUMBER_FORMAT = 'number';

const NOT_SUPPORT_EDIT_COLUMN_TYPE = [
  CellType.CTIME,
  CellType.MTIME,
  CellType.CREATOR,
  CellType.LAST_MODIFIER,
];

const NOT_SUPPORT_EDIT_COLUMN_TYPE_MAP = {
  [CellType.CTIME]: true,
  [CellType.MTIME]: true,
  [CellType.CREATOR]: true,
  [CellType.LAST_MODIFIER]: true,
};

const MULTIPLE_CELL_VALUE_COLUMN_TYPE_MAP = {
  [CellType.COLLABORATOR]: true,
  [CellType.MULTIPLE_SELECT]: true,
};
const SINGLE_CELL_VALUE_COLUMN_TYPE_MAP = {
  [CellType.TEXT]: true,
  [CellType.CTIME]: true,
  [CellType.MTIME]: true,
  [CellType.CREATOR]: true,
  [CellType.LAST_MODIFIER]: true,
  [CellType.FILE_NAME]: true,
  [CellType.CHECKBOX]: true,
  [CellType.DATE]: true,
  [CellType.LONG_TEXT]: true,
  [CellType.SINGLE_SELECT]: true,
  [CellType.NUMBER]: true,
  [CellType.RATE]: true,
};

const DATE_DEFAULT_TYPES = {
  SPECIFIC_DATE: 'specific_date',
  CURRENT_DATE: 'current_date',
  DAYS_BEFORE: 'days_before',
  DAYS_AFTER: 'days_after',
};

const GEOLOCATION_FORMAT = {
  LNG_LAT: 'lng_lat',
  COUNTRY_REGION: 'country_region',
  PROVINCE: 'province',
  PROVINCE_CITY: 'province_city',
  PROVINCE_CITY_DISTRICT: 'province_city_district',
  MAP_SELECTION: 'map_selection',
};

export {
  COLLABORATOR_COLUMN_TYPES,
  DATE_COLUMN_OPTIONS,
  NUMERIC_COLUMNS_TYPES,
  DEFAULT_DATE_FORMAT,
  UTC_FORMAT_DEFAULT,
  DATE_UNIT,
  DATE_FORMAT_MAP,
  DEFAULT_NUMBER_FORMAT,
  DATE_DEFAULT_TYPES,
  NOT_SUPPORT_EDIT_COLUMN_TYPE,
  NOT_SUPPORT_EDIT_COLUMN_TYPE_MAP,
  MULTIPLE_CELL_VALUE_COLUMN_TYPE_MAP,
  SINGLE_CELL_VALUE_COLUMN_TYPE_MAP,
  GEOLOCATION_FORMAT,
};
