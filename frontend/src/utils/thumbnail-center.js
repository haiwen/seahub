import { seafileAPI } from '../utils/seafile-api';
import { thumbnailDefaultSize } from '../utils/constants';

class ThumbnailCenter {

  constructor() {
    this.waitingQuery = [];
    this.isStartQuery = false;
  }

  createThumbnail = ({ repoID, path, callback }) => {
    this.waitingQuery.push({ repoID, path, callback });
    if (!this.isStartQuery) {
      this.startQuery();
    }
  };

  cancelThumbnail = ({ repoID, path }) => {
    const index = this.waitingQuery.findIndex(q => (q.repoID === repoID && q.path === path));
    if (index > -1) {
      this.waitingQuery.splice(index, 1);
    }
    if (this.waitingQuery.length === 0) {
      this.isStartQuery = false;
    }
  };

  startQuery = () => {
    if (this.waitingQuery.length === 0) {
      this.isStartQuery = false;
      return;
    }
    this.isStartQuery = true;
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

// server generates image and PDF thumbnails quickly, but generates video thumbnails slowly, so use two queues
const imageThumbnailCenter = new ThumbnailCenter();

const videoThumbnailCenter = new ThumbnailCenter();

export { imageThumbnailCenter, videoThumbnailCenter };
