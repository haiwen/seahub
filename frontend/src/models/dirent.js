import moment from 'moment';
import { Utils } from '../utils/utils';
import FileTag from './file-tag';

class Dirent {
  constructor(json) {
    this.id = json.id;
    this.name = json.name;
    this.type = json.type;
    this.mtime = json.mtime;
    this.mtime_relative = moment.unix(json.mtime).fromNow();
    this.permission = json.permission;
    this.isSelected = false; // is check or not
    if (json.type === 'file') {
      this.size = Utils.bytesToSize(json.size);
      this.starred = json.starred || false;
      this.is_locked = json.is_locked || false;
      this.lock_time = json.lock_time;
      this.lock_owner= json.lock_owner;
      this.locked_by_me = json.locked_by_me;
      this.modifier_name = json.modifier_name;
      this.modifier_email = json.modifier_email;
      this.modifier_contact_email = json.modifier_contact_email;
      let file_tags = [];
      if (json.file_tags) {
        file_tags = json.file_tags.map(item => {
          return new FileTag(item);
        });
      }
      this.file_tags = file_tags;
    }
  }

  isDir() {
    return this.type !== 'file';
  }

}

export default Dirent;
