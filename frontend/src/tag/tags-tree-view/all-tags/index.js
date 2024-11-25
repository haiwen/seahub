import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { PRIVATE_FILE_TYPE } from '../../../constants';
import { PRIVATE_COLUMN_KEY, ALL_TAGS_ID } from '../../constants';
import { useTags } from '../../hooks';
import { gettext } from '../../../utils/constants';

import './index.css';

const AllTags = ({ currentPath }) => {
  const { selectTag } = useTags();

  const path = useMemo(() => '/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/' + ALL_TAGS_ID, []);
  const isSelected = useMemo(() => currentPath === path, [currentPath, path]);

  const handelClick = useCallback(() => {
    selectTag({
      [PRIVATE_COLUMN_KEY.ID]: ALL_TAGS_ID,
    }, isSelected);
  }, [isSelected, selectTag]);

  return (
    <div
      className={classnames('tree-node-inner text-nowrap all-tags-tree-node-inner', { 'tree-node-hight-light': isSelected })}
      onClick={handelClick}
    >
      <div className="tree-node-text">{gettext('All tags')}</div>
      <div className="left-icon">
        <div className="tree-node-icon">
          <i className="sf3-font sf3-font-tag"></i>
        </div>
      </div>
    </div>
  );
};

AllTags.propTypes = {
  currentPath: PropTypes.string.isRequired,
};

export default AllTags;
