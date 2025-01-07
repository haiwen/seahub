import React, { useMemo } from 'react';
import { PRIVATE_COLUMN_KEY } from '../../../../constants';

const TagNameFormatter = ({ record }) => {

  const tagColor = useMemo(() => {
    return record[PRIVATE_COLUMN_KEY.TAG_COLOR];
  }, [record]);

  const tagName = useMemo(() => {
    return record[PRIVATE_COLUMN_KEY.TAG_NAME];
  }, [record]);

  return (
    <div className="sf-table-tag-name-formatter sf-table-cell-formatter sf-metadata-ui cell-formatter-container">
      <span className="sf-table-tag-color" style={{ backgroundColor: tagColor }}></span>
      <span className="sf-table-tag-name" title={tagName}>{tagName}</span>
    </div>
  );
};

export default TagNameFormatter;
