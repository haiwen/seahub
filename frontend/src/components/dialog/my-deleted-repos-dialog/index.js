import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext, trashReposExpireDays } from '../../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import Loading from '../../loading';
import EmptyTip from '../../empty-tip';
import Repos from './repos';

import './index.css';

const MyDeletedReposDialog = ({ toggleDialog }) => {

  const [isLoading, setLoading] = useState(true);
  const [deletedRepoList, setDeletedRepoList] = useState([]);

  useEffect(() => {
    seafileAPI.listDeletedRepo().then(res => {
      setDeletedRepoList(res.data);
      setLoading(false);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, []);

  const filterRestoredRepo = useCallback((restoredRepoID) => {
    const newDeletedRepoList = deletedRepoList.filter(item => {
      return item.repo_id !== restoredRepoID;
    });
    setDeletedRepoList(newDeletedRepoList);
  }, [deletedRepoList]);

  return (
    <Modal isOpen={true} toggle={toggleDialog} className="my-deleted-repos-dialog">
      <SeahubModalHeader toggle={toggleDialog}>{gettext('Deleted Libraries')}</SeahubModalHeader>
      <ModalBody className="my-deleted-repos-container">
        {isLoading ? (
          <Loading />
        ) : (
          <>
            {deletedRepoList.length === 0 ? (
              <EmptyTip
                className="my-deleted-repos-empty-tip"
                title={gettext('No deleted libraries')}
                text={gettext('You have not deleted any libraries in the last {placeholder} days. A deleted library will be cleaned automatically after this period.').replace('{placeholder}', trashReposExpireDays)}
              />
            ) : (
              <Repos repos={deletedRepoList} filterRestoredRepo={filterRestoredRepo} />
            )}
          </>
        )}
      </ModalBody>
    </Modal>
  );

};

MyDeletedReposDialog.propTypes = {
  toggleDialog: PropTypes.func.isRequired
};

export default MyDeletedReposDialog;
