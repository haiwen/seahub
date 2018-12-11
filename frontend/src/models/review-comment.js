import moment from 'moment';

class reviewComment {

  constructor(item) {
    let oldTime = (new Date(item.created_at)).getTime();
    this.time = moment(oldTime).format('YYYY-MM-DD HH:mm');
    this.id = item.id;
    this.avatarUrl = item.avatar_url;
    this.comment = item.comment;
    this.name = item.user_name;
    this.userEmail = item.user_email;
    this.resolved = item.resolved;
    if (item.detail) {
      let detail = JSON.parse(item.detail);
      this.newIndex = detail.newIndex;
      this.oldIndex = detail.oldIndex;
      this.quote = detail.quote;
    }
  }

}

export default reviewComment;