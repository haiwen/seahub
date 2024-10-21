import { useState, useEffect, useCallback } from 'react';
import { setKanbanSetting, loadKanbanSettings } from './utils';
import { KANBAN_SETTINGS_KEYS } from '../../constants';

const useKanbanSettings = (viewsMap) => {
  const [selectedViewId, setSelectedViewId] = useState('');
  const [groupByColumn, setGroupByColumn] = useState(null);
  const [titleField, setTitleField] = useState(null);
  const [hideEmptyValues, setHideEmptyValues] = useState(false);
  const [showFieldNames, setShowFieldNames] = useState(false);
  const [textWrap, setTextWrap] = useState(false);

  useEffect(() => {
    const loadedSettings = loadKanbanSettings(viewsMap);
    setSelectedViewId(loadedSettings.selectedViewId);
    setGroupByColumn(loadedSettings.groupByColumn);
    setTitleField(loadedSettings.titleField);
    setHideEmptyValues(loadedSettings.hideEmptyValues);
    setShowFieldNames(loadedSettings.showFieldNames);
    setTextWrap(loadedSettings.textWrap);
  }, [viewsMap]);

  const updateSetting = useCallback((key, value) => {
    switch (key) {
      case KANBAN_SETTINGS_KEYS.SELECTED_VIEW_ID:
        setSelectedViewId(value);
        break;
      case KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN:
        setGroupByColumn(value);
        break;
      case KANBAN_SETTINGS_KEYS.TITLE_FIELD:
        setTitleField(value);
        break;
      case KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUES:
        setHideEmptyValues(value);
        break;
      case KANBAN_SETTINGS_KEYS.SHOW_FIELD_NAMES:
        setShowFieldNames(value);
        break;
      case KANBAN_SETTINGS_KEYS.TEXT_WRAP:
        setTextWrap(value);
        break;
      default:
        break;
    }
    setKanbanSetting(key, value);
  }, []);

  return {
    selectedViewId,
    groupByColumn,
    titleField,
    hideEmptyValues,
    showFieldNames,
    textWrap,
    updateSetting,
  };
};

export default useKanbanSettings;
