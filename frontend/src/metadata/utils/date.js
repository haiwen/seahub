import { DEFAULT_DATE_FORMAT, DATE_UNIT } from '../constants';
import { getFloatNumber } from './cell';

const MONTH_QUARTERS = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4];
const FORMATTING_TOKENS = /(\[[^[]*\])|([-:/.()\s]+)|(A|a|YYYY|YY?|MM?M?M?|Do|DD?|hh?|HH?|mm?|ss?|S{1,3}|z|ZZ?)/g;
const MATCH_1_2 = /\d\d?/; // 0 - 99
const MATCH2 = /\d\d/; // 00 - 99
const MATCH4 = /\d{4}/; // 0000 - 9999

const MATCHER_EXPRESSIONS = {
  mm: [MATCH_1_2, DATE_UNIT.MINUTES],
  HH: [MATCH_1_2, DATE_UNIT.HOURS],
  D: [MATCH_1_2, DATE_UNIT.DAY],
  DD: [MATCH2, DATE_UNIT.DAY],
  M: [MATCH_1_2, DATE_UNIT.MONTH],
  MM: [MATCH2, DATE_UNIT.MONTH],
  YYYY: [MATCH4, DATE_UNIT.YEAR],
};

const MATCHER_DATE_PARTS = ['YYYY', 'MM', 'M', 'DD', 'D'];

class DateUtils {
  /**
   * return the formatted date with target format.
   * @param {string|date object} date
   * @param {string} format
   * @returns formatted date
   */
  static format(date, format) {
    const dateObject = this.getValidDate(date);
    if (!dateObject) {
      return '';
    }
    const upperCaseFormat = format && format.toUpperCase();
    const year = dateObject.getFullYear();
    const month = dateObject.getMonth() + 1;
    const day = dateObject.getDate();
    const displayMonth = month < 10 ? `0${month}` : month;
    const displayDay = day < 10 ? `0${day}` : day;
    switch (upperCaseFormat) {
      case 'YYYY-MM-DD HH:MM:SS': {
        const hours = dateObject.getHours();
        const minutes = dateObject.getMinutes();
        const seconds = dateObject.getSeconds();
        const disPlayHours = hours < 10 ? `0${hours}` : hours;
        const disPlayMinutes = minutes < 10 ? `0${minutes}` : minutes;
        const disPlaySeconds = seconds < 10 ? `0${seconds}` : seconds;
        return `${year}-${displayMonth}-${displayDay} ${disPlayHours}:${disPlayMinutes}:${disPlaySeconds}`;
      }
      case 'YYYY-MM-DD HH:MM': {
        const hours = dateObject.getHours();
        const minutes = dateObject.getMinutes();
        const disPlayHours = hours < 10 ? `0${hours}` : hours;
        const disPlayMinutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${year}-${displayMonth}-${displayDay} ${disPlayHours}:${disPlayMinutes}`;
      }
      default: {
        return `${year}-${displayMonth}-${displayDay}`;
      }
    }
  }

  /**
   * returns the formatted date with granularity.
   * @param {string|date object} date
   * @param {string} granularity
   * @returns formatted date
   */
  static getDateByGranularity(date, granularity) {
    const dateObject = this.getValidDate(date);
    if (!dateObject) {
      return '';
    }
    const upperCaseGranularity = granularity && granularity.toUpperCase();
    const year = dateObject.getFullYear();
    switch (upperCaseGranularity) {
      case 'YEAR': {
        return `${year}`;
      }
      case 'QUARTER': {
        const month = dateObject.getMonth();
        const quarter = MONTH_QUARTERS[month];
        return `${year}-Q${quarter}`;
      }
      case 'MONTH': {
        const month = dateObject.getMonth() + 1;
        const displayMonth = month < 10 ? `0${month}` : month;
        return `${year}-${displayMonth}`;
      }
      case 'WEEK': {
        const weekNum = dateObject.getDay();
        const startOfWeekDay = dateObject.getDate() + (weekNum === 0 ? -6 : 1 - weekNum);
        const startOfWeekDate = new Date(year, dateObject.getMonth(), startOfWeekDay);
        const month = startOfWeekDate.getMonth() + 1;
        const day = startOfWeekDate.getDate();
        const displayMonth = month < 10 ? `0${month}` : month;
        const displayDay = day < 10 ? `0${day}` : day;
        return `${startOfWeekDate.getFullYear()}-${displayMonth}-${displayDay}`;
      }
      case 'DAY': {
        const month = dateObject.getMonth() + 1;
        const day = dateObject.getDate();
        const displayMonth = month < 10 ? `0${month}` : month;
        const displayDay = day < 10 ? `0${day}` : day;
        return `${year}-${displayMonth}-${displayDay}`;
      }
      default: {
        return '';
      }
    }
  }

  static isValidDateObject(dateObject) {
    return dateObject instanceof Date && !isNaN(dateObject.getTime());
  }

  static getValidDate(date) {
    if (!date) {
      return null;
    }
    const isDateTypeString = typeof date === 'string';
    let dateString = date;
    let dateObject = date;
    if (isDateTypeString) {
      if (dateString.split(' ').length > 1 || dateString.includes('T')) {
        dateObject = new Date(date);
      } else {
        // given date is without time precision
        dateString = `${date} 00:00:00`;
        dateObject = new Date(dateString);
      }
    }
    if (this.isValidDateObject(dateObject)) return dateObject;
    if (!isDateTypeString) return null;

    // ios phone and safari browser not support use '2021-09-10 12:30', support '2021/09/10 12:30'
    dateObject = new Date(dateString.replace(/-/g, '/'));
    if (this.isValidDateObject(dateObject)) return dateObject;
    return null;
  }

  /**
   * @param {string} dateString
   * @param {string} format
   * @returns Date Object
   */
  static parseDateWithFormat(dateString, format) {
    if (dateString.includes('T')) {
      // ISO 8601 format with "T" separator directly using Date object
      const dateObj = new Date(dateString);
      return this.isValidDateObject(dateObj) ? dateObj : this.getValidDate(dateString);
    }
    try {
      const parser = this.makeParser(format);
      let {
        year, month, day, hours, minutes,
      } = parser(dateString);
      if (!year) {
        const nowDate = new Date();
        year = nowDate.getFullYear();
      }
      let dateObj = new Date(`${year}-${month}-${day} ${hours || '00'}:${minutes || '00'}`);
      if (!this.isValidDateObject(dateObj)) {
        return this.getValidDate(dateString);
      }
      return dateObj;
    } catch (err) {
      return this.getValidDate(dateString);
    }
  }

  static makeParser(format) {
    // 'YYYY-MM-DD HH:mm'.match(formattingTokens):
    // ['YYYY', '-', 'MM', '-', 'DD', ' ', 'HH', ':', 'mm']
    const tokens = (format || DEFAULT_DATE_FORMAT).match(FORMATTING_TOKENS);
    const { length: formatPartsLength } = tokens;
    return (dateString) => {
      const dateParts = dateString.split(' ');
      let datePart = dateParts[0] || '';
      let timePart = dateParts[1] || '';
      let time = {};
      for (let i = 0; i < formatPartsLength; i++) {
        const token = tokens[i];
        const parseTo = MATCHER_EXPRESSIONS[token];
        if (!parseTo) continue;
        const regex = parseTo[0];
        const parserType = parseTo[1];
        if (!parserType) continue;
        const isDatePart = MATCHER_DATE_PARTS.includes(token);
        let match = isDatePart ? regex.exec(datePart) : regex.exec(timePart);
        if (!match) continue;
        const value = match[0];
        time[parserType] = value;
        if (isDatePart) {
          datePart = datePart.replace(value, '');
        } else {
          timePart = timePart.replace(value, '');
        }
      }
      return time;
    };
  }
}

const formatTextToDate = (text, format = 'YYYY-MM-DD') => {
  if (typeof text !== 'string' || !text.trim()) return null;
  let isAllNumber = /^[0-9]+$/.test(text);
  let dateObj = {};
  if (isAllNumber) {
    dateObj = new Date(getFloatNumber(text));
  } else {
    dateObj = DateUtils.parseDateWithFormat(text, format);
  }
  if (format.indexOf('HH:mm') < 0) {
    return DateUtils.format(dateObj, 'YYYY-MM-DD') || null;
  }
  return DateUtils.format(dateObj, 'YYYY-MM-DD HH:MM') || null;
};

export default DateUtils;
export { DateUtils, formatTextToDate };
