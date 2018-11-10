import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { siteRoot, lang } from '../../utils/constants';

moment.locale(lang);
const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  item: PropTypes.object.isRequired,
};

function Reviewers(props) {
  return (
    <div>
      {props.reviewers.map((item, index) => (
        <img key={index} className="avatar avatar-sm" alt={item.username} src={item.avatar_url} />
      ))}
    </div>  
  );
}

class ReviewListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: '',
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: 'tr-highlight'
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: ''
      });
    }
  }

  onReviewsClick = () => {
    let item = this.props.item;
    let itemID = item.id;
    window.open(siteRoot + 'drafts/review/' + itemID);
  }

  getFileName(filePath) {
    let lastIndex = filePath.lastIndexOf('/');
    return filePath.slice(lastIndex+1);
  }

  render() {
    let item = this.props.item;
    let fileName = this.getFileName(item.draft_file_path);
    let localTime = moment.utc(item.updated_at).toDate();
    localTime = moment(localTime).fromNow();

    return (
      <tr className={this.state.highlight} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="icon" style={{width: '4%'}}><img src={siteRoot + 'media/img/file/192/txt.png'} alt="icon"/></td>
        <td className="name a-simulate" style={{width: '26%'}} onClick={this.onReviewsClick}>{fileName}</td>
        <td className='library' style={{width: '25%'}}>{item.draft_origin_repo_name}</td>
        <td className="update" style={{width: '20%'}}>{localTime}</td>
        <td className="author" style={{width: '10%'}}><img className="avatar avatar-sm" src={item.author.avatar_url} /></td>
        <td className="reviewer" style={{width: '15%'}}><Reviewers reviewers={item.reviewers}/></td>
      </tr>
    );
  }
}

ReviewListItem.propTypes = propTypes;

export default ReviewListItem;
