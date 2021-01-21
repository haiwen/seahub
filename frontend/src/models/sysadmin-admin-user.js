
class SysAdminAdminUser {
  constructor(object) {
    this.email = object.email;
    this.name = object.name;
    this.contact_email = object.contact_email;
    this.login_id = object.login_id;
    this.last_login = object.last_login;
    this.last_access_time = object.last_access_time;
    this.create_time = object.create_time;
    this.is_active = object.is_active;
    this.is_staff = object.is_staff;
    this.quota_total = object.quota_total;
    this.quota_usage = object.quota_usage;
    this.admin_role = object.admin_role;
    this.isSelected = false;
  }
}

export default SysAdminAdminUser;
