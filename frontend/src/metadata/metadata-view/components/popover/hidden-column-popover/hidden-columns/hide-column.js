import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Icon, Switch } from '@seafile/sf-metadata-ui-component';
import { COLUMNS_ICON_CONFIG } from '../../../../_basic';
import classNames from 'classnames';

const HideColumnItem = ({ readOnly, column, isHidden, onChange }) => {

  const update = useCallback(() => {
    if (readOnly) return;
    onChange(column.key);
  }, [readOnly, column, onChange]);

  return (
    <div className={classNames('hide-column-item', { 'disabled': readOnly })}>
      <Switch
        disabled={readOnly}
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
  readOnly: PropTypes.bool,
  isHidden: PropTypes.bool,
  column: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default HideColumnItem;
