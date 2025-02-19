import { lang } from '../utils/constants';
import dayjs from 'dayjs';

dayjs.locale(lang);

class OrgLogsFileTransferEvent {
  constructor(object) {
    this.from_group_id = object.from_group_id;
    this.from_group_name = object.from_group_name;
    this.from_type = object.from_type;
    this.from_user_contact_email = object.from_user_contact_email;
    this.from_user_email = object.from_user_email;
    this.from_user_name = object.from_user_name;
    this.repo_id = object.repo_id;
    this.repo_name = object.repo_name;
    this.to_group_id = object.to_group_id;
    this.to_group_name = object.to_group_name;
    this.to_type = object.to_type;
    this.to_user_contact_email = object.to_user_contact_email;
    this.to_user_email = object.to_user_email;
    this.to_user_name = object.to_user_name;
    this.time = dayjs(object.date).format('YYYY-MM-DD HH:mm:ss');
  }
}

export default OrgLogsFileTransferEvent;
