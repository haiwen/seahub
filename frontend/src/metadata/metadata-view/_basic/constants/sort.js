import { CellType } from './column';

const SORT_TYPE = {
  UP: 'up',
  DOWN: 'down',
};

const SORT_COLUMN_OPTIONS = [
  CellType.FILE_NAME,
  CellType.CTIME,
  CellType.MTIME,
  CellType.TEXT,
];

const TEXT_SORTER_COLUMN_TYPES = [CellType.TEXT];
const NUMBER_SORTER_COLUMN_TYPES = [];

export {
  SORT_TYPE,
  SORT_COLUMN_OPTIONS,
  TEXT_SORTER_COLUMN_TYPES,
  NUMBER_SORTER_COLUMN_TYPES,
};
