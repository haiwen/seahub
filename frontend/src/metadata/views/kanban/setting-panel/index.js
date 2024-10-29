import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import KanbanHiddenColumns from './hidden-columns';
import { IconBtn, CustomizeSelect, Icon } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../utils/constants';
import { useMetadata } from '../../../hooks/metadata';
import { CellType, COLUMNS_ICON_CONFIG, KANBAN_SETTINGS_KEYS, VIEW_TYPE } from '../../../constants';
import Switch from '../../../../components/common/switch';

const SettingPanel = ({
  columns,
  settings,
  onSettingChange,
  onClose
}) => {
  const [isHiddenColumnsVisible, setIsHiddenColumnsVisible] = useState(false);
  const { viewsMap } = useMetadata();

  const viewOptions = useMemo(() =>
    Object.values(viewsMap)
      .filter(view => view.type === VIEW_TYPE.TABLE)
      .map(({ _id, name }) => ({ label: name, value: _id }))
  , [viewsMap]);

  const groupByOptions = useMemo(() => {
    return columns
      .filter(col => col.type === CellType.SINGLE_SELECT || col.type === CellType.COLLABORATOR)
      .map(col => ({
        value: col.key,
        label: (
          <>
            <span className="sf-metadata-filter-header-icon"><Icon iconName={COLUMNS_ICON_CONFIG[col.type]} /></span>
            <span>{col.name}</span>
          </>
        )
      }));
  }, [columns]);

  const titleOptions = useMemo(() => {
    return columns.map(col => ({
      value: col.key,
      label: (
        <>
          <span className="sf-metadata-filter-header-icon"><Icon iconName={COLUMNS_ICON_CONFIG[col.type]} /></span>
          <span>{col.name}</span>
        </>
      )
    }));
  }, [columns]);

  const selectedViewOption = viewOptions.find(option => option.value === settings.selectedViewId);
  const selectedGroupByOption = groupByOptions.find(option => option.value === settings.groupByColumnKey);
  const selectedTitleFieldOption = titleOptions.find(option => option.value === settings.titleFieldKey);

  const handleViewChange = useCallback((value) => {
    onSettingChange(KANBAN_SETTINGS_KEYS.SELECTED_VIEW_ID, value);
  }, [onSettingChange]);

  const handleGroupByChange = useCallback((value) => {
    onSettingChange(KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY, value);
  }, [onSettingChange]);

  const handleTitleFieldChange = useCallback((value) => {
    onSettingChange(KANBAN_SETTINGS_KEYS.TITLE_FIELD_KEY, value);
  }, [onSettingChange]);

  const handleToggleChange = useCallback((key, value) => {
    onSettingChange(key, value);
  }, [onSettingChange]);

  const handleToggleHiddenColumns = useCallback(() => {
    setIsHiddenColumnsVisible(!isHiddenColumnsVisible);
  }, [isHiddenColumnsVisible]);

  const handleHiddenColumnsChange = useCallback((value) => {
    onSettingChange(KANBAN_SETTINGS_KEYS.HIDDEN_COLUMNS, value);
  }, [onSettingChange]);

  return (
    <div className="sf-metadata-view-kanban-setting-panel">
      <div className='setting-panel-header'>
        <h5 className='m-0'>{gettext('Setting')}</h5>
        <IconBtn
          className="kanban-setting-close-icon"
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
          <span className='setting-item-label'>{gettext('Subtable')}</span>
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
          <Switch
            placeholder={gettext('Don\'t show empty values')}
            checked={settings.hideEmptyValues || false}
            onChange={() => handleToggleChange(KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUES, !settings.hideEmptyValues)}
          />
        </div>
        <div className="split-line"></div>
        <div className='setting-item'>
          <Switch
            placeholder={gettext('Show field names')}
            checked={settings.showFieldNames || false}
            onChange={() => handleToggleChange(KANBAN_SETTINGS_KEYS.SHOW_FIELD_NAMES, !settings.showFieldNames)}
          />
        </div>
        <div className="split-line"></div>
        <div className='setting-item'>
          <Switch
            placeholder={gettext('Text wraps')}
            checked={settings.textWrap || false}
            onChange={() => handleToggleChange(KANBAN_SETTINGS_KEYS.TEXT_WRAP, !settings.textWrap)}
          />
        </div>
        <div className="split-line"></div>
        <div className='toggle-hide-columns-btn' onClick={handleToggleHiddenColumns}>
          <span className='hide-columns-label'>{gettext('Other fields')}</span>
          <div className='toggle-hide-columns-btn-icon'>
            <i className={classNames('sf3-font sf3-font-down', { 'rotate-90': !isHiddenColumnsVisible })}></i>
          </div>
        </div>
        {isHiddenColumnsVisible && (
          <KanbanHiddenColumns settings={settings} onChange={handleHiddenColumnsChange} />
        )}
      </div>
    </div>
  );
};

SettingPanel.propTypes = {
  columns: PropTypes.array.isRequired,
  settings: PropTypes.object.isRequired,
  onSettingChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SettingPanel;
