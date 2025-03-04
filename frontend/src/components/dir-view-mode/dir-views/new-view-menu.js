import React from 'react';
import Icon from '../../icon';
import TextTranslation from '../../../utils/text-translation';
import { gettext } from '../../../utils/constants';
import { VIEW_TYPE, VIEW_TYPE_ICON } from '../../../metadata/constants';

export const KEY_ADD_VIEW_MAP = {
  ADD_FOLDER: 'ADD_FOLDER',
  ADD_TABLE: 'ADD_TABLE',
  ADD_GALLERY: 'ADD_GALLERY',
  ADD_KANBAN: 'ADD_KANBAN',
  ADD_MAP: 'ADD_MAP',
};

const ADD_VIEW_OPTIONS = [
  {
    key: KEY_ADD_VIEW_MAP.ADD_TABLE,
    type: VIEW_TYPE.TABLE,
  },
  {
    key: KEY_ADD_VIEW_MAP.ADD_GALLERY,
    type: VIEW_TYPE.GALLERY,
  },
  {
    key: KEY_ADD_VIEW_MAP.ADD_KANBAN,
    type: VIEW_TYPE.KANBAN,
  },
  {
    key: KEY_ADD_VIEW_MAP.ADD_MAP,
    type: VIEW_TYPE.MAP,
  },
];

const translateLabel = (type) => {
  switch (type) {
    case VIEW_TYPE.TABLE:
      return gettext('Table');
    case VIEW_TYPE.GALLERY:
      return gettext('Gallery');
    case VIEW_TYPE.KANBAN:
      return gettext('Kanban');
    case VIEW_TYPE.MAP:
      return gettext('Map');
    default:
      return type;
  }
};

export const getNewViewSubMenu = () => {
  return ADD_VIEW_OPTIONS.map((option) => {
    const { key, type } = option;
    return {
      key,
      value: translateLabel(type),
      icon_dom: <Icon symbol={VIEW_TYPE_ICON[type] || VIEW_TYPE.TABLE} className="metadata-view-icon" />
    };
  });
};

export const getNewViewMenuItem = () => {
  return {
    ...TextTranslation.ADD_VIEW,
    subOpListHeader: gettext('New view'),
    subOpList: getNewViewSubMenu(),
  };
};
