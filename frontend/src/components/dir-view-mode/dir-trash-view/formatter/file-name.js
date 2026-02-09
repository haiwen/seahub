import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../../../utils/utils';
import { siteRoot, thumbnailDefaultSize } from '../../../../utils/constants';
import FileNameFormatter from '../../../../metadata/components/cell-formatter/file-name-formatter';
import EventBus from '../../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../../common/event-bus-type';

const FileName = ({ repoID, column, record, className: propsClassName, value, hideIcon = false, ...params }) => {
  const parentDir = useMemo(() => record.parent_dir, [record.parent_dir]);
  const isDir = useMemo(() => record.is_dir, [record]);

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
      const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}?deleted_time=${record.deleted_time}`;
      return { iconUrl: thumbnail, defaultIconUrl };
    }
    return { iconUrl: defaultIconUrl, defaultIconUrl };
  }, [hideIcon, isDir, value, parentDir, repoID, record.deleted_time]);

  const onFileNameClick = useCallback(() => {
    const eventBus = EventBus.getInstance();
    eventBus.dispatch(EVENT_BUS_TYPE.ON_TRASH_ITEM_CLICK, record);
  }, [record]);

  return (<FileNameFormatter { ...params } className={className} value={value} onClickName={onFileNameClick} { ...iconUrl } />);

};

FileName.propTypes = {
  value: PropTypes.string,
  hideIcon: PropTypes.bool,
  record: PropTypes.object,
  className: PropTypes.string,
  onFileNameClick: PropTypes.func,
};

export default FileName;
