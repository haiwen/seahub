import { mediaUrl } from '../../utils/constants';

export const updateFavicon = () => {
  const favicon = document.getElementById('favicon');
  if (favicon) {
    favicon.href = `${mediaUrl}favicons/favicon.png`;
  }
};
