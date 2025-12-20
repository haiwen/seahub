import { gettext } from '../../../../utils/constants';
import { PRIVATE_COLUMN_KEY, PRIVATE_COLUMN_KEYS } from '../../../constants';
import { createColumnEditor } from './editors/editor-factory';
import { createColumnFormatter } from './formatter/formatter-factory';

const KEY_COLUMN_ICON_NAME = {
  [PRIVATE_COLUMN_KEY.TAG_NAME]: 'tag-filled',
  [PRIVATE_COLUMN_KEY.PARENT_LINKS]: 'tag-filled',
  [PRIVATE_COLUMN_KEY.SUB_LINKS]: 'number',
  [PRIVATE_COLUMN_KEY.TAG_FILE_LINKS]: 'number',
};

const KEY_COLUMN_DISPLAY_NAME = {
  [PRIVATE_COLUMN_KEY.TAG_NAME]: gettext('Tag'),
  [PRIVATE_COLUMN_KEY.PARENT_LINKS]: gettext('Parent tags'),
  [PRIVATE_COLUMN_KEY.SUB_LINKS]: gettext('Child tags count'),
  [PRIVATE_COLUMN_KEY.TAG_FILE_LINKS]: gettext('File count'),
};

const EDITABLE_PRIVATE_COLUMNS_KEYS = [PRIVATE_COLUMN_KEY.TAG_NAME, PRIVATE_COLUMN_KEY.PARENT_LINKS, PRIVATE_COLUMN_KEY.SUB_LINKS];

const FROZEN_PRIVATE_COLUMNS_KEYS = [PRIVATE_COLUMN_KEY.TAG_NAME];

const EDITABLE_VIA_CLICK_CELL_COLUMNS_KEYS = [PRIVATE_COLUMN_KEY.PARENT_LINKS];

const POPUP_EDITOR_COLUMNS_KEYS = [PRIVATE_COLUMN_KEY.PARENT_LINKS, PRIVATE_COLUMN_KEY.SUB_LINKS];

export const createTableColumns = (columns, otherProps) => {
  return columns.map((column) => {
    const { key } = column;
    const is_private = PRIVATE_COLUMN_KEYS.includes(key);
    const editable = is_private && EDITABLE_PRIVATE_COLUMNS_KEYS.includes(key);
    const editable_via_click_cell = is_private && EDITABLE_VIA_CLICK_CELL_COLUMNS_KEYS.includes(key);
    const frozen = FROZEN_PRIVATE_COLUMNS_KEYS.includes(key);
    const is_name_column = key === PRIVATE_COLUMN_KEY.TAG_NAME;
    const display_name = KEY_COLUMN_DISPLAY_NAME[key];
    const icon_name = KEY_COLUMN_ICON_NAME[key];
    const formatter = !column.formatter && createColumnFormatter({ column, otherProps });
    const editor = !column.editor && createColumnEditor({ column, otherProps });
    const is_popup_editor = is_private && POPUP_EDITOR_COLUMNS_KEYS.includes(key);

    let normalizedColumn = { ...column, is_private, editable, frozen };
    if (editable_via_click_cell) {
      normalizedColumn.editable_via_click_cell = editable_via_click_cell;
    }
    if (is_name_column) {
      normalizedColumn.is_name_column = is_name_column;
    }
    if (display_name) {
      normalizedColumn.display_name = display_name;
    }
    if (icon_name) {
      normalizedColumn.icon_name = icon_name;
    }
    if (formatter) {
      normalizedColumn.formatter = formatter;
    }
    if (editor) {
      normalizedColumn.editor = editor;
    }
    if (is_popup_editor) {
      normalizedColumn.is_popup_editor = is_popup_editor;
    }
    return normalizedColumn;
  });
};
