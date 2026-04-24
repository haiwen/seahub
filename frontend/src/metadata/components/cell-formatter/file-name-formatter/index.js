import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../../../utils/utils';
import { gettext, mediaUrl } from '@/utils/constants';

import './index.css';

const FileNameFormatter = ({
  record,
  value,
  className,
  children,
  iconUrl,
  defaultIconUrl,
  height,
  cellRef,
  onClickName = () => {}
}) => {
  const [icon, setIcon] = useState(iconUrl);
  const [iconContainerStyle, setIconContainerStyle] = useState({});

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
    defaultIconUrl && setIcon(defaultIconUrl);
  }, [defaultIconUrl]);

  const onClick = useCallback((e) => {
    onClickName(e, record);
  }, [onClickName, record]);

  useEffect(() => {
    if (cellRef.current) {
      const cellComputedStyle = window.getComputedStyle(cellRef.current);
      const borderTop = parseFloat(cellComputedStyle.borderTopWidth) || 0;
      const borderBottom = parseFloat(cellComputedStyle.borderBottomWidth) || 0;
      const paddingTop = parseFloat(cellComputedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(cellComputedStyle.paddingBottom) || 0;
      const size = height - borderTop - borderBottom - paddingTop - paddingBottom;
      setIconContainerStyle({ width: size, height: size });
    }
  }, [cellRef, height]);

  if (!value) return children || null;

  return (
    <div
      className={classnames('sf-metadata-ui cell-formatter-container file-name-formatter', className)}
      title={value}
    >
      {icon &&
        <div className="sf-metadata-file-icon-container" style={iconContainerStyle}>
          <img className="sf-metadata-file-icon" src={icon} onError={onLoadError} alt='' />
          {record?._is_locked && <img className="locked" src={lockedImageUrl} alt={lockedMessage} title={lockedInfo} />}
        </div>
      }
      <span
        tabIndex="0"
        role="button"
        className="sf-metadata-file-name"
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
  className: PropTypes.string,
  children: PropTypes.any,
  onClickName: PropTypes.func,
};

export default FileNameFormatter;
