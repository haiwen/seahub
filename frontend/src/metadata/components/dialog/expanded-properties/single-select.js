import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { PRIVATE_COLUMN_KEY } from '../../../constants';
import { getCellValueByColumn, getColumnOptionNameById } from '../../../utils/cell';
import SingleSelectEditor from '../../cell-editors/single-select-editor';
import SelectOption from '../../cell-formatter/select-option';
import ClickOutside from '../../../../components/click-outside';

const SingleSelect = ({ record, column, columns, onCommit, modifyColumnData }) => {
  const [isEditorShow, setIsEditorShow] = useState(false);
  const editorRef = useRef(null);
  const columnRef = useRef(column);
  const value = useMemo(() => getCellValueByColumn(record, column), [record, column]);
  const columnKey = useMemo(() => column.key, [column]);
  const options = useMemo(() => column.data?.options || [], [column]);
  const option = useMemo(() => options.find(item => item.id === value || item.name === value), [value, options]);

  const onChange = useCallback((optionId) => {
    const currentColumn = columnRef.current;
    const newValue = getColumnOptionNameById(currentColumn, optionId);
    onCommit(currentColumn, newValue);
    setIsEditorShow(false);
  }, [onCommit]);

  const onEdit = useCallback(() => {
    setIsEditorShow(true);
  }, []);

  const onClickOutside = useCallback(() => {
    setIsEditorShow(false);
  }, []);

  useEffect(() => {
    columnRef.current = column;
  }, [column]);

  if (columnKey === PRIVATE_COLUMN_KEY.FILE_TYPE) {
    return (
      <div className="form-control disabled shrink select-option-container">
        <span
          className="text-truncate expanded-properties-single-option"
          title={option?.name}
          style={{ color: option?.textColor || null, backgroundColor: option?.color }}
        >
          {option?.name}
        </span>
      </div>
    );
  }

  return (
    <ClickOutside onClickOutside={onClickOutside}>
      <div className="form-control position-relative select-option-container" onClick={onEdit}>
        {option ? <SelectOption option={option} /> : null}
        <i className="sf3-font sf3-font-down dropdown-indicator" aria-hidden="true"></i>
        {isEditorShow && (
          <SingleSelectEditor
            ref={editorRef}
            record={record}
            column={column}
            columns={columns}
            value={value}
            onCommit={onChange}
            modifyColumnData={modifyColumnData}
          />
        )}
      </div>
    </ClickOutside>
  );
};

SingleSelect.propTypes = {
  record: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
  columns: PropTypes.array.isRequired,
  onCommit: PropTypes.func.isRequired,
  modifyColumnData: PropTypes.func.isRequired,
};

export default SingleSelect;
