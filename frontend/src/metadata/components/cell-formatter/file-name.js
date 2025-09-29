import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import FileNameFormatter from './file-name-formatter';
import { Utils } from '../../../utils/utils';
import { siteRoot, thumbnailDefaultSize } from '../../../utils/constants';
import { getParentDirFromRecord, getFileMTimeFromRecord } from '../../utils/cell';
import { checkIsDir } from '../../utils/row';

const FileName = ({ record, className: propsClassName, value, showThumbnail = true, onFileNameClick, ...params }) => {
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
    if (Utils.imageCheck(value) && showThumbnail) {
      const path = Utils.encodePath(Utils.joinPath(parentDir, value));
      const repoID = window.sfMetadataStore.repoId;
      const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}?mtime=${getFileMTimeFromRecord(record)}`;
      return { iconUrl: thumbnail, defaultIconUrl };
    }
    return { iconUrl: defaultIconUrl, defaultIconUrl };
  }, [isDir, value, parentDir, record, showThumbnail]);

  return (<FileNameFormatter { ...params } className={className} value={value} onClickName={onFileNameClick} { ...iconUrl } />);

};

FileName.propTypes = {
  value: PropTypes.string,
  record: PropTypes.object.isRequired,
  className: PropTypes.string,
  onFileNameClick: PropTypes.func,
};

export default FileName;
