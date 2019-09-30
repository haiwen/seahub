import NP from 'number-precision';

function formatNumberValue(value, format) {
  if (typeof value !== 'number') {
    return value;
  }
  const commaValue = _toThousands(value);
  const moneyCommaValue = _toThousands(value.toFixed(2), true);
  switch(format) {
    case 'number':
      return value;
    case 'number-with-commas':
      return commaValue;
    case 'percent':
      return `${value * 100}%`;
    case 'yuan':
      return `￥${moneyCommaValue}`;
    case 'dollar':
      return `$${moneyCommaValue}`;
    case 'euro':
      return `€${moneyCommaValue}`;
    default:
      return value;
  }
}

function formatDateValue(value, format) {
  if (value === '' || !value) {
    return value;
  }
  // Compatible with older versions: if format is null, use defaultFormat
  let newValue = value.split(' ');
  let cellDate = newValue[0].split('-');
  switch(format) {
    case 'M/D/YYYY HH:mm':
      return newValue[1] ? `${Number(cellDate[1])}/${Number(cellDate[2])}/${cellDate[0]} ${newValue[1]}` : `${Number(cellDate[1])}/${Number(cellDate[2])}/${cellDate[0]}`;
    case 'D/M/YYYY HH:mm':
      return newValue[1] ? `${Number(cellDate[2])}/${Number(cellDate[1])}/${cellDate[0]} ${newValue[1]}` : `${Number(cellDate[2])}/${Number(cellDate[1])}/${cellDate[0]}`;
    case 'YYYY-MM-DD HH:mm':
      return value;
    case 'M/D/YYYY':
      return `${Number(cellDate[1])}/${Number(cellDate[2])}/${cellDate[0]}`;
    case 'D/M/YYYY':
      return `${Number(cellDate[2])}/${Number(cellDate[1])}/${cellDate[0]}`;
    case 'YYYY-MM-DD':
      return `${cellDate[0]}-${cellDate[1]}-${cellDate[2]}`;
    default:
      return value;
  }
}

function _toThousands(num, isCurrency) {
  let integer = Math.trunc(num);
  let decimal = String(Math.abs(NP.minus(num, integer))).slice(1);
  if (isCurrency) {
    if (decimal.length === 2) {
      decimal = decimal.padEnd(3, '0');
    } else {
      decimal = decimal.substring(0, 3).padEnd(3, '.00');
    }
  }
  let result = [], counter = 0;
  integer = Object.is(integer, -0) ? ['-', '0'] : integer.toString().split('');
  for (var i = integer.length - 1; i >= 0; i--) {
    counter++;
    result.unshift(integer[i]);
    if (!(counter % 3) && i != 0) {
      result.unshift(',');
    }
  }
  return result.join('') + decimal;
}

export { formatNumberValue, formatDateValue }


