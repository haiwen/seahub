import { VIEW_TYPE } from '../constants';
import { mediaUrl } from '../../utils/constants';

export const updateFavicon = (type) => {
  const favicon = document.getElementById('favicon');
  if (favicon) {
    switch (type) {
      case VIEW_TYPE.GALLERY:
      case 'image':
        favicon.href = `${mediaUrl}favicons/gallery.png`;
        break;
      case VIEW_TYPE.TABLE:
        favicon.href = `${mediaUrl}favicons/table.png`;
        break;
      case VIEW_TYPE.FACE_RECOGNITION:
        favicon.href = `${mediaUrl}favicons/face-recognition-view.png`;
        break;
      case VIEW_TYPE.KANBAN:
        favicon.href = `${mediaUrl}favicons/kanban.png`;
        break;
      case VIEW_TYPE.MAP:
        favicon.href = `${mediaUrl}favicons/map.png`;
        break;
      default:
        favicon.href = `${mediaUrl}favicons/favicon.png`;
    }
  }
};
