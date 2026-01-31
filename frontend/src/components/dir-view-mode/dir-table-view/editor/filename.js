import React, { useCallback } from 'react';
import FileNameEditor from '@/metadata/components/cell-editors/file-name-editor';

const FileName = ({ repoID, repoInfo, table, record, column, mode, onDirentChange, onCommitCancel }) => {
  const onFileName = useCallback((newFileName) => {
    onDirentChange(record, newFileName);
  }, [onDirentChange, record]);

  return (
    <FileNameEditor
      repoID={repoID}
      repoInfo={repoInfo}
      table={table}
      record={record}
      column={column}
      mode={mode}
      onCommit={onFileName}
      onCommitCancel={onCommitCancel}
    />
  );
};

export default FileName;
