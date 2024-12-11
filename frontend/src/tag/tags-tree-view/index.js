import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTags } from '../hooks';
import Tag from './tag';
import { getTagId } from '../utils';
import { PRIVATE_FILE_TYPE } from '../../constants';
import AllTags from './all-tags';

import './index.css';

const TagsTreeView = ({ currentPath }) => {
  const { tagsData, selectTag } = useTags();

  const tags = useMemo(() => {
    if (!tagsData) return [];
    return tagsData.rows;
  }, [tagsData]);

  return (
    <div className="tree-view tree metadata-tree-view metadata-tree-view-tag">
      <div className="tree-node">
        <div className="children">
          {tags.slice(0, 20).map(tag => {
            const id = getTagId(tag);
            const tagPath = '/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/' + id;
            const isSelected = currentPath === tagPath;
            return (
              <Tag
                key={id}
                tag={tag}
                isSelected={isSelected}
                onClick={(tag) => selectTag(tag, isSelected)}
              />
            );
          })}
          <AllTags currentPath={currentPath} />
        </div>
      </div>
    </div>
  );
};

TagsTreeView.propTypes = {
  currentPath: PropTypes.string,
};

export default TagsTreeView;
