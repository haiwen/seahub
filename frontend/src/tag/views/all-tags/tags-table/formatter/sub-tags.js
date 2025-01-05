import React, { useMemo } from 'react';
import { NumberFormatter } from '@seafile/sf-metadata-ui-component';

const SubTagsFormatter = ({ record, column }) => {

  const subTagLinksCount = useMemo(() => {
    const subTagLinks = record[column.key];
    return Array.isArray(subTagLinks) ? subTagLinks.length : 0;
  }, [record, column]);

  return (
    <div className="sf-table-sub-tags-formatter sf-table-cell-formatter sf-metadata-ui cell-formatter-container">
      <NumberFormatter value={subTagLinksCount} />
    </div>
  );
};

export default SubTagsFormatter;
