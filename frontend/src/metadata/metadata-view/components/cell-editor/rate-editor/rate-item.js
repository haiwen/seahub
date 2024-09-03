import React, { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import classnames from 'classnames';
import { Icon } from '@seafile/sf-metadata-ui-component';

const RateItem = ({
  isShowRateItem,
  field,
  enterIndex,
  index,
  value,
  onMouseEnter: onMouseEnterAPI,
  onMouseLeave: onMouseLeaveAPI,
  onChange: onChangeAPI,
}) => {
  const ref = useRef(null);

  const onMouseEnter = useCallback(() => {
    onMouseEnterAPI(index);
  }, [index, onMouseEnterAPI]);

  const onMouseLeave = useCallback(() => {
    onMouseLeaveAPI();
  }, [onMouseLeaveAPI]);

  const onChange = useCallback(() => {
    onChangeAPI(index);
  }, [index, onChangeAPI]);

  if (!isShowRateItem && index > value) return null;

  const { color, type } = field.data || {};
  let style = { fill: value >= index ? color : '#e5e5e5' };

  if (enterIndex >= index) {
    style = {
      fill: color,
      opacity: value >= index ? 1 : 0.4
    };
  }

  return (
    <>
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={style}
        onClick={onChange}
        className={classnames('sf-metadata-rate-item', { 'active': value >= index })}
        ref={ref}
      >
        <Icon iconName={type || 'rate'} />
      </div>
      {enterIndex !== -1 && (
        <UncontrolledTooltip placement='bottom' target={ref} modifiers={{ preventOverflow: { boundariesElement: document.body } }}>
          {enterIndex}
        </UncontrolledTooltip>
      )}
    </>
  );

};

RateItem.propTypes = {
  isShowRateItem: PropTypes.bool,
  field: PropTypes.object,
  enterIndex: PropTypes.number,
  index: PropTypes.number,
  value: PropTypes.number,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  onChange: PropTypes.func,
};

export default RateItem;
