import { VIEW_TYPE, VIEW_TYPE_ICON } from '../constants';
import { mediaUrl } from '../../utils/constants';

export const updateFavicon = (type) => {
  const favicon = document.getElementById('favicon');
  if (favicon) {
    switch (type) {
      case VIEW_TYPE.GALLERY:
      case 'image':
      case VIEW_TYPE.TABLE:
      case VIEW_TYPE.FACE_RECOGNITION:
      case VIEW_TYPE.KANBAN:
      case VIEW_TYPE.CARD:
      case VIEW_TYPE.MAP:
        favicon.href = `${mediaUrl}favicons/${VIEW_TYPE_ICON[type]}.png`;
        break;
      default:
        favicon.href = `${mediaUrl}favicons/favicon.png`;
    }
  }
};
