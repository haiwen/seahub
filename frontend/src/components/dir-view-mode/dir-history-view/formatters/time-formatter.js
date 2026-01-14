import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { formatWithTimezone } from '../../../../utils/time';

const TimeFormatter = ({ record }) => {
  if (!record) return null;

  const { time } = record;
  if (!time) return null;

  const formatted = dayjs(time).format('YYYY-MM-DD');
  const fullTime = formatWithTimezone(time);

  return (
    <span title={fullTime}>{formatted}</span>
  );
};

TimeFormatter.propTypes = {
  record: PropTypes.object,
};

export default TimeFormatter;
