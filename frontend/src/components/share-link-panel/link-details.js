import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import copy from 'copy-to-clipboard';
import { Button } from 'reactstrap';
import { isPro, gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax, shareLinkExpireDaysDefault, canSendShareLinkEmail } from '../../utils/constants';
import Selector from '../../components/single-selector';
import CommonOperationConfirmationDialog from '../../components/dialog/common-operation-confirmation-dialog';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import ShareLink from '../../models/share-link';
import toaster from '../toast';
import SendLink from '../send-link';
import SharedLink from '../shared-link';
import SetLinkExpiration from '../set-link-expiration';
import ShareLinkScopeEditor from '../select-editor/share-link-scope-editor';
import { shareLinkAPI } from '../../utils/share-link-api';

const propTypes = {
  sharedLinkInfo: PropTypes.object.isRequired,
  permissionOptions: PropTypes.array.isRequired,
  defaultExpireDays: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  showLinkDetails: PropTypes.func.isRequired,
  updateLink: PropTypes.func.isRequired,
  deleteLink: PropTypes.func.isRequired,
  closeShareDialog: PropTypes.func.isRequired,
  setMode: PropTypes.func,
};

class LinkDetails extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      storedPasswordVisible: false,
      isEditingExpiration: false,
      isExpirationEditIconShow: false,
      expType: 'by-days',
      expireDays: this.props.defaultExpireDays,
      expDate: null,
      isOpIconShown: false,
      isLinkDeleteDialogOpen: false,
      isSendLinkShown: false,

      isScopeOpIconShown: false,
      currentScope: this.props.sharedLinkInfo.user_scope,  // all_users, specific_users, spcific_emails
      selectedOption: null,
      isSpecificUserChecked: false,
    };
  }

  onCopySharedLink = () => {
    const { sharedLinkInfo } = this.props;
    copy(sharedLinkInfo.link);
    toaster.success(gettext('Share link is copied to the clipboard.'));
  };

  onCopyDownloadLink = () => {
    const { sharedLinkInfo } = this.props;
    copy(`${sharedLinkInfo.link}?dl=1`);
    toaster.success(gettext('Direct download link is copied to the clipboard.'));
  };

  toggleStoredPasswordVisible = () => {
    this.setState({
      storedPasswordVisible: !this.state.storedPasswordVisible
    });
  };

  handleMouseOverExpirationEditIcon = () => {
    this.setState({isExpirationEditIconShow: true});
  };

  handleMouseOutExpirationEditIcon = () => {
    this.setState({isExpirationEditIconShow: false});
  };

  editingExpirationToggle = () => {
    this.setState({isEditingExpiration: !this.state.isEditingExpiration});
  };

  setExpType = (e) => {
    this.setState({
      expType: e.target.value
    });
  };

  onExpDateChanged = (value) => {
    this.setState({
      expDate: value
    });
  };

  onExpireDaysChanged = (e) => {
    let day = e.target.value.trim();
    this.setState({expireDays: day});
  };

  updateExpiration = () => {
    const { sharedLinkInfo } = this.props;
    const { expType, expireDays, expDate } = this.state;
    let expirationTime = '';
    if (expType === 'by-days') {
      expirationTime = moment().add(parseInt(expireDays), 'days').format();
    } else {
      expirationTime = expDate.format();
    }
    seafileAPI.updateShareLink(sharedLinkInfo.token, '', expirationTime).then((res) => {
      this.setState({
        isEditingExpiration: false
      });
      this.props.updateLink(new ShareLink(res.data));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  handleMouseOver = () => {
    this.setState({isOpIconShown: true});
  };

  handleMouseOut = () => {
    this.setState({isOpIconShown: false});
  };

  handleMouseOverScope = () => {
    this.setState({isScopeOpIconShown: true});
  };

  handleMouseOutScope = () => {
    this.setState({isScopeOpIconShown: false});
  };

  changePerm = (permOption) => {
    const { sharedLinkInfo } = this.props;
    const { permissionDetails } = Utils.getShareLinkPermissionObject(permOption.value);
    seafileAPI.updateShareLink(sharedLinkInfo.token, JSON.stringify(permissionDetails)).then((res) => {
      this.props.updateLink(new ShareLink(res.data));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleLinkDeleteDialog = () => {
    this.setState({isLinkDeleteDialogOpen: !this.state.isLinkDeleteDialogOpen});
  };

  toggleSendLink = () => {
    this.setState({ isSendLinkShown: !this.state.isSendLinkShown });
  };

  deleteLink = () => {
    const { sharedLinkInfo } = this.props;
    const { token } = sharedLinkInfo;
    this.props.deleteLink(token);
  };

  goBack = () => {
    this.props.showLinkDetails(null);
  };

  changeScope = (scope) => {
    shareLinkAPI.updateShareLinkScope(this.props.sharedLinkInfo.token, scope).then((res) => {
      let sharedLinkInfo = new ShareLink(res.data);
      this.setState({sharedLinkInfo: sharedLinkInfo, currentScope: sharedLinkInfo.user_scope});
      let message = gettext('Success');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onUserAuth  = () => {
    this.props.setMode('linkUserAuth', this.state.sharedLinkInfo);
  };

  onEmailAuth  = () => {
    this.props.setMode('linkEmailAuth', this.state.sharedLinkInfo);
  };


  render() {
    const { sharedLinkInfo, permissionOptions } = this.props;
    const { isOpIconShown, isScopeOpIconShown, currentScope } = this.state;
    const currentPermission = Utils.getShareLinkPermissionStr(sharedLinkInfo.permissions);
    this.permOptions = permissionOptions.map(item => {
      return {
        value: item,
        text: Utils.getShareLinkPermissionObject(item).text,
        isSelected: item === currentPermission
      };
    });
    const currentSelectedPermOption = this.permOptions.filter(item => item.isSelected)[0];

    return (
      <div>
        <button className="fa fa-arrow-left back-icon border-0 bg-transparent text-secondary p-0" onClick={this.goBack} title={gettext('Back')} aria-label={gettext('Back')}></button>
        <dl>
          <dt className="text-secondary font-weight-normal">{gettext('Link:')}</dt>
          <dd>
            <SharedLink
              link={sharedLinkInfo.link}
              linkExpired={sharedLinkInfo.is_expired}
              copyLink={this.onCopySharedLink}
            />
          </dd>
          {!sharedLinkInfo.is_dir && sharedLinkInfo.permissions.can_download && ( // just for file
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Direct Download Link:')}</dt>
              <dd>
                <SharedLink
                  link={`${sharedLinkInfo.link}?dl=1`}
                  linkExpired={sharedLinkInfo.is_expired}
                  copyLink={this.onCopyDownloadLink}
                />
              </dd>
            </>
          )}
          {sharedLinkInfo.password && (
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Password:')}</dt>
              <dd className="d-flex align-items-center">
                <span className="mr-1">{this.state.storedPasswordVisible ? sharedLinkInfo.password : '***************'}</span>
                <span tabIndex="0" role="button" aria-label={this.state.storedPasswordVisible ? gettext('Hide') : gettext('Show')} onKeyDown={this.onIconKeyDown} onClick={this.toggleStoredPasswordVisible} className={`eye-icon fas ${this.state.storedPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></span>
              </dd>
            </>
          )}
          {sharedLinkInfo.expire_date && (
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Expiration Date:')}</dt>
              {!this.state.isEditingExpiration &&
              <dd style={{width:'250px'}} onMouseEnter={this.handleMouseOverExpirationEditIcon} onMouseLeave={this.handleMouseOutExpirationEditIcon}>
                {moment(sharedLinkInfo.expire_date).format('YYYY-MM-DD HH:mm:ss')}
                {this.state.isExpirationEditIconShow && (
                  <a href="#"
                    role="button"
                    aria-label={gettext('Edit')}
                    title={gettext('Edit')}
                    className="fa fa-pencil-alt attr-action-icon"
                    onClick={this.editingExpirationToggle}>
                  </a>
                )}
              </dd>
              }
              {this.state.isEditingExpiration &&
              <dd>
                <div className="ml-4">
                  <SetLinkExpiration
                    minDays={shareLinkExpireDaysMin}
                    maxDays={shareLinkExpireDaysMax}
                    defaultDays={shareLinkExpireDaysDefault}
                    expType={this.state.expType}
                    setExpType={this.setExpType}
                    expireDays={this.state.expireDays}
                    onExpireDaysChanged={this.onExpireDaysChanged}
                    expDate={this.state.expDate}
                    onExpDateChanged={this.onExpDateChanged}
                  />
                  <div className={this.state.expType === 'by-days' ? 'mt-2' : 'mt-3'}>
                    <button className="btn btn-primary mr-2" onClick={this.updateExpiration}>{gettext('Update')}</button>
                    <button className="btn btn-secondary" onClick={this.editingExpirationToggle}>{gettext('Cancel')}</button>
                  </div>
                </div>
              </dd>
              }
            </>
          )}
          {(isPro && sharedLinkInfo.permissions) && (
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Permission:')}</dt>
              <dd style={{width:'250px'}} onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
                <Selector
                  isDropdownToggleShown={isOpIconShown && !sharedLinkInfo.is_expired}
                  currentSelectedOption={currentSelectedPermOption}
                  options={this.permOptions}
                  selectOption={this.changePerm}
                />
              </dd>
            </>
          )}
          <>
            <dt className="text-secondary font-weight-normal">{gettext('Scope')}</dt>
            <dd style={{width:'250px'}} onMouseEnter={this.handleMouseOverScope} onMouseLeave={this.handleMouseOutScope}>
              <ShareLinkScopeEditor
                isTextMode={true}
                isEditIconShow={isScopeOpIconShown}
                currentScope={currentScope}
                onScopeChanged={this.changeScope}
              />
            </dd>
          </>
        </dl>
        {(canSendShareLinkEmail && !this.state.isSendLinkShown) &&
        <Button onClick={this.toggleSendLink} className='mr-2'>{gettext('Send')}</Button>
        }
        {this.state.isSendLinkShown &&
          <SendLink
            linkType='shareLink'
            token={sharedLinkInfo.token}
            toggleSendLink={this.toggleSendLink}
            closeShareDialog={this.props.closeShareDialog}
          />
        }
        {(!this.state.isSendLinkShown) &&
        <Button onClick={this.toggleLinkDeleteDialog}>{gettext('Delete')}</Button>
        }
        {this.state.isLinkDeleteDialogOpen &&
        <CommonOperationConfirmationDialog
          title={gettext('Delete share link')}
          message={gettext('Are you sure you want to delete the share link?')}
          executeOperation={this.deleteLink}
          confirmBtnText={gettext('Delete')}
          toggleDialog={this.toggleLinkDeleteDialog}
        />
        }
        {currentScope === 'specific_users' && !this.state.isSendLinkShown &&
          <Button onClick={this.onUserAuth} style={{'marginLeft': '5px'}}>{gettext('Authed users')}</Button>
        }
        {currentScope === 'specific_emails' && !this.state.isSendLinkShown &&
          <Button onClick={this.onEmailAuth} style={{'marginLeft': '5px'}}>{gettext('Authed emails')}</Button>
        }
      </div>
    );
  }
}

LinkDetails.propTypes = propTypes;

export default LinkDetails;
