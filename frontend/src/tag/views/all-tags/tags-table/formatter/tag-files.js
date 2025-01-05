import React, { useMemo } from 'react';
import { NumberFormatter } from '@seafile/sf-metadata-ui-component';

const TagFilesFormatter = ({ record, column }) => {

  const tagFileLinksCount = useMemo(() => {
    const tagFileLinks = record[column.key];
    return Array.isArray(tagFileLinks) ? tagFileLinks.length : 0;
  }, [record, column]);

  return (
    <div className="sf-table-tag-files-formatter sf-table-cell-formatter sf-metadata-ui cell-formatter-container">
      <NumberFormatter value={tagFileLinksCount} />
    </div>
  );
};

export default TagFilesFormatter;
