import React, { forwardRef } from 'react';
import CollaboratorEditor from '@/metadata/components/cell-editors/collaborator-editor';
import { PRIVATE_COLUMN_KEY } from '@/metadata/constants';
import { checkIsDir } from '@/metadata/utils/row';

const CollaboratorEditorWrapper = forwardRef((props, ref) => {
  const { record, column } = props;

  if ((column.key === PRIVATE_COLUMN_KEY.FILE_COLLABORATORS || column.key === PRIVATE_COLUMN_KEY.FILE_REVIEWER) && checkIsDir(record)) return null;

  return (
    <CollaboratorEditor ref={ref} column={column} {...props} />
  );
});

export default CollaboratorEditorWrapper;
