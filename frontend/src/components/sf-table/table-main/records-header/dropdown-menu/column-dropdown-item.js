import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip, DropdownItem } from 'reactstrap';
import classnames from 'classnames';
import Icon from '../../../../icon';

const ColumnDropdownItem = ({
  disabled = false,
  iconName,
  target,
  title,
  tip,
  className = '',
  onChange = () => {},
  onMouseEnter = () => {},
}) => {
  const [isShowToolTip, setToolTipShow] = useState(false);

  useEffect(() => {
    if (disabled) {
      setToolTipShow(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClick = useCallback((event) => {
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();
    event.stopPropagation();
  }, []);

  if (!disabled) {
    return (
      <DropdownItem id={target} onClick={onChange} onMouseEnter={onMouseEnter} className={className}>
        <Icon symbol={iconName} />
        <span className="item-text">{title}</span>
      </DropdownItem>
    );
  }

  return (
    <>
      <DropdownItem
        className={classnames('disabled', className)}
        toggle={true}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        id={target}
      >
        <Icon symbol={iconName} />
        <span className="item-text">{title}</span>
        {isShowToolTip && (
          <UncontrolledTooltip placement="right" target={target} fade={false} delay={{ show: 0, hide: 0 }} className="sf-table-tooltip">
            {tip}
          </UncontrolledTooltip>
        )}
      </DropdownItem>
    </>
  );

};

ColumnDropdownItem.propTypes = {
  disabled: PropTypes.bool.isRequired,
  target: PropTypes.string.isRequired,
  iconName: PropTypes.string,
  title: PropTypes.string.isRequired,
  tip: PropTypes.string.isRequired,
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
};

export default ColumnDropdownItem;
