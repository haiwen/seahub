import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label, Input } from 'reactstrap';
import CustomizePopover from '@/components/customize-popover';
import CustomizeSelect from '@/components/customize-select';
import { gettext } from '@/utils/constants';
import { DEFAULT_NUMBER_FORMAT } from '@/metadata/constants';

import './index.css';

const FORMAT_OPTIONS = [
  { label: gettext('Number'), value: 'number' },
  { label: gettext('Percentage'), value: 'percent' },
  { label: gettext('Chinese Yuan'), value: 'yuan' },
  { label: gettext('Dollar'), value: 'dollar' },
  { label: gettext('Euro'), value: 'euro' },
  { label: gettext('Custom Currency'), value: 'custom_currency' },
];

const DECIMAL_OPTIONS = [
  { label: gettext('Comma(1,03)'), value: 'comma' },
  { label: gettext('Dot(1.03)'), value: 'dot' },
];

const THOUSANDS_OPTIONS = [
  { label: gettext('No Separator(1000000)'), value: 'no' },
  { label: gettext('Comma(1.000.000)'), value: 'comma' },
  { label: gettext('Space(1 000 000)'), value: 'space' },
];

const PRECISION_OPTIONS = [
  { label: '1', value: 0 },
  { label: '1.0', value: 1 },
  { label: '1.00', value: 2 },
  { label: '1.000', value: 3 },
];

const SIGN_POSITION_OPTIONS = [
  { label: gettext('Before'), value: 'before' },
  { label: gettext('After'), value: 'after' },
];

const NumberFormatPopover = ({ target, column, onToggle, onSubmit }) => {
  const currentData = useMemo(() => column.data || {}, [column.data]);

  // Initialize state with current values
  const [format, setFormat] = useState(() => currentData.format || DEFAULT_NUMBER_FORMAT);
  const [decimalSeparator, setDecimalSeparator] = useState(() => currentData.decimal || 'dot');
  const [thousandsSeparator, setThousandsSeparator] = useState(() => currentData.thousands || 'no');
  const [enablePrecision, setEnablePrecision] = useState(() => currentData.enable_precision || false);
  const [precision, setPrecision] = useState(() => currentData.precision !== undefined ? currentData.precision : 2);
  const [customSymbol, setCustomSymbol] = useState(() => currentData.currency_symbol || '');
  const [signPosition, setSignPosition] = useState(() => currentData.currency_symbol_position || 'before');

  const isCustomCurrency = format === 'custom_currency';

  // Event handlers
  const onFormatChange = useCallback((value) => {
    setFormat(value);
  }, []);

  const onDecimalSeparatorChange = useCallback((value) => {
    setDecimalSeparator(value);
  }, []);

  const onThousandsSeparatorChange = useCallback((value) => {
    setThousandsSeparator(value);
  }, []);

  const onEnablePrecisionChange = useCallback((e) => {
    setEnablePrecision(e.target.checked);
  }, []);

  const onPrecisionChange = useCallback((value) => {
    setPrecision(value);
  }, []);

  const onCustomSymbolChange = useCallback((e) => {
    setCustomSymbol(e.target.value);
  }, []);

  const onSignPositionChange = useCallback((value) => {
    setSignPosition(value);
  }, []);

  const onSubmitForm = useCallback(() => {
    const newData = {
      format,
      decimal: decimalSeparator,
      thousands: thousandsSeparator,
      enable_precision: enablePrecision,
      precision: enablePrecision ? precision : 2,
    };

    // Add currency-specific properties only when needed
    if (isCustomCurrency) {
      newData.currency_symbol = customSymbol;
      newData.currency_symbol_position = signPosition;
    }

    onSubmit(newData);
    onToggle();
  }, [format, decimalSeparator, thousandsSeparator, enablePrecision, precision, customSymbol, signPosition, isCustomCurrency, onSubmit, onToggle]);

  const onCancel = useCallback(() => {
    onToggle();
  }, [onToggle]);

  const selectedFormat = useMemo(() => (
    FORMAT_OPTIONS.find(option => option.value === format) || FORMAT_OPTIONS[0]
  ), [format]);

  const selectedDecimal = useMemo(() => (
    DECIMAL_OPTIONS.find(option => option.value === decimalSeparator) || DECIMAL_OPTIONS[1]
  ), [decimalSeparator]);

  const selectedThousands = useMemo(() => (
    THOUSANDS_OPTIONS.find(option => option.value === thousandsSeparator) || THOUSANDS_OPTIONS[0]
  ), [thousandsSeparator]);

  const selectedPrecision = useMemo(() => (
    PRECISION_OPTIONS.find(option => option.value === precision) || PRECISION_OPTIONS[2]
  ), [precision]);

  const selectedSignPosition = useMemo(() => (
    SIGN_POSITION_OPTIONS.find(option => option.value === signPosition) || SIGN_POSITION_OPTIONS[0]
  ), [signPosition]);

  return (
    <CustomizePopover
      target={target}
      className="sf-metadata-number-format-popover"
      popoverClassName="sf-metadata-popover"
      placement="bottom-start"
      isOpen={true}
      toggle={onToggle}
      hidePopover={onToggle}
      hidePopoverWithEsc={onToggle}
      hideArrow={true}
      canHide={true}
      header={gettext('Number Format Settings')}
    >
      <div className="sf-metadata-number-format-popover-content sf-metadata-column-data-settings">
        <FormGroup className="">
          <Label>{gettext('Format')}</Label>
          <CustomizeSelect
            value={selectedFormat}
            options={FORMAT_OPTIONS}
            onSelectOption={onFormatChange}
          />
        </FormGroup>

        {isCustomCurrency && (
          <>
            <FormGroup className="">
              <Label>{gettext('Custom Sign')}</Label>
              <Input
                type="text"
                value={customSymbol}
                onChange={onCustomSymbolChange}
                placeholder={gettext('Enter custom currency symbol')}
                className="sf-metadata-number-format-input"
              />
            </FormGroup>

            <FormGroup className="">
              <Label>{gettext('Sign Position')}</Label>
              <CustomizeSelect
                value={selectedSignPosition}
                options={SIGN_POSITION_OPTIONS}
                onSelectOption={onSignPositionChange}
              />
            </FormGroup>
          </>
        )}

        <FormGroup className="">
          <Label>{gettext('Decimal Separator')}</Label>
          <CustomizeSelect
            value={selectedDecimal}
            options={DECIMAL_OPTIONS}
            onSelectOption={onDecimalSeparatorChange}
          />
        </FormGroup>

        <FormGroup className="">
          <Label>{gettext('Thousands Separator')}</Label>
          <CustomizeSelect
            value={selectedThousands}
            options={THOUSANDS_OPTIONS}
            onSelectOption={onThousandsSeparatorChange}
          />
        </FormGroup>

        <FormGroup className="">
          <div className="d-flex align-items-center">
            <Input
              type="checkbox"
              id="enable-precision"
              checked={enablePrecision}
              onChange={onEnablePrecisionChange}
              className="sf-metadata-number-format-checkbox mr-2"
            />
            <Label for="enable-precision" className="mb-0">
              {gettext('Enforce Precision')}
            </Label>
          </div>
        </FormGroup>

        {enablePrecision && (
          <FormGroup className="">
            <Label>{gettext('Precision')}</Label>
            <CustomizeSelect
              value={selectedPrecision}
              options={PRECISION_OPTIONS}
              onSelectOption={onPrecisionChange}
            />
          </FormGroup>
        )}

        <div className="sf-metadata-column-data-settings-footer d-flex justify-content-end mt-3">
          <button type="button" className="btn btn-secondary btn-sm mr-2" onClick={onCancel}>
            {gettext('Cancel')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onSubmitForm}>
            {gettext('Submit')}
          </button>
        </div>
      </div>
    </CustomizePopover>
  );
};

NumberFormatPopover.propTypes = {
  target: PropTypes.string.isRequired,
  column: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default NumberFormatPopover;
