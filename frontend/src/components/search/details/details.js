import PropTypes from 'prop-types';
import { Body, Header } from '../../dirent-detail/detail';
import { siteRoot, thumbnailSizeForGrid } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import FileDetails from '../../dirent-detail/dirent-details/file-details';
import DirDetails from '../../dirent-detail/dirent-details/dir-details';
import { useEffect, useState } from 'react';
import { useMetadataStatus } from '../../../hooks';
import tagsAPI from '../../../tag/api';
import { PER_LOAD_NUMBER } from '../../../metadata/constants';
import { normalizeColumns } from '../../../tag/utils/column';
import { TAGS_DEFAULT_SORT } from '../../../tag/constants/sort';
import TagsData from '../../../tag/model/tagsData';
import toaster from '../../toast';

const Details = ({ repoID, repoInfo, path, dirent, direntDetail }) => {
  const [tagsData, setTagsData] = useState(null);
  const { enableMetadata, enableTags } = useMetadataStatus();

  useEffect(() => {
    if (enableMetadata && enableTags) {
      tagsAPI.getTags(repoID, 0, PER_LOAD_NUMBER).then(res => {
        const rows = res?.data?.results || [];
        const columns = normalizeColumns(res?.data?.metadata);
        const tagsData = new TagsData({ rows, columns, TAGS_DEFAULT_SORT });
        setTagsData(tagsData);
      }).catch(error => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
      });
    } else {
      setTagsData(null);
    }
  }, [repoID, enableMetadata, enableTags]);

  let src = '';
  if (repoInfo.encrypted) {
    src = `${siteRoot}repo/${repoID}/raw` + Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`);
  } else {
    src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}` + Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`) + '?mtime=' + direntDetail.mtime;
  }
  return (
    <div className="searched-item-details">
      <div
        className="cur-view-detail"
        style={{ width: 300 }}
      >
        <Header title={dirent?.name || ''} icon={Utils.getDirentIcon(dirent, true)}></Header>
        <Body>
          {Utils.imageCheck(dirent.name) && (
            <div className="detail-image">
              <img src={src} alt="" />
            </div>
          )}
          <div className="detail-content">
            {dirent.type !== 'file' ? (
              <DirDetails
                direntDetail={direntDetail}
                readOnly={true}
                tagsData={tagsData}
              />
            ) : (
              <FileDetails
                repoID={repoID}
                dirent={dirent}
                path={path}
                direntDetail={direntDetail}
                repoTags={[]}
                fileTagList={dirent ? dirent.file_tags : []}
                readOnly={true}
                tagsData={tagsData}
                onFileTagChanged={() => {}}
              />
            )}
          </div>
        </Body>
      </div>
    </div>
  );
};

Details.propTypes = {
  repoID: PropTypes.string.isRequired,
  repoInfo: PropTypes.object.isRequired,
  path: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
  direntDetail: PropTypes.object.isRequired,
};

export default Details;
