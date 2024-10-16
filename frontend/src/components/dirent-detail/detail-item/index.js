import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { CellType, COLUMNS_ICON_CONFIG } from '../../../metadata/constants';

import './index.css';

const DetailItem = ({ readonly, field, className, children }) => {
  const icon = useMemo(() => {
    if (field.type === 'size') return COLUMNS_ICON_CONFIG[CellType.NUMBER];
    return COLUMNS_ICON_CONFIG[field.type];
  }, [field]);

  return (
    <div className={classnames('dirent-detail-item', className)}>
      <div className="dirent-detail-item-name d-flex">
        <div><Icon iconName={icon} /></div>
        <span className="dirent-detail-item-name-value">{field.name}</span>
      </div>
      <div className={classnames('dirent-detail-item-value', { 'editable': !readonly })} >
        {children}
      </div>
    </div>
  );
};

DetailItem.defaultProps = {
  readonly: true,
};

DetailItem.propTypes = {
  readonly: PropTypes.bool,
  field: PropTypes.object.isRequired,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default DetailItem;
