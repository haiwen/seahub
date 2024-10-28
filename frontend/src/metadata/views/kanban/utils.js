import { KANBAN_SETTINGS_KEYS } from '../../constants';

export const setKanbanSetting = (viewId, key, value) => {
  if (key === KANBAN_SETTINGS_KEYS.SELECTED_VIEW_ID) {
    window.sfMetadataContext.localStorage.setItem(KANBAN_SETTINGS_KEYS.SELECTED_VIEW_ID, value);
  } else {
    const settings = JSON.parse(window.sfMetadataContext.localStorage.getItem(viewId) || '{}');
    settings[key] = value;
    window.sfMetadataContext.localStorage.setItem(viewId, JSON.stringify(settings));
  }
};

export const loadKanbanSettings = (viewsMap) => {
  const viewId = window.sfMetadataContext.localStorage.getItem(KANBAN_SETTINGS_KEYS.SELECTED_VIEW_ID) || Object.keys(viewsMap)[0];
  const settings = JSON.parse(window.sfMetadataContext.localStorage.getItem(viewId) || '{}');

  return {
    selectedViewId: viewId,
    groupByColumnKey: settings[KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY] || '',
    titleFieldKey: settings[KANBAN_SETTINGS_KEYS.TITLE_FIELD_KEY] || '',
    hideEmptyValues: settings[KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUES] || false,
    showFieldNames: settings[KANBAN_SETTINGS_KEYS.SHOW_FIELD_NAMES] || false,
    textWrap: settings[KANBAN_SETTINGS_KEYS.TEXT_WRAP] || false,
  };
};
