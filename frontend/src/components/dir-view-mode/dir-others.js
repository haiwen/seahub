import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import TreeSection from '../tree-section';
import TrashDialog from '../dialog/trash-dialog';

const DirOthers = ({ userPerm, repoID, currentRepoInfo }) => {
  const [showTrashDialog, setShowTrashDialog] = useState(false);
  let trashUrl = null;
  const historyUrl = siteRoot + 'repo/history/' + repoID + '/';
  if (userPerm === 'rw') {
    trashUrl = siteRoot + 'repo/' + repoID + '/trash/';
  }
  const toggleTrashDialog = () => {
    setShowTrashDialog(!showTrashDialog);
  };
  return (
    <TreeSection title={gettext('Others')} className="dir-others">
      {trashUrl &&
        <div className='tree-node-inner text-nowrap' title={gettext('Trash')} onClick={toggleTrashDialog}>
          <div className="tree-node-text">{gettext('Trash')}</div>
          <div className="left-icon">
            <div className="tree-node-icon">
              <span className="sf3-font-recycle1 sf3-font"></span>
            </div>
          </div>
        </div>
      }
      {Utils.isDesktop() &&
      <div className='tree-node-inner text-nowrap' title={gettext('History')} onClick={() => location.href = historyUrl}>
        <div className="tree-node-text">{gettext('History')}</div>
        <div className="left-icon">
          <div className="tree-node-icon">
            <span className="sf3-font-history sf3-font"></span>
          </div>
        </div>
      </div>
      }
      {showTrashDialog && (
        <TrashDialog
          repoID={repoID}
          currentRepoInfo={currentRepoInfo}
          showTrashDialog={showTrashDialog}
          toggleTrashDialog={toggleTrashDialog}
        />
      )}
    </TreeSection>
  );
};

DirOthers.propTypes = {
  userPerm: PropTypes.string,
  repoID: PropTypes.string,
  currentRepoInfo: PropTypes.object.isRequired,
};

export default DirOthers;
