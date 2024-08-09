class PatchUtils {
  static getUsername(username) {
    // username maybe not a email(form)
    if (username && username.indexOf('@') === -1) return '';
    return username;
  }

  static getUserId(userId) {
    return userId;
  }

}

export default PatchUtils;
