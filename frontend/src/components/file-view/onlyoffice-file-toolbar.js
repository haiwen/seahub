import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Icon from '../../components/icon';
import IconButton from '../icon-button';
import CustomDropdown from '../dropdown';

const propTypes = {
  isCommentUpdated: PropTypes.bool,
  isShareEnabled: PropTypes.bool,
  toggleShareDialog: PropTypes.func.isRequired,
  toggleDetailsPanel: PropTypes.func.isRequired,
  toggleHeader: PropTypes.func.isRequired,
};

const {
  repoID, repoName, parentDir
} = window.app.pageOptions;

class OnlyofficeFileToolbar extends React.Component {
  render() {
    const { isCommentUpdated, isShareEnabled } = this.props;
    const desktopMenuItems = [{
      key: 'open-parent-folder',
      label: gettext('Open parent folder'),
      onClick: () => {
        location.href = `${siteRoot}library/${repoID}/${Utils.encodePath(repoName + parentDir)}`;
      }
    }];
    const mobileMenuItems = [
      { key: 'fold', label: gettext('Fold'), onClick: this.props.toggleHeader },
      { key: 'details', label: gettext('Details'), onClick: this.props.toggleDetailsPanel },
      { key: 'comment', label: gettext('Comment'), onClick: this.props.toggleCommentPanel },
      ...(isShareEnabled ? [{ key: 'share', label: gettext('Share'), onClick: this.props.toggleShareDialog }] : []),
      {
        key: 'open-parent-folder',
        label: gettext('Open parent folder'),
        onClick: () => {
          location.href = `${siteRoot}library/${repoID}/${Utils.encodePath(repoName + parentDir)}`;
        }
      }
    ];
    return (
      <Fragment>
        <div className="d-none d-md-flex justify-content-between align-items-center flex-shrink-0 ml-4">
          <IconButton
            id="file-details"
            icon='info'
            text={gettext('Details')}
            onClick={this.props.toggleDetailsPanel}
          />
          <Button
            className='file-toolbar-btn border-0 p-0 bg-transparent'
            onClick={this.props.toggleCommentPanel}
            aria-label={gettext('Comment')}
          >
            <Icon symbol="comment" />
            {isCommentUpdated && <span className='comment-tip'></span>}
          </Button>
          {isShareEnabled && (
            <IconButton
              id="share-file"
              icon='share'
              text={gettext('Share')}
              onClick={this.props.toggleShareDialog}
            />
          )}
          <CustomDropdown
            target="onlyoffice-file-toolbar-more"
            items={desktopMenuItems}
            triggerClassName="file-toolbar-btn"
            menuPortal={false}
          />
          <IconButton
            id="fold-header"
            icon='double-arrow-up'
            text={gettext('Fold')}
            onClick={this.props.toggleHeader}
          />
        </div>

        <CustomDropdown
          target="onlyoffice-file-toolbar-mobile-more"
          items={mobileMenuItems}
          className="d-block d-md-none flex-shrink-0 ml-4"
          triggerClassName="mx-1"
          menuPortal={false}
        />
      </Fragment>
    );
  }
}

OnlyofficeFileToolbar.propTypes = propTypes;

export default OnlyofficeFileToolbar;
