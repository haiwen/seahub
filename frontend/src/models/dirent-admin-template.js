import moment from 'moment';
import { Utils } from '../utils/utils';
import FileTag from './file-tag';

class DirentAdminTemplate {
  constructor(json) {
    this.name = json.obj_name;
    this.mtime = json.last_update;
    this.size = json.file_size;
    this.is_file = json.is_file;
  }

  clone() {
    return new DirentAdminTemplate(this);
  }

  isDir() {
    return !this.is_file;
  }

}

export default DirentAdminTemplate;
