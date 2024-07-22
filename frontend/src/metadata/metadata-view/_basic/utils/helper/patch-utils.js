class PatchUtils {
  static getUsername(username) {
    if (typeof window !== 'undefined') {
      return window.dtable && window.dtable.username;
    }
    // username maybe not a email(form)
    if (username && username.indexOf('@') === -1) return '';
    return username;
  }

  static getUserId(userId) {
    if (typeof window !== 'undefined') {
      return window.dtable && window.dtable.userId;
    }
    return userId;
  }

  static getUserDepartmentIdsMap(userDepartmentIdsMap) {
    if (typeof window !== 'undefined' && window.dtable && window.dtable.userDepartmentIdsMap) {
      return window.dtable.userDepartmentIdsMap;
    }
    return userDepartmentIdsMap;
  }
}

export default PatchUtils;
