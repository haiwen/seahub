import { lang } from '../utils/constants';
import moment from 'moment';

moment.locale(lang);

class OrgLogsFileUpdateEvent {
  constructor(object) {
    this.repo_id = object.repo_id;
    this.description = object.description;
    this.repo_name = object.repo_name;
    this.user_name = object.user_name;
    this.user_email = object.user_email;
    this.repo_encrypted = object.repo_encrypted;
    this.repo_commit_id = object.repo_commit_id;
    this.user_contact_email = object.user_contact_email;
    this.time = moment(object.time).format('YYYY-MM-DD HH:mm:ss');
  }
}

export default OrgLogsFileUpdateEvent;
