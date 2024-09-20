import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { CustomizePopover, IconBtn } from '@seafile/sf-metadata-ui-component';
import { SELECT_OPTION_COLORS } from '../../../../../constants';

import './index.css';

const Color = ({ option, isViewing, isPredefined, onChange }) => {
  const target = useMemo(() => `option-color-${option.id}`, [option]);
  const [isShowPopover, setPopoverShow] = useState(false);

  const openPopover = useCallback(() => {
    if (isPredefined) return;
    setPopoverShow(true);
  }, [isPredefined]);

  const closePopover = useCallback(() => {
    setPopoverShow(false);
  }, []);

  const onClick = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    setPopoverShow(false);
    const newColor = event.target.value;
    if (newColor === option?.color) return;
    const selected = SELECT_OPTION_COLORS.find(item => item.COLOR === newColor);
    const newOption = Object.assign({}, option, {
      color: newColor,
      textColor: selected.TEXT_COLOR,
      borderColor: selected.BORDER_COLOR,
    });
    onChange(newOption);
  }, [option, onChange]);

  useEffect(() => {
    if (isViewing) return;
    setPopoverShow(false);
  }, [isViewing]);

  return (
    <>
      <IconBtn
        className="sf-metadata-edit-option-color"
        id={target}
        style={{ backgroundColor: option?.color || null }}
        iconName="drop-down"
        iconStyle={{ fill: option?.textColor || '#666' }}
        onClick={openPopover}
      />
      {isShowPopover && (
        <CustomizePopover
          target={target}
          className="sf-metadata-edit-option-color-popover"
          hide={closePopover}
          hideWithEsc={closePopover}
        >
          <div className="row gutters-xs" onClick={(e) => e && e.stopPropagation()}>
            {SELECT_OPTION_COLORS.map((colorItem, index) => {
              const { COLOR: optionColor, BORDER_COLOR: borderColor, TEXT_COLOR: textColor } = colorItem;
              const isSelected = (index === 0 && !option) || option?.color === optionColor;
              return (
                <div key={colorItem.COLOR} className="col-auto">
                  <label className="color-select">
                    <input name="color" type="radio" value={optionColor} className="sf-metadata-edit-option-color-item-input" defaultChecked={isSelected} onClick={onClick} />
                    <IconBtn
                      className={classnames('sf-metadata-edit-option-color-item-container', { 'selected': isSelected })}
                      id={target}
                      style={{ backgroundColor: optionColor || null, borderColor: borderColor }}
                      iconName="check-mark"
                      iconStyle={{ fill: textColor || '#666' }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </CustomizePopover>
      )}
    </>
  );
};

Color.propTypes = {
  option: PropTypes.object,
  isViewing: PropTypes.bool,
  isPredefined: PropTypes.bool,
  onChange: PropTypes.func,
};

export default Color;
