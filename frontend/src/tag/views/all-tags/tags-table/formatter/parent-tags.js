import React, { useMemo } from 'react';
import FileTagsFormatter from '../../../../../metadata/components/cell-formatter/file-tags';
import { useTags } from '../../../../hooks';

const ParentTagsFormatter = ({ record, column }) => {
  const { tagsData } = useTags();

  const parentTagLinks = useMemo(() => {
    return record[column.key];
  }, [record, column]);

  return (
    <div className="sf-table-parent-tags-formatter sf-table-cell-formatter sf-metadata-ui cell-formatter-container">
      <FileTagsFormatter tagsData={tagsData} value={parentTagLinks} showName={true} />
    </div>
  );
};

export default ParentTagsFormatter;
