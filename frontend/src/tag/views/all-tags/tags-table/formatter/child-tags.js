import React, { useMemo } from 'react';
import NumberFormatter from '../../../../../metadata/components/cell-formatter/number';
import { useTags } from '../../../../hooks';
import { getRowsByIds } from '../../../../../components/sf-table/utils/table';

const ChildTagsFormatter = ({ record, column }) => {
  const { tagsData } = useTags();

  const childTagsLinksCount = useMemo(() => {
    const childTagLinks = record[column.key];
    if (!Array.isArray(childTagLinks) || childTagLinks.length === 0) {
      return 0;
    }
    const childTagsIds = childTagLinks.map((link) => link.row_id);
    const subTags = getRowsByIds(tagsData, childTagsIds);
    return subTags.length;
  }, [record, column, tagsData]);

  return (
    <div className="sf-table-child-tags-formatter sf-table-cell-formatter sf-metadata-ui cell-formatter-container">
      <NumberFormatter value={childTagsLinksCount} />
    </div>
  );
};

export default ChildTagsFormatter;
