import moment from 'moment';

class Review {

  constructor(item) {
    let oldTime = (new Date(item.created_at)).getTime();
    this.created_time = moment(oldTime).format('YYYY-MM-DD HH:mm');
    this.id = item.id;
    this.creator = item.creator_name; 
  }

}

export default Review;
