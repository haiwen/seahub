import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Repo from '../../../models/repo';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import DetailItem from '../../../components/dirent-detail/detail-item';
import { Formatter } from '@seafile/sf-metadata-ui-component';
import { Utils } from '../../../utils/utils';
import { gettext, siteRoot, thumbnailSizeForGrid } from '../../../utils/constants';
import { Detail, Header, Body } from '../../../components/dirent-detail/detail';
import { CellType, PRIVATE_COLUMN_KEY } from '../../constants';
import { useMetadata, useGallery } from '../../../metadata';
import { seafileAPI } from '../../../utils/seafile-api';
import FileDetails from '../../../components/dirent-detail/dirent-details/file-details';
import { Dirent } from '../../../models';

const GalleryDetail = ({ currentRepoInfo, viewID, onClose }) => {
  const [isLoading, setLoading] = useState(true);
  const [repo, setRepo] = useState({});
  const [direntDetail, setDirentDetail] = useState(null);
  const { viewsMap } = useMetadata();
  const { currentImage } = useGallery();

  const view = useMemo(() => viewsMap[viewID], [viewID, viewsMap]);
  const icon = useMemo(() => Utils.getFolderIconUrl(), []);
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

  useEffect(() => {
    const fetchDirentDetail = async () => {
      if (currentImage) {
        try {
          const direntPath = Utils.joinPath(currentImage.path, currentImage.name);
          const res = await seafileAPI.getFileInfo(currentRepoInfo.repo_id, direntPath);
          setDirentDetail(res.data);
        } catch (error) {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        }
      } else {
        setDirentDetail(null);
      }
    };

    fetchDirentDetail();
  }, [currentImage, currentRepoInfo.repo_id]);

  const dirent = useMemo(() => {
    return currentImage ? new Dirent({
      id: currentImage.obj_id,
      name: currentImage.name,
      type: 'file'
    }) : null;
  }, [currentImage]);

  const smallIconUrl = useMemo(() => dirent ? Utils.getDirentIcon(dirent) : '', [dirent]);
  const bigIconUrl = useMemo(() => dirent ? `${siteRoot}thumbnail/${currentRepoInfo.repo_id}/${thumbnailSizeForGrid}${Utils.encodePath(`${currentImage.path === '/' ? '' : currentImage.path}/${dirent.name}`)}` : '', [dirent, currentRepoInfo.repo_id, currentImage]);

  const renderGalleryInfo = () => (
    <Detail>
      <Header title={view.name} icon={icon} onClose={onClose} />
      <Body>
        {isLoading ? (
          <div className="w-100 h-100 d-flex align-items-center justify-content-center"><Loading /></div>
        ) : (
          <div className="detail-content">
            <DetailItem field={mtimeField} className="sf-metadata-property-detail-formatter">
              <Formatter field={mtimeField} value={repo.last_modified} />
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
          </div>
        )}
      </Body>
    </Detail>
  );

  const renderImageInfo = () => (
    <Detail>
      <Header title={currentImage.name} icon={smallIconUrl} onClose={onClose} />
      <Body>
        <div className="detail-image-thumbnail">
          <img src={bigIconUrl} alt="" className="thumbnail" />
        </div>
        {dirent && direntDetail && (
          <div className="detail-content">
            <FileDetails
              repoID={currentRepoInfo.repo_id}
              repoInfo={currentRepoInfo}
              dirent={dirent}
              path={currentImage.path}
              direntDetail={direntDetail}
              repoTags={currentRepoInfo.repoTags}
              onFileTagChanged={currentRepoInfo.onFileTagChanged}
            />
          </div>
        )}
      </Body>
    </Detail>
  );

  return currentImage ? renderImageInfo() : renderGalleryInfo();
};

GalleryDetail.propTypes = {
  currentRepoInfo: PropTypes.object.isRequired,
  viewID: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default GalleryDetail;
