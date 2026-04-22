import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import FileNameFormatter from './file-name-formatter';
import { Utils } from '../../../utils/utils';
import { siteRoot, thumbnailDefaultSize } from '../../../utils/constants';
import { getParentDirFromRecord, getFileMTimeFromRecord } from '../../utils/cell';
import { checkIsDir } from '../../utils/row';
import EventBus from '@/components/common/event-bus';
import { openFile } from '@/metadata/utils/file';
import { EDITOR_TYPE } from '@/components/sf-table/constants/grid';
import { EVENT_BUS_TYPE } from '@/components/sf-table/constants/event-bus-type';

const FileName = ({ repoID, record, className: propsClassName, value, hideIcon = false, isCellSelected, onItemClick, ...params }) => {
  const parentDir = useMemo(() => getParentDirFromRecord(record), [record]);
  const isDir = useMemo(() => checkIsDir(record), [record]);
  const className = useMemo(() => {
    if (!value) return;
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
      const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}?mtime=${getFileMTimeFromRecord(record)}`;
      return { iconUrl: thumbnail, defaultIconUrl };
    }
    return { iconUrl: defaultIconUrl, defaultIconUrl };
  }, [isDir, hideIcon, value, parentDir, record, repoID]);

  const handleFilenameClick = useCallback((event) => {
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();

    if (!isCellSelected) return;

    // For directories, use onItemClick to navigate within dirtableview
    if (isDir && onItemClick) {
      onItemClick(record);
      return;
    }

    // For files, open in new window or preview
    const eventBus = EventBus.getInstance();
    openFile(repoID, record, () => {
      eventBus.dispatch(EVENT_BUS_TYPE.OPEN_EDITOR, EDITOR_TYPE.PREVIEWER);
    });
  }, [isCellSelected, isDir, onItemClick, record, repoID]);

  return (<FileNameFormatter { ...params } className={className} value={value} record={record} onClickName={handleFilenameClick} { ...iconUrl } />);

};

FileName.propTypes = {
  value: PropTypes.string,
  hideIcon: PropTypes.bool,
  record: PropTypes.object,
  className: PropTypes.string,
  onFileNameClick: PropTypes.func,
  onItemClick: PropTypes.func,
};

export default FileName;
