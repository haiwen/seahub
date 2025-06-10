import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import FileDetails from '../../dirent-detail/dirent-details/file-details';
import DirDetails from '../../dirent-detail/dirent-details/dir-details';
import { useMetadataStatus } from '../../../hooks';
import tagsAPI from '../../../tag/api';
import { PER_LOAD_NUMBER } from '../../../metadata/constants';
import { normalizeColumns } from '../../../tag/utils/column';
import { TAGS_DEFAULT_SORT } from '../../../tag/constants/sort';
import TagsData from '../../../tag/model/tagsData';
import toaster from '../../toast';

const Details = ({ repoID, path, dirent, direntDetail }) => {
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

  return (
    <div className="detail-content">
      {dirent.type !== 'file' ?
        <DirDetails
          direntDetail={direntDetail}
          readOnly={true}
          tagsData={tagsData}
        />
        :
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
      }
    </div>
  );
};

Details.propTypes = {
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
  direntDetail: PropTypes.object.isRequired,
};

export default Details;
