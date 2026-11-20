import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FormGroup, Label } from 'reactstrap';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import CustomizePopover from '@/components/customize-popover';
import CustomizeSelect from '@/components/customize-select';
import { DROPDOWN_MENU_OFFSET_DEFAULT } from '@/components/dropdown/utils';
import Icon from '@/components/icon';
import IconBtn from '@/components/icon-btn';
import { gettext } from '@/utils/constants';
import { RATE_MAX_NUMBER, RATE_COLORS, RATE_TYPES, DEFAULT_RATE_DATA } from '../../../../../constants';

import './index.css';

const RATE_STYLE_COLOR_NAMES = {
  '#ff9800': gettext('Orange'),
  '#FFB600': gettext('Amber'),
  '#E91E63': gettext('Pink'),
  '#EB00B1': gettext('Magenta'),
  '#7626FD': gettext('Purple'),
  '#1DDD1D': gettext('Green'),
  '#02C0FF': gettext('Cyan'),
  '#00C9C7': gettext('Teal'),
  '#1688FC': gettext('Blue'),
  '#656463': gettext('Gray'),
};

const RATE_STYLE_TYPE_NAMES = {
  rate: gettext('Star'),
  like: gettext('Like'),
  praise: gettext('Praise'),
  flag: gettext('Flag'),
};

const RateData = ({ value, onChange, updatePopoverState }) => {
  const initValue = { ...DEFAULT_RATE_DATA, ...value };
  const { max, color: selectedColor, type: selectedType } = initValue;
  const [isShowStylePopover, setIsShowStylePopover] = useState(false);
  const settingsRef = useRef(null);
  const selectedBtnRef = useRef(null);
  const styleOptionsRef = useRef(null);
  const maxSelectRef = useRef(null);

  const maxOptions = useMemo(() => {
    return RATE_MAX_NUMBER.map(max => ({
      label: max.name,
      value: max.name,
    }));
  }, []);

  const selectedMaxOption = useMemo(() => {
    return maxOptions.find(item => item.value === max) || maxOptions.find(item => item.value === 5);
  }, [maxOptions, max]);

  const openStylePopover = useCallback(() => {
    maxSelectRef.current?.closeSelect();
    setIsShowStylePopover(!isShowStylePopover);
    updatePopoverState(!isShowStylePopover);
  }, [updatePopoverState, isShowStylePopover]);

  const closeStylePopover = useCallback((event) => {
    if (event && selectedBtnRef.current && selectedBtnRef.current.contains(event.target)) return; // did nothing during click selected-button(handle click itself)
    setIsShowStylePopover(false);
    setTimeout(() => updatePopoverState(false), 100);
  }, [updatePopoverState]);

  const closeStylePopoverWithEsc = useCallback(() => {
    closeStylePopover();
    selectedBtnRef.current?.focus();
  }, [closeStylePopover]);

  const onStyleTriggerKeyDown = useCallback((event) => {
    if (event.key !== 'Tab' || event.shiftKey || !isShowStylePopover) return;
    const firstStyleOption = styleOptionsRef.current?.querySelector('button');
    if (!firstStyleOption) return;
    event.preventDefault();
    firstStyleOption.focus();
  }, [isShowStylePopover]);

  const onStyleOptionsKeyDown = useCallback((event) => {
    if (event.key !== 'Tab') return;
    const styleOptions = styleOptionsRef.current?.querySelectorAll('button');
    if (!styleOptions?.length) return;

    if (event.shiftKey && event.target === styleOptions[0]) {
      event.preventDefault();
      selectedBtnRef.current?.focus();
      return;
    }

    if (!event.shiftKey && event.target === styleOptions[styleOptions.length - 1]) {
      const maxSelect = settingsRef.current?.querySelector('.rate-column-data-max-setting .sf-select');
      if (!maxSelect) return;
      event.preventDefault();
      closeStylePopover(event);
      maxSelect.focus();
    }
  }, [closeStylePopover]);

  const onRateStyleChange = useCallback((color, type) => {
    onChange({ ...value, color, type });
    closeStylePopover();
    selectedBtnRef.current?.focus();
  }, [value, onChange, closeStylePopover]);

  const onMaxChange = useCallback((option) => {
    closeStylePopover();
    onChange({ ...value, max: option });
  }, [value, onChange, closeStylePopover]);

  return (
    <div ref={settingsRef} className="sf-metadata-column-data-settings sf-metadata-rate-column-data-settings">
      <div className="column-data-settings-container">
        <FormGroup className="rate-column-data-setting-item rate-column-data-style-setting">
          <Label for="sf-metadata-rate-column-data-style-setting-wrapper">{gettext('Style')}</Label>
          <button
            type="button"
            className={classnames('sf-select rate-column-data-style-setting-wrapper', { 'focus': isShowStylePopover })}
            id="sf-metadata-rate-column-data-style-setting-wrapper"
            aria-expanded={isShowStylePopover}
            onClick={openStylePopover}
            onKeyDown={onStyleTriggerKeyDown}
            ref={selectedBtnRef}
          >
            <div className="selected-option" style={{ fill: selectedColor }}>
              <Icon symbol={selectedType} />
              <Icon symbol="down" />
            </div>
          </button>
          {isShowStylePopover && (
            <CustomizePopover
              target="sf-metadata-rate-column-data-style-setting-wrapper"
              popoverClassName="sf-metadata-rate-column-data-style-setting-popover"
              hidePopover={closeStylePopover}
              hidePopoverWithEsc={closeStylePopoverWithEsc}
              modifiers={[DROPDOWN_MENU_OFFSET_DEFAULT, { name: 'preventOverflow', options: { boundary: document.body } }]}
            >
              <div ref={styleOptionsRef} className="rate-column-style-list" onKeyDown={onStyleOptionsKeyDown}>
                {RATE_COLORS.map(color => {
                  return RATE_TYPES.map(type => {
                    return (
                      <IconBtn
                        key={type + 'color' + color}
                        symbol={type}
                        aria-label={`${RATE_STYLE_COLOR_NAMES[color]} ${RATE_STYLE_TYPE_NAMES[type]}`}
                        aria-pressed={color === selectedColor && type === selectedType}
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
        <FormGroup className="rate-column-data-setting-item rate-column-data-max-setting" onMouseDown={closeStylePopover}>
          <Label>{gettext('Max')}</Label>
          <CustomizeSelect
            ref={maxSelectRef}
            isInModal={true}
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
