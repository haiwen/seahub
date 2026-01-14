import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { gettext, username, isPro, siteRoot } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import TreeSection from '../../tree-section';
import TrashDialog from '../../dialog/trash-dialog';
import LibSettingsDialog from '../../dialog/lib-settings';
import { eventBus } from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';
import { TAB } from '../../../constants/repo-setting-tabs';
import LibraryMoreOperations from './library-more-operations';
import WatchUnwatchFileChanges from './watch-unwatch-file-changes';
import Item from './item';

import './index.css';

const DirOthers = ({ userPerm, repoID, currentRepoInfo, currentMode, updateRepoInfo }) => {
  const { owner_email, is_admin, repo_name: repoName, permission } = currentRepoInfo;

  const showSettings = is_admin; // repo owner, department admin, shared with 'Admin' permission
  let [isSettingsDialogOpen, setSettingsDialogOpen] = useState(false);
  let [activeTab, setActiveTab] = useState(TAB.HISTORY_SETTING);
  let [showMigrateTip, setShowMigrateTip] = useState(false);

  const toggleSettingsDialog = () => {
    setSettingsDialogOpen(!isSettingsDialogOpen);
  };

  const handleMigrateSuccess = useCallback(() => {
    setShowMigrateTip(false);
    const serviceUrl = window.app.config.serviceURL;
    window.location.href = serviceUrl + '/library/' + repoID + '/' + repoName + '/?tag=__all_tags';
  }, [repoID, repoName]);

  useEffect(() => {
    const unsubscribeUnselectFiles = eventBus.subscribe(EVENT_BUS_TYPE.OPEN_LIBRARY_SETTINGS_TAGS, () => {
      setSettingsDialogOpen(true);
      setActiveTab(TAB.TAGS_SETTING);
      setShowMigrateTip(true);
    });
    return () => {
      unsubscribeUnselectFiles();
    };
  });

  const [showTrashDialog, setShowTrashDialog] = useState(false);
  const toggleTrashDialog = () => {
    setShowTrashDialog(!showTrashDialog);
  };

  const handleHistoryClick = () => {
    const url = siteRoot + 'library/' + repoID + '/' + encodeURIComponent(repoName) + '/?history=true';
    window.history.pushState({}, '', url);
    eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_TO_HISTORY_VIEW);
  };

  const isDesktop = Utils.isDesktop();
  const isRepoOwner = owner_email == username;
  const isDepartmentAdmin = owner_email.indexOf('@seafile_group') != -1 && is_admin;

  const enableMonitorRepo = isPro && (permission == 'r' || permission == 'rw');

  return (
    <TreeSection title={gettext('Others')} className="dir-others">
      {enableMonitorRepo && (
        <WatchUnwatchFileChanges
          repo={currentRepoInfo}
          updateRepoInfo={updateRepoInfo}
        />
      )}
      {showSettings && (
        <Item
          text={gettext('Settings')}
          iconSymbol="set-up"
          op={toggleSettingsDialog}
        />
      )}
      {userPerm == 'rw' && (
        <Item
          text={gettext('Trash')}
          iconSymbol="trash"
          op={toggleTrashDialog}
        />
      )}
      {isDesktop && (
        <Item
          text={gettext('History')}
          iconSymbol="history"
          op={handleHistoryClick}
          isActive={currentMode === 'history'}
        />
      )}
      {isDesktop && (isRepoOwner || isDepartmentAdmin) && (
        <LibraryMoreOperations
          repo={currentRepoInfo}
          updateRepoInfo={updateRepoInfo}
        />
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
          tab={activeTab}
          showMigrateTip={showMigrateTip}
          onMigrateSuccess={handleMigrateSuccess}
        />
      )}
    </TreeSection>
  );
};

DirOthers.propTypes = {
  userPerm: PropTypes.string,
  repoID: PropTypes.string,
  currentRepoInfo: PropTypes.object.isRequired,
  currentMode: PropTypes.string.isRequired,
  updateRepoInfo: PropTypes.func
};

export default DirOthers;
