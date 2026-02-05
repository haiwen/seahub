import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { Utils } from '../utils/utils';
import FileTag from './file-tag';
import { lang } from '../utils/constants';

import 'dayjs/locale/ar';
import 'dayjs/locale/de';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/fr';
import 'dayjs/locale/ru';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

class Dirent {
  constructor(json) {
    this.id = json.id || '0000000000000000';
    this.name = json.name;
    this.type = json.type;
    this.mtime = json.mtime;
    if (!json.mtime) {
      this.mtime_relative = '';
    } else {
      this.mtime_relative = dayjs.unix(json.mtime).locale(lang).fromNow();
    }
    this.permission = json.permission || 'rw';
    this.isSelected = false;
    this.starred = json.starred || false;
    if (json.type === 'dir') {
      this.has_been_shared_out = false;
      this.size = (typeof json.size === 'number') ? Utils.bytesToSize(json.size) : '';
    }
    if (json.type === 'file') {
      this.size_original = json.size_original || json.size;
      this.size = (typeof json.size === 'number') ? Utils.bytesToSize(json.size) : json.size;
      this.is_locked = json.is_locked || false;
      this.is_freezed = json.is_freezed || false;
      this.lock_time = json.lock_time || '';
      this.lock_owner = json.lock_owner || null;
      this.lock_owner_name = json.lock_owner_name || null;
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
      if (Utils.isSdocFile(json.name)) {
        this.is_sdoc_revision = json.is_sdoc_revision || false;
        this.revision_id = json.revision_id || null;
      }

      // metadata fields
      if (json._file_creator) {
        this._file_creator = json._file_creator;
      }
      if (json._file_modifier) {
        this._file_modifier = json._file_modifier;
      }
      if (json._status) {
        this._status = json._status;
      }
    }
  }

  clone() {
    return new Dirent(this);
  }

  isDir() {
    return this.type !== 'file';
  }

  toJson() {
    const json = {
      id: this.id,
      name: this.name,
      mtime: this.mtime,
      type: this.type,
      is_dir: this.type !== 'file',
      size: this.size,
      modifier_name: this.modifier_name,
      modifier_email: this.modifier_email,
      modifier_contact_email: this.modifier_contact_email,
    };
    if (this.encoded_thumbnail_src) {
      json.encoded_thumbnail_src = this.encoded_thumbnail_src;
    }
    return json;
  }

}

export default Dirent;
