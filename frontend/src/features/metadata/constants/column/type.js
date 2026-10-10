import { CellType } from '@/constants/metadata-column';

export { CellType as default };

export const POPUP_EDITOR_COLUMN_TYPES = [
  CellType.DATE,
  CellType.COLLABORATOR,
  CellType.SINGLE_SELECT,
  CellType.MULTIPLE_SELECT,
  CellType.LONG_TEXT,
  CellType.LINK,
  CellType.TAGS,
  CellType.GEOLOCATION,
];
