import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import IconBtn from '../../../components/icon-btn';
import { HideColumnPopover } from '../popover';
import { gettext } from '../../../utils/constants';
import { isEnter, isSpace } from '../../../utils/hotkey';
import { TABLE_NOT_DISPLAY_COLUMN_KEYS } from '../../constants';
import { useMetadataStatus } from '../../../hooks';

const HideColumnSetter = ({ readOnly, columns, wrapperClass, target, hiddenColumns, modifyHiddenColumns, modifyColumnOrder }) => {
  const [isShowSetter, setShowSetter] = useState(false);

  const { globalHiddenColumns } = useMetadataStatus();

  const validColumns = useMemo(() => columns.filter(column => !TABLE_NOT_DISPLAY_COLUMN_KEYS.includes(column.key) && !globalHiddenColumns.includes(column.key)), [columns, globalHiddenColumns]);

  const validHiddenColumns = useMemo(() => {
    return hiddenColumns.filter(key => columns.find(column => column.key === key));
  }, [columns, hiddenColumns]);

  const message = useMemo(() => {
    const hiddenColumnsLength = validHiddenColumns.length;
    if (hiddenColumnsLength === 1) return gettext('1 hidden property');
    if (hiddenColumnsLength > 1) return gettext('{name_placeholder} hidden properties').replace('{name_placeholder}', hiddenColumnsLength);
    return gettext('Hide properties');
  }, [validHiddenColumns]);

  const onSetterToggle = useCallback(() => {
    setShowSetter(!isShowSetter);
  }, [isShowSetter]);

  const onKeyDown = useCallback((event) => {
    event.stopPropagation();
    if (isEnter(event) || isSpace(event)) onSetterToggle();
  }, [onSetterToggle]);

  const onChange = useCallback((hiddenColumns) => {
    modifyHiddenColumns(hiddenColumns);
  }, [modifyHiddenColumns]);

  const className = classnames(wrapperClass, { 'active': validHiddenColumns.length > 0 });
  return (
    <>
      <IconBtn
        symbol="hide"
        size={24}
        className={className}
        onClick={onSetterToggle}
        role="button"
        onKeyDown={onKeyDown}
        title={message}
        aria-label={message}
        tabIndex={0}
        id={target}
      />
      {isShowSetter && (
        <HideColumnPopover
          readOnly={readOnly}
          hiddenColumns={validHiddenColumns}
          target={target}
          placement="bottom-end"
          columns={validColumns}
          hidePopover={onSetterToggle}
          onChange={onChange}
          modifyColumnOrder={modifyColumnOrder}
        />
      )}
    </>
  );
};

HideColumnSetter.propTypes = {
  readOnly: PropTypes.bool,
  wrapperClass: PropTypes.string,
  target: PropTypes.string,
  hiddenColumns: PropTypes.array,
  columns: PropTypes.array,
  modifyHiddenColumns: PropTypes.func,
  modifyColumnOrder: PropTypes.func,
};

export default HideColumnSetter;
