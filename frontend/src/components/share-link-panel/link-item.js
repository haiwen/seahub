import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import copy from 'copy-to-clipboard';
import classnames from 'classnames';
import QRCodePopover from '../qr-code-popover';
import toaster from '../toast';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import CommonOperationConfirmationDialog from '../../components/dialog/common-operation-confirmation-dialog';
import Icon from '../icon';
import ClickOutside from '../click-outside';

const propTypes = {
  idx: PropTypes.number.isRequired,
  item: PropTypes.object.isRequired,
  showLinkDetails: PropTypes.func.isRequired,
  toggleSelectLink: PropTypes.func.isRequired,
  deleteLink: PropTypes.func.isRequired
};

class LinkItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isItemOpVisible: false,
      isDeleteShareLinkDialogOpen: false,
      isQRCodePopoverOpen: false
    };
    this.qrCodeBtn = React.createRef();
  }

  onMouseOver = () => {
    this.setState({
      isHighlighted: true,
      isItemOpVisible: true
    });
  };

  onMouseOut = () => {
    this.setState({
      isHighlighted: false,
      isItemOpVisible: false
    });
  };

  cutLink = (link) => {
    let length = link.length;
    return link.slice(0, 9) + '...' + link.slice(length - 5);
  };

  onDeleteIconClicked = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.toggleDeleteShareLinkDialog();
  };

  toggleDeleteShareLinkDialog = () => {
    this.setState({ isDeleteShareLinkDialogOpen: !this.state.isDeleteShareLinkDialogOpen });
  };

  onCopyIconClicked = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { item } = this.props;
    copy(item.link);
    toaster.success(gettext('Share link is copied to the clipboard.'));
  };

  clickItem = (e) => {
    this.props.showLinkDetails(this.props.item);
  };

  onCheckboxClicked = (e) => {
    e.stopPropagation();
  };

  toggleSelectLink = (e) => {
    const { item } = this.props;
    this.props.toggleSelectLink(item, e.target.checked);
  };

  deleteLink = () => {
    const { item } = this.props;
    this.props.deleteLink(item.token);
  };

  toggleQRCodePopover = () => {
    this.setState({
      isQRCodePopoverOpen: !this.state.isQRCodePopoverOpen
    });
  };

  onQRCodeIconClicked = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.toggleQRCodePopover();
  };

  translateScope = (scope) => {
    if (scope === 'all_users') {
      return gettext('Anyone with the link');
    }
    if (scope === 'specific_users') {
      return gettext('Specific users in the team');
    }
    if (scope === 'specific_emails') {
      return gettext('Specific people with email address');
    }
    return '';
  };

  onClickOutside = (e) => {
    if (this.qrCodeBtn.current && !this.qrCodeBtn.current.contains(e.target)) {
      this.setState({ isQRCodePopoverOpen: false });
    }
  };

  render() {
    const { isHighlighted, isItemOpVisible, isQRCodePopoverOpen } = this.state;
    const { item } = this.props;
    const { isSelected = false, permissions, link, expire_date } = item;
    const currentPermission = Utils.getShareLinkPermissionStr(permissions);
    const opsVisible = isItemOpVisible || isQRCodePopoverOpen || isHighlighted;
    return (
      <Fragment>
        <tr
          tabIndex={0}
          onClick={this.clickItem}
          onKeyDown={Utils.onKeyDown}
          onMouseOver={this.onMouseOver}
          onMouseOut={this.onMouseOut}
          className={classnames('cursor-pointer', {
            'tr-highlight': isHighlighted || isQRCodePopoverOpen,
            'tr-active': isSelected
          }
          )}
        >
          <td className="text-center">
            <input
              type="checkbox"
              checked={isSelected}
              className="form-check-input"
              onClick={this.onCheckboxClicked}
              onChange={this.toggleSelectLink}
              onKeyDown={Utils.onKeyDown}
            />
          </td>
          <td title={link}>
            {this.cutLink(link)}
          </td>
          <td>
            {permissions && Utils.getShareLinkPermissionObject(currentPermission).text}
          </td>
          <td>{this.translateScope(item.user_scope)}</td>
          <td>
            {expire_date ? dayjs(expire_date).format('YYYY-MM-DD HH:mm') : '--'}
          </td>
          <td>{item.password && <Icon symbol="check-thin" />}</td>
          <td>
            <a href="#" role="button" onClick={this.onCopyIconClicked} className={`sf3-font sf3-font-copy1 op-icon ${opsVisible ? '' : 'invisible'}`} title={gettext('Copy')} aria-label={gettext('Copy')}></a>
            <a href="#" role="button" onClick={this.onDeleteIconClicked} className={`sf3-font-delete1 sf3-font op-icon ${opsVisible ? '' : 'invisible'}`} title={gettext('Delete')} aria-label={gettext('Delete')}></a>
            <a href="#" role="button" id={`qr-code-button-${this.props.idx}`} ref={this.qrCodeBtn} onClick={this.onQRCodeIconClicked} className={`sf3-font sf3-font-qr-code op-icon ${opsVisible ? '' : 'invisible'}`} title={gettext('QR Code')} aria-label={gettext('QR Code')}></a>
            {isQRCodePopoverOpen && (
              <ClickOutside onClickOutside={this.onClickOutside}>
                <QRCodePopover
                  container={this.qrCodeBtn}
                  target={`qr-code-button-${this.props.idx}`}
                  value={link}
                />
              </ClickOutside>
            )}
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
