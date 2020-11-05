import { Utils } from '../utils/utils';
import { lang } from '../utils/constants';
import moment from 'moment';

moment.locale(lang);

class OrgUserInfo {
  constructor(object) {
    this.id = object.id;
    this.name = object.name;
    this.email = object.email;
    this.contact_email = object.owner_contact_email;
    this.is_active = object.is_active;
    this.quota_usage = object.quota_usage;
    this.quota_total = object.quota_total;
    this.last_login = object.last_login ? moment(object.last_login).fromNow() : '--';
    this.ctime = moment(object.ctime).format('YYYY-MM-DD HH:mm:ss');
  }
}

export default OrgUserInfo;
