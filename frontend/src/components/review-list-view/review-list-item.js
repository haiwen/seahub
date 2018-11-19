import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Tooltip } from 'reactstrap';
import { siteRoot, lang } from '../../utils/constants';

moment.locale(lang);
const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  item: PropTypes.object.isRequired,
};


class Reviewers extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      reviewertipOpen: false, 
      reviewerList:''
    };
  }

  toggle = () => {
    this.setState({
      reviewertipOpen: !this.state.reviewertipOpen
    });
  }
  
  reviewerListItem = () => {
    let reviewers = '';

    this.props.item.reviewers.map(item => {
      reviewers = reviewers + ' and ' + item.user_name
    });

    this.setState({
      reviewerList: reviewers.substr(5,)
    });
  }

  render() {
    let items = this.props.item;
    let { reviewerList } = this.state;
    return (
      <div className='dirent-item tag-list tag-list-stacked'>
        <span id={'reviewers' + items.id}>
        {items.reviewers.map((item, index) => (
          <img key={index} id={'reviewer-tip' + '-' + items.id + '-' + index} onMouseEnter={this.reviewerListItem} className="avatar file-tag avatar-sm" style={{width: '1.5rem', height: '1.5rem'}} src={item.avatar_url} />
        ))}
        </span>
        <Tooltip placement="bottom" isOpen={this.state.reviewertipOpen} target={'reviewers' + items.id} toggle={this.toggle}>
          {reviewerList}
        </Tooltip>
      </div>  
    );
  }
}

class ReviewListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: '',
      authortipOpen: false
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

  toggle = () => {
    this.setState({
      authortipOpen: !this.state.authortipOpen
    });
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
        <td className="author" style={{width: '10%'}}><img className="avatar avatar-sm" id={'tip-' + item.id} src={item.author.avatar_url} /></td>
        <td className="reviewer" style={{width: '15%'}}><Reviewers item={item}/></td>
        <Tooltip placement="bottom-end" isOpen={this.state.authortipOpen} target={'tip-' + item.id} toggle={this.toggle}>
          {item.author.user_name}
        </Tooltip>
      </tr>
    );
  }
}

ReviewListItem.propTypes = propTypes;

export default ReviewListItem;
