import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext, siteRoot, lang } from '../../utils/constants';
import { Utils } from '../../utils/utils';

moment.locale(lang);
const propTypes = {
  draft: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onDeleteHandler: PropTypes.func.isRequired,
  onPublishHandler: PropTypes.func.isRequired,
};

class DraftListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isMenuIconShow: false,
      isItemMenuShow: false,
      highlight: false,
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isMenuIconShow: true,
        highlight: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isMenuIconShow: false,
        highlight: false,
      });
    }
  }

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    this.toggleOperationMenu(e);
  }

  toggleOperationMenu = (e) => {
    e.stopPropagation();
    this.setState(
      {isItemMenuShow: !this.state.isItemMenuShow }, () => {
        if (this.state.isItemMenuShow) {
          this.props.onFreezedItem();
        } else {
          this.setState({
            highlight: false,
            isMenuIconShow: false,
          });
          this.props.onUnfreezedItem();
        }
      }
    );
  }

  onDeleteHandler = () => {
    this.props.onDeleteHandler(this.props.draft);
  }

  onPublishHandler = () => {
    this.props.onPublishHandler(this.props.draft);
  }

  render() {
    let draft = this.props.draft;
    let repoID = draft.origin_repo_id;
    let filePath = draft.draft_file_path;
    let fileName = Utils.getFileName(filePath);
    let draftUrl = siteRoot + 'drafts/' + draft.id + '/';
    let libraryUrl = siteRoot + 'library/' + repoID + '/' + encodeURIComponent(draft.repo_name) + '/' ;
    let localTime = moment.utc(draft.updated_at).toDate();
    localTime = moment(localTime).fromNow();

    let iconUrl = Utils.getFileIconUrl(fileName);
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="text-center"><img src={iconUrl} width="24" alt='' /></td>
        <td className="name" >
          <a href={draftUrl} target="_blank">{fileName}</a>
        </td>
        <td className="library">
          <a href={libraryUrl} target="_blank">{draft.repo_name}</a>
        </td>
        <td className="update">{localTime}</td>
        <td className="text-center">
          {this.state.isMenuIconShow && (
            <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
              <DropdownToggle
                tag="i"
                className="fas fa-ellipsis-v attr-action-icon"
                title={gettext('More Operations')}
                onClick={this.onDropdownToggleClick}
                data-toggle="dropdown"
                aria-expanded={this.state.isItemMenuShow}
              />
              <DropdownMenu>
                <DropdownItem onClick={this.onDeleteHandler}>{gettext('Delete')}</DropdownItem>
                {draft.status == 'open' &&
                  <DropdownItem onClick={this.onPublishHandler}>{gettext('Publish')}</DropdownItem>
                }
              </DropdownMenu>
            </Dropdown>
          )}
        </td>
      </tr>
    );
  }
}

DraftListItem.propTypes = propTypes;

export default DraftListItem;
