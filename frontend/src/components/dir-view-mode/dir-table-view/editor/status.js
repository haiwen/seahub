import { useCallback } from 'react';
import SingleSelectEditor from '@/metadata/components/cell-editors/single-select-editor';
import { getFileNameFromRecord } from '@/metadata/utils/cell';
import { checkIsDir } from '@/metadata/utils/row';

/**
 * StatusEditor - Editor component for dirent status field
 *
 * Props flow:
 * - record: Comes from editor clone in sftable's editor container
 * - onDirentStatus: Callback from editor factory, invoked when status is committed
 */
const StatusEditor = ({ record, onDirentStatus, ...editorProps }) => {
  const handleDirentStatus = useCallback((optionID) => {
    const direntName = getFileNameFromRecord(record);
    onDirentStatus(direntName, optionID);
    editorProps.onClose();
  }, [record, onDirentStatus, editorProps]);

  if (checkIsDir(record)) return;
  return (
    <SingleSelectEditor {...editorProps} onCommit={handleDirentStatus} />
  );
};

export default StatusEditor;
