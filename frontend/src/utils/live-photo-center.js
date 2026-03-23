import { seafileAPI } from '../utils/seafile-api';

class LivePhotoCenter {

  constructor() {
    this.waitingQuery = [];
    this.queryStart = false;
  }

  checkLivePhoto = ({ repoID, path, callback }) => {
    this.waitingQuery.push({ repoID, path, callback });
    if (!this.queryStart) {
      this.startQuery();
    }
  };

  cancelCheck = ({ repoID, path }) => {
    const index = this.waitingQuery.findIndex(q => (q.repoID === repoID && q.path === path));
    if (index > -1) {
      this.waitingQuery.splice(index, 1);
    }
  };

  startQuery = () => {
    if (this.waitingQuery.length === 0) {
      this.queryStart = false;
      return;
    }
    this.queryStart = true;
    let { repoID, path, callback } = this.waitingQuery[0];
    seafileAPI.checkLivePhoto(repoID, path).then((res) => {
      callback && callback(res.data.is_live_photo);
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.log(error);
    }).then(() => {
      this.waitingQuery.shift();
      this.startQuery();
    });
  };
}

const livePhotoCenter = new LivePhotoCenter();

export { livePhotoCenter };
