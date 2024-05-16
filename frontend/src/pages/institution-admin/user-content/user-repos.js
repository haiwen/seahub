import { useParams } from '@gatsbyjs/reach-router';
import React, { useEffect, useState } from 'react';
import { gettext } from '../../../utils/constants';
import Loading from '../../../components/loading';
import EmptyTip from '../../../components/empty-tip';
import instAdminAPI from '../api';
import UserRepoItem from './user-repo-item';

export default function UserRepos() {

  const [isLoading, setIsLoading] = useState(true);
  const [repos, setRepos] = useState(null);
  const params = useParams();

  useEffect(() => {
    instAdminAPI.listInstitutionUserRepos(decodeURIComponent(params.email)).then(res => {
      const { repo_list } = res.data;
      setRepos(repo_list);
      setIsLoading(false);
    });
  }, [params.email]);

  if (isLoading) {
    return <Loading />;
  }

  if (repos.length === 0) {
    return (
      <EmptyTip>
        <h2>{gettext('No libraries')}</h2>
      </EmptyTip>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th width="5%"></th>
          <th width="35%">{gettext('Name')}</th>
          <th width="30%">{gettext('Size')}</th>
          <th width="25%">{gettext('Last Update')}</th>
          <th width="5%">{/* Operations */}</th>
        </tr>
      </thead>
      <tbody>
        {repos.map((repo) => {
          return <UserRepoItem key={repo.id} repo={repo} />;
        })}
      </tbody>
    </table>
  );
}
