import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ClickOutside from '../../../../components/click-outside';
import { getCellValueByColumn } from '../../metadata-details/utils';
import SelectOption from '../../cell-formatter/select-option';
import MultipleSelectEditor from '../../cell-editors/multiple-select-editor';
import { getColumnOptionNamesByIds } from '../../../utils/cell';

const MultipleSelect = ({ record, column, onCommit, modifyColumnData }) => {
  const [isEditorShow, setIsEditorShow] = useState(false);
  const ref = useRef(null);
  const editorRef = useRef(null);
  const columnRef = useRef(column);

  const value = useMemo(() => getCellValueByColumn(record, column) || [], [record, column]);
  const options = useMemo(() => column.data?.options || [], [column]);

  const onEdit = useCallback(() => {
    setIsEditorShow(true);
  }, []);

  const onChange = useCallback((optionIds) => {
    const currentColumn = columnRef.current;
    const newValue = getColumnOptionNamesByIds(currentColumn, optionIds);
    onCommit(currentColumn, newValue);
    setIsEditorShow(false);
  }, [onCommit]);

  const onClickOutside = useCallback(() => {
    setIsEditorShow(false);
  }, []);

  useEffect(() => {
    columnRef.current = column;
  }, [column]);

  return (
    <ClickOutside onClickOutside={onClickOutside}>
      <div ref={ref} className="form-control position-relative select-option-container" onClick={onEdit}>
        <div className="options-wrapper d-flex align-center gap-1">
          {value.map((optionId) => {
            const option = options.find(item => item.id === optionId || item.name === optionId);
            return option ? <SelectOption key={optionId} option={option} /> : null;
          })}
        </div>
        <i className="sf3-font sf3-font-down dropdown-indicator" aria-hidden="true"></i>
        {isEditorShow && (
          <MultipleSelectEditor
            ref={editorRef}
            record={record}
            column={column}
            value={value}
            saveImmediately={true}
            onCommit={onChange}
            modifyColumnData={modifyColumnData}
          />
        )}
      </div>
    </ClickOutside>
  );
};

export default MultipleSelect;
