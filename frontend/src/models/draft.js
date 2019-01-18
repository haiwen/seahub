import moment from 'moment';

class Draft {

  constructor(item) {
    this.created = item.created_at;
    this.createdStr = moment((new Date(item.created_at)).getTime()).format('YYYY-MM-DD HH:mm');
    this.id = item.id;
    this.ownerNickname = item.owner_nickname;
    this.originRepoID = item.origin_repo_id;
    this.draftFilePath = item.draft_file_path;
  }
}

export default Draft;
