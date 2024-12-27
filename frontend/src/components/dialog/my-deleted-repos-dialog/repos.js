import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import RepoItem from './repo-item';
import { gettext, trashReposExpireDays } from '../../../utils/constants';
import FixedWidthTable from '../../common/fixed-width-table';

const Repos = ({ repos, filterRestoredRepo }) => {
  const headers = useMemo(() => [
    { width: 40, isFixed: true, className: 'pl-2 pr-2' },
    { width: 0.5, isFixed: false, children: gettext('Name') },
    { width: 0.3, isFixed: false, children: gettext('Deleted Time') },
    { width: 0.2, isFixed: false },
  ], []);

  return (
    <div>
      <p className="tip my-deleted-repos-tip">{gettext('Tip: libraries deleted {placeholder} days ago will be cleaned automatically.').replace('{placeholder}', trashReposExpireDays)}</p>
      <FixedWidthTable headers={headers} >
        {repos.map((repo) => {
          return (
            <RepoItem key={repo.repo_id} repo={repo} filterRestoredRepo={filterRestoredRepo} />
          );
        })}
      </FixedWidthTable>
    </div>
  );
};

Repos.propTypes = {
  repos: PropTypes.array,
  filterRestoredRepo: PropTypes.func,
};

export default Repos;
