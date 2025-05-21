import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Header, Body } from '../../dirent-detail/detail';
import DetailItem from '../../dirent-detail/detail-item';
import Formatter from '../../../metadata/components/formatter';
import { Utils } from '../../../utils/utils';
import { gettext } from '../../../utils/constants';
import { CellType } from '../../../metadata/constants';

const LibDetail = ({ repoInfo }) => {
  const libIconUrl = useMemo(() => Utils.getLibIconUrl(repoInfo), [repoInfo]);
  const filesField = useMemo(() => ({ type: CellType.NUMBER, name: gettext('Files') }), []);
  const sizeField = useMemo(() => ({ type: 'size', name: gettext('Size') }), []);
  const creatorField = useMemo(() => ({ type: CellType.CREATOR, name: gettext('Creator') }), []);
  const mtimeField = useMemo(() => ({ type: CellType.MTIME, name: gettext('Last modified time') }), []);

  return (
    <>
      <Header title={repoInfo.repo_name} icon={libIconUrl} />
      <Body>
        <div className="detail-content">
          <DetailItem field={filesField} value={repoInfo.file_count || 0} className="sf-metadata-property-detail-formatter">
            <Formatter field={filesField} value={repoInfo.file_count || 0} />
          </DetailItem>
          <DetailItem field={sizeField} value={repoInfo.size} className="sf-metadata-property-detail-formatter">
            <Formatter field={sizeField} value={repoInfo.size} />
          </DetailItem>
          <DetailItem field={creatorField} className="sf-metadata-property-detail-formatter">
            <Formatter
              field={creatorField}
              value={repoInfo.owner_email}
              collaborators={[{
                name: repoInfo.owner_name,
                contact_email: repoInfo.owner_contact_email,
                email: repoInfo.owner_email,
                avatar_url: repoInfo.owner_avatar,
              }]}
            />
          </DetailItem>
          <DetailItem field={mtimeField} className="sf-metadata-property-detail-formatter">
            <Formatter field={mtimeField} value={repoInfo.last_modified} />
          </DetailItem>
        </div>
      </Body>
    </>
  );

};

LibDetail.propTypes = {
  repoInfo: PropTypes.object.isRequired,
};

export default LibDetail;
