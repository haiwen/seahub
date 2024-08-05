import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Formatter, Icon } from '@seafile/sf-metadata-ui-component';
import classnames from 'classnames';
import { CellType, COLUMNS_ICON_CONFIG } from '../../../metadata/metadata-view/_basic';
import { gettext } from '../../../utils/constants';

import './index.css';

const DetailItem = ({ field, value, valueId, valueClick, children, ...params }) => {
  const icon = useMemo(() => {
    if (field.type === 'size') return COLUMNS_ICON_CONFIG[CellType.NUMBER];
    return COLUMNS_ICON_CONFIG[field.type];
  }, [field]);

  return (
    <div className="dirent-detail-item">
      <div className="dirent-detail-item-name-container">
        <Icon iconName={icon} />
        <span className="dirent-detail-item-name">{field.name}</span>
      </div>
      <div className={classnames('dirent-detail-item-value', { 'editable': valueClick })} id={valueId} onClick={valueClick}>
        {children ? children : (<Formatter { ...params } field={field} value={value}/>)}
      </div>
    </div>
  );
};

DetailItem.defaultProps = {
  emptyTip: gettext('Empty')
};

DetailItem.propTypes = {
  field: PropTypes.object.isRequired,
  value: PropTypes.any,
  children: PropTypes.any,
  valueId: PropTypes.string,
};

export default DetailItem;

