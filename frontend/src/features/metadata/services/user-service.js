const PENDING_INTERVAL = 1000; // 1s

class UserService {

  constructor({ api, mediaUrl = '' }) {
    this.api = api;
    this.defaultAvatarUrl = `${mediaUrl}/avatars/default.png`;
    this.waitingQueryEmails = [];
    this.waitingExecCallbacks = [];
    this.emailUserMap = {};
  }

  queryUser = (email, callback) => {
    if (!email) return;
    this.waitingExecCallbacks.push(callback);
    if (this.emailUserMap[email] || this.waitingQueryEmails.includes(email)) return;
    this.waitingQueryEmails.push(email);
    this.startQueryUsers();
  };

  queryUsers = (emails, callback) => {
    if (!Array.isArray(emails) || emails.length === 0) return;
    let validEmails = [];
    emails.forEach(email => {
      this.waitingExecCallbacks.push(callback);
      if (!email || this.emailUserMap[email] || this.waitingQueryEmails.includes(email)) return;
      validEmails.push(email);
    });
    if (validEmails.length === 0) return;
    this.waitingQueryEmails.push(...validEmails);
    this.startQueryUsers();
  };

  startQueryUsers = () => {
    if (this.pendingTimer) return;
    this.pendingTimer = setTimeout(() => {
      if (this.waitingQueryEmails.length > 0) {
        this.api(this.waitingQueryEmails).then(res => {
          const { user_list } = res.data;
          user_list.forEach(user => {
            this.emailUserMap[user.email] = user;
          });
          this.queryUserCallback();
        }).catch(() => {
          this.waitingQueryEmails.forEach(email => {
            this.emailUserMap[email] = {
              email: email,
              name: email,
              avatar_url: this.defaultAvatarUrl,
            };
          });
          this.queryUserCallback();
        });
      }
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }, PENDING_INTERVAL);
  };

  queryUserCallback = () => {
    this.waitingExecCallbacks.forEach(callback => {
      callback(this.emailUserMap);
    });
    this.waitingQueryEmails = [];
    this.waitingExecCallbacks = [];
  };

}

export default UserService;
