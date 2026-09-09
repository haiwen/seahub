import React, { useMemo } from 'react';
import classnames from 'classnames';
import { isString } from '../../../../utils/type-detection';
import Icon from '../../../icon';

import './index.css';

const Option = ({
  className,
  checkPlacement,
  highlight,
  isSelected,
  option,
  height,
  index,
  onChange,
  onMouseEnter,
  onMouseLeave,
}) => {
  const validCheckPlacement = useMemo(() => checkPlacement === 'left' ? 'left' : 'right', [checkPlacement]);
  const { icon, img, label, value } = option;

  return (
    <div
      className={classnames('option-editor-option', className, {
        'active': highlight,
        [`check-placement-${validCheckPlacement}`]: validCheckPlacement
      })}
      key={value}
      style={{ minHeight: height }}
      onClick={() => onChange(value)}
      onMouseEnter={() => onMouseEnter(index)}
      onMouseLeave={() => onMouseLeave(index)}
    >
      {validCheckPlacement === 'right' ? (
        <>
          <div className="option-editor-option-content">
            {option.icon && (<Icon symbol={icon} className="option-editor-option-icon mr-2 ml-0" />)}
            {option.img && (<img src={img} alt="" className="option-editor-option-icon mr-2 ml-0" />)}
            {isString(label) ? (<span className="text-truncate" title={label}>{label}</span>) : (<>{label || value}</>)}
          </div>
          {isSelected ? <Icon symbol="check-mark-option" className="option-editor-option-check-btn ml-3" /> : <span className="option-editor-option-check-btn ml-3" />}
        </>
      ) : (
        <>
          {isSelected ? <Icon symbol="check-mark-option" className="option-editor-option-check-btn mr-2" /> : <span className="option-editor-option-check-btn mr-2" />}
          <div className="option-editor-option-content">
            {option.icon && (<Icon symbol={icon} className="option-editor-option-icon mr-2 ml-0" />)}
            {option.img && (<img src={img} alt="" className="option-editor-option-icon mr-2 ml-0"/>)}
            {isString(label) ? (<span className="text-truncate" title={label}>{label}</span>) : (<>{label || value}</>)}
          </div>
        </>
      )}
    </div>
  );
};

export default Option;
