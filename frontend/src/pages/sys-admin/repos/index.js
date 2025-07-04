import React, { useCallback } from 'react';
import { Button } from 'reactstrap';
import { useLocation, navigate } from '@gatsbyjs/reach-router';
import MainPanelTopbar from '../main-panel-topbar';
import { gettext, siteRoot } from '../../../utils/constants';
import ReposNav from './repos-nav';
import Search from '../search';
import toaster from '../../../components/toast';
import { eventBus } from '../../../components/common/event-bus';
import { EVENT_BUS_TYPE } from '../../../components/common/event-bus-type';

const Libraries = ({ children, ...commonProps }) => {
  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();

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
    eventBus.dispatch(EVENT_BUS_TYPE.OPEN_CREATE_REPO_DIALOG);
  }, []);

  const toggleCleanTrashDialog = useCallback(() => {
    eventBus.dispatch(EVENT_BUS_TYPE.OPEN_CLEAN_TRASH_DIALOG);
  }, []);

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
      <ReposNav currentItem={path} />
      {children}
    </>
  );
};

export default Libraries;
