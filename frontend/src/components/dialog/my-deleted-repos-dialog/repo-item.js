import React, { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PropTypes from 'prop-types';
import { gettext, lang } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import Icon from '../../icon';
import ModalPortal from '../../modal-portal';
import toaster from '../../toast';
import CommonOperationConfirmationDialog from '../common-operation-confirmation-dialog';

dayjs.locale(lang);
dayjs.extend(relativeTime);

const RepoItem = ({ repo, filterRestoredRepo, enableUserCleanTrash }) => {
  const repoID = useMemo(() => repo.repo_id, [repo]);
  const repoName = useMemo(() => repo.repo_name, [repo]);
  const localTime = useMemo(() => {
    const timeDate = dayjs.utc(repo.del_time).toDate();
    return dayjs(timeDate).fromNow();
  }, [repo]);
  const iconUrl = useMemo(() => Utils.getLibIconUrl(repo), [repo]);

  const [highlight, setHighlight] = useState(false);
  const [isDeleteRepoDialogOpen, setDeleteRepoDialogOpen] = useState(false);

  const onMouseEnter = useCallback(() => {
    setHighlight(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHighlight(false);
  }, []);

  const restoreDeletedRepo = useCallback(() => {
    seafileAPI.restoreDeletedRepo(repoID).then(res => {
      const message = gettext('Successfully restored the library {library_name}.').replace('{library_name}', repoName);
      toaster.success(message);
      filterRestoredRepo(repoID);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, repoName, filterRestoredRepo]);

  const toggleDeleteRepoDialog = useCallback((event) => {
    if (event) {
      event.preventDefault();
    }
    setDeleteRepoDialogOpen(currentValue => !currentValue);
  }, []);

  const deleteDeletedRepo = useCallback(() => {
    seafileAPI.deleteDeletedRepo(repoID).then(() => {
      const message = gettext('Successfully deleted {name}.').replace('{name}', repoName);
      toaster.success(message);
      filterRestoredRepo(repoID);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, repoName, filterRestoredRepo]);

  const deleteRepoMessage = useMemo(() => {
    const escapedRepoName = Utils.HTMLescape(repoName);
    return gettext('Are you sure you want to delete {placeholder} completely?').replace('{placeholder}', `<span class="op-target">${escapedRepoName}</span>`);
  }, [repoName]);

  return (
    <>
      <tr
        className={highlight ? 'tr-highlight' : ''}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        tabIndex="0"
        onFocus={onMouseEnter}
      >
        <td className="text-center pl-2 pr-2"><img src={iconUrl} alt='' width="24" /></td>
        <td className="name">{repoName}</td>
        <td className="update">{localTime}</td>
        <td>
          <span
            role="button"
            onClick={restoreDeletedRepo}
            title={gettext('Restore')}
            aria-label={gettext('Restore')}
            className={`op-icon ${highlight ? '' : 'vh'}`}
          >
            <Icon symbol="reply" />
          </span>
          {enableUserCleanTrash && (
            <span
              role="button"
              onClick={toggleDeleteRepoDialog}
              title={gettext('Delete')}
              aria-label={gettext('Delete')}
              className={`op-icon ml-2 ${highlight ? '' : 'vh'}`}
            >
              <Icon symbol="delete" />
            </span>
          )}
        </td>
      </tr>
      {enableUserCleanTrash && isDeleteRepoDialogOpen && (
        <ModalPortal>
          <CommonOperationConfirmationDialog
            title={gettext('Delete library')}
            message={deleteRepoMessage}
            executeOperation={deleteDeletedRepo}
            confirmBtnText={gettext('Delete')}
            toggleDialog={toggleDeleteRepoDialog}
          />
        </ModalPortal>
      )}
    </>
  );

};

RepoItem.propTypes = {
  repo: PropTypes.object.isRequired,
  filterRestoredRepo: PropTypes.func.isRequired,
  enableUserCleanTrash: PropTypes.bool,
};

export default RepoItem;
