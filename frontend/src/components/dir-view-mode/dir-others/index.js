import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import TreeSection from '../../tree-section';
import TrashDialog from '../../dialog/trash-dialog';
import LibSettingsDialog, { TAB } from '../../dialog/lib-settings';

import './index.css';

const DirOthers = ({ userPerm, repoID, currentRepoInfo }) => {
  const showSettings = currentRepoInfo.is_admin; // repo owner, department admin, shared with 'Admin' permission
  let [isSettingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const toggleSettingsDialog = () => {
    setSettingsDialogOpen(!isSettingsDialogOpen);
  };

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
      {showSettings && (
        <div className='dir-others-item text-nowrap' title={gettext('Settings')} onClick={toggleSettingsDialog}>
          <span className="sf3-font-set-up sf3-font"></span>
          <span className="dir-others-item-text">{gettext('Settings')}</span>
        </div>
      )}
      {trashUrl && (
        <div className='dir-others-item text-nowrap' title={gettext('Trash')} onClick={toggleTrashDialog}>
          <span className="sf3-font-trash sf3-font"></span>
          <span className="dir-others-item-text">{gettext('Trash')}</span>
        </div>
      )}
      {Utils.isDesktop() && (
        <div className='dir-others-item text-nowrap' title={gettext('History')} onClick={() => location.href = historyUrl}>
          <span className="sf3-font-history sf3-font"></span>
          <span className="dir-others-item-text">{gettext('History')}</span>
        </div>
      )}
      {showTrashDialog && (
        <TrashDialog
          repoID={repoID}
          currentRepoInfo={currentRepoInfo}
          showTrashDialog={showTrashDialog}
          toggleTrashDialog={toggleTrashDialog}
        />
      )}
      {isSettingsDialogOpen && (
        <LibSettingsDialog
          repoID={repoID}
          currentRepoInfo={currentRepoInfo}
          toggleDialog={toggleSettingsDialog}
          tab={TAB.HISTORY_SETTINGS}
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
