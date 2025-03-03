import React, { useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Popover } from 'reactstrap';
import classnames from 'classnames';
import { gettext } from '../../../../utils/constants';
import { useMetadataView } from '../../../hooks/metadata-view';
import { CellType, DEFAULT_DATE_FORMAT, PRIVATE_COLUMN_KEY } from '../../../constants';
import ObjectUtils from '../../../../utils/object';
import { getDefaultFileStatusOptions } from '../../../utils/column';
import { ValidateColumnFormFields } from './utils';
import { COMMON_FORM_FIELD_TYPE } from './constants';
import Name from './name';
import Type from './type';
import Data from './data';

import './index.css';

const DEFAULT_POPOVER_INNER_WIDTH = 350;
const COLUMN_TYPE_POPOVER_INNER_WIDTH = {};

const ColumnPopover = ({ target, column, onSelect, onCancel, onSubmit }) => {
  const popoverInnerRef = useRef(null);
  const nameRef = useRef(null);
  const typeRef = useRef(null);
  const dataRef = useRef(null);
  const { metadata } = useMetadataView();

  const popoverInnerWidth = useMemo(() => {
    return COLUMN_TYPE_POPOVER_INNER_WIDTH[column.type] || DEFAULT_POPOVER_INNER_WIDTH;
  }, [column]);

  const onColumnChange = useCallback((newColumn) => {
    setTimeout(() => {
      typeRef.current.setPopoverState(false);
    }, 100);
    if (ObjectUtils.isSameObject(column, newColumn)) return;
    onSelect(newColumn);
    if (newColumn.type === column.type) return;
    dataRef.current.setValue({});
  }, [typeRef, column, onSelect]);

  const handleSubmit = useCallback(() => {
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
    onSubmit(column.unique ? column.key : columnName, column.type, { key: column.unique ? column.key : '', data });
  }, [nameRef, column, metadata, onSubmit]);

  return (
    <Popover
      target={target}
      isOpen={true}
      placement="bottom-end"
      hideArrow={true}
      fade={false}
      className="sf-metadata-column-popover"
    >
      <div className="sf-metadata-column-popover-inner" ref={popoverInnerRef} style={{ width: popoverInnerWidth }}>
        <div>
          <Name ref={nameRef} readOnly={column?.unique} value={column?.unique ? column.name : ''} />
          <Type ref={typeRef} column={column} onChange={onColumnChange} />
          <Data ref={dataRef} column={column} />
        </div>
        <div className={classnames('sf-metadata-column-popover-footer', { 'sf-metadata-number-column-popover-footer': column.type === CellType.NUMBER })}>
          <Button color="secondary" className="mr-4" onClick={onCancel}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={handleSubmit}>{gettext('Submit')}</Button>
        </div>
      </div>
    </Popover>
  );
};

ColumnPopover.propTypes = {
  target: PropTypes.string.isRequired,
  column: PropTypes.object.isRequired,
  onSelect: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default ColumnPopover;
