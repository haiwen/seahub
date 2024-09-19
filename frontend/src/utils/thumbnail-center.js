import { seafileAPI } from '../utils/seafile-api';
import { thumbnailDefaultSize } from '../utils/constants';

class ThumbnailCenter {

  constructor() {
    this.waitingQuery = [];
  }

  createThumbnail = ({ repoID, path, callback }) => {
    this.waitingQuery.push({ repoID, path, callback });
    if (this.waitingQuery.length === 1) {
      this.startQuery();
    }
  };

  cancelThumbnail = ({ repoID, path }) => {
    const index = this.waitingQuery.findIndex(q => (q.repoID === repoID && q.path === path));
    if (index > -1) {
      this.waitingQuery.splice(index, 1);
    }
  };

  startQuery = () => {
    if (this.waitingQuery.length === 0) return;
    let { repoID, path, callback } = this.waitingQuery[0];
    seafileAPI.createThumbnail(repoID, path, thumbnailDefaultSize).then((res) => {
      callback && callback(res.data.encoded_thumbnail_src);
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.log(error);
    }).then(() => {
      this.waitingQuery.shift();
      this.startQuery();
    });
  };
}

const thumbnailCenter = new ThumbnailCenter();

export default thumbnailCenter;
