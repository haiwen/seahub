import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import ModalPortal from '../modal-portal';
import ShareDialog from '../dialog/share-dialog';
import Icon from '../icon';
import CustomDropdown from '../dropdown';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  repoTags: PropTypes.array.isRequired,
  userPerm: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  filePermission: PropTypes.string,
  fileTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  dirent: PropTypes.object,
  children: PropTypes.object
};

class ViewFileToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShareDialogShow: false,
    };
  }

  onEditClick = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    let url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(path) + '?mode=edit';
    window.open(url);
  };

  onShareToggle = () => {
    this.setState({ isShareDialogShow: !this.state.isShareDialogShow });
  };

  onHistoryClick = () => {
    let historyUrl = siteRoot + 'repo/file_revisions/' + this.props.repoID + '/?p=' + Utils.encodePath(this.props.path);
    location.href = historyUrl;
  };

  render() {
    const { filePermission, showShareBtn } = this.props;
    let opList = [];

    if (filePermission === 'rw' || filePermission === 'cloud-edit') {
      opList.push({
        'icon': 'rename',
        'text': gettext('Edit'),
        'onClick': this.onEditClick
      });
    }
    if (filePermission === 'rw') {
      if (showShareBtn) {
        opList.push({
          'icon': 'share',
          'text': gettext('Share'),
          'onClick': this.onShareToggle
        });
      }
      opList.push(
        { 'icon': 'history', 'text': gettext('History'), 'onClick': this.onHistoryClick }
      );
    }

    return (
      <Fragment>
        {opList.length > 0 &&
          <CustomDropdown
            className="view-file-toolbar-dropdown"
            items={opList.map((item, index) => item === 'Divider' ? item : {
              key: item.key || item.text || `view-file-op-${index}`,
              label: item.text,
              icon_dom: item.icon ? <Icon symbol={item.icon} className="mr-2 dropdown-item-icon" /> : null,
              onClick: item.onClick,
              subOpList: item.subOpList,
            })}
            trigger={(
              <>
                {this.props.children}
                <Icon symbol="down" className="ml-1 path-item-dropdown-toggle" />
              </>
            )}
            triggerClassName="path-item"
            menuClassName="position-fixed"
            menuPortal={false}
          />
        }
        {this.state.isShareDialogShow && (
          <ModalPortal>
            <ShareDialog
              itemType={'file'}
              itemName={Utils.getFileName(this.props.path)}
              itemPath={this.props.path}
              repoID={this.props.repoID}
              repoEncrypted={this.props.repoEncrypted}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              userPerm={this.props.userPerm}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              toggleDialog={this.onShareToggle}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

ViewFileToolbar.propTypes = propTypes;

export default ViewFileToolbar;
