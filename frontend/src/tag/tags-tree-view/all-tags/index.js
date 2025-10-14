import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { PRIVATE_FILE_TYPE } from '../../../constants';
import { ALL_TAGS_ID } from '../../constants';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import Icon from '../../../components/icon';

import './index.css';

const AllTags = ({ currentPath, selectAllTags }) => {
  const path = useMemo(() => '/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/' + ALL_TAGS_ID, []);
  const isSelected = useMemo(() => currentPath === path, [currentPath, path]);

  const handleClick = useCallback(() => {
    selectAllTags(isSelected);

  }, [isSelected, selectAllTags]);

  return (
    <div
      className={classnames('tree-node-inner text-nowrap all-tags-tree-node-inner', { 'tree-node-hight-light': isSelected })}
      onClick={handleClick}
      tabIndex="0"
      onKeyDown={Utils.onKeyDown}
    >
      <div className="tree-node-text">{gettext('All tags')}</div>
      <div className="left-icon">
        <div className="tree-node-icon">
          <Icon symbol="tag" className="metadata-views-icon" />
        </div>
      </div>
    </div>
  );
};

AllTags.propTypes = {
  currentPath: PropTypes.string.isRequired,
};

export default AllTags;
