import React, { useCallback, useMemo } from 'react';
import { IconBtn, CustomizeSelect } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../utils/constants';
import { useMetadata } from '../../hooks/metadata';
import { CellType, KANBAN_SETTINGS_KEYS, PRIVATE_COLUMN_KEY, VIEW_TYPE } from '../../constants';
import ToggleSetting from '../../components/data-process-setter/kanban-setter';

import './index.css';

const SettingPanel = ({
  shownColumns,
  settings,
  onSettingChange,
  onClose
}) => {
  const { viewsMap } = useMetadata();

  const viewOptions = useMemo(() =>
    Object.values(viewsMap)
      .filter(view => view.type === VIEW_TYPE.TABLE)
      .map(({ _id, name }) => ({ label: name, value: _id }))
  , [viewsMap]);

  const groupByOptions = useMemo(() => {
    return shownColumns
      .filter(col => col.type === CellType.SINGLE_SELECT || col.key === PRIVATE_COLUMN_KEY.FILE_COLLABORATORS)
      .map(col => ({ label: col.name, value: col }));
  }, [shownColumns]);

  const titleOptions = useMemo(() => {
    return shownColumns.map(col => ({ label: col.name, value: col }));
  }, [shownColumns]);

  const selectedViewOption = viewOptions.find(option => option.value === settings.selectedViewId);
  const selectedGroupByOption = groupByOptions.find(option => option.value.key === settings.groupByColumn?.key);
  const selectedTitleFieldOption = titleOptions.find(option => option.value.key === settings.titleField?.key);

  const handleViewChange = useCallback((value) => {
    onSettingChange(KANBAN_SETTINGS_KEYS.SELECTED_VIEW_ID, value);
  }, [onSettingChange]);

  const handleGroupByChange = useCallback((value) => {
    onSettingChange(KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN, value);
  }, [onSettingChange]);

  const handleTitleFieldChange = useCallback((value) => {
    onSettingChange(KANBAN_SETTINGS_KEYS.TITLE_FIELD, value);
  }, [onSettingChange]);

  const handleToggleChange = useCallback((key, value) => {
    onSettingChange(key, value);
  }, [onSettingChange]);

  return (
    <div className="sf-metadata-view-kanban-setting-panel">
      <div className='setting-panel-header'>
        <h5 className='m-0'>{gettext('Setting')}</h5>
        <IconBtn
          className="close-button"
          iconName="close"
          size={24}
          role="button"
          aria-label="close"
          tabIndex={0}
          onClick={onClose}
        />
      </div>
      <div className='setting-panel-body'>
        <div className='setting-item'>
          <span className='setting-item-label'>{gettext('Table view')}</span>
          <CustomizeSelect
            value={selectedViewOption}
            onSelectOption={handleViewChange}
            options={viewOptions}
          />
        </div>
        <div className='setting-item'>
          <span className='setting-item-label'>{gettext('Group by')}</span>
          <CustomizeSelect
            value={selectedGroupByOption}
            onSelectOption={handleGroupByChange}
            options={groupByOptions}
          />
        </div>
        <div className="split-line"></div>
        <div className='setting-item'>
          <span className='setting-item-label'>{gettext('Title field')}</span>
          <CustomizeSelect
            value={selectedTitleFieldOption}
            onSelectOption={handleTitleFieldChange}
            options={titleOptions}
          />
        </div>
        <div className="split-line"></div>
        <div className='setting-item'>
          <ToggleSetting
            value={settings.hideEmptyValues}
            label={gettext('Don\'t show empty values')}
            settingKey={KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUES}
            onToggle={(value) => handleToggleChange(KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUES, value)}
          />
        </div>
        <div className="split-line"></div>
        <div className='setting-item'>
          <ToggleSetting
            value={settings.showFieldNames}
            label={gettext('Show field names')}
            settingKey={KANBAN_SETTINGS_KEYS.SHOW_FIELD_NAMES}
            onToggle={(value) => handleToggleChange(KANBAN_SETTINGS_KEYS.SHOW_FIELD_NAMES, value)}
          />
        </div>
        <div className="split-line"></div>
        <div className='setting-item'>
          <ToggleSetting
            value={settings.textWrap}
            label={gettext('Text wraps')}
            settingKey={KANBAN_SETTINGS_KEYS.TEXT_WRAP}
            onToggle={(value) => handleToggleChange(KANBAN_SETTINGS_KEYS.TEXT_WRAP, value)}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingPanel;
