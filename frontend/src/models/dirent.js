import moment from 'moment';
import { Utils } from '../utils/utils';
import FileTag from './file-tag';

class Dirent {
  constructor(json) {
    this.id = json.id || '0000000000000000';
    this.name = json.name;
    this.type = json.type;
    this.mtime = json.mtime;
    this.mtime_relative = moment.unix(json.mtime).fromNow();
    this.permission = json.permission || 'rw';
    this.isSelected = false; // is check or not
    this.starred = json.starred || false;
    if (json.type === 'file') {
      this.size = Utils.bytesToSize(json.size);
      this.is_locked = json.is_locked || false;
      this.lock_time = json.lock_time || '';
      this.lock_owner= json.lock_owner || null;
      this.locked_by_me = json.locked_by_me || false;
      this.modifier_name = json.modifier_name || '';
      this.modifier_email = json.modifier_email || '';
      this.modifier_contact_email = json.modifier_contact_email || '';
      let file_tags = [];
      if (json.file_tags) {
        file_tags = json.file_tags.map(item => {
          return new FileTag(item);
        });
      }
      this.file_tags = file_tags;
      if (json.encoded_thumbnail_src) {
        this.encoded_thumbnail_src = json.encoded_thumbnail_src;
      }
    }
  }

  clone() {
    return new Dirent(this);
  }

  isDir() {
    return this.type !== 'file';
  }

}

export default Dirent;
