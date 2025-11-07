import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Input } from 'reactstrap';
import PropTypes from 'prop-types';
import Icon from '../../../../../components/icon';
import { gettext } from '../../../../../utils/constants';
import { CellType, COLUMNS_ICON_CONFIG, DEFAULT_DATE_FORMAT, DEFAULT_RATE_DATA, DEFAULT_SHOOTING_TIME_FORMAT, PRIVATE_COLUMN_KEY } from '../../../../constants';
import { getColumnDisplayName } from '../../../../utils/column';
import { DEFAULT_FILE_STATUS_OPTIONS } from '../../../../constants/column/format';

import './index.css';

const COLUMNS = [
  {
    icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR],
    type: CellType.COLLABORATOR,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_COLLABORATORS),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_COLLABORATORS,
    canChangeName: false,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR],
    type: CellType.COLLABORATOR,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_REVIEWER),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_REVIEWER,
    canChangeName: false,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR],
    type: CellType.COLLABORATOR,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.OWNER),
    unique: true,
    key: PRIVATE_COLUMN_KEY.OWNER,
    canChangeName: false,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.DATE],
    type: CellType.DATE,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME,
    canChangeName: false,
    data: { format: DEFAULT_DATE_FORMAT },
    groupby: 'predefined',
    canSetData: true,
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.SINGLE_SELECT],
    type: CellType.SINGLE_SELECT,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_STATUS),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_STATUS,
    canChangeName: false,
    data: { options: DEFAULT_FILE_STATUS_OPTIONS },
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.DATE],
    type: CellType.DATE,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.CAPTURE_TIME),
    unique: true,
    key: PRIVATE_COLUMN_KEY.CAPTURE_TIME,
    canChangeName: false,
    data: { format: DEFAULT_SHOOTING_TIME_FORMAT },
    groupby: 'predefined',
    canSetData: true,
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.RATE],
    type: CellType.RATE,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_RATE),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_RATE,
    canChangeName: false,
    data: DEFAULT_RATE_DATA,
    groupby: 'predefined',
    canSetData: true,
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.TEXT],
    type: CellType.TEXT,
    name: gettext('Text'),
    canChangeName: true,
    key: CellType.TEXT,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.LONG_TEXT],
    type: CellType.LONG_TEXT,
    name: gettext('Long text'),
    canChangeName: true,
    key: CellType.LONG_TEXT,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.NUMBER],
    type: CellType.NUMBER,
    name: gettext('Number'),
    canChangeName: true,
    key: CellType.NUMBER,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.COLLABORATOR],
    type: CellType.COLLABORATOR,
    name: gettext('Collaborator'),
    canChangeName: true,
    key: CellType.COLLABORATOR,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.CHECKBOX],
    type: CellType.CHECKBOX,
    name: gettext('Checkbox'),
    canChangeName: true,
    key: CellType.CHECKBOX,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.DATE],
    type: CellType.DATE,
    name: gettext('Date'),
    canChangeName: true,
    key: CellType.DATE,
    data: { format: DEFAULT_DATE_FORMAT },
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.SINGLE_SELECT],
    type: CellType.SINGLE_SELECT,
    name: gettext('Single select'),
    canChangeName: true,
    key: CellType.SINGLE_SELECT,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.MULTIPLE_SELECT],
    type: CellType.MULTIPLE_SELECT,
    name: gettext('Multiple select'),
    canChangeName: true,
    key: CellType.MULTIPLE_SELECT,
    groupby: 'basics'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.RATE],
    type: CellType.RATE,
    name: gettext('Rate'),
    canChangeName: true,
    key: CellType.RATE,
    data: DEFAULT_RATE_DATA,
    groupby: 'basics',
  },
];

const CustomDropdownMenu = ({ modifiers, onSelect }) => {
  const [searchValue, setSearchValue] = useState('');
  const [isCustomPropertiesOpen, setCustomPropertiesOpen] = useState(false);
  const inputRef = useRef(null);

  const displayColumns = useMemo(() => {
    const validValue = searchValue.trim().toLocaleLowerCase();
    return COLUMNS.filter(item => {
      const columnName = item.name.toLocaleLowerCase();
      return columnName.indexOf(validValue) > -1;
    });
  }, [searchValue]);

  const basicsColumns = useMemo(() => {
    return displayColumns.filter(item => item.groupby === 'basics');
  }, [displayColumns]);

  const predefinedColumns = useMemo(() => {
    return displayColumns.filter(item => item.groupby === 'predefined');
  }, [displayColumns]);

  const toggleCustomProperties = useCallback((e) => {
    e?.stopPropagation();
    setCustomPropertiesOpen(prev => !prev);
    setSearchValue('');
  }, []);

  const onSearchColumn = useCallback((event) => {
    const value = event.target.value;
    if (value === searchValue) return;
    setSearchValue(value);
  }, [searchValue]);

  const onSearchClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const handleSelect = useCallback((column) => {
    onSelect(column);
    setSearchValue('');
  }, [onSelect]);

  return (
    <DropdownMenu className="sf-metadata-column-type-dropdown-menu" modifiers={modifiers} style={{ zIndex: 1061 }}>
      <div className="search-column-container">
        <Input onChange={onSearchColumn} placeholder={gettext('Search properties')} value={searchValue} onClick={onSearchClick} ref={inputRef} />
      </div>
      {displayColumns.length > 0 && predefinedColumns.length > 0 && (
        <>
          {predefinedColumns.map(item => (
            <DropdownItem
              key={item.key}
              className="column-type-item text-truncate"
              onMouseEnter={() => setCustomPropertiesOpen(false)}
              onClick={() => handleSelect(item)}
            >
              <Icon symbol={item.icon} className="sf-metadata-icon" />
              <span>{item.name}</span>
            </DropdownItem>
          ))}
          {basicsColumns.length > 0 && (
            <>
              <DropdownItem className="w-100" divider />
              <Dropdown
                className="w-100"
                direction="end"
                isOpen={isCustomPropertiesOpen}
                toggle={toggleCustomProperties}
                onMouseEnter={() => setCustomPropertiesOpen(true)}
                onMouseMove={(e) => {e.stopPropagation();}}
              >
                <DropdownToggle
                  tag='span'
                  className="column-type-item dropdown-item text-truncate d-flex align-items-center"
                >
                  <Icon symbol="edit" className="sf-metadata-icon" />
                  <span className="mr-auto">{gettext('Custom properties')}</span>
                  <Icon symbol="down" className="rotate-270" />
                </DropdownToggle>
                <DropdownMenu>
                  {basicsColumns.map((item, index) => (
                    <DropdownItem
                      key={index}
                      className="column-type-item text-truncate"
                      onClick={() => handleSelect(item)}
                    >
                      <Icon symbol={item.icon} className="sf-metadata-icon" />
                      <span>{item.name}</span>
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            </>
          )}
        </>
      )}
    </DropdownMenu>
  );
};

CustomDropdownMenu.propTypes = {
  column: PropTypes.object,
  modifiers: PropTypes.array,
  onSelect: PropTypes.func,
};

export default CustomDropdownMenu;
