import { lang } from '../utils/constants';
import moment from 'moment';

moment.locale(lang);

class OrgLogsPermAuditEvent {
  constructor(object) {
    this.from_user_name = object.from_user_name;
    this.from_user_email = object.from_user_email;
    this.from_user_contact_email = object.from_user_contact_email;
    this.to_user_email = object.to_user_email;
    this.to_user_name = object.to_user_name;
    this.to_user_contact_email = object.to_user_contact_email;
    this.to_group_name = object.to_group_name;
    this.to_group_id = object.to_group_id;
    this.type = object.type;
    this.repo_id = object.repo_id;
    this.repo_name = object.repo_name;
    this.folder_name = object.folder_name;
    this.folder_path = object.folder_path;
    this.time = moment(object.time).format('YYYY-MM-DD HH:mm:ss');
    this.permission = object.permission;
  }
}

export default OrgLogsPermAuditEvent;
