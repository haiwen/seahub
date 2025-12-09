// CellMasks should render in front of the cells
// Unfrozen cells do not have a zIndex specified
export const CELL_MASK = 1;
export const TABLE_MAIN_INTERVAL = 1;
export const RESIZE_HANDLE = 1;
export const SEQUENCE_COLUMN = 2;

//  higher than unfrozen header cell(0), RESIZE_HANDLE
export const FROZEN_HEADER_CELL = 2;
export const GROUP_FROZEN_HEADER = 2;
export const SCROLL_BAR = 2;

// In front of CELL_MASK/non-frozen cell(1)、back of the frozen cells (2)
export const GROUP_BACKDROP = 2;
export const MOBILE_RECORDS_COLUMN_NAMES = 2;
export const FROZEN_GROUP_CELL = 2;

// Frozen cells have a zIndex value of 2 so CELL_MASK should have a higher value
export const FROZEN_CELL_MASK = 3;

// need higher than the doms(etc. cell, cell_mask) which behind of the grid header
export const GRID_HEADER = 4;
export const GRID_FOOTER = 4;
export const UPLOAD_PROGRESS = 4;

// EditorContainer is rendered outside the grid and it higher FROZEN_GROUP_CELL(2)
export const EDITOR_CONTAINER = 9;

export const DROPDOWN_MENU = 1051;
