import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Icon, Switch } from '@seafile/sf-metadata-ui-component';
import { COLUMNS_ICON_CONFIG } from '../../../../_basic';

const HideColumnItem = ({ column, isHidden, onChange }) => {

  const update = useCallback(() => {
    onChange(column.key);
  }, [column, onChange]);

  return (
    <div className="hide-column-item">
      <Switch
        checked={isHidden}
        placeholder={(
          <>
            <Icon iconName={COLUMNS_ICON_CONFIG[column.type]} />
            <span className="text-truncate">{column.name}</span>
          </>
        )}
        onChange={update}
        switchClassName="hide-column-item-switch"
      />
    </div>
  );
};

HideColumnItem.propTypes = {
  isHidden: PropTypes.bool,
  column: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default HideColumnItem;
