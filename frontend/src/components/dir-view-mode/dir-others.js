import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import TreeSection from '../tree-section';
import TrashDialog from '../dialog/trash-dialog';
import './dir-others.css';

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
        <div className='dir-others-item text-nowrap' title={gettext('Trash')} onClick={toggleTrashDialog}>
          <span className="sf3-font-recycle1 sf3-font"></span>
          <span className="dir-others-item-text">{gettext('Trash')}</span>
        </div>
      }
      {Utils.isDesktop() &&
      <div className='dir-others-item text-nowrap' title={gettext('History')} onClick={() => location.href = historyUrl}>
        <span className="sf3-font-history sf3-font"></span>
        <span className="dir-others-item-text">{gettext('History')}</span>
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
