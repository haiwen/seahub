import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import RepoItem from './repo-item';
import { gettext, trashReposExpireDays } from '../../../utils/constants';
import FixedWidthTable from '../../fixed-width-table';
import ModalPortal from '../../modal-portal';
import CommonOperationConfirmationDialog from '../common-operation-confirmation-dialog';

const Repos = ({ repos, filterRestoredRepo, cleanDeletedRepos, enableUserCleanTrash }) => {
  const [isCleanDialogOpen, setIsCleanDialogOpen] = useState(false);

  const headers = useMemo(() => [
    { width: 40, isFixed: true, className: 'pl-2 pr-2' },
    { width: 0.5, isFixed: false, children: gettext('Name') },
    { width: 0.3, isFixed: false, children: gettext('Deleted Time') },
    { width: 0.2, isFixed: false },
  ], []);

  const toggleCleanDialog = useCallback(() => {
    setIsCleanDialogOpen(currentValue => !currentValue);
  }, []);

  return (
    <div>
      <div className="my-deleted-repos-toolbar">
        <p className="tip my-deleted-repos-tip mb-0">{gettext('Tip: libraries deleted {placeholder} days ago will be cleaned automatically.').replace('{placeholder}', trashReposExpireDays)}</p>
        {enableUserCleanTrash && (
          <Button className="operation-item my-deleted-repos-clean-btn" onClick={toggleCleanDialog}>{gettext('Clean')}</Button>
        )}
      </div>
      <FixedWidthTable headers={headers} >
        {repos.map((repo) => {
          return (
            <RepoItem
              key={repo.repo_id}
              repo={repo}
              filterRestoredRepo={filterRestoredRepo}
              enableUserCleanTrash={enableUserCleanTrash}
            />
          );
        })}
      </FixedWidthTable>
      {enableUserCleanTrash && isCleanDialogOpen && (
        <ModalPortal>
          <CommonOperationConfirmationDialog
            title={gettext('Delete all deleted libraries')}
            message={gettext('Are you sure you want to delete all deleted libraries?')}
            executeOperation={cleanDeletedRepos}
            confirmBtnText={gettext('Clean')}
            toggleDialog={toggleCleanDialog}
          />
        </ModalPortal>
      )}
    </div>
  );
};

Repos.propTypes = {
  repos: PropTypes.array,
  filterRestoredRepo: PropTypes.func,
  cleanDeletedRepos: PropTypes.func,
  enableUserCleanTrash: PropTypes.bool,
};

export default Repos;
