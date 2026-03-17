import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import FileNameFormatter from './file-name-formatter';
import { Utils } from '../../../utils/utils';
import { siteRoot, thumbnailDefaultSize } from '../../../utils/constants';
import { getParentDirFromRecord, getFileMTimeFromRecord } from '../../utils/cell';
import { checkIsDir } from '../../utils/row';

const FileName = ({ record, className: propsClassName, value, hideIcon = false, onFileNameClick, ...params }) => {
  const parentDir = useMemo(() => getParentDirFromRecord(record), [record]);
  const isDir = useMemo(() => checkIsDir(record), [record]);
  const className = useMemo(() => {
    if (!Utils.imageCheck(value)) return propsClassName;
    return classnames(propsClassName, 'sf-metadata-image-file-formatter');
  }, [propsClassName, value]);

  const iconUrl = useMemo(() => {
    if (hideIcon) return {};
    if (isDir) {
      const icon = Utils.getFolderIconUrl();
      return { iconUrl: icon, defaultIconUrl: icon };
    }
    const defaultIconUrl = Utils.getFileIconUrl(value);
    if (Utils.imageCheck(value)) {
      const path = Utils.encodePath(Utils.joinPath(parentDir, value));
      const repoID = window.sfMetadataStore?.repoId || params.repoID;
      const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}?mtime=${getFileMTimeFromRecord(record)}`;
      return { iconUrl: thumbnail, defaultIconUrl };
    }
    return { iconUrl: defaultIconUrl, defaultIconUrl };
  }, [isDir, hideIcon, value, parentDir, record, params.repoID]);

  return (<FileNameFormatter { ...params } className={className} value={value} record={record} onClickName={onFileNameClick} { ...iconUrl } />);

};

FileName.propTypes = {
  value: PropTypes.string,
  hideIcon: PropTypes.bool,
  record: PropTypes.object,
  className: PropTypes.string,
  onFileNameClick: PropTypes.func,
};

export default FileName;
