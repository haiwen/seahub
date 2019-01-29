import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Tooltip } from 'reactstrap';
import { siteRoot, lang } from '../../utils/constants';
import { Utils } from '../../utils/utils';

moment.locale(lang);
const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  item: PropTypes.object.isRequired,
};


class Reviewers extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      reviewerTipOpen: false, 
      reviewerList:''
    };
  }

  toggle = () => {
    this.reviewerListItem();
    this.setState({
      reviewerTipOpen: !this.state.reviewerTipOpen
    });
  }
  
  reviewerListItem = () => {
    let reviewers = '';

    this.props.item.reviewers.map(item => {
      reviewers = reviewers + ' and ' + item.user_name;
    });

    this.setState({
      reviewerList: reviewers.substr(5,)
    });
  }

  render() {
    let items = this.props.item;
    let { reviewerList } = this.state;
    return (
      <div className='position-relative reviewer-list'>
        <span id={'reviewers' + items.id}>
          {items.reviewers.map((item, index) => (
            <img key={index} id={'reviewer-tip' + '-' + items.id + '-' + index}  className="avatar avatar-sm reviewer-avatar" src={item.avatar_url} alt={item.user_name} />
          ))}
        </span>
        <Tooltip placement="bottom-end" isOpen={this.state.reviewerTipOpen} target={'reviewers' + items.id} toggle={this.toggle}>
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
      authorTipOpen: false
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
      authorTipOpen: !this.state.authorTipOpen
    });
  }

  getFileName(filePath) {
    let lastIndex = filePath.lastIndexOf('/');
    return filePath.slice(lastIndex+1);
  }

  render() {
    let item = this.props.item;
    let fileName = this.getFileName(item.draft_file_path);
    let reviewUrl = siteRoot + 'drafts/review/' + item.id;
    let localTime = moment.utc(item.updated_at).toDate();
    localTime = moment(localTime).fromNow();

    let iconUrl = Utils.getFileIconUrl(fileName);

    return (
      <tr className={this.state.highlight} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="text-center" style={{width: '4%'}}><img src={iconUrl} width="24" alt="" /></td>
        <td style={{width: '26%'}}><a href={reviewUrl} target="_blank">{fileName}</a></td>
        <td className='library' style={{width: '25%'}}>{item.draft_origin_repo_name}</td>
        <td className="update" style={{width: '20%'}}>{localTime}</td>
        <td className="author" style={{width: '10%'}}><img className="avatar avatar-sm cursor-pointer" id={'tip-' + item.id} src={item.author.avatar_url} alt={item.user_name} /></td>
        <td className="reviewer" style={{width: '15%'}}><Reviewers item={item}/></td>
        <Tooltip placement="bottom-end" isOpen={this.state.authorTipOpen} target={'tip-' + item.id} toggle={this.toggle}>
          {item.author.user_name}
        </Tooltip>
      </tr>
    );
  }
}

ReviewListItem.propTypes = propTypes;

Reviewers.propTypes = {
  item: PropTypes.object.isRequired,
};

export default ReviewListItem;
