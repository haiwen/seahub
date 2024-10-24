import * as zIndexes from './zIndexes';
import KeyCodes from './keyCodes';

export const DIALOG_MAX_HEIGHT = window.innerHeight - 56; // Dialog margin is 3.5rem (56px)

export const PRIVATE_FILE_TYPE = {
  FILE_EXTENDED_PROPERTIES: '__file_extended_properties',
  FACE_RECOGNITION: '__face_recognition',
};

const TAG_COLORS = ['#FBD44A', '#EAA775', '#F4667C', '#DC82D2', '#9860E5', '#9F8CF1', '#59CB74', '#ADDF84',
  '#89D2EA', '#4ECCCB', '#46A1FD', '#C2C2C2'];

export const SIDE_PANEL_FOLDED_WIDTH = 71;
export const SUB_NAV_ITEM_HEIGHT = 28;

export const MAP_TYPE = {
  B_MAP: 'b_map', // baidu
  G_MAP: 'g_map', // google
};

// domestic map's format: [lng, lat], foreign map's format: [lat, lng]
export const DOMESTIC_MAP_TYPE = [MAP_TYPE.B_MAP];

export { KeyCodes, zIndexes, TAG_COLORS };
