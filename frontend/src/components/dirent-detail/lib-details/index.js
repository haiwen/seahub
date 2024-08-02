import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import toaster from '../../toast';
import Header from '../header';
import Repo from '../../../models/repo';
import Loading from '../../loading';
import DetailItem from '../detail-item';
import { CellType } from '../../../metadata/metadata-view/_basic';

const LibDetail = React.memo(({ currentRepo, closeDetails }) => {
  const [isLoading, setLoading] = useState(true);
  const [repo, setRepo] = useState({});
  const smallIconUrl = useMemo(() => Utils.getLibIconUrl(currentRepo), [currentRepo]);

  useEffect(() => {
    setLoading(true);
    seafileAPI.getRepoInfo(currentRepo.repo_id).then(res => {
      const repo = new Repo(res.data);
      setRepo(repo);
      setLoading(false);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [currentRepo.repo_id]);

  return (
    <div className="detail-container">
      <Header title={currentRepo.repo_name} icon={smallIconUrl} onClose={closeDetails} />
      <div className="detail-body dirent-info">
        {isLoading ? (
          <div className="w-100 h-100 d-flex algin-items-center justify-content-center"><Loading /></div>
        ) : (
          <div className="detail-content">
            <DetailItem field={{ type: CellType.NUMBER, name: gettext('Files') }} value={repo.file_count} />
            <DetailItem field={{ type: 'size', name: gettext('Size') }} value={repo.size} />
            <DetailItem field={{ type: CellType.CREATOR, name: gettext('Creator') }} value={repo.owner_email} collaborators={[{
              name: repo.owner_name,
              contact_email: repo.owner_contact_email,
              email: repo.owner_email,
              avatar_url: repo.owner_avatar,
            }]} />
            <DetailItem field={{ type: CellType.MTIME, name: gettext('Last modified time') }} value={repo.last_modified} />
          </div>
        )}
      </div>
    </div>
  );

}, (props, nextProps) => {
  return props.currentRepo.repo_id === nextProps.currentRepo.repo_id;
});

LibDetail.propTypes = {
  currentRepo: PropTypes.object.isRequired,
  closeDetails: PropTypes.func.isRequired,
};

export default LibDetail;
