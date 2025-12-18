import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../../components/icon';
import OpIcon from '../../../../components/op-icon';
import Switch from '../../../../components/switch';
import Selector from '../../../components/selector';
import FieldDisplaySettings from '../../../components/data-process-setter/field-display-settings';
import { gettext } from '../../../../utils/constants';
import { CellType, COLUMNS_ICON_CONFIG, KANBAN_SETTINGS_KEYS } from '../../../constants';
import { getColumnByKey } from '../../../utils/column';
import { useMetadataStatus } from '../../../../hooks';

import './index.css';

const Settings = ({
  columns,
  columnsMap,
  settings,
  modifySettings,
  onClose
}) => {
  const { globalHiddenColumns } = useMetadataStatus();
  const validColumns = useMemo(() => columns.filter(column => !globalHiddenColumns.includes(column.key)), [columns, globalHiddenColumns]);
  const groupByColumnOptions = useMemo(() => {
    return validColumns
      .filter(col => col.type === CellType.SINGLE_SELECT || col.type === CellType.COLLABORATOR)
      .map(col => ({
        value: col.key,
        label: (
          <>
            <span className="sf-metadata-select-icon"><Icon className="sf-metadata-icon" symbol={COLUMNS_ICON_CONFIG[col.type]} /></span>
            <span>{col.name}</span>
          </>
        )
      }));
  }, [validColumns]);
  const titleColumnOptions = useMemo(() => {
    return validColumns
      .map(col => ({
        value: col.key,
        label: (
          <>
            <span className="sf-metadata-select-icon"><Icon className="sf-metadata-icon" symbol={COLUMNS_ICON_CONFIG[col.type]} /></span>
            <span>{col.name}</span>
          </>
        )
      }));
  }, [validColumns]);

  const displayColumns = useMemo(() => {
    const displayColumnsConfig = settings[KANBAN_SETTINGS_KEYS.COLUMNS].filter(column => !globalHiddenColumns.includes(column.key));
    const titleColumnKey = settings[KANBAN_SETTINGS_KEYS.TITLE_COLUMN_KEY];
    const filteredColumns = validColumns.filter(item => item.key !== titleColumnKey);
    if (!displayColumnsConfig) return filteredColumns.map(column => ({ ...column, shown: false }));
    const validDisplayColumnsConfig = displayColumnsConfig.map(columnConfig => {
      const column = columnsMap[columnConfig.key];
      if (column) return { ...column, shown: columnConfig.shown };
      return null;
    }).filter(column => column && column.key !== titleColumnKey);
    const addedColumns = filteredColumns
      .filter(column => !getColumnByKey(validDisplayColumnsConfig, column.key))
      .map(column => ({ ...column, shown: false }));
    return [...validDisplayColumnsConfig, ...addedColumns];
  }, [validColumns, columnsMap, settings, globalHiddenColumns]);

  const displayColumnsConfig = useMemo(() => displayColumns.map(column => ({ key: column.key, shown: column.shown })), [displayColumns]);

  const handleUpdateSettings = useCallback((key, value) => {
    modifySettings({ ...settings, [key]: value });
  }, [settings, modifySettings]);

  const onToggleField = useCallback((key, shown) => {
    const newDisplayColumnsConfig = displayColumnsConfig.map(columnConfig => {
      if (columnConfig.key === key) return { ...columnConfig, shown };
      return columnConfig;
    });
    handleUpdateSettings(KANBAN_SETTINGS_KEYS.COLUMNS, newDisplayColumnsConfig);
  }, [displayColumnsConfig, handleUpdateSettings]);

  const onMoveField = useCallback((sourceKey, targetKey) => {
    const newDisplayColumnsConfig = displayColumnsConfig.slice(0);
    const sourceIndex = displayColumnsConfig.findIndex(columnConfig => columnConfig.key === sourceKey);
    const targetIndex = displayColumnsConfig.findIndex(columnConfig => columnConfig.key === targetKey);
    if (sourceIndex === -1 || targetIndex === -1) return;
    newDisplayColumnsConfig.splice(sourceIndex, 1, displayColumnsConfig[targetIndex]);
    newDisplayColumnsConfig.splice(targetIndex, 1, displayColumnsConfig[sourceIndex]);
    handleUpdateSettings(KANBAN_SETTINGS_KEYS.COLUMNS, newDisplayColumnsConfig);
  }, [displayColumnsConfig, handleUpdateSettings]);

  const onToggleFieldsVisibility = useCallback((visibility) => {
    const newDisplayColumnsConfig = displayColumnsConfig.map(columnConfig => ({ ...columnConfig, shown: visibility }));
    handleUpdateSettings(KANBAN_SETTINGS_KEYS.COLUMNS, newDisplayColumnsConfig);
  }, [displayColumnsConfig, handleUpdateSettings]);

  return (
    <div className="sf-metadata-view-kanban-setting-panel">
      <div className="setting-panel-header">
        <h5 className="m-0">{gettext('Settings')}</h5>
        <OpIcon className="op-icon" symbol="close" op={onClose} title={gettext('Close')} />
      </div>
      <div className="setting-panel-body">
        <div className="setting-item">
          <span className="setting-item-label">{gettext('Group by')}</span>
          <Selector
            settingKey={KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY}
            value={settings[KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY]}
            defaultValue={groupByColumnOptions[0]?.value}
            options={groupByColumnOptions}
            onChange={handleUpdateSettings}
          />
        </div>
        <div className="sf-metadata-setting-divide-line"></div>
        <div className="setting-item">
          <span className="setting-item-label">{gettext('Title property')}</span>
          <Selector
            settingKey={KANBAN_SETTINGS_KEYS.TITLE_COLUMN_KEY}
            value={settings[KANBAN_SETTINGS_KEYS.TITLE_COLUMN_KEY]}
            options={titleColumnOptions}
            onChange={handleUpdateSettings}
          />
        </div>
        <div className="sf-metadata-setting-divide-line"></div>
        <div className="setting-item">
          <Switch
            placeholder={gettext('Don\'t show empty values')}
            checked={settings[KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUE] || false}
            onChange={() => handleUpdateSettings(KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUE, !settings[KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUE])}
          />
        </div>
        <div className="sf-metadata-setting-divide-line"></div>
        <div className="setting-item">
          <Switch
            placeholder={gettext('Show property names')}
            checked={settings[KANBAN_SETTINGS_KEYS.SHOW_COLUMN_NAME] || false}
            onChange={() => handleUpdateSettings(KANBAN_SETTINGS_KEYS.SHOW_COLUMN_NAME, !settings[KANBAN_SETTINGS_KEYS.SHOW_COLUMN_NAME])}
          />
        </div>
        <div className="sf-metadata-setting-divide-line"></div>
        <div className="setting-item">
          <Switch
            placeholder={gettext('Text wraps')}
            checked={settings[KANBAN_SETTINGS_KEYS.TEXT_WRAP] || false}
            onChange={() => handleUpdateSettings(KANBAN_SETTINGS_KEYS.TEXT_WRAP, !settings[KANBAN_SETTINGS_KEYS.TEXT_WRAP])}
          />
        </div>
        <div className="sf-metadata-setting-divide-line"></div>
        <FieldDisplaySettings
          fieldIconConfig={COLUMNS_ICON_CONFIG}
          fields={displayColumns}
          textProperties={{
            titleValue: gettext('Properties to display on the card'),
            bannerValue: gettext('Properties'),
            hideValue: gettext('Hide all'),
            showValue: gettext('Show all'),
          }}
          onToggleField={onToggleField}
          onMoveField={onMoveField}
          onToggleFieldsVisibility={onToggleFieldsVisibility}
        />
      </div>
    </div>
  );
};

Settings.propTypes = {
  columns: PropTypes.array.isRequired,
  columnsMap: PropTypes.object.isRequired,
  settings: PropTypes.object.isRequired,
  modifySettings: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default Settings;
