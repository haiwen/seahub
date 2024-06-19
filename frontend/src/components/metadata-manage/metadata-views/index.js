import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import { siteRoot } from '../../../utils/constants';
import Icon from '../../icon';

import './index.css';

const MetadataViews = ({ repoID }) => {
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

  const openView = useCallback(() => {
    const server = siteRoot.substring(0, siteRoot.length-1);
    window.open(server + '/repos/' + repoID + '/metadata/table-view/', '_blank');
  }, [repoID]);

  return (
    <div className="tree-view tree metadata-tree-view">
      <div className="tree-node">
        <div className="children" style={{ paddingLeft: 20 }}>
          <div
            className={`tree-node-inner text-nowrap${highlight ? ' tree-node-inner-hover' : ''}`}
            title={gettext('File extended properties')}
            onMouseEnter={onMouseEnter}
            onMouseOver={onMouseOver}
            onMouseLeave={onMouseLeave}
            onClick={openView}
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

MetadataViews.propTypes = {
  repoID: PropTypes.string.isRequired,
};

export default MetadataViews;
