import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, UncontrolledPopover } from 'reactstrap';
import classnames from 'classnames';
import { CellType, DEFAULT_DATE_FORMAT, PRIVATE_COLUMN_KEY } from '../../../_basic';
import { gettext } from '../../../utils';
import ObjectUtils from '../../../utils/object-utils';
import { ValidateColumnFormFields } from './utils';
import { COMMON_FORM_FIELD_TYPE } from './constants';
import { useMetadata } from '../../../hooks';
import Name from './name';
import Type from './type';
import Data from './data';
import { getDefaultFileStatusOptions } from '../../../utils/column-utils';

import './index.css';

const DEFAULT_POPOVER_INNER_WIDTH = 350;
const COLUMN_TYPE_POPOVER_INNER_WIDTH = {};

const ColumnPopover = ({ target, onChange }) => {
  const [column, setColumn] = useState({});
  const popoverRef = useRef(null);
  const popoverInnerRef = useRef(null);
  const nameRef = useRef(null);
  const typeRef = useRef(null);
  const dataRef = useRef(null);
  const { metadata } = useMetadata();

  const popoverInnerWidth = useMemo(() => {
    return COLUMN_TYPE_POPOVER_INNER_WIDTH[column.type] || DEFAULT_POPOVER_INNER_WIDTH;
  }, [column]);

  const toggle = useCallback((event) => {
    if (typeRef.current?.getIsPopoverShow()) return;
    if (dataRef.current?.getIsPopoverShow()) return;
    popoverRef.current.toggle();
  }, [typeRef, dataRef]);

  const onColumnChange = useCallback((newColumn) => {
    setTimeout(() => {
      typeRef.current.setPopoverState(false);
    }, 100);
    if (ObjectUtils.isSameObject(column, newColumn)) return;
    setColumn(newColumn);
    if (newColumn.type === column.type) return;
    dataRef.current.setValue({});
  }, [typeRef, column]);

  const onSubmit = useCallback(() => {
    nameRef.current.setError('');
    typeRef.current.setError('');
    let flag = 1;
    const columnName = nameRef.current.getName();
    const columnNameError = ValidateColumnFormFields[COMMON_FORM_FIELD_TYPE.COLUMN_NAME]({ columnName, metadata, gettext });
    if (columnNameError) {
      nameRef.current.setError(columnNameError.tips);
      flag = 0;
    }

    const columnTypeError = ValidateColumnFormFields[COMMON_FORM_FIELD_TYPE.COLUMN_TYPE]({ column, metadata, gettext });
    if (columnTypeError) {
      typeRef.current.setError(columnTypeError.tips);
      flag = 0;
    }

    if (flag == 0) return;
    let data = dataRef.current.getValue();
    if (Object.keys(data).length === 0) {
      data = null;
      if (!column.unique) {
        if (column.type === CellType.SINGLE_SELECT || column.type === CellType.MULTIPLE_SELECT) {
          data = { options: [] };
        } else if (column.type === CellType.DATE) {
          data = { format: DEFAULT_DATE_FORMAT };
        }
      } else {
        if (column.type === CellType.SINGLE_SELECT && column.key === PRIVATE_COLUMN_KEY.FILE_STATUS) {
          data = { options: getDefaultFileStatusOptions() };
        }
      }
    }
    onChange(column.unique ? column.key : columnName, column.type, { key: column.unique ? column.key : '', data });
    toggle();
  }, [nameRef, column, metadata, onChange, toggle]);

  return (
    <UncontrolledPopover
      target={target}
      trigger="legacy"
      placement="bottom-end"
      hideArrow={true}
      toggle={toggle}
      fade={false}
      ref={popoverRef}
      className="sf-metadata-column-popover"
    >
      <div className="sf-metadata-column-popover-inner" ref={popoverInnerRef} style={{ width: popoverInnerWidth }}>
        <div>
          <Name ref={nameRef} readOnly={column?.unique} value={column?.unique ? column.name : ''} />
          <Type ref={typeRef} column={column} onChange={onColumnChange} parentWidth={popoverInnerWidth} />
          <Data ref={dataRef} column={column} />
        </div>
        <div className={classnames('sf-metadata-column-popover-footer', { 'sf-metadata-number-column-popover-footer': column.type === CellType.NUMBER })}>
          <Button color="secondary" className="mr-4" onClick={toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={onSubmit}>{gettext('Submit')}</Button>
        </div>
      </div>
    </UncontrolledPopover>
  );
};

ColumnPopover.propTypes = {
  target: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ColumnPopover;
