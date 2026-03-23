import { forwardRef, useImperativeHandle, useRef } from 'react';
import DateEditor from '@/metadata/components/cell-editors/date-editor';
import { getCellValueByColumn, getFileNameFromRecord } from '@/metadata/utils/cell';
import { PRIVATE_COLUMN_KEY } from '@/metadata/constants';
import { Utils } from '@/utils/utils';

const DateEditorWrapper = forwardRef((props, ref) => {
  const editorRef = useRef(null);
  const { record, column, onClose, ...editorProps } = props;

  const value = getCellValueByColumn(record, column);

  useImperativeHandle(ref, () => ({
    getValue: () => {
      const { key } = column;
      return { [key]: editorRef?.current?.getValue() };
    }
  }));

  if (column.key === PRIVATE_COLUMN_KEY.CAPTURE_TIME && !Utils.imageCheck(getFileNameFromRecord(record))) return null;

  return (
    <DateEditor
      {...editorProps}
      ref={editorRef}
      value={value}
      format={column.data.format}
    />
  );
});

export default DateEditorWrapper;
