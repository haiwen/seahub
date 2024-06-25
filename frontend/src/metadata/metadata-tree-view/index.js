import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext } from '../../utils/constants';
import Icon from '../../components/icon';
import { PRIVATE_FILE_TYPE } from '../../constants';

import './index.css';

const MetadataTreeView = ({ repoID, currentPath, onNodeClick }) => {
  const node = useMemo(() => {
    return {
      children: [],
      path: '/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES,
      isExpanded: false,
      isLoaded: true,
      isPreload: true,
      object: {
        file_tags: [],
        id: PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES,
        name: gettext('File extended properties'),
        type: PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES,
        isDir: () => false,
      },
      parentNode: {},
      key: repoID,
    };
  }, [repoID]);
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
    <div className="tree-view tree metadata-tree-view">
      <div className="tree-node">
        <div className="children" style={{ paddingLeft: 20 }}>
          <div
            className={classnames('tree-node-inner text-nowrap', { 'tree-node-inner-hover': highlight, 'tree-node-hight-light': currentPath === node.path })}
            title={gettext('File extended properties')}
            onMouseEnter={onMouseEnter}
            onMouseOver={onMouseOver}
            onMouseLeave={onMouseLeave}
            onClick={() => onNodeClick(node)}
          >
            <div className="tree-node-text">{gettext('File extended properties')}</div>
            <div className="left-icon">
              <div className="tree-node-icon">
                <Icon symbol="table" className="metadata-views-icon" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

MetadataTreeView.propTypes = {
  repoID: PropTypes.string.isRequired,
  currentPath: PropTypes.string,
  onNodeClick: PropTypes.func,
};

export default MetadataTreeView;
