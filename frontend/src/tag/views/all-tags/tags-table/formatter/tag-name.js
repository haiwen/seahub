import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import FileTagsFormatter from '../../../../../metadata/components/cell-formatter/file-tags';
import { useTags } from '../../../../hooks';
import { getRecordIdFromRecord } from '../../../../../metadata/utils/cell';
import { getTreeNodeKey } from '../../../../../components/sf-table/utils/tree';
import { isNumber } from '../../../../../utils/number';

const TagNameFormatter = ({ record, isCellSelected, setDisplayTag, treeNodeIndex }) => {
  const { tagsData } = useTags();

  const tree = useMemo(() => {
    return tagsData.rows_tree || [];
  }, [tagsData]);

  const currentNode = useMemo(() => {
    return isNumber(treeNodeIndex) ? tree[treeNodeIndex] : null;
  }, [tree, treeNodeIndex]);

  const tagId = useMemo(() => {
    return getRecordIdFromRecord(record);
  }, [record]);

  const tagValue = useMemo(() => {
    return tagId ? [{ row_id: tagId }] : [];
  }, [tagId]);

  const onClickName = useCallback(() => {
    if (!isCellSelected) return;
    const nodeKey = getTreeNodeKey(currentNode);
    setDisplayTag && setDisplayTag(tagId, nodeKey);
  }, [isCellSelected, tagId, currentNode, setDisplayTag]);

  return (
    <div className="sf-table-tag-name-formatter sf-table-cell-formatter sf-metadata-ui cell-formatter-container" onClick={onClickName}>
      <FileTagsFormatter tagsData={tagsData} value={tagValue} showName={true} />
    </div>
  );
};

TagNameFormatter.propTypes = {
  record: PropTypes.object,
  isCellSelected: PropTypes.bool,
  treeNodeIndex: PropTypes.number,
  setDisplayTag: PropTypes.func,
};

export default TagNameFormatter;
