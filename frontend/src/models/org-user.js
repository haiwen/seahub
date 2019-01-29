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
    this.quota = object.quota > 0 ? Utils.bytesToSize(object.quota) : '';
    this.self_usage = Utils.bytesToSize(object.self_usage);
    this.last_login = object.last_login ? moment(object.last_login).fromNow() : '--';
    this.ctime = moment(object.ctime).format('YYYY-MM-DD HH:mm:ss');
  }
}

export default OrgUserInfo;
