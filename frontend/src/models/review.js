import moment from 'moment';

class Review {

  constructor(item) {
    this.created = item.created_at;
    this.createdStr = moment((new Date(item.created_at)).getTime()).format('YYYY-MM-DD HH:mm');
    this.id = item.id;
    this.creatorName = item.creator_name;
    this.draftFilePath = item.draft_file_path;
  }
}

export default Review;
