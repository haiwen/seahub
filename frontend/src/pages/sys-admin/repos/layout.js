import { Router, useLocation, navigate } from '@gatsbyjs/reach-router';
import React, { useCallback, useEffect, useState } from 'react';
import AllRepos from './all-repos';
import AllWikis from './all-wikis';
import SystemRepo from './system-repo';
import TrashRepos from './trash-repos';
import MainPanelTopbar from '../main-panel-topbar';
import { Button } from 'reactstrap';
import { gettext, siteRoot } from '../../../utils/constants';
import ReposNav from './repos-nav';
import Search from '../search';
import toaster from '../../../components/toast';

const PATH_NAME_MAP = {
  'all-libraries': 'all',
  'all-wikis': 'wikis',
  'system-library': 'system',
  'trash-libraries': 'trash'
};

const LibrariesLayout = ({ ...commonProps }) => {
  const [sortBy, setSortBy] = useState('');
  const [perPage, setPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateRepoDialogOpen, setIsCreateRepoDialogOpen] = useState(false);

  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();
  const pathSegment = PATH_NAME_MAP[path] || 'all';

  const searchRepos = (repoNameOrID) => {
    if (this.getValueLength(repoNameOrID) < 3) {
      toaster.notify(gettext('Required at least three letters.'));
      return;
    }
    navigate(`${siteRoot}sys/search-libraries/?name_or_id=${encodeURIComponent(repoNameOrID)}`);
  };

  const getSearch = useCallback(() => {
    return (
      <Search
        placeholder={gettext('Search libraries by name or ID')}
        submit={searchRepos}
      />
    );
  }, []);

  const toggleCreateRepoDialog = useCallback(() => {
    setIsCreateRepoDialogOpen(!isCreateRepoDialogOpen);
  }, [isCreateRepoDialogOpen]);

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

  return (
    <>
      {pathSegment === 'all' ? (
        <MainPanelTopbar search={getSearch()} { ...commonProps }>
          <Button className="btn btn-secondary operation-item" onClick={toggleCreateRepoDialog}>
            <i className="sf3-font sf3-font-enlarge text-secondary mr-1"></i>{gettext('New Library')}
          </Button>
        </MainPanelTopbar>
      ) : (
        <MainPanelTopbar { ...commonProps } />
      )}
      <ReposNav currentItem={pathSegment} sortBy={sortBy} sortItems={sortItems} />
      <Router>
        <AllRepos
          path="all-libraries"
          isCreateRepoDialogOpen={isCreateRepoDialogOpen}
          sortBy={sortBy}
          perPage={perPage}
          currentPage={currentPage}
          onResetPerPage={onResetPerPage}
        />
        <AllWikis
          path="all-wikis"
          sortBy={sortBy}
          perPage={perPage}
          currentPage={currentPage}
          onResetPerPage={onResetPerPage}
        />
        <SystemRepo path="system-library" />
        <TrashRepos path="trash-libraries" />
      </Router>
    </>
  );
};

export default LibrariesLayout;
