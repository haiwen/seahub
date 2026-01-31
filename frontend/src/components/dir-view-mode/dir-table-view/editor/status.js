import { useCallback } from 'react';
import SingleSelectEditor from '@/metadata/components/cell-editors/single-select-editor';
import { getFileNameFromRecord } from '@/metadata/utils/cell';

/**
 * StatusEditor - Editor component for dirent status field
 *
 * Props flow:
 * - record: Comes from editor clone in sftable's editor container
 * - onDirentStatus: Callback from editor factory, invoked when status is committed
 */
const StatusEditor = ({ record, onDirentStatus, onClose, ...editorProps }) => {
  const handleDirentStatus = useCallback((optionID) => {
    const direntName = getFileNameFromRecord(record);
    onDirentStatus(direntName, optionID);
    onClose();
  }, [record, onDirentStatus, onClose]);

  return (
    <SingleSelectEditor {...editorProps} onCommit={handleDirentStatus} />
  );
};

export default StatusEditor;
