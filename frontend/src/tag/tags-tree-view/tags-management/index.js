import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { PRIVATE_FILE_TYPE } from '../../../constants';
import { PRIVATE_COLUMN_KEY, TAG_MANAGEMENT_ID } from '../../constants';
import { useTags } from '../../hooks';
import { gettext } from '../../../utils/constants';

import './index.css';

const TagsManagement = ({ currentPath }) => {
  const { selectTag } = useTags();

  const path = useMemo(() => '/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/' + TAG_MANAGEMENT_ID, []);
  const isSelected = useMemo(() => currentPath === path, [currentPath, path]);

  const selectTagManagement = useCallback(() => {
    selectTag({
      [PRIVATE_COLUMN_KEY.ID]: TAG_MANAGEMENT_ID,
    }, isSelected);
  }, [isSelected, selectTag]);

  return (
    <div
      className={classnames('tree-node-inner text-nowrap tag-management-tree-node-inner', { 'tree-node-hight-light': isSelected })}
      onClick={selectTagManagement}
    >
      <div className="tree-node-text">{gettext('Tags management')}</div>
      <div className="left-icon">
        <div className="tree-node-icon">
          <i className="sf3-font sf3-font-tag"></i>
        </div>
      </div>
    </div>
  );
};

TagsManagement.propTypes = {
  currentPath: PropTypes.string.isRequired,
};

export default TagsManagement;
