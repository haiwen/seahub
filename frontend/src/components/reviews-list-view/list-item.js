import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, lang } from '../constants';
import NodeMenuControl from '../menu-component/node-menu-control';
import moment from 'moment';

moment.locale(lang);
const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  onMenuToggleClick: PropTypes.func.isRequired,
}
class ListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isMenuControlShow: false,
      highlight: '',
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isMenuControlShow: true,
        highlight: 'tr-highlight'
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isMenuControlShow: false,
        highlight: ''
      });
    }
  }

  onMenuToggleClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let item = this.props.item;
    this.props.onMenuToggleClick(e, item);
  }

  onReviewsClick = () => {
    let item = this.props.item;
    let filePath = item.draft_file_path;
    let itemID = item.draft_id;
    window.location.href= siteRoot + 'drafts/review/' + itemID;
  }

  getFileName(filePath) {
    let lastIndex = filePath.lastIndexOf("/");
    return filePath.slice(lastIndex+1);
  }

  render() {
    let item = this.props.item;
    let fileName = this.getFileName(item.draft_file_path);
    let localTime = moment.utc(item.updated_at).toDate();
    localTime = moment(localTime).fromNow();
    return (
      <tr className={this.state.highlight} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="icon" style={{width: "4%"}}><img src={siteRoot + "media/img/file/192/txt.png"} /></td>
        <td className="name a-simulate" style={{width: "46%"}} onClick={this.onReviewsClick}>{fileName}</td>
        <td className="status" style={{width: "20%"}}>{item.status}</td>
        <td className="update" style={{width: "20%"}}>{localTime}</td>
      </tr>
    );
  }
}

ListItem.propTypes = propTypes;

export default ListItem;
