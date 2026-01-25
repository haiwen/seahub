import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
// import Search from '../../components/library-trash-search';
import { gettext, enableUserCleanTrash, username } from '../../utils/constants';
import CleanTrash from '../../components/dialog/clean-trash';
import ModalPortal from '../../components/modal-portal';
import { EVENT_BUS_TYPE } from '../../metadata/constants';

const LibraryTrashToolbar = ({ repoID, currentRepoInfo }) => {
  let [isCleanTrashDialogOpen, setCleanTrashDialogOpen] = useState(false);

  const toggleCleanTrashDialog = () => {
    setCleanTrashDialogOpen(!isCleanTrashDialogOpen);
  };

  const refreshTrash = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);
  }, []);

  const { owner_email, is_admin } = currentRepoInfo;
  const isRepoAdmin = owner_email === username || is_admin;
  return (
    <>
      {/* <Search /> */}
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
