import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from 'reactstrap';
import { useLocation, navigate, Router } from '@gatsbyjs/reach-router';
import MainPanelTopbar from './main-panel-topbar';
import { gettext, siteRoot } from '../../utils/constants';
import ReposNav from './repos/repos-nav';
import Search from './search';
import toaster from '../../components/toast';
import AllRepos from './repos/all-repos';
import AllWikis from './repos/all-wikis';
import SystemRepo from './repos/system-repo';
import TrashRepos from './repos/trash-repos';
import ShareLinks from './links/share-links';
import UploadLinks from './links/upload-links';
import LinksNav from './links/links-nav';

const LINKS_PATH_NAME_MAP = {
  'share-links': 'shareLinks',
  'upload-links': 'uploadLinks'
};

const LibrariesAndLinks = ({ ...commonProps }) => {
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [perPage, setPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateRepoDialogOpen, setIsCreateRepoDialogOpen] = useState(false);
  const [isCleanTrashDialogOpen, setIsCleanTrashDialogOpen] = useState(false);
  const callbackRef = React.useRef(null);

  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();
  let curTab = '';
  const isLibraries = useMemo(() => path === 'all-libraries' || path === 'trash-libraries' || path === 'all-wikis' || path === 'system-library', [path]);
  if (isLibraries) {
    curTab = path;
  } else {
    curTab = LINKS_PATH_NAME_MAP[path];
  }

  const getValueLength = (str) => {
    let code; let len = 0;
    for (let i = 0, length = str.length; i < length; i++) {
      code = str.charCodeAt(i);
      if (code === 10) { // solve enter problem
        len += 2;
      } else if (code < 0x007f) {
        len += 1;
      } else if (code >= 0x0080 && code <= 0x07ff) {
        len += 2;
      } else if (code >= 0x0800 && code <= 0xffff) {
        len += 3;
      }
    }
    return len;
  };

  const searchRepos = (repoNameOrID) => {
    if (getValueLength(repoNameOrID) < 3) {
      toaster.notify(gettext('Required at least three letters.'));
      return;
    }
    navigate(`${siteRoot}sys/search-libraries/?name_or_id=${encodeURIComponent(repoNameOrID)}`);
  };

  const getSearch = () => {
    return (
      <Search
        placeholder={gettext('Search libraries by name or ID')}
        submit={searchRepos}
      />
    );
  };

  const toggleCreateRepoDialog = useCallback(() => {
    setIsCreateRepoDialogOpen(!isCreateRepoDialogOpen);
  }, [isCreateRepoDialogOpen]);

  const toggleCleanTrashDialog = useCallback(() => {
    setIsCleanTrashDialogOpen(!isCleanTrashDialogOpen);
  }, [isCleanTrashDialogOpen]);

  const sortItems = (sortBy, sortOrder) => {
    setSortBy(sortBy);
    setSortOrder(sortOrder);
    setCurrentPage(1);
    const url = new URL(location.href);
    const searchParams = new URLSearchParams(url.search);
    searchParams.set('page', 1);
    searchParams.set('order_by', sortBy);
    sortOrder && searchParams.set('direction', sortOrder);
    url.search = searchParams.toString();
    navigate(url.toString());
  };

  const onResetPerPage = (perPage, callBack) => {
    setPerPage(perPage);
    setCurrentPage(1);
    callbackRef.current = callBack;
  };

  useEffect(() => {
    if (callbackRef.current) {
      callbackRef.current();
      callbackRef.current = null;
    }
  }, [perPage, currentPage]);

  const resetAllStates = useCallback(() => {
    setSortBy('');
    setSortOrder('asc');
    setPerPage(100);
    setCurrentPage(1);
    setIsCreateRepoDialogOpen(false);
    setIsCleanTrashDialogOpen(false);
  }, []);

  useEffect(() => {
    const urlParams = (new URL(window.location)).searchParams;
    setSortBy(urlParams.get('order_by') || sortBy);
    setSortOrder(urlParams.get('direction') || sortOrder);
    setPerPage(parseInt(urlParams.get('per_page') || perPage));
    setCurrentPage(parseInt(urlParams.get('page') || currentPage));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentPathType = isLibraries ? 'library' : 'link';
    resetAllStates();

    const cleanUrlParams = () => {
      const url = new URL(location.href);
      const paramsToKeep = currentPathType === 'library' ? ['page', 'per_page'] : [];
      const searchParams = new URLSearchParams();

      Array.from(url.searchParams.entries()).forEach(([key, value]) => {
        if (paramsToKeep.includes(key)) {
          searchParams.set(key, value);
        }
      });

      if (url.search !== searchParams.toString()) {
        navigate(url.pathname + (searchParams.toString() ? `?${searchParams}` : ''));
      }
    };

    cleanUrlParams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLibraries]);

  return (
    <>
      {path === 'all-libraries' && (
        <MainPanelTopbar search={getSearch()} { ...commonProps }>
          <Button className="btn btn-secondary operation-item" onClick={toggleCreateRepoDialog}>
            <i className="sf3-font sf3-font-enlarge text-secondary mr-1"></i>{gettext('New Library')}
          </Button>
        </MainPanelTopbar>
      )}
      {path === 'trash-libraries' && (
        <MainPanelTopbar {...commonProps}>
          <Button className="operation-item" onClick={toggleCleanTrashDialog}>{gettext('Clean')}</Button>
        </MainPanelTopbar>
      )}
      {(path === 'all-wikis' || path === 'system-library') && (
        <MainPanelTopbar {...commonProps} />
      )}
      {!isLibraries && <MainPanelTopbar {...commonProps} />}
      {isLibraries ? (
        <ReposNav currentItem={curTab} sortBy={sortBy} sortItems={sortItems} />
      ) : (
        <LinksNav currentItem={curTab} sortBy={sortBy} sortOrder={sortOrder} sortItems={sortItems} />
      )}
      <Router className="d-flex overflow-hidden">
        <AllRepos
          path="all-libraries"
          sortBy={sortBy}
          perPage={perPage}
          currentPage={currentPage}
          onResetPerPage={onResetPerPage}
          isCreateRepoDialogOpen={isCreateRepoDialogOpen}
          toggleCreateRepoDialog={toggleCreateRepoDialog}
        />
        <AllWikis
          path="all-wikis"
          sortBy={sortBy}
          perPage={perPage}
          currentPage={currentPage}
          onResetPerPage={onResetPerPage}
        />
        <SystemRepo path="system-library" />
        <TrashRepos
          path="trash-libraries"
          isCleanTrashDialogOpen={isCleanTrashDialogOpen}
          toggleCleanTrashDialog={toggleCleanTrashDialog}
        />
        <ShareLinks path="share-links" onResetPerPage={onResetPerPage} />
        <UploadLinks path="upload-links" />
      </Router>
    </>
  );
};

export default LibrariesAndLinks;
