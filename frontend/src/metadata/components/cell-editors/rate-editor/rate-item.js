import React, { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import classnames from 'classnames';
import Icon from '../../../../components/icon';
import { Utils } from '../../../../utils/utils';
import { DEFAULT_RATE_DATA } from '../../../constants';

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

  const { color, type } = field.data || DEFAULT_RATE_DATA;
  let style = { color: value >= index ? color : '#eee' };

  if (enterIndex >= index) {
    style = {
      color: color,
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
        onKeyDown={Utils.onKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Rate ${index}`}
        className={classnames('sf-metadata-rate-item', { 'active': value >= index })}
        ref={ref}
      >
        <Icon className="sf-metadata-icon" symbol={type || 'rate'} />
      </div>
      {enterIndex !== -1 && (
        <UncontrolledTooltip placement='bottom' target={ref} modifiers={[{ name: 'preventOverflow', options: { boundary: document.body } }]} className="sf-metadata-tooltip">
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
