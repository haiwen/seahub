import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Input } from 'reactstrap';
import PropTypes from 'prop-types';
import Icon from '../../../../../components/icon';
import { gettext } from '../../../../../utils/constants';
import { COLUMNS } from './constants';

import './index.css';

const ColumnTypeDropdownMenu = ({ modifiers, onSelect }) => {
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
    e && e.stopPropagation();
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
        <Input
          onChange={onSearchColumn}
          placeholder={gettext('Search properties')}
          value={searchValue}
          onClick={onSearchClick}
          ref={inputRef}
          name="sf-metadata-column-type-search-input"
        />
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

ColumnTypeDropdownMenu.propTypes = {
  column: PropTypes.object,
  modifiers: PropTypes.array,
  onSelect: PropTypes.func,
};

export default ColumnTypeDropdownMenu;
