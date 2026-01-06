import PropTypes from 'prop-types';

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

