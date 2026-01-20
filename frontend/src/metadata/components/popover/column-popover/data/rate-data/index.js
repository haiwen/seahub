import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label } from 'reactstrap';
import classnames from 'classnames';
import CustomizePopover from '../../../../../../components/customize-popover';
import CustomizeSelect from '../../../../../../components/customize-select';
import Icon from '../../../../../../components/icon';
import IconBtn from '../../../../../../components/icon-btn';
import { gettext } from '../../../../../../utils/constants';
import { RATE_MAX_NUMBER, RATE_COLORS, RATE_TYPES, DEFAULT_RATE_DATA } from '../../../../../constants';

import './index.css';

const RateData = ({ value, onChange, updatePopoverState }) => {
  const initValue = { ...DEFAULT_RATE_DATA, ...value };
  const { max, color, type } = initValue;
  const [isShowStylePopover, setIsShowStylePopover] = useState(false);
  const selectedBtnRef = useRef(null);

  const maxOptions = useMemo(() => {
    return RATE_MAX_NUMBER.map(max => ({
      label: max.name,
      value: max.name,
    }));
  }, []);

  const selectedMaxOption = useMemo(() => {
    return maxOptions.find(item => item.value === max) || maxOptions.find(item => item.value === 5);
  }, [maxOptions, max]);

  const openStylePopover = useCallback((event) => {
    setIsShowStylePopover(!isShowStylePopover);
    updatePopoverState(!isShowStylePopover);
  }, [updatePopoverState, isShowStylePopover]);

  const closeStylePopover = useCallback((event) => {
    if (event && selectedBtnRef.current && selectedBtnRef.current.contains(event.target)) return; // did nothing during click selected-button(handle click itself)
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
            className={classnames('seafile-customize-select custom-select rate-column-data-style-setting-wrapper', { 'focus': isShowStylePopover })}
            id="sf-metadata-rate-column-data-style-setting-wrapper"
            onClick={openStylePopover}
            ref={selectedBtnRef}
          >
            <div className="selected-option" style={{ fill: color }}>
              <Icon symbol={type} />
              <Icon symbol="arrow-down" />
            </div>
          </div>
          {isShowStylePopover && (
            <CustomizePopover
              target="sf-metadata-rate-column-data-style-setting-wrapper"
              popoverClassName="sf-metadata-rate-column-data-style-setting-popover"
              hidePopover={closeStylePopover}
              hidePopoverWithEsc={closeStylePopover}
              modifiers={[{ name: 'preventOverflow', options: { boundary: document.body } }]}
            >
              <div className="rate-column-style-list">
                {RATE_COLORS.map(color => {
                  return RATE_TYPES.map(type => {
                    return (
                      <IconBtn
                        key={type + 'color' + color}
                        symbol={type}
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
          <CustomizeSelect
            value={selectedMaxOption}
            options={maxOptions}
            onSelectOption={onMaxChange}
          />
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
