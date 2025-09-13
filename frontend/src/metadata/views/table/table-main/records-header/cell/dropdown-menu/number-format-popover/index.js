import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label, Input } from 'reactstrap';
import CustomizePopover from '@/components/customize-popover';
import CustomizeSelect from '@/components/customize-select';
import Switch from '@/components/switch';
import { gettext } from '@/utils/constants';
import { DEFAULT_NUMBER_FORMAT } from '@/metadata/constants';

import './index.css';

// Default values constants
const DEFAULTS = {
  DECIMAL_SEPARATOR: 'dot',
  THOUSANDS_SEPARATOR: 'no',
  PRECISION: 2,
  CURRENCY_SYMBOL_POSITION: 'before',
  CURRENCY_SYMBOL: '',
  ENABLE_PRECISION: false,
};

// Format type constants
const FORMAT_TYPES = {
  CUSTOM_CURRENCY: 'custom_currency',
  NUMBER: 'number',
  PERCENT: 'percent',
  YUAN: 'yuan',
  DOLLAR: 'dollar',
  EURO: 'euro',
};

const FORMAT_OPTIONS = [
  { label: gettext('Number'), value: FORMAT_TYPES.NUMBER },
  { label: gettext('Percent'), value: FORMAT_TYPES.PERCENT },
  { label: gettext('Yuan'), value: FORMAT_TYPES.YUAN },
  { label: gettext('Dollar'), value: FORMAT_TYPES.DOLLAR },
  { label: gettext('Euro'), value: FORMAT_TYPES.EURO },
  { label: gettext('Custom currency'), value: FORMAT_TYPES.CUSTOM_CURRENCY },
];

const DECIMAL_OPTIONS = [
  { label: gettext('Comma(1,03)'), value: 'comma' },
  { label: gettext('Dot(1.03)'), value: DEFAULTS.DECIMAL_SEPARATOR },
];

const THOUSANDS_OPTIONS = [
  {
    label: gettext('No separator (1000000)'),
    value: DEFAULTS.THOUSANDS_SEPARATOR,
  },
  { label: gettext('Comma (1.000.000)'), value: 'comma' },
  { label: gettext('Space (1 000 000)'), value: 'space' },
];

const PRECISION_OPTIONS = [
  { label: '1', value: 0 },
  { label: '1.0', value: 1 },
  { label: '1.00', value: DEFAULTS.PRECISION },
  { label: '1.000', value: 3 },
];

const SIGN_POSITION_OPTIONS = [
  { label: gettext('Before'), value: DEFAULTS.CURRENCY_SYMBOL_POSITION },
  { label: gettext('After'), value: 'after' },
];

const NumberFormatPopover = ({ target, column, onToggle, onSubmit }) => {
  const currentData = useMemo(() => column.data || {}, [column.data]);

  const initialValues = useMemo(
    () => ({
      format: currentData.format || DEFAULT_NUMBER_FORMAT,
      decimal: currentData.decimal || DEFAULTS.DECIMAL_SEPARATOR,
      thousands: currentData.thousands || DEFAULTS.THOUSANDS_SEPARATOR,
      enable_precision:
        currentData.enable_precision || DEFAULTS.ENABLE_PRECISION,
      precision:
        currentData.precision !== undefined
          ? currentData.precision
          : DEFAULTS.PRECISION,
      currency_symbol: currentData.currency_symbol || DEFAULTS.CURRENCY_SYMBOL,
      currency_symbol_position:
        currentData.currency_symbol_position ||
        DEFAULTS.CURRENCY_SYMBOL_POSITION,
    }),
    [currentData]
  );

  const [format, setFormat] = useState(
    () => currentData.format || DEFAULT_NUMBER_FORMAT
  );
  const [decimalSeparator, setDecimalSeparator] = useState(
    () => currentData.decimal || DEFAULTS.DECIMAL_SEPARATOR
  );
  const [thousandsSeparator, setThousandsSeparator] = useState(
    () => currentData.thousands || DEFAULTS.THOUSANDS_SEPARATOR
  );
  const [enablePrecision, setEnablePrecision] = useState(
    () => currentData.enable_precision || DEFAULTS.ENABLE_PRECISION
  );
  const [precision, setPrecision] = useState(() =>
    currentData.precision !== undefined
      ? currentData.precision
      : DEFAULTS.PRECISION
  );
  const [customSymbol, setCustomSymbol] = useState(
    () => currentData.currency_symbol || DEFAULTS.CURRENCY_SYMBOL
  );
  const [signPosition, setSignPosition] = useState(
    () =>
      currentData.currency_symbol_position || DEFAULTS.CURRENCY_SYMBOL_POSITION
  );
  const [validationError, setValidationError] = useState('');

  const isCustomCurrency = format === FORMAT_TYPES.CUSTOM_CURRENCY;

  const hasChanges = useMemo(() => {
    const currentValues = {
      format,
      decimal: decimalSeparator,
      thousands: thousandsSeparator,
      enable_precision: enablePrecision,
      precision: enablePrecision ? precision : DEFAULTS.PRECISION,
      currency_symbol: isCustomCurrency
        ? customSymbol
        : DEFAULTS.CURRENCY_SYMBOL,
      currency_symbol_position: isCustomCurrency
        ? signPosition
        : DEFAULTS.CURRENCY_SYMBOL_POSITION,
    };

    return JSON.stringify(currentValues) !== JSON.stringify(initialValues);
  }, [
    format,
    decimalSeparator,
    thousandsSeparator,
    enablePrecision,
    precision,
    customSymbol,
    signPosition,
    isCustomCurrency,
    initialValues,
  ]);

  const validateForm = useCallback(() => {
    if (isCustomCurrency && !customSymbol.trim()) {
      setValidationError(gettext('Currency symbol is required'));
      return false;
    }
    setValidationError('');
    return true;
  }, [isCustomCurrency, customSymbol]);

  const onFormatChange = useCallback(
    (value) => {
      setFormat(value);
      setValidationError('');

      if (value !== FORMAT_TYPES.CUSTOM_CURRENCY) {
        setCustomSymbol(DEFAULTS.CURRENCY_SYMBOL);
      } else if (
        value === FORMAT_TYPES.CUSTOM_CURRENCY &&
        initialValues.format !== FORMAT_TYPES.CUSTOM_CURRENCY
      ) {
        setCustomSymbol(DEFAULTS.CURRENCY_SYMBOL);
      }
    },
    [initialValues.format]
  );

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

  const onCustomSymbolChange = useCallback(
    (e) => {
      setCustomSymbol(e.target.value);
      if (validationError) {
        setValidationError('');
      }
    },
    [validationError]
  );

  const onSignPositionChange = useCallback((value) => {
    setSignPosition(value);
  }, []);

  const handlePopoverClose = useCallback(() => {
    if (!hasChanges) {
      onToggle();
      return;
    }

    if (!validateForm()) {
      return;
    }

    const newData = {
      format,
      decimal: decimalSeparator,
      thousands: thousandsSeparator,
      enable_precision: enablePrecision,
      precision: enablePrecision ? precision : DEFAULTS.PRECISION,
    };

    if (isCustomCurrency) {
      newData.currency_symbol = customSymbol;
      newData.currency_symbol_position = signPosition;
    }

    onSubmit(newData);
    onToggle();
  }, [
    hasChanges,
    validateForm,
    format,
    decimalSeparator,
    thousandsSeparator,
    enablePrecision,
    precision,
    customSymbol,
    signPosition,
    isCustomCurrency,
    onSubmit,
    onToggle,
  ]);

  const selectedFormat = useMemo(
    () =>
      FORMAT_OPTIONS.find((option) => option.value === format) ||
      FORMAT_OPTIONS[0],
    [format]
  );

  const selectedDecimal = useMemo(
    () =>
      DECIMAL_OPTIONS.find((option) => option.value === decimalSeparator) ||
      DECIMAL_OPTIONS[1],
    [decimalSeparator]
  );

  const selectedThousands = useMemo(
    () =>
      THOUSANDS_OPTIONS.find((option) => option.value === thousandsSeparator) ||
      THOUSANDS_OPTIONS[0],
    [thousandsSeparator]
  );

  const selectedPrecision = useMemo(
    () =>
      PRECISION_OPTIONS.find((option) => option.value === precision) ||
      PRECISION_OPTIONS[2],
    [precision]
  );

  const selectedSignPosition = useMemo(
    () =>
      SIGN_POSITION_OPTIONS.find((option) => option.value === signPosition) ||
      SIGN_POSITION_OPTIONS[0],
    [signPosition]
  );

  return (
    <CustomizePopover
      target={target}
      className='sf-metadata-number-format-popover'
      popoverClassName='sf-metadata-popover number-format-settings'
      placement='bottom-start'
      isOpen={true}
      toggle={handlePopoverClose}
      hidePopover={handlePopoverClose}
      hidePopoverWithEsc={handlePopoverClose}
      hideArrow={true}
      canHide={true}
      header={gettext('Number Format Settings')}
    >
      <div className='sf-metadata-number-format-popover-content sf-metadata-column-data-settings'>
        <FormGroup>
          <Label>{gettext('Format')}</Label>
          <CustomizeSelect
            value={selectedFormat}
            options={FORMAT_OPTIONS}
            onSelectOption={onFormatChange}
          />
        </FormGroup>

        {isCustomCurrency && (
          <>
            <FormGroup>
              <Label>{gettext('Custom symbol')}</Label>
              <Input
                type='text'
                value={customSymbol}
                onChange={onCustomSymbolChange}
                placeholder={gettext('Enter custom currency symbol')}
                className={`sf-metadata-number-format-input${
                  validationError ? ' error' : ''
                }`}
              />
              {validationError && (
                <div className='sf-metadata-validation-error'>
                  {validationError}
                </div>
              )}
            </FormGroup>

            <FormGroup>
              <Label>{gettext('Symbol position')}</Label>
              <CustomizeSelect
                value={selectedSignPosition}
                options={SIGN_POSITION_OPTIONS}
                onSelectOption={onSignPositionChange}
              />
            </FormGroup>
          </>
        )}

        <FormGroup>
          <Label>{gettext('Decimal separator')}</Label>
          <CustomizeSelect
            value={selectedDecimal}
            options={DECIMAL_OPTIONS}
            onSelectOption={onDecimalSeparatorChange}
          />
        </FormGroup>

        <FormGroup>
          <Label>{gettext('Thousands separator')}</Label>
          <CustomizeSelect
            value={selectedThousands}
            options={THOUSANDS_OPTIONS}
            onSelectOption={onThousandsSeparatorChange}
          />
        </FormGroup>

        <FormGroup>
          <Switch
            className="enforce-precision-switch"
            checked={enablePrecision}
            placeholder={gettext('Enforce precision')}
            onChange={onEnablePrecisionChange}
            size="small"
            textPosition="right"
          />
        </FormGroup>

        {enablePrecision && (
          <FormGroup>
            <Label>{gettext('Precision')}</Label>
            <CustomizeSelect
              value={selectedPrecision}
              options={PRECISION_OPTIONS}
              onSelectOption={onPrecisionChange}
            />
          </FormGroup>
        )}
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
