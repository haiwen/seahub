class User {
  constructor(object) {
    this.avatar_url = object.avatar_url || '';
    this.contact_email = object.contact_email || '';
    this.email = object.email || '';
    this.name = object.name || '';
    this.name_pinyin = object.name_pinyin || '';
    this.id = object.id_in_org || '';
  }
}

export default User;
