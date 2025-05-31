import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from '@gatsbyjs/reach-router';
import { Utils } from '../../../utils/utils';
import { gettext } from '../../../utils/constants';
import Loading from '../../../components/loading';
import EditIcon from '../../../components/edit-icon';
import SetQuotaDialog from '../../../components/dialog/sysadmin-dialog/set-quota';
import instAdminAPI from '../api';

export default function UserInfo() {

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isShowEditDialog, setIsShowEditDialog] = useState(false);
  const params = useParams();

  useEffect(() => {
    instAdminAPI.getInstitutionUserInfo(decodeURIComponent(params.email)).then(res => {
      const user = res.data;
      setUser(user);
      setIsLoading(false);
    });
  }, [params.email]);

  const toggleSetQuotaDialog = useCallback(() => {
    setIsShowEditDialog(!isShowEditDialog);
  }, [isShowEditDialog]);

  const updateQuota = useCallback((quote) => {
    instAdminAPI.setInstitutionUserQuote(user.email, quote).then(res => {
      // convert value to mb
      const newUser = { ...user, quota_total: quote * 1000 * 1000 };
      setUser(newUser);
    });
  }, [user]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <dl className="m-0">
        <dt className="info-item-heading">{gettext('Avatar')}</dt>
        <dd className="info-item-content">
          <img src={user.avatar_url} alt={user.name} width="80" className="rounded" />
        </dd>

        <dt className="info-item-heading">{gettext('Email')}</dt>
        <dd className="info-item-content">{user.email}</dd>

        <dt className="info-item-heading">{gettext('Name')}</dt>
        <dd className="info-item-content">
          {user.name || '--'}
        </dd>

        <dt className="info-item-heading">{gettext('Space Used / Quota')}</dt>
        <dd className="info-item-content">
          {`${Utils.bytesToSize(user.quota_usage)} / ${user.quota_total > 0 ? Utils.bytesToSize(user.quota_total) : '--'}`}
          <EditIcon onClick={toggleSetQuotaDialog} />
        </dd>
      </dl>
      {isShowEditDialog && (
        <SetQuotaDialog updateQuota={updateQuota} toggle={toggleSetQuotaDialog}/>
      )}
    </>
  );
}
