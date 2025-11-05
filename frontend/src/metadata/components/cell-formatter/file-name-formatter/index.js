import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../../../utils/utils';

import './index.css';

const FileNameFormatter = ({
  value,
  className,
  children,
  iconUrl,
  defaultIconUrl,
  onClickName = () => {}
}) => {
  const [icon, setIcon] = useState(iconUrl);

  const onLoadError = useCallback(() => {
    defaultIconUrl && setIcon(defaultIconUrl);
  }, [defaultIconUrl]);

  if (!value) return children || null;
  return (
    <div
      className={classnames('sf-metadata-ui cell-formatter-container file-name-formatter', className)}
      title={value}
    >
      {icon &&
        <div className="sf-metadata-file-icon-container">
          <img className="sf-metadata-file-icon" src={icon} onError={onLoadError} alt='' />
        </div>
      }
      <span
        tabIndex="0"
        role="button"
        className="sf-metadata-file-name"
        onClick={onClickName}
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
