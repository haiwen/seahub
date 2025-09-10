import React, { useCallback, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label, Input } from 'reactstrap';
import CustomizePopover from '@/components/customize-popover';
import CustomizeSelect from '@/components/customize-select';
import { gettext } from '@/utils/constants';
import { DEFAULT_NUMBER_FORMAT } from '@/metadata/constants';

import './index.css';

const NumberFormatPopover = ({ target, column, onToggle, onSubmit }) => {
  const currentData = useMemo(() => column.data || {}, [column.data]);

  // Initialize with actual current values to prevent false change detection
  const [format, setFormat] = useState(() => {
    const value = currentData.format || DEFAULT_NUMBER_FORMAT;
    console.log('NumberFormatPopover: Initialize format state', { value, currentData, DEFAULT_NUMBER_FORMAT });
    return value;
  });
  const [decimalSeparator, setDecimalSeparator] = useState(() => {
    const value = currentData.decimal || 'dot';
    console.log('NumberFormatPopover: Initialize decimalSeparator state', { value, currentData });
    return value;
  });
  const [thousandsSeparator, setThousandsSeparator] = useState(() => {
    const value = currentData.thousands || 'no';
    console.log('NumberFormatPopover: Initialize thousandsSeparator state', { value, currentData });
    return value;
  });
  const [enablePrecision, setEnablePrecision] = useState(() => currentData.enable_precision || false);
  const [precision, setPrecision] = useState(() => currentData.precision !== undefined ? currentData.precision : 2);
  const [customSymbol, setCustomSymbol] = useState(() => currentData.currency_symbol || '');
  const [signPosition, setSignPosition] = useState(() => currentData.currency_symbol_position || 'before');

  // Remove dropdown states - we'll use CustomizeSelect instead

  const formatOptions = [
    { label: gettext('Number'), value: 'number' },
    { label: gettext('Percentage'), value: 'percent' },
    { label: gettext('Chinese Yuan'), value: 'yuan' },
    { label: gettext('Dollar'), value: 'dollar' },
    { label: gettext('Euro'), value: 'euro' },
    { label: gettext('Custom Currency'), value: 'custom_currency' },
  ];

  const decimalOptions = [
    { label: gettext('Comma'), value: 'comma' },
    { label: gettext('Dot'), value: 'dot' },
  ];

  const thousandsOptions = [
    { label: gettext('No Separator'), value: 'no' },
    { label: gettext('Comma'), value: 'comma' },
    { label: gettext('Space'), value: 'space' },
  ];

  const precisionOptions = [
    { label: '1', value: 0 },
    { label: '1.0', value: 1 },
    { label: '1.00', value: 2 },
    { label: '1.000', value: 3 },
    { label: '1.0000', value: 4 },
    { label: '1.00000', value: 5 },
    { label: '1.000000', value: 6 },
    { label: '1.0000000', value: 7 },
    { label: '1.00000000', value: 8 },
  ];

  const signPositionOptions = [
    { label: gettext('Before'), value: 'before' },
    { label: gettext('After'), value: 'after' },
  ];

  const isCustomCurrency = format === 'custom_currency';

  // Auto-submit when data changes (but not on initial load)
  const [isInitialized, setIsInitialized] = useState(false);

  // Capture initial values once and never recalculate them
  const [initialValues] = useState(() => ({
    format: currentData.format || DEFAULT_NUMBER_FORMAT,
    decimal: currentData.decimal || 'dot',
    thousands: currentData.thousands || 'no',
    enable_precision: currentData.enable_precision || false,
    precision: currentData.precision !== undefined ? currentData.precision : 2,
    currency_symbol: currentData.currency_symbol || '',
    currency_symbol_position: currentData.currency_symbol_position || 'before',
  }));

  useEffect(() => {
    // Mark as initialized after first render with a longer delay to prevent race conditions
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Remove auto-submit for now - let's make it manual like DateData
  /*
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const newData = {
      format,
      decimal: decimalSeparator,
      thousands: thousandsSeparator,
      enable_precision: enablePrecision,
      precision: enablePrecision ? precision : 2,
    };

    if (isCustomCurrency) {
      newData.currency_symbol = customSymbol;
      newData.currency_symbol_position = signPosition;
    }

    // Compare against initial values to detect real changes
    const hasChanged = (
      newData.format !== initialValues.format ||
      newData.decimal !== initialValues.decimal ||
      newData.thousands !== initialValues.thousands ||
      newData.enable_precision !== initialValues.enable_precision ||
      newData.precision !== initialValues.precision ||
      (isCustomCurrency && (
        newData.currency_symbol !== initialValues.currency_symbol ||
        newData.currency_symbol_position !== initialValues.currency_symbol_position
      ))
    );

    console.log('NumberFormatPopover: Change detection', {
      hasChanged,
      newData,
      initialValues,
      currentData
    });

    if (hasChanged) {
      console.log('NumberFormatPopover: Submitting changes', newData);
      onSubmit(newData);
    }
  }, [format, decimalSeparator, thousandsSeparator, enablePrecision, precision, customSymbol, signPosition, isCustomCurrency, onSubmit, isInitialized, initialValues]);
  */

  const onFormatChange = useCallback((value) => {
    console.log('NumberFormatPopover: onFormatChange called', { value, previousFormat: format });
    setFormat(value);
  }, [format]);

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

    if (isCustomCurrency) {
      newData.currency_symbol = customSymbol;
      newData.currency_symbol_position = signPosition;
    }

    console.log('NumberFormatPopover: Manual submit', newData);
    onSubmit(newData);
    onToggle();
  }, [format, decimalSeparator, thousandsSeparator, enablePrecision, precision, customSymbol, signPosition, isCustomCurrency, onSubmit, onToggle]);

  const onCancel = useCallback(() => {
    onToggle();
  }, [onToggle]);

  // Get selected values for CustomizeSelect
  const selectedFormat = useMemo(() => {
    const found = formatOptions.find(option => option.value === format);
    console.log('NumberFormatPopover: selectedFormat calculation', { format, found, formatOptions });
    return found || formatOptions[0];
  }, [format, formatOptions]);

  const selectedDecimal = useMemo(() => {
    const found = decimalOptions.find(option => option.value === decimalSeparator);
    console.log('NumberFormatPopover: selectedDecimal calculation', { decimalSeparator, found });
    return found || decimalOptions[1]; // default to dot
  }, [decimalSeparator, decimalOptions]);

  const selectedThousands = useMemo(() => {
    const found = thousandsOptions.find(option => option.value === thousandsSeparator);
    console.log('NumberFormatPopover: selectedThousands calculation', { thousandsSeparator, found });
    return found || thousandsOptions[0];
  }, [thousandsSeparator, thousandsOptions]);

  const selectedPrecision = useMemo(() => {
    const found = precisionOptions.find(option => option.value === precision);
    console.log('NumberFormatPopover: selectedPrecision calculation', { precision, found });
    return found || precisionOptions[2]; // default to 2
  }, [precision, precisionOptions]);

  const selectedSignPosition = useMemo(() => {
    const found = signPositionOptions.find(option => option.value === signPosition);
    console.log('NumberFormatPopover: selectedSignPosition calculation', { signPosition, found });
    return found || signPositionOptions[0];
  }, [signPosition, signPositionOptions]);

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
            options={formatOptions}
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
                options={signPositionOptions}
                onSelectOption={onSignPositionChange}
              />
            </FormGroup>
          </>
        )}

        <FormGroup className="">
          <Label>{gettext('Decimal Separator')}</Label>
          <CustomizeSelect
            value={selectedDecimal}
            options={decimalOptions}
            onSelectOption={onDecimalSeparatorChange}
          />
        </FormGroup>

        <FormGroup className="">
          <Label>{gettext('Thousands Separator')}</Label>
          <CustomizeSelect
            value={selectedThousands}
            options={thousandsOptions}
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
              options={precisionOptions}
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
