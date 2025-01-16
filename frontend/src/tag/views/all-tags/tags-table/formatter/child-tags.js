import React, { useMemo } from 'react';
import { NumberFormatter } from '@seafile/sf-metadata-ui-component';

const ChildTagsFormatter = ({ record, column }) => {

  const childTagsLinksCount = useMemo(() => {
    const subTagLinks = record[column.key];
    return Array.isArray(subTagLinks) ? subTagLinks.length : 0;
  }, [record, column]);

  return (
    <div className="sf-table-child-tags-formatter sf-table-cell-formatter sf-metadata-ui cell-formatter-container">
      <NumberFormatter value={childTagsLinksCount} />
    </div>
  );
};

export default ChildTagsFormatter;
