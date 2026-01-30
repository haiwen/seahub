import React, { useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Search from '../../components/library-trash-search';
import { gettext, enableUserCleanTrash, username } from '../../utils/constants';
import CleanTrash from '../../components/dialog/clean-trash';
import ModalPortal from '../../components/modal-portal';
import { EVENT_BUS_TYPE } from '../../metadata/constants';

const LibraryTrashToolbar = ({ repoID, currentRepoInfo }) => {
  let [showFolder, setShowFolder] = useState(false);
  let [canSearch, setCanSearch] = useState(true);
  let [isCleanTrashDialogOpen, setCleanTrashDialogOpen] = useState(false);

  const toggleCleanTrashDialog = () => {
    setCleanTrashDialogOpen(!isCleanTrashDialogOpen);
  };

  const refreshTrash = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);
  }, []);

  const updateTrashToolbar = useCallback((data) => {
    setShowFolder(data.showFolder);
    setCanSearch(data.canSearch);
  }, []);

  useEffect(() => {
    let unsubscribeUpateTrashToolbar;
    let timer = setInterval(() => {
      if (window.sfMetadataContext && window.sfMetadataStore.data) {
        timer && clearInterval(timer);
        timer = null;
        setCanSearch(window.sfMetadataStore.data.canSearch);
        unsubscribeUpateTrashToolbar = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_TRASH_TOOLBAR, updateTrashToolbar);
      }
    }, 300);
    return () => {
      timer && clearInterval(timer);
      unsubscribeUpateTrashToolbar && unsubscribeUpateTrashToolbar();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { owner_email, is_admin } = currentRepoInfo;
  const isRepoAdmin = owner_email === username || is_admin;
  return showFolder ? null : (
    <>
      {canSearch &&
        <Search />
      }
      {(enableUserCleanTrash && isRepoAdmin) &&
      <button className="btn btn-sm btn-secondary clean flex-shrink-0 ml-4" onClick={toggleCleanTrashDialog}>{gettext('Clean')}</button>
      }
      {isCleanTrashDialogOpen && (
        <ModalPortal>
          <CleanTrash
            repoID={repoID}
            refreshTrash={refreshTrash}
            toggleDialog={toggleCleanTrashDialog}
          />
        </ModalPortal>
      )}
    </>
  );
};

LibraryTrashToolbar.propTypes = {
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired
};

export default LibraryTrashToolbar;
