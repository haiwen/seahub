import React, { useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledPopover } from 'reactstrap';
import IconBtn from './icon-btn';
import { Utils } from '../utils/utils';
import { gettext } from '../utils/constants';
import { ROW_HEIGHT } from '../metadata/constants';
import Icon from './icon';

import '../css/set-row-height.css';

const ROW_HEIGHT_OPTIONS = [
  { label: gettext('Default'), icon: 'default', value: ROW_HEIGHT },
  { label: gettext('Double'), icon: 'double', value: 56 },
  { label: gettext('Triple'), icon: 'triple', value: 88 },
  { label: gettext('Quadruple'), icon: 'quadruple', value: 128 },
];

const SetRowHeight = ({ rowHeight = ROW_HEIGHT, modifyRowHeight, iconClass }) => {
  const [isShowSetter, setShowSetter] = useState(false);

  const onSetterToggle = useCallback(() => {
    setShowSetter(!isShowSetter);
  }, [isShowSetter]);

  const onChangeRowHeight = useCallback((value) => {
    if (value == rowHeight) return;
    modifyRowHeight(value);
    setShowSetter(false);
  }, [rowHeight, modifyRowHeight]);

  // click outside to close the popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isShowSetter) return;
      const popover = document.querySelector('.set-row-height-popover');
      const btn = document.getElementById('set-row-height-btn');
      if (
        !popover.contains(event.target) &&
        !btn.contains(event.target)
      ) {
        setShowSetter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isShowSetter]);

  return (
    <>
      <IconBtn
        symbol="row-height-default"
        className={iconClass}
        size={24}
        onClick={onSetterToggle}
        role="button"
        onKeyDown={Utils.onKeyDown}
        title={gettext('Set row height')}
        aria-label={gettext('Set row height')}
        tabIndex={0}
        id="set-row-height-btn"
      />
      {isShowSetter &&
      <UncontrolledPopover
        placement="bottom-end"
        isOpen={isShowSetter}
        target="set-row-height-btn"
        fade={false}
        hideArrow={true}
        className="set-row-height-popover"
        boundariesElement={document.body}
      >
        <div className="set-row-height-popover-content py-2">
          <h5 className='hd font-weight-normal px-3'>{gettext('Select row height')}</h5>
          <ul className="option-list list-unstyled" role="menu">
            {ROW_HEIGHT_OPTIONS.map((item, index) => {
              return (
                <li
                  key={index}
                  tabIndex="0"
                  role="menuitem"
                  className="option-item h-6 py-1 px-3 d-flex justify-content-between align-items-center"
                  onClick={() => {onChangeRowHeight(item.value);}}
                  onKeyDown={Utils.onKeyDown}
                >
                  <div>
                    <Icon symbol={`row-height-${item.icon}`} />
                    <span className="option-item-text flex-shrink-0 mr-3 ml-2">{item.label}</span>
                  </div>
                  <Icon symbol="check-thin" className={item.value === rowHeight ? '' : 'invisible'} />
                </li>
              );
            })}
          </ul>
        </div>
      </UncontrolledPopover>
      }
    </>
  );

};

SetRowHeight.propTypes = {
  rowHeight: PropTypes.number,
  modifyRowHeight: PropTypes.func,
  iconClass: PropTypes.string,
};

export default SetRowHeight;
