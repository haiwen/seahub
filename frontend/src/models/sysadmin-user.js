class SysAdminUser {
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
    this.reference_id = object.reference_id;
    this.department = object.department;
    this.quota_total = object.quota_total;
    this.quota_usage = object.quota_usage;
    this.role = object.role;
    this.institution = object.institution;
    if (object.org_id) {
      this.org_id = object.org_id;
    }
    if (object.org_name) {
      this.org_name = object.org_name;
    }
    this.isSelected = false;
  }
}

export default SysAdminUser;
