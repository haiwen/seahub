import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import classnames from 'classnames';
import Icon from '../../../../../../components/icon';
import ModalPortal from '../../../../../../components/modal-portal';
import { gettext } from '../../../../../../utils/constants';
import { getEventClassName } from '../../../../../../utils/dom';

import './index.css';

const SELECT_COLUMN_LIST_WIDTH = 450;

const ColumnTypes = ({
  column,
  columns,
  target,
  parentWidth,
  onChange,
  onToggle,
}) => {
  const inputRef = useRef(null);
  const popoverRef = useRef(null);
  const style = useMemo(() => {
    if (!target) return;
    const { top, left } = target.getBoundingClientRect();
    let value = {
      width: SELECT_COLUMN_LIST_WIDTH,
      left: left + parentWidth,
      top,
      maxHeight: `calc(100% - ${top}px - 5px)`,
    };
    const isBeyondBoundary = left + SELECT_COLUMN_LIST_WIDTH + parentWidth > document.body.offsetWidth;
    if (isBeyondBoundary) {
      if (left - SELECT_COLUMN_LIST_WIDTH <= 5) {
        value.left = 5;
      } else {
        value.left = left - SELECT_COLUMN_LIST_WIDTH;
      }
    }
    return value;
  }, [target, parentWidth]);
  const [searchValue, setSearchValue] = useState('');

  const displayColumns = useMemo(() => {
    const validValue = searchValue.trim().toLocaleLowerCase();
    return columns.filter(item => {
      const columnName = item.name.toLocaleLowerCase();
      return columnName.indexOf(validValue) > -1;
    });
  }, [searchValue, columns]);

  const onSearchColumn = useCallback((event) => {
    const value = event.target.value;
    if (value === searchValue) return;
    setSearchValue(value);
  }, [searchValue]);

  const onSearchClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const basicsColumns = useMemo(() => {
    return displayColumns.filter(item => item.groupby === 'basics');
  }, [displayColumns]);

  const predefinedColumns = useMemo(() => {
    return displayColumns.filter(item => item.groupby === 'predefined');
  }, [displayColumns]);

  const onSelectColumn = useCallback((event, column) => {
    event && event.stopPropagation();
    event && event.nativeEvent.stopImmediatePropagation();
    onChange(column);
  }, [onChange]);

  useEffect(() => {
    setTimeout(() => {
      inputRef?.current?.focus();
    }, 1);
  }, []);

  const closePopover = useCallback((event) => {
    if (!popoverRef.current) return;
    if (getEventClassName(event).indexOf('popover') === -1 && !popoverRef.current.contains(event.target)) {
      setTimeout(() => onToggle(), 100);
    }
  }, [popoverRef, onToggle]);

  useEffect(() => {
    document.addEventListener('click', closePopover);
    return () => {
      document.removeEventListener('click', closePopover);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ModalPortal>
      <div className="sf-metadata-column-types-popover" style={style} ref={popoverRef}>
        <div className="search-column-container">
          <Input onChange={onSearchColumn} placeholder={gettext('Search property types')} value={searchValue} onClick={onSearchClick} ref={inputRef} />
        </div>
        {displayColumns.length > 0 && (
          <div className="select-column-wrapper">
            <div className="select-column-list">
              {predefinedColumns.length > 0 && (
                <>
                  <div className="select-column-title">{gettext('Predefined properties')}</div>
                  {predefinedColumns.map(item => {
                    return (
                      <div
                        className={classnames('select-column-item text-truncate', { 'active': item.key === column.key })}
                        key={item.key}
                        onClick={(event) => onSelectColumn(event, item)}
                      >
                        <Icon symbol={item.icon} />
                        <span>{item.name}</span>
                      </div>
                    );
                  })}
                </>
              )}
              {basicsColumns.length > 0 && (
                <>
                  <div className="select-column-title">{gettext('Custom properties')}</div>
                  {basicsColumns.map(item => {
                    return (
                      <div
                        className={classnames('select-column-item text-truncate', { 'active': item.key === column.key })}
                        key={item.key}
                        onClick={(event) => onSelectColumn(event, item)}
                      >
                        <Icon symbol={item.icon} />
                        <span>{item.name}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  );
};

ColumnTypes.propTypes = {
  column: PropTypes.object,
  columns: PropTypes.array,
  target: PropTypes.object,
  parentWidth: PropTypes.number,
  onChange: PropTypes.func,
  onToggle: PropTypes.func,
};

export default ColumnTypes;
