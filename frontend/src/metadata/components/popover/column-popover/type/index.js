import React, { forwardRef, useImperativeHandle, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { FormGroup, FormFeedback, Label, Dropdown, DropdownToggle, DropdownMenu, Input, DropdownItem } from 'reactstrap';
import Icon from '@/components/icon';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext } from '../../../../../utils/constants';
import { getColumnDisplayName } from '../../../../utils/column';
import { CellType, COLUMNS_ICON_CONFIG, DEFAULT_DATE_FORMAT, DEFAULT_SHOOTING_TIME_FORMAT, PRIVATE_COLUMN_KEY, DEFAULT_RATE_DATA } from '../../../../constants';

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
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.LONG_TEXT],
    type: CellType.LONG_TEXT,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_DESCRIPTION),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_DESCRIPTION,
    canChangeName: false,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.SINGLE_SELECT],
    type: CellType.SINGLE_SELECT,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_STATUS),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_STATUS,
    canChangeName: false,
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.DATE],
    type: CellType.DATE,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.CAPTURE_TIME),
    unique: true,
    key: PRIVATE_COLUMN_KEY.CAPTURE_TIME,
    canChangeName: false,
    data: { format: DEFAULT_SHOOTING_TIME_FORMAT },
    groupby: 'predefined'
  }, {
    icon: COLUMNS_ICON_CONFIG[CellType.RATE],
    type: CellType.RATE,
    name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_RATE),
    unique: true,
    key: PRIVATE_COLUMN_KEY.FILE_RATE,
    canChangeName: false,
    data: DEFAULT_RATE_DATA,
    groupby: 'predefined'
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

const Type = forwardRef(({ column, onChange }, ref) => {
  const [error, setError] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [isPredefinedPropertiesOpen, setPredefinedPropertiesOpen] = useState(false);
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

  const togglePredefinedProperties = useCallback((e) => {
    e?.stopPropagation();
    setPredefinedPropertiesOpen(prev => !prev);
  }, []);

  const toggleCustomProperties = useCallback((e) => {
    e?.stopPropagation();
    setCustomPropertiesOpen(prev => !prev);
    setSearchValue('');
  }, []);

  const onSelectPredefinedColumn = useCallback((column) => {
    onChange(column);
    setSearchValue('');
  }, [onChange]);

  const onSelectCustomColumn = useCallback((column) => {
    onChange(column);
    togglePredefinedProperties();
  }, [onChange, togglePredefinedProperties]);

  const onSearchColumn = useCallback((event) => {
    const value = event.target.value;
    if (value === searchValue) return;
    setSearchValue(value);
  }, [searchValue]);

  const onSearchClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  useImperativeHandle(ref, () => ({
    setError: (error) => setError(error),
    getIsPopoverShow: () => isPredefinedPropertiesOpen || isCustomPropertiesOpen,
    setPopoverState: (state) => {
      if (state) {
        inputRef.current.focus();
      } else {
        setPredefinedPropertiesOpen(false);
        setCustomPropertiesOpen(false);
      }
    },
  }), [isPredefinedPropertiesOpen, isCustomPropertiesOpen]);

  useEffect(() => {
    onChange(COLUMNS.find(c => c.groupby === 'basics') || COLUMNS[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <FormGroup className={classnames('sf-metadata-column-settings-item', { 'is-invalid': error })}>
        <Label>{gettext('Type')}</Label>
        <Dropdown
          isOpen={isPredefinedPropertiesOpen}
          direction="start"
          toggle={togglePredefinedProperties}
          className={classnames('sf-metadata-column-type', { 'sf-metadata-column-type-focus': isPredefinedPropertiesOpen })}
        >
          <DropdownToggle
            tag="span"
            className="sf-metadata-column-type-info"
          >
            <Icon iconName={column.icon} className="mr-2" />
            <span className="mr-auto">{column.name}</span>
            <i className="sf3-font sf3-font-down" aria-hidden="true"></i>
          </DropdownToggle>
          <DropdownMenu
            modifiers={[{
              name: 'offset',
              options: {
                offset: [0, 17],
              }
            }]}>
            <div className="search-column-container">
              <Input onChange={onSearchColumn} placeholder={gettext('Search properties')} value={searchValue} onClick={onSearchClick} ref={inputRef} />
            </div>
            {displayColumns.length > 0 && predefinedColumns.length > 0 && (
              <>
                {predefinedColumns.map(item => (
                  <DropdownItem
                    key={item.key}
                    className={classnames('column-type-item text-truncate', { 'active': item.key === column.key })}
                    onMouseEnter={() => setCustomPropertiesOpen(false)}
                    onClick={() => onSelectPredefinedColumn(item)}
                  >
                    <Icon iconName={item.icon} />
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
                        className="column-type-item dropdown-item text-truncate"
                      >
                        <Icon iconName="edit" />
                        <span className="mr-auto">{gettext('Custom properties')}</span>
                        <i className="sf3-font-down sf3-font rotate-270"></i>
                      </DropdownToggle>
                      <DropdownMenu>
                        {basicsColumns.map((item, index) => (
                          <DropdownItem
                            key={index}
                            className={classnames('column-type-item text-truncate', { 'active': item.key === column.key })}
                            onClick={() => onSelectCustomColumn(item)}
                          >
                            <Icon iconName={item.icon} />
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
        </Dropdown>
        {error && (<FormFeedback>{error}</FormFeedback>)}
      </FormGroup>
    </>
  );
});

Type.propTypes = {
  parentWidth: PropTypes.number,
  column: PropTypes.object,
  onChange: PropTypes.func,
};

export default Type;
