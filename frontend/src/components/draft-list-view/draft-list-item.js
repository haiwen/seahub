import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, lang } from '../../utils/constants';
import { Utils } from '../../utils/utils';
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

  render() {
    let draft = this.props.draft;
    let repoID = draft.origin_repo_id;
    let filePath = draft.draft_file_path;
    let fileName = Utils.getFileName(filePath);
    let draftUrl = siteRoot + 'lib/' + repoID + '/file' + filePath + '?mode=edit';
    let libraryUrl = siteRoot + 'library/' + repoID + '/' + encodeURIComponent(draft.repo_name) + '/' ;
    let reviewUrl = siteRoot + 'drafts/review/' + draft.review_id + '/';
    let localTime = moment.utc(draft.updated_at).toDate();
    localTime = moment(localTime).fromNow();
    return (
      <tr className={this.state.highlight} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="text-center"><img src={siteRoot + 'media/img/file/192/txt.png'} alt='icon' /></td>
        <td className="name" >
          <a href={draftUrl} target="_blank">{fileName}</a>
        </td>
        <td className="library">
          <a href={libraryUrl} target="_blank">{draft.repo_name}</a>
        </td>
        <td className="review">
          {(draft.review_id && draft.review_status === 'open') ? 
            <a href={reviewUrl} target="_blank">#{draft.review_id}</a> : 
            <span>--</span> 
          }
        </td>
        <td className="update">{localTime}</td>
        <td className="text-center cursor-pointer">
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
