import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { NumberFormatter } from '@seafile/sf-metadata-ui-component';
import { useTags } from '../../../../hooks';
import { getTagFilesLinks } from '../../../../utils/cell';
import { getAllChildTagsIdsFromNode } from '../../../../utils/tree';
import { getRowById } from '../../../../../metadata/utils/table';
import { getTreeNodeId } from '../../../../../components/sf-table/utils/tree';

const TagFilesFormatter = ({ treeNodeIndex }) => {
  const { tagsData } = useTags();

  const tree = useMemo(() => {
    return tagsData.rows_tree || [];
  }, [tagsData]);

  const currentNode = useMemo(() => {
    return tree[treeNodeIndex];
  }, [tree, treeNodeIndex]);

  const currentTag = useMemo(() => {
    const nodeId = getTreeNodeId(currentNode);
    return getRowById(tagsData, nodeId);
  }, [currentNode, tagsData]);

  const tagFileLinksCount = useMemo(() => {
    const filesLinks = getTagFilesLinks(currentTag);
    let allFilesLinks = [...filesLinks];
    const childTagsIds = getAllChildTagsIdsFromNode(currentNode);
    childTagsIds.forEach((childTagId) => {
      const childTag = getRowById(tagsData, childTagId);
      const childFilesLinks = getTagFilesLinks(childTag);
      if (childFilesLinks && childFilesLinks.length > 0) {
        allFilesLinks.push(...childFilesLinks);
      }
    });
    return allFilesLinks.length;
  }, [currentNode, currentTag, tagsData]);

  return (
    <div className="sf-table-tag-files-formatter sf-table-cell-formatter sf-metadata-ui cell-formatter-container">
      <NumberFormatter value={tagFileLinksCount} />
    </div>
  );
};

TagFilesFormatter.propTypes = {
  treeNodeIndex: PropTypes.number,
};

export default TagFilesFormatter;
