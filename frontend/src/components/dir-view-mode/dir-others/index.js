import React from 'react';
import PropTypes from 'prop-types';
import { gettext, username, isPro, siteRoot } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import TreeSection from '../../tree-section';
import { eventBus } from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';
import LibraryMoreOperations from './library-more-operations';
import WatchUnwatchFileChanges from './watch-unwatch-file-changes';
import Item from './item';

import './index.css';

const DirOthers = ({ userPerm, repoID, currentRepoInfo, currentMode, updateRepoInfo }) => {
  const { owner_email, is_admin, repo_name: repoName, permission } = currentRepoInfo;
  const showSettings = is_admin; // repo owner, department admin, shared with 'Admin' permission

  const handleSettingsClick = () => {
    eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_TO_SETTINGS_VIEW);
  };

  const handleTrashClick = () => {
    eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_TO_TRASH_VIEW);
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
          op={handleSettingsClick}
          isActive={currentMode === 'settings'}
        />
      )}
      {userPerm == 'rw' && (
        <Item
          text={gettext('Trash')}
          iconSymbol="trash"
          op={handleTrashClick}
          isActive={currentMode === 'trash'}
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
