class SysAdminUser {
  constructor(object) {
    this.login_id = object.login_id;
    this.quota_usage = object.quota_usage;
    this.last_login = object.last_login;
    this.name = object.name;
    this.create_time = object.create_time;
    this.is_active = object.is_active;
    this.is_staff = object.is_staff;
    this.contact_email = object.contact_email;
    this.reference_id = object.reference_id;
    this.department = object.department;
    this.quota_total = object.quota_total;
    this.role = object.role;
    this.admin_role = object.admin_role;
    this.email = object.email;
    this.isSelected = false;
  }
}

export default SysAdminUser;
