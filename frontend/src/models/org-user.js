import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { lang } from '../utils/constants';

dayjs.locale(lang);
dayjs.extend(relativeTime);

class OrgUserInfo {
  constructor(object) {
    this.id = object.id;
    this.name = object.name;
    this.email = object.email;
    this.contact_email = object.owner_contact_email;
    this.is_active = object.is_active;
    this.quota_usage = object.quota_usage;
    this.quota_total = object.quota_total;
    this.last_login = object.last_login ? dayjs(object.last_login).fromNow() : '--';
    this.ctime = dayjs(object.ctime).format('YYYY-MM-DD HH:mm:ss');
  }
}

export default OrgUserInfo;
