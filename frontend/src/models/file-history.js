import moment from 'moment';
moment.locale(window.app.config.lang);

export default class FileHistory {

  constructor(object) {
    this.commitId = object.commit_id || undefined;
    this.ctime = object.ctime ? moment(object.ctime).format('YYYY-MM-DD HH:mm') : '';
    this.creatorName = object.creator_name || '';
    this.size = object.size || 0;
    this.revRenamedOldPath = object.rev_renamed_old_path || '';
    this.revFileId = object.rev_file_id || '';
    this.path = object.path || '';
    this.description = object.description || '';
  }

}
