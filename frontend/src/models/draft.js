import moment from 'moment';

class Draft {

  constructor(item) {
    let oldTime = (new Date(item.created_at)).getTime();
    this.created_time = moment(oldTime).format('YYYY-MM-DD HH:mm');
    this.id = item.id;
    this.owner = item.owner_nickname;
  }

}

export default Draft;
