import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Formatter } from '@seafile/sf-metadata-ui-component';
import { Utils } from '../../../utils/utils';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import toaster from '../../toast';
import { Detail, Header, Body } from '../detail';
import Repo from '../../../models/repo';
import Loading from '../../loading';
import DetailItem from '../detail-item';
import { CellType } from '../../../metadata/metadata-view/_basic';

const LibDetail = React.memo(({ currentRepoInfo, onClose }) => {
  const [isLoading, setLoading] = useState(true);
  const [repo, setRepo] = useState({});
  const smallIconUrl = useMemo(() => Utils.getLibIconUrl(currentRepoInfo), [currentRepoInfo]);
  const filesField = useMemo(() => ({ type: CellType.NUMBER, name: gettext('Files') }), []);
  const sizeField = useMemo(() => ({ type: 'size', name: gettext('Size') }), []);
  const creatorField = useMemo(() => ({ type: CellType.CREATOR, name: gettext('Creator') }), []);
  const mtimeField = useMemo(() => ({ type: CellType.MTIME, name: gettext('Last modified time') }), []);

  useEffect(() => {
    setLoading(true);
    seafileAPI.getRepoInfo(currentRepoInfo.repo_id).then(res => {
      const repo = new Repo(res.data);
      setRepo(repo);
      setLoading(false);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [currentRepoInfo.repo_id]);

  return (
    <Detail>
      <Header title={currentRepoInfo.repo_name} icon={smallIconUrl} onClose={onClose} />
      <Body>
        {isLoading ? (
          <div className="w-100 h-100 d-flex algin-items-center justify-content-center"><Loading /></div>
        ) : (
          <div className="detail-content">
            <DetailItem field={filesField} value={repo.file_count || 0} className="sf-metadata-property-detail-formatter">
              <Formatter field={filesField} value={repo.file_count || 0} />
            </DetailItem>
            <DetailItem field={sizeField} value={repo.size} className="sf-metadata-property-detail-formatter">
              <Formatter field={sizeField} value={repo.size} />
            </DetailItem>
            <DetailItem field={creatorField} className="sf-metadata-property-detail-formatter">
              <Formatter
                field={creatorField}
                value={repo.owner_email}
                collaborators={[{
                  name: repo.owner_name,
                  contact_email: repo.owner_contact_email,
                  email: repo.owner_email,
                  avatar_url: repo.owner_avatar,
                }]}
              />
            </DetailItem>
            <DetailItem field={mtimeField} className="sf-metadata-property-detail-formatter">
              <Formatter field={mtimeField} value={repo.last_modified} />
            </DetailItem>
          </div>
        )}
      </Body>
    </Detail>
  );

}, (props, nextProps) => {
  return props.currentRepo.repo_id === nextProps.currentRepo.repo_id;
});

LibDetail.propTypes = {
  currentRepoInfo: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default LibDetail;
