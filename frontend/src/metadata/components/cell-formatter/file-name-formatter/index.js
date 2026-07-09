import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../../../utils/utils';
import { ROW_HEIGHT } from '@/metadata/constants';
import { gettext, mediaUrl } from '@/utils/constants';

import './index.css';

const FileNameFormatter = ({
  record,
  value,
  className,
  children,
  iconUrl,
  defaultIconUrl,
  iconType,
  height,
  cellRef,
  onClickName = () => {}
}) => {
  const [icon, setIcon] = useState(iconUrl);
  const [currentIconType, setCurrentIconType] = useState(iconType);
  const [iconContainerStyle, setIconContainerStyle] = useState({});
  const [fileNameStyle, setFileNameStyle] = useState({});
  const isDefaultRowHeight = useMemo(() => {
    return height === ROW_HEIGHT || height === ROW_HEIGHT - 1;
  }, [height]);

  const { lockedImageUrl, lockedMessage, lockedInfo } = useMemo(() => {
    if (!record) return { lockedImageUrl: null, lockedMessage: null, lockedInfo: null };
    if (record._is_locked === undefined || record._is_freezed === undefined) return { lockedImageUrl: null, lockedMessage: null, lockedInfo: null };
    const lockedImageUrl = `${mediaUrl}img/file-${record._is_freezed ? 'freezed-32.svg' : 'locked-32.png'}`;
    const lockedMessage = record._is_freezed ? gettext('freezed') : gettext('locked');
    let lockedInfo = record._is_freezed ? gettext('Frozen by {name}') : gettext('locked by {name}');
    lockedInfo = lockedInfo.replace('{name}', record._lock_owner_name);
    return { lockedImageUrl, lockedMessage, lockedInfo };
  }, [record]);

  const onLoadError = useCallback(() => {
    if (defaultIconUrl) {
      setIcon(defaultIconUrl);
      setCurrentIconType('file-img');
    }
  }, [defaultIconUrl]);

  const onClick = useCallback((e) => {
    onClickName(e, record);
  }, [onClickName, record]);

  useEffect(() => {
    setIcon(iconUrl);
    setCurrentIconType(iconType);
  }, [iconUrl, iconType]);

  useEffect(() => {
    if (cellRef?.current) {
      const cellComputedStyle = window.getComputedStyle(cellRef.current);
      const borderTop = parseFloat(cellComputedStyle.borderTopWidth) || 0;
      const borderBottom = parseFloat(cellComputedStyle.borderBottomWidth) || 0;
      const paddingTop = parseFloat(cellComputedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(cellComputedStyle.paddingBottom) || 0;
      const size = height - borderTop - borderBottom - paddingTop - paddingBottom;
      setIconContainerStyle({ width: size, height: size });

      if (isDefaultRowHeight) {
        setFileNameStyle({});
        return;
      }

      const cellLineHeight = parseFloat(cellComputedStyle.lineHeight) || 20;
      const availableHeight = Math.max(size, 0);
      const maxVisibleLines = Math.max(Math.floor(availableHeight / cellLineHeight), 1);
      setFileNameStyle({
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: maxVisibleLines,
        lineClamp: String(maxVisibleLines),
      });
    }
  }, [cellRef, height, isDefaultRowHeight]);

  if (!value) return children || null;

  return (
    <div
      className={classnames('sf-metadata-ui cell-formatter-container file-name-formatter', className, {
        'multi-line-file-name-formatter': !isDefaultRowHeight,
      })}
      title={value}
    >
      {icon &&
        <div
          className={classnames('sf-metadata-file-icon-container', {
            'sf-metadata-file-thumbnail-icon-container': currentIconType === 'thumbnail',
            'sf-metadata-file-img-icon-container': currentIconType === 'file-img',
          })}
          style={iconContainerStyle}
        >
          <img
            className={classnames('sf-metadata-file-icon', {
              thumbnail: currentIconType === 'thumbnail',
              'file-img-icon': currentIconType === 'file-img',
            })}
            src={icon}
            onError={onLoadError}
            alt=''
          />
          {record?._is_locked && <img className="locked" src={lockedImageUrl} alt={lockedMessage} title={lockedInfo} />}
        </div>
      }
      <span
        tabIndex="0"
        role="button"
        className="sf-metadata-file-name"
        style={fileNameStyle}
        onClick={onClick}
        onKeyDown={Utils.onKeyDown}
      >
        {value}
      </span>
    </div>
  );
};

FileNameFormatter.propTypes = {
  value: PropTypes.string.isRequired,
  iconUrl: PropTypes.string,
  defaultIconUrl: PropTypes.string,
  iconType: PropTypes.oneOf(['thumbnail', 'file-img']),
  className: PropTypes.string,
  children: PropTypes.any,
  onClickName: PropTypes.func,
};

export default FileNameFormatter;
