import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getTagColor, getTagName, getTagFilesCount } from '../../utils';

import './index.css';

const Tag = ({ isSelected, tag, onClick }) => {
  const tagName = useMemo(() => getTagName(tag), [tag]);
  const tagColor = useMemo(() => getTagColor(tag), [tag]);
  const tagCount = useMemo(() => getTagFilesCount(tag), [tag]);
  const [highlight, setHighlight] = useState(false);

  const onMouseEnter = useCallback(() => {
    setHighlight(true);
  }, []);

  const onMouseOver = useCallback(() => {
    setHighlight(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHighlight(false);
  }, []);

  return (
    <div
      className={classnames('tree-node-inner text-nowrap tag-tree-node', { 'tree-node-inner-hover': highlight, 'tree-node-hight-light': isSelected })}
      title={`${tagName} (${tagCount})`}
      onMouseEnter={onMouseEnter}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
      onClick={() => onClick(tag)}
    >
      <div className="tree-node-text tag-tree-node-text">
        <div className="tag-tree-node-name">{tagName}</div>
        <div className="tag-tree-node-count">{tagCount}</div>
      </div>
      <div className="left-icon">
        <div className="tree-node-icon">
          <div className="tag-tree-node-color" style={{ backgroundColor: tagColor }}></div>
        </div>
      </div>
    </div>
  );
};

Tag.propTypes = {
  isSelected: PropTypes.bool,
  tag: PropTypes.object,
  onClick: PropTypes.func,
};

export default Tag;
