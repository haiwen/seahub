import { gettext } from '../../utils/constants';
import { decimalToExposureTime, getDateDisplayString } from './cell';

const IMAGE_INFO_MAPPING = {
  'Dimensions': { label: () => gettext('Dimensions'), format: value => value?.replace('x', ' x ') },
  'Capture time': { label: () => gettext('Capture time'), format: value => getDateDisplayString(value, 'YYYY-MM-DD HH:mm:ss') },
  'Focal length': { label: () => gettext('Focal length'), format: value => value ? `${value} ${gettext('mm')}` : value },
  'Exposure time': { label: () => gettext('Exposure time'), format: value => value ? `${decimalToExposureTime(value)} ${gettext('s')}` : value },
  'Device make': { label: () => gettext('Device make') },
  'Device model': { label: () => gettext('Device model') },
  'Color space': { label: () => gettext('Color space') },
  'F number': { label: () => gettext('F number') }
};

export const getImageInfo = (key, value) => {
  const info = IMAGE_INFO_MAPPING[key] || { label: () => key, format: value => value };
  return {
    name: info.label(),
    value: info.format ? info.format(value) : value
  };
};
