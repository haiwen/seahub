import React from 'react';
import { Router } from '@gatsbyjs/reach-router';
import PropTypes from 'prop-types';
import { siteRoot } from '../../../utils/constants';
import FilesActivities from './files-activities';
import GroupView from './groups/group-view';
import InvitationsView from './invitations/invitations-view';
import LibContentView from './lib-content-view/lib-content-view';
import Libraries from './libraries';
import LinkedDevices from './linked-devices/linked-devices';
import MyLibraries from './my-libs/my-libs';
import MyLibDeleted from './my-libs/my-libs-deleted';
import OCMViaWebdav from './ocm-via-webdav/ocm-via-webdav';
import ShareAdminFolders from './share-admin/folders';
import ShareAdminLibraries from './share-admin/libraries';
import ShareAdminLinks from './share-admin/links';
import OCMRepoDir from './share-with-ocm/remote-dir-view';
import ShareWithOCM from './share-with-ocm/shared-with-ocm';
import SharedLibraries from './shared-libs';
import SharedWithAll from './shared-with-all';
import Starred from './starred/starred';
import Wikis from './wikis/wikis';

const propTypes = {
  sidePanelRate: PropTypes.number,
  isSidePanelFolded: PropTypes.bool,
  pathPrefix: PropTypes.array,
  onTabNavClick: PropTypes.func,
  eventBus: PropTypes.object,
  resetTitle: PropTypes.func,
};

const MainPanelRouter = ({
  sidePanelRate,
  isSidePanelFolded,
  pathPrefix,
  onTabNavClick,
  eventBus,
  resetTitle,
}) => (
  <Router className="reach-router">
    <Libraries path={siteRoot} />
    <Libraries path={siteRoot + 'libraries'} />
    <MyLibraries path={siteRoot + 'my-libs'} />
    <MyLibDeleted path={siteRoot + 'my-libs/deleted/'} />
    <ShareAdminLinks path={siteRoot + ':shareAdminPage'} />
    <SharedWithAll path={siteRoot + 'org/'} />
    <Wikis
      path={siteRoot + 'published'}
      sidePanelRate={sidePanelRate}
      isSidePanelFolded={isSidePanelFolded}
    />
    <Starred path={siteRoot + 'starred'} />
    <InvitationsView path={siteRoot + 'invitations/'} />
    <FilesActivities path={`${siteRoot}activities/*`} />
    <GroupView path={siteRoot + 'group/:groupID'} />
    <LinkedDevices path={siteRoot + 'linked-devices'} />
    <ShareAdminLibraries path={siteRoot + 'share-admin-libs'} />
    <ShareAdminFolders path={siteRoot + 'share-admin-folders'} />
    <SharedLibraries path={siteRoot + 'shared-libs'} />
    <ShareWithOCM path={siteRoot + 'shared-with-ocm'} />
    <OCMViaWebdav path={siteRoot + 'ocm-via-webdav'} />
    <OCMRepoDir
      path={siteRoot + 'remote-library/:providerID/:repoID/*'}
      pathPrefix={pathPrefix}
      onTabNavClick={onTabNavClick}
    />
    <LibContentView
      path={siteRoot + 'library/:repoID/*'}
      pathPrefix={pathPrefix}
      isSidePanelFolded={isSidePanelFolded}
      onTabNavClick={onTabNavClick}
      eventBus={eventBus}
      resetTitle={resetTitle}
    />
  </Router>
);

MainPanelRouter.propTypes = propTypes;

export default MainPanelRouter;
