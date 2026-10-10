export const CellType = {
  DEFAULT: 'default',
  TEXT: 'text',
  CREATOR: 'creator',
  CTIME: 'ctime',
  LAST_MODIFIER: 'last-modifier',
  MTIME: 'mtime',
  FILE_NAME: 'file-name',
  CHECKBOX: 'checkbox',
  COLLABORATOR: 'collaborator',
  DATE: 'date',
  LONG_TEXT: 'long-text',
  SINGLE_SELECT: 'single-select',
  MULTIPLE_SELECT: 'multiple-select',
  NUMBER: 'number',
  GEOLOCATION: 'geolocation',
  RATE: 'rate',
  LINK: 'link',
  SIZE: 'size',
  TAGS: 'tags'
};

export const PRIVATE_COLUMN_KEY = {
  ID: '_id',

  // base key
  CTIME: '_ctime',
  MTIME: '_mtime',
  DTIME: '_dtime',
  CREATOR: '_creator',
  LAST_MODIFIER: '_last_modifier',

  IS_DIR: '_is_dir',
  PARENT_DIR: '_parent_dir',
  FILE_CTIME: '_file_ctime',
  FILE_MTIME: '_file_mtime',
  FILE_CREATOR: '_file_creator',
  FILE_MODIFIER: '_file_modifier',
  FILE_NAME: '_name',
  FILE_TYPE: '_file_type',
  FILE_COLLABORATORS: '_collaborators',
  FILE_EXPIRE_TIME: '_expire_time',
  FILE_KEYWORDS: '_keywords',
  FILE_DESCRIPTION: '_description',
  FILE_EXPIRED: '_expired',
  FILE_STATUS: '_status',
  LOCATION: '_location',
  OBJ_ID: '_obj_id',
  SIZE: '_size',
  SIZE_ORIGINAL: '_size_original',
  SUFFIX: '_suffix',
  FILE_DETAILS: '_file_details',
  AI_SUMMARY: '_ai_summary',
  AI_SUMMARY_MTIME: '_ai_summary_mtime',
  CAPTURE_TIME: '_capture_time',
  FILE_REVIEWER: '_reviewer',
  OWNER: '_owner',
  FILE_RATE: '_rate',

  // face
  FACE_LINKS: '_face_links',
  EXCLUDED_FACE_LINKS: '_excluded_face_links',
  INCLUDED_FACE_LINKS: '_included_face_links',
  FACE_VECTORS: '_face_vectors',

  // tag
  TAGS: '_tags',

  // location
  LOCATION_TRANSLATED: '_location_translated'
};
