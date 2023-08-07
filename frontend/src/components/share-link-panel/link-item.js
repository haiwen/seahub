import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import copy from 'copy-to-clipboard';
import toaster from '../toast';
import { isPro, gettext } from '../../utils/constants';
import ShareLinkPermissionEditor from '../../components/select-editor/share-link-permission-editor';
import { Utils } from '../../utils/utils';
import CommonOperationConfirmationDialog from '../../components/dialog/common-operation-confirmation-dialog';

const propTypes = {
  item: PropTypes.object.isRequired,
  permissionOptions: PropTypes.array,
  showLinkDetails : PropTypes.func.isRequired,
  toggleSelectLink: PropTypes.func.isRequired,
  deleteLink: PropTypes.func.isRequired
};

class LinkItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemOpVisible: false,
      isDeleteShareLinkDialogOpen: false
    };
  }

  onMouseOver = () => {
    this.setState({
      isItemOpVisible: true
    });
  }

  onMouseOut = () => {
    this.setState({
      isItemOpVisible: false
    });
  }

  cutLink = (link) => {
    let length = link.length;
    return link.slice(0, 9) + '...' + link.slice(length-5);
  }

  toggleDeleteShareLinkDialog = () => {
    this.setState({isDeleteShareLinkDialogOpen: !this.state.isDeleteShareLinkDialogOpen});
  }

  copyLink = (e) => {
    e.preventDefault();
    const { item } = this.props;
    copy(item.link);
    toaster.success(gettext('Share link is copied to the clipboard.'));
  }

  viewDetails = (e) => {
    e.preventDefault();
    this.props.showLinkDetails(this.props.item);
  }

  toggleSelectLink = (e) => {
    const { item } = this.props;
    this.props.toggleSelectLink(item, e.target.checked);
  }

  deleteLink = () => {
    const { item } = this.props;
    this.props.deleteLink(item.token);
  }

  render() {
    const { isItemOpVisible } = this.state;
    const { item, permissionOptions } = this.props;
    const { isSelected = false, permissions, link, expire_date } = item;
    const currentPermission = Utils.getShareLinkPermissionStr(permissions);
    return (
      <Fragment>
        <tr onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut} className={isSelected ? 'tr-highlight' : ''}>
          <td className="text-center">
            <input type="checkbox" checked={isSelected} onChange={this.toggleSelectLink} className="vam" />
          </td>
          <td>
            <a href="#" onClick={this.viewDetails} className="text-inherit">{this.cutLink(link)}</a>
          </td>
          <td>
            {(isPro && permissions) && (
              <ShareLinkPermissionEditor
                isTextMode={true}
                isEditIconShow={false}
                currentPermission={currentPermission}
                permissionOptions={permissionOptions}
                onPermissionChanged={() => {}}
              />
            )}
          </td>
          <td>
            {expire_date ? moment(expire_date).format('YYYY-MM-DD HH:mm') : '--'}
          </td>
          <td>
            <a href="#" role="button" onClick={this.copyLink} className={`sf2-icon-copy action-icon ${isItemOpVisible ? '' : 'invisible'}`} title={gettext('Copy')} aria-label={gettext('Copy')}></a>
            <a href="#" role="button" onClick={this.viewDetails} className={`fa fa-pencil-alt attr-action-icon ${isItemOpVisible ? '' : 'invisible'}`} title={gettext('Edit')} aria-label={gettext('Edit')}></a>
            <a href="#" role="button" onClick={this.toggleDeleteShareLinkDialog} className={`sf2-icon-delete action-icon ${isItemOpVisible ? '' : 'invisible'}`} title={gettext('Delete')} aria-label={gettext('Delete')}></a>
          </td>
        </tr>
        {this.state.isDeleteShareLinkDialogOpen && (
          <CommonOperationConfirmationDialog
            title={gettext('Delete share link')}
            message={gettext('Are you sure you want to delete the share link?')}
            executeOperation={this.deleteLink}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleDeleteShareLinkDialog}
          />
        )}
      </Fragment>
    );
  }
}

LinkItem.propTypes = propTypes;

export default LinkItem;
