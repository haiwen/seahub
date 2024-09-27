import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label } from 'reactstrap';
import classnames from 'classnames';
import { CustomizeSelect, CustomizePopover, Icon, IconBtn } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../../../utils/constants';
import { RATE_MAX_NUMBER, RATE_COLORS, RATE_TYPES } from '../../../../../constants';

import './index.css';

const RateData = ({ value, onChange, updatePopoverState }) => {
  const initValue = { max: 5, color: '#FF8000', type: 'rate', ...value };
  const { max, color, type } = initValue;
  const [isShowStylePopover, setIsShowStylePopover] = useState(false);
  const maxOptions = useMemo(() => {
    return RATE_MAX_NUMBER.map(max => ({
      label: max.name,
      value: max.name,
    }));
  }, []);

  useEffect(() => {
    onChange(initValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedMaxOption = useMemo(() => {
    return maxOptions.find(item => item.value === max) || maxOptions.find(item => item.value === 5);
  }, [maxOptions, max]);

  const openStylePopover = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    if (isShowStylePopover) return;
    setIsShowStylePopover(true);
    updatePopoverState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatePopoverState]);

  const closeStylePopover = useCallback(() => {
    setIsShowStylePopover(false);
    setTimeout(() => updatePopoverState(false), 100);
  }, [updatePopoverState]);

  const onRateStyleChange = useCallback((color, type) => {
    onChange({ ...value, color, type });
    closeStylePopover();
  }, [value, onChange, closeStylePopover]);

  const onMaxChange = useCallback((option) => {
    onChange({ ...value, max: option });
  }, [value, onChange]);

  return (
    <div className="sf-metadata-column-data-settings sf-metadata-rate-column-data-settings">
      <div className="column-data-settings-container">
        <FormGroup className="rate-column-data-setting-item rate-column-data-style-setting">
          <Label>{gettext('Style')}</Label>
          <div
            className={classnames('sf-metadata-select custom-select rate-column-data-style-setting-wrapper', { 'focus': isShowStylePopover })}
            id="sf-metadata-rate-column-data-style-setting-wrapper"
            onClick={openStylePopover}
          >
            <div className="selected-option" style={{ fill: color }}><Icon iconName={type} /></div>
            <Icon iconName="drop-down" />
          </div>
          {isShowStylePopover && (
            <CustomizePopover
              target="sf-metadata-rate-column-data-style-setting-wrapper"
              className="sf-metadata-rate-column-data-style-setting-popover"
              hide={closeStylePopover}
              hideWithEsc={closeStylePopover}
              modifiers={{ preventOverflow: { boundariesElement: document.body } }}
            >
              <div className="rate-column-style-list">
                {RATE_COLORS.map(color => {
                  return RATE_TYPES.map(type => {
                    return (
                      <IconBtn
                        key={type + 'color' + color}
                        iconName={type}
                        onClick={() => onRateStyleChange(color, type)}
                        style={{ fill: color }}
                        className="rate-column-data-style-item"
                      />
                    );
                  });
                })}
              </div>
            </CustomizePopover>
          )}
        </FormGroup>
        <FormGroup className="rate-column-data-setting-item rate-column-data-max-setting">
          <Label>{gettext('Max')}</Label>
          <CustomizeSelect value={selectedMaxOption} options={maxOptions} onSelectOption={onMaxChange} />
        </FormGroup>
      </div>
    </div>
  );
};

RateData.propTypes = {
  value: PropTypes.object,
  onChange: PropTypes.func,
  updatePopoverState: PropTypes.func,
};

export default RateData;
