import { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Label } from 'reactstrap';
import { gettext } from '../../../../utils/constants';
import { KANBAN_SETTINGS_KEYS } from '../../../constants';
import HiddenColumnItem from './hidden-column-item';

const HiddenColumns = ({ columns, settings, onChange }) => {
  const [currentIndex, setCurrentIndex] = useState(-1);

  const shownColumnKeys = useMemo(() => settings[KANBAN_SETTINGS_KEYS.SHOWN_COLUMN_KEYS] || [], [settings]);

  const isEmpty = useMemo(() => {
    if (!Array.isArray(columns) || columns.length === 0) return true;
    return false;
  }, [columns]);

  const handleChange = useCallback((columnKey) => {
    const newShownColumns = shownColumnKeys.slice(0);
    const columnIndex = newShownColumns.indexOf(columnKey);
    if (columnIndex > -1) {
      newShownColumns.splice(columnIndex, 1);
    } else {
      newShownColumns.push(columnKey);
    }
    onChange(newShownColumns);
  }, [shownColumnKeys, onChange]);

  const hideAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const showAll = useCallback(() => {
    onChange(columns.map(column => column.key));
  }, [columns, onChange]);

  const onToggleFieldsVisibility = useCallback(() => {
    if (shownColumnKeys.length < columns.length) {
      showAll();
    } else {
      hideAll();
    }
  }, [columns, shownColumnKeys, hideAll, showAll]);

  const hasPropertiesHidden = useMemo(() => {
    return shownColumnKeys.length < columns.length;
  }, [shownColumnKeys, columns]);

  const handleUpdateCurrentIndex = useCallback((columnIndex) => {
    if (currentIndex === columnIndex) return;
    setCurrentIndex(columnIndex);
  }, [currentIndex]);

  const textProperties = {
    titleValue: gettext('Properties to display on the card'),
    bannerValue: gettext('Properties'),
    hideValue: gettext('Hide all'),
    showValue: gettext('Show all'),
  };

  return (
    <div className="sf-metadata-kanban-hide-columns">
      <div className="hide-columns-banner">
        <Label className="mb-0">{textProperties.bannerValue}</Label>
        <span className="show-all-button" onClick={onToggleFieldsVisibility}>
          {hasPropertiesHidden ? textProperties.showValue : textProperties.hideValue}
        </span>
      </div>
      <div className={classNames('hide-columns-list', { 'empty-hide-columns-container': isEmpty })}>
        {isEmpty && <div className="empty-hide-columns-list">{gettext('No properties available to be hidden')}</div>}
        {!isEmpty && columns.map((column, columnIndex) => {
          return (
            <HiddenColumnItem
              key={column.key}
              isHidden={!shownColumnKeys.includes(column.key)}
              column={column}
              columnIndex={columnIndex}
              currentIndex={currentIndex}
              onUpdateCurrentIndex={handleUpdateCurrentIndex}
              onChange={handleChange}
            />
          );
        })}
      </div>
    </div>
  );
};

HiddenColumns.propTypes = {
  columns: PropTypes.array.isRequired,
  settings: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default HiddenColumns;
