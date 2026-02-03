import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown, DropdownToggle } from 'reactstrap';
import PropTypes from 'prop-types';
import ColumnPopover from '@/metadata/components/popover/column-popover';
import Icon from '@/components/icon';
import { gettext } from '@/utils/constants';
import { getEventClassName } from '@/utils/dom';
import ColumnTypeDropdownMenu from '@/metadata/components/popover/column-popover/column-type-dropdown-menu';
import { useMetadataView } from '@/metadata/hooks/metadata-view';
import { ValidateColumnFormFields } from '@/metadata/components/popover/column-popover/utils';
import { COMMON_FORM_FIELD_TYPE } from '@/metadata/components/popover/column-popover/constants';
import toaster from '@/components/toast';
import { getColumnDisplayName } from '@/metadata/utils/column';

import './index.css';

const InsertColumn = ({ lastColumn, height, groupOffsetLeft, insertColumn: insertColumnAPI }) => {
  const [isColumnMenuOpen, setColumnMenuOpen] = useState(false);
  const [isColumnPopoverShow, setColumnPopoverShow] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);

  const { metadata } = useMetadataView();

  const id = useMemo(() => 'sf-metadata-add-column', []);

  const style = useMemo(() => {
    return {
      height: height,
      width: 44,
      minWidth: 44,
      maxWidth: 44,
      left: lastColumn.left + lastColumn.width + groupOffsetLeft,
      position: 'absolute',
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastColumn, lastColumn.left, height, groupOffsetLeft]);

  const toggleAddColumn = useCallback(() => {
    setColumnMenuOpen(!isColumnMenuOpen);
  }, [isColumnMenuOpen]);

  const handleCancel = useCallback(() => {
    setColumnMenuOpen(false);
    setColumnPopoverShow(false);
    setSelectedColumn(null);
  }, []);

  const handleSubmit = useCallback((name, type, { key, data }) => {
    insertColumnAPI(name, type, { key, data });
    setColumnPopoverShow(false);
  }, [insertColumnAPI]);

  const handleSelect = useCallback((column) => {
    setColumnMenuOpen(false);
    setSelectedColumn(column);
    if (column.groupby === 'predefined' && !column.canSetData) {
      const columnName = getColumnDisplayName(column.key, column.name);
      const columnNameError = ValidateColumnFormFields[COMMON_FORM_FIELD_TYPE.COLUMN_NAME]({ columnName, metadata, gettext });
      if (columnNameError) {
        toaster.danger(columnNameError.tips);
        return;
      }
      handleSubmit(column.key, column.type, { key: column.key, data: column.data || {} });
      return;
    }
    setColumnPopoverShow(true);
  }, [handleSubmit, metadata]);

  const handleClickOutside = useCallback((event) => {
    if (!isColumnPopoverShow) return;
    if (!event.target) return;
    const className = getEventClassName(event);
    if (className.indexOf('column-type-item') > -1) return;
    const popover = document.querySelector('.sf-metadata-column-popover');
    if (popover && popover.contains(event.target)) return;
    const dropdownMenu = document.querySelector('.sf-metadata-column-type-dropdown-menu');
    if (dropdownMenu && event.target.closest('.sf-metadata-column-type-dropdown-menu')) return;
    setColumnPopoverShow(false);
  }, [isColumnPopoverShow]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });

  return (
    <>
      <Dropdown
        id={id}
        className="sf-metadata-record-header-cell sf-metadata-column-type"
        isOpen={isColumnMenuOpen}
        direction="down"
        toggle={toggleAddColumn}
        style={style}
      >
        <DropdownToggle
          tag="span"
          tabIndex="0"
          className="sf-metadata-result-table-cell column insert-column"
          aria-label={gettext('Add column')}
          role="button"
        >
          <Icon symbol="add-table" />
        </DropdownToggle>
        <ColumnTypeDropdownMenu onSelect={handleSelect} />
      </Dropdown>
      {isColumnPopoverShow && !isColumnMenuOpen && (
        <ColumnPopover
          target={id}
          column={selectedColumn}
          onSelect={handleSelect}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
};

InsertColumn.propTypes = {
  lastColumn: PropTypes.object.isRequired,
  height: PropTypes.number,
  groupOffsetLeft: PropTypes.number,
  insertColumn: PropTypes.func.isRequired,
};

export default InsertColumn;
