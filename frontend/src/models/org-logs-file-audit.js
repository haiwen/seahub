import { lang } from '../utils/constants';
import moment from 'moment';

moment.locale(lang);

class OrgLogsFileAuditEvent {
  constructor(object) {
    this.ip = object.ip;
    this.type = object.type;
    this.device = object.device;
    this.repo_id = object.repo_id;
    this.repo_name = object.repo_name;
    this.file_name = object.file_name;
    this.file_path = object.file_path;
    this.user_name = object.user_name;
    this.user_email = object.user_email;
    this.user_contact_email = object.user_contact_email;
    this.time = moment(object.time).format('YYYY-MM-DD HH:mm:ss');
  }
}

export default OrgLogsFileAuditEvent;
