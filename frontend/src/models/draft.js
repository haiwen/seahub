import moment from 'moment';

class Draft {

  constructor(item) {
    let oldTime = (new Date(item.created_at)).getTime();
    this.time = moment(oldTime).format('YYYY-MM-DD HH:mm');
    this.id = item.id;
    this.owner = item.owner_nickname;
    this.repoID = item.origin_repo_id;
    this.path = item.draft_file_path;
  }
}

export default Draft;
