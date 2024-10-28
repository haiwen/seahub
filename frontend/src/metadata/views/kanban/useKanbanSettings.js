import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { setKanbanSetting, loadKanbanSettings } from './utils';
import { KANBAN_SETTINGS_KEYS } from '../../constants';

const useKanbanSettings = (viewsMap) => {
  const [selectedViewId, setSelectedViewId] = useState('');
  const [groupByColumnKey, setGroupByColumnKey] = useState(null);
  const [titleFieldKey, setTitleFieldKey] = useState(null);
  const [hideEmptyValues, setHideEmptyValues] = useState(false);
  const [showFieldNames, setShowFieldNames] = useState(false);
  const [textWrap, setTextWrap] = useState(false);

  useEffect(() => {
    const loadedSettings = loadKanbanSettings(viewsMap);
    setSelectedViewId(loadedSettings.selectedViewId);
    setGroupByColumnKey(loadedSettings.groupByColumnKey);
    setTitleFieldKey(loadedSettings.titleFieldKey);
    setHideEmptyValues(loadedSettings.hideEmptyValues);
    setShowFieldNames(loadedSettings.showFieldNames);
    setTextWrap(loadedSettings.textWrap);
  }, [viewsMap, selectedViewId]);

  const updateSetting = useCallback((key, value) => {
    setKanbanSetting(selectedViewId, key, value);
    switch (key) {
      case KANBAN_SETTINGS_KEYS.SELECTED_VIEW_ID:
        setSelectedViewId(value);
        break;
      case KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY:
        setGroupByColumnKey(value);
        break;
      case KANBAN_SETTINGS_KEYS.TITLE_FIELD_KEY:
        setTitleFieldKey(value);
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
  }, [selectedViewId]);

  return {
    selectedViewId,
    groupByColumnKey,
    titleFieldKey,
    hideEmptyValues,
    showFieldNames,
    textWrap,
    updateSetting,
  };
};

useKanbanSettings.propTypes = {
  viewsMap: PropTypes.object.isRequired,
};

export default useKanbanSettings;
