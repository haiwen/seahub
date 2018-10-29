import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, lang } from '../../utils/constants';
import MenuControl from '../menu-control';
import moment from 'moment';

moment.locale(lang);
const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  onMenuToggleClick: PropTypes.func.isRequired,
  draft: PropTypes.object.isRequired,
};

class DraftListItem extends React.Component {

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
    let draft = this.props.draft;
    this.props.onMenuToggleClick(e, draft);
  }

  onDraftEditClick = () => {
    let draft = this.props.draft;
    let filePath = draft.draft_file_path;
    let repoID = draft.origin_repo_id;
    let url =  siteRoot + 'lib/' + repoID + '/file' + filePath + '?mode=edit';
    window.open(url);
  }

  onLibraryClick = () => {
    let draft = this.props.draft;
    let repoID = draft.origin_repo_id;
    let url =  siteRoot + '#common/lib/' + repoID;
    window.open(url);
  }

  onReviewClick = () => {
    let draft = this.props.draft;
    let url = siteRoot + 'drafts/review/' + draft.review_id + '/';
    window.open(url);
  }

  getFileName(filePath) {
    let lastIndex = filePath.lastIndexOf('/');
    return filePath.slice(lastIndex+1);
  }

  render() {
    let draft = this.props.draft;
    let fileName = this.getFileName(draft.draft_file_path);
    let localTime = moment.utc(draft.updated_at).toDate();
    localTime = moment(localTime).fromNow();
    return (
      <tr className={this.state.highlight} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="icon"><img src={siteRoot + 'media/img/file/192/txt.png'} alt='icon' /></td>
        <td className="name a-simulate" >
          <span onClick={this.onDraftEditClick}>{fileName}</span>
        </td>
        <td className="library a-simulate">
          <span onClick={this.onLibraryClick}>{draft.repo_name}</span>
        </td>
        <td className="review">
          { draft.review_id && draft.review_status === 'open' ? <span className="a-simulate" onClick={this.onReviewClick}>#{draft.review_id}</span> : <span>--</span> }
        </td>
        <td className="update">{localTime}</td>
        <td className="menu-toggle">
          { 
            this.props.draft.review_status !== 'open' &&
            <MenuControl
              isShow={this.state.isMenuControlShow}
              onClick={this.onMenuToggleClick}
            />
          }
        </td>
      </tr>
    );
  }
}

DraftListItem.propTypes = propTypes;

export default DraftListItem;
