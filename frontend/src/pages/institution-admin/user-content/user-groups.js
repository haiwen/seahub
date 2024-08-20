import { useParams } from '@gatsbyjs/reach-router';
import React, { useEffect, useState } from 'react';
import { gettext } from '../../../utils/constants';
import Loading from '../../../components/loading';
import EmptyTip from '../../../components/empty-tip';
import UserGroupItem from './user-group-item';
import instAdminAPI from '../api';

export default function UsersGroups() {

  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState(null);
  const params = useParams();

  useEffect(() => {
    instAdminAPI.listInstitutionUserGroups(decodeURIComponent(params.email)).then(res => {
      const { groups_list } = res.data;
      setGroups(groups_list);
      setIsLoading(false);
    });
  }, [params.email]);

  if (isLoading) {
    return <Loading />;
  }

  if (groups.length === 0) {
    return (
      <EmptyTip text={gettext('This user has not created or joined any groups')}/>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th width="30%">{gettext('Name')}</th>
          <th width="30%">{gettext('Role')}</th>
          <th width="25%">{gettext('Create At')}</th>
          <th width="15%">{gettext('Operations')}</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group) => {
          return <UserGroupItem key={group.id} group={group} />;
        })}
      </tbody>
    </table>
  );
}
