import NP from 'number-precision';

class NumberUtils {

  static toThousands(num, isCurrency) {
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
  
  static formateValue(value, type) {
    if (typeof value !== 'number') {
      return value;
    }
    const commaValue = toThousands(value);
    const moneyCommaValue = toThousands(value.toFixed(2), true);
    switch(type) {
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

}

export default NumberUtils;