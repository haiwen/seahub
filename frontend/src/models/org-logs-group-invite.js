import { lang } from '../utils/constants';
import dayjs from 'dayjs';

dayjs.locale(lang);

class OrgLogsGroupInviteEvent {
  constructor(object) {
    this.group_id = object.group_id;
    this.group_name = object.group_name;
    this.user_contact_email = object.user_contact_email;
    this.user_email = object.user_email;
    this.user_name = object.user_name;
    this.operator_email = object.operator_email;
    this.operator_name = object.operator_name;
    this.operator_contact_email = object.operator_contact_email;
    this.operation = object.operation;
    this.time = dayjs(object.date).format('YYYY-MM-DD HH:mm:ss');
  }
}

export default OrgLogsGroupInviteEvent;
