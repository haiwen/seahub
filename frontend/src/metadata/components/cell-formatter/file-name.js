import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { FileNameFormatter } from '@seafile/sf-metadata-ui-component';
import { Utils } from '../../../utils/utils';
import { siteRoot, thumbnailDefaultSize } from '../../../utils/constants';
import { getParentDirFromRecord } from '../../utils/cell';
import { checkIsDir } from '../../utils/row';

const FileName = ({ record, className: propsClassName, value, ...params }) => {
  const parentDir = useMemo(() => getParentDirFromRecord(record), [record]);
  const isDir = useMemo(() => checkIsDir(record), [record]);
  const className = useMemo(() => {
    if (!Utils.imageCheck(value)) return propsClassName;
    return classnames(propsClassName, 'sf-metadata-image-file-formatter');
  }, [propsClassName, value]);

  const iconUrl = useMemo(() => {
    if (isDir) {
      const icon = Utils.getFolderIconUrl();
      return { iconUrl: icon, defaultIconUrl: icon };
    }
    const defaultIconUrl = Utils.getFileIconUrl(value);
    if (Utils.imageCheck(value)) {
      const path = Utils.encodePath(Utils.joinPath(parentDir, value));
      const repoID = window.sfMetadataStore.repoId;
      const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}`;
      return { iconUrl: thumbnail, defaultIconUrl };
    }
    return { iconUrl: defaultIconUrl, defaultIconUrl };
  }, [isDir, value, parentDir]);

  return (<FileNameFormatter { ...params } className={className} value={value} { ...iconUrl } />);

};

FileName.propTypes = {
  value: PropTypes.string,
  record: PropTypes.object.isRequired,
  className: PropTypes.string,
};

export default FileName;
