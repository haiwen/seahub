import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { IconBtn, CustomizeSelect, Icon } from '@seafile/sf-metadata-ui-component';
import HiddenColumns from './hidden-columns';
import { gettext } from '../../../../utils/constants';
import { CellType, COLUMNS_ICON_CONFIG, KANBAN_SETTINGS_KEYS } from '../../../constants';
import Switch from '../../../../components/common/switch';

import './index.css';

const SettingPanel = ({
  columns,
  settings,
  onUpdateSettings,
  onClose
}) => {
  const [isHiddenColumnsVisible, setIsHiddenColumnsVisible] = useState(false);

  const panelRef = useRef(null);

  useEffect(() => {
    const handleScrollOutsideMenu = (event) => {
      const menuElement = document.querySelector('.sf-metadata-option-group');
      const panelElement = panelRef.current;

      if (panelElement && menuElement) {
        if (panelElement.contains(event.target) && !menuElement.contains(event.target)) {
          menuElement.style.display = 'none';
        }
      }
    };

    const panelElement = panelRef.current;
    if (panelElement) {
      panelElement.addEventListener('scroll', handleScrollOutsideMenu, true);
    }

    return () => {
      if (panelElement) {
        panelElement.removeEventListener('scroll', handleScrollOutsideMenu, true);
      }
    };
  }, []);

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

  const selectedGroupByOption = groupByOptions.find(option => option.value === settings[KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY]);
  const selectedTitleFieldOption = titleOptions.find(option => option.value === settings[KANBAN_SETTINGS_KEYS.TITLE_FIELD_KEY]) || titleOptions[0];

  const handleGroupByChange = useCallback((value) => {
    onUpdateSettings({ ...settings, [KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY]: value });
  }, [settings, onUpdateSettings]);

  const handleTitleFieldChange = useCallback((value) => {
    onUpdateSettings({ ...settings, [KANBAN_SETTINGS_KEYS.TITLE_FIELD_KEY]: value });
  }, [settings, onUpdateSettings]);

  const handleToggleChange = useCallback((key, value) => {
    onUpdateSettings({ ...settings, [key]: value });
  }, [settings, onUpdateSettings]);

  const handleHiddenColumnsChange = useCallback((value) => {
    onUpdateSettings({ ...settings, [KANBAN_SETTINGS_KEYS.SHOWN_COLUMNS_KEYS]: value });
  }, [settings, onUpdateSettings]);

  const handleColumnsOrderChange = useCallback((value) => {
    onUpdateSettings({ ...settings, [KANBAN_SETTINGS_KEYS.COLUMNS_KEYS]: value });
  }, [settings, onUpdateSettings]);

  const handleToggleHiddenColumns = useCallback(() => {
    setIsHiddenColumnsVisible(!isHiddenColumnsVisible);
  }, [isHiddenColumnsVisible]);

  return (
    <div className="sf-metadata-view-kanban-setting-panel" ref={panelRef}>
      <div className="setting-panel-header">
        <h5 className="m-0">{gettext('Settings')}</h5>
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
      <div className="setting-panel-body">
        <div className="setting-item">
          <span className="setting-item-label">{gettext('Group by')}</span>
          <CustomizeSelect
            value={selectedGroupByOption}
            onSelectOption={handleGroupByChange}
            options={groupByOptions}
            isInModal={true}
          />
        </div>
        <div className="split-line"></div>
        <div className="setting-item">
          <span className="setting-item-label">{gettext('Title property')}</span>
          <CustomizeSelect
            value={selectedTitleFieldOption}
            onSelectOption={handleTitleFieldChange}
            options={titleOptions}
            isInModal={true}
          />
        </div>
        <div className="split-line"></div>
        <div className="setting-item">
          <Switch
            placeholder={gettext('Don\'t show empty values')}
            checked={settings[KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUES] || false}
            onChange={() => handleToggleChange(KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUES, !settings[KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUES])}
          />
        </div>
        <div className="split-line"></div>
        <div className="setting-item">
          <Switch
            placeholder={gettext('Show property names')}
            checked={settings[KANBAN_SETTINGS_KEYS.SHOW_FIELD_NAMES] || false}
            onChange={() => handleToggleChange(KANBAN_SETTINGS_KEYS.SHOW_FIELD_NAMES, !settings[KANBAN_SETTINGS_KEYS.SHOW_FIELD_NAMES])}
          />
        </div>
        <div className="split-line"></div>
        <div className="setting-item">
          <Switch
            placeholder={gettext('Text wraps')}
            checked={settings[KANBAN_SETTINGS_KEYS.TEXT_WRAP] || false}
            onChange={() => handleToggleChange(KANBAN_SETTINGS_KEYS.TEXT_WRAP, !settings[KANBAN_SETTINGS_KEYS.TEXT_WRAP])}
          />
        </div>
        <div className="split-line"></div>
        <div className="toggle-hide-columns-btn" onClick={handleToggleHiddenColumns}>
          <span className="hide-columns-label">{gettext('Properties to display on the card')}</span>
          <div className="toggle-hide-columns-btn-icon">
            <i className={classNames('sf3-font sf3-font-down', { 'rotate-270': !isHiddenColumnsVisible })}></i>
          </div>
        </div>
        {isHiddenColumnsVisible && (
          <HiddenColumns
            columns={columns}
            settings={settings}
            onChange={handleHiddenColumnsChange}
            onChangeOrder={handleColumnsOrderChange}
          />
        )}
      </div>
    </div>
  );
};

SettingPanel.propTypes = {
  columns: PropTypes.array.isRequired,
  settings: PropTypes.object.isRequired,
  onUpdateSettings: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SettingPanel;
