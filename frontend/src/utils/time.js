import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const DEFAULT_TIMEZONE_FORMAT = 'MMMM D, YYYY, h:mm:ss A';

const formatWithTimezone = (date) => {
  if (!date) return '';
  const formattedDate = dayjs(date).format(DEFAULT_TIMEZONE_FORMAT);
  const offset = dayjs(date).utcOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const sign = offset >= 0 ? '+' : '-';
  return `${formattedDate} GMT${sign}${hours}`;
};

const formatUnixWithTimezone = (date) => {
  if (!date) return '';
  const formattedDate = dayjs.unix(date).format(DEFAULT_TIMEZONE_FORMAT);
  const offset = dayjs(date).utcOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const sign = offset >= 0 ? '+' : '-';
  return `${formattedDate} GMT${sign}${hours}`;
};

export { formatWithTimezone, formatUnixWithTimezone };
