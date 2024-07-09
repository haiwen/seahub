import React from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import TreeSection from '../tree-section';

const DirOthers = ({ userPerm, repoID, currentPath }) => {

  let trashUrl = null;
  const historyUrl = siteRoot + 'repo/history/' + repoID + '/';
  if (userPerm === 'rw') {
    if (Utils.getFileName(currentPath)) {
      trashUrl = siteRoot + 'repo/' + repoID + '/trash/?path=' + encodeURIComponent(currentPath);
    } else {
      trashUrl = siteRoot + 'repo/' + repoID + '/trash/';
    }
  }

  return (
    <TreeSection title={gettext('Others')} className="dir-others">
      {trashUrl &&
        <div className='tree-node-inner text-nowrap' title={gettext('Trash')} onClick={() => location.href = trashUrl}>
          <div className="tree-node-text">{gettext('Trash')}</div>
          <div className="left-icon">
            <div className="tree-node-icon">
              <span className="sf3-font-recycle1 sf3-font"></span>
            </div>
          </div>
        </div>
      }
      <div className='tree-node-inner text-nowrap' title={gettext('History')} onClick={() => location.href = historyUrl}>
        <div className="tree-node-text">{gettext('History')}</div>
        <div className="left-icon">
          <div className="tree-node-icon">
            <span className="sf3-font-history sf3-font"></span>
          </div>
        </div>
      </div>
    </TreeSection>
  );
};

DirOthers.propTypes = {
  userPerm: PropTypes.string,
  repoID: PropTypes.string,
  currentPath: PropTypes.string,
};

export default DirOthers;
