import React from 'react';
import PropTypes from 'prop-types';

/**
 * Formatter for device/version column
 * Displays device name and client version, or "API / --" for API commits
 */
const DeviceFormatter = ({ record }) => {
  if (!record) return null;
  
  if (record.client_version) {
    return `${record.device_name} / ${record.client_version}`;
  }
  
  return 'API / --';
};

DeviceFormatter.propTypes = {
  record: PropTypes.object,
};

export default DeviceFormatter;

