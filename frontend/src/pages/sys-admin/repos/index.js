import React, { useCallback, useEffect, useState } from 'react';
import { Button } from 'reactstrap';
import { useLocation, navigate, Router } from '@gatsbyjs/reach-router';
import MainPanelTopbar from '../main-panel-topbar';
import { gettext, siteRoot } from '../../../utils/constants';
import ReposNav from './repos-nav';
import Search from '../search';
import toaster from '../../../components/toast';
import AllRepos from './all-repos';
import AllWikis from './all-wikis';
import SystemRepo from './system-repo';
import TrashRepos from './trash-repos';

const PATH_NAME_MAP = {
  'all-libraries': 'all',
  'all-wikis': 'wikis',
  'system-library': 'system',
  'trash-libraries': 'trash'
};

const Libraries = ({ children, ...commonProps }) => {
  const [sortBy, setSortBy] = useState('');
  const [perPage, setPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateRepoDialogOpen, setIsCreateRepoDialogOpen] = useState(false);
  const [isCleanTrashDialogOpen, setIsCleanTrashDialogOpen] = useState(false);

  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();
  const pathSegment = PATH_NAME_MAP[path] || 'all';

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

  const sortItems = (sortBy) => {
    setSortBy(sortBy);
    setCurrentPage(1);
    const url = new URL(location.href);
    const searchParams = new URLSearchParams(url.search);
    searchParams.set('page', 1);
    searchParams.set('order_by', sortBy);
    url.search = searchParams.toString();
    navigate(url.toString());
  };

  const onResetPerPage = (perPage) => {
    setPerPage(perPage);
    setCurrentPage(1);
  };

  useEffect(() => {
    const urlParams = (new URL(window.location)).searchParams;
    setSortBy(urlParams.get('order_by') || sortBy);
    setPerPage(parseInt(urlParams.get('per_page') || perPage));
    setCurrentPage(parseInt(urlParams.get('page') || currentPage));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showReposNav = pathSegment === 'all' || pathSegment === 'trash' || pathSegment === 'wikis' || pathSegment === 'system';
  return (
    <>
      {pathSegment === 'all' && (
        <MainPanelTopbar search={getSearch()} { ...commonProps }>
          <Button className="btn btn-secondary operation-item" onClick={toggleCreateRepoDialog}>
            <i className="sf3-font sf3-font-enlarge text-secondary mr-1"></i>{gettext('New Library')}
          </Button>
        </MainPanelTopbar>
      )}
      {pathSegment === 'trash' && (
        <MainPanelTopbar {...commonProps}>
          <Button className="operation-item" onClick={toggleCleanTrashDialog}>{gettext('Clean')}</Button>
        </MainPanelTopbar>
      )}
      {(pathSegment === 'wikis' || pathSegment === 'system') && (
        <MainPanelTopbar {...commonProps} />
      )}
      {showReposNav && <ReposNav currentItem={path} sortBy={sortBy} sortItems={sortItems} />}
      <Router>
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
      </Router>
    </>
  );
};

export default Libraries;
