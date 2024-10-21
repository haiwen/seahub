const getKanbanSetting = (key, defaultValue) => {
  const value = window.sfMetadataContext.localStorage.getItem(key);
  return value !== null ? value : defaultValue;
};

export const setKanbanSetting = (key, value) => {
  window.sfMetadataContext.localStorage.setItem(key, value);
};

export const loadKanbanSettings = (viewsMap) => {
  let selectedViewId = getKanbanSetting('selectedViewId', '');
  if (!selectedViewId && Object.keys(viewsMap).length > 0) {
    selectedViewId = Object.values(viewsMap)[0];
  }

  return {
    selectedViewId,
    groupByColumn: getKanbanSetting('groupByColumn', ''),
    titleField: getKanbanSetting('titleField', ''),
    hideEmptyValues: getKanbanSetting('hideEmptyValues', false),
    showFieldNames: getKanbanSetting('showFieldNames', false),
    textWrap: getKanbanSetting('textWrap', false),
  };
};
