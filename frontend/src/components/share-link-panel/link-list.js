import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import EmptyTip from '../empty-tip';
import LinkItem from './link-item';
import CommonOperationConfirmationDialog from '../../components/dialog/common-operation-confirmation-dialog';
import Loading from '../loading';
import { Utils } from '../../utils/utils';

const propTypes = {
  shareLinks: PropTypes.array.isRequired,
  permissionOptions: PropTypes.array.isRequired,
  setMode: PropTypes.func.isRequired,
  showLinkDetails: PropTypes.func.isRequired,
  toggleSelectAllLinks: PropTypes.func.isRequired,
  toggleSelectLink: PropTypes.func.isRequired,
  deleteLink: PropTypes.func.isRequired,
  deleteShareLinks: PropTypes.func.isRequired,
  isLoadingMore: PropTypes.bool.isRequired,
  handleScroll: PropTypes.func.isRequired
};

class LinkList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isDeleteShareLinksDialogOpen: false
    };
  }

  toggleDeleteShareLinksDialog = () => {
    this.setState({ isDeleteShareLinksDialogOpen: !this.state.isDeleteShareLinksDialogOpen });
  };

  toggleSelectAllLinks = (e) => {
    this.props.toggleSelectAllLinks(e.target.checked);
  };

  cancelSelectAllLinks = () => {
    this.props.toggleSelectAllLinks(false);
  };

  exportSelectedLinks = () => {
    const { shareLinks } = this.props;
    const selectedLinks = shareLinks.filter(item => item.isSelected);
    let url = `${siteRoot}share/link/export-excel/?`;
    url += selectedLinks.map(item => `token=${item.token}`).join('&');
    location.href = url;
  };

  render() {
    const { shareLinks, permissionOptions, isLoadingMore, handleScroll } = this.props;
    const selectedLinks = shareLinks.filter(item => item.isSelected);
    const isAllLinksSelected = shareLinks.length == selectedLinks.length;

    return (
      <Fragment>
        <div className="d-flex justify-content-between align-items-center pb-2 mt-1 pr-1 border-bottom">
          <h6 className="font-weight-normal m-0">{gettext('Share Link')}</h6>
          <div className="d-flex">
            {selectedLinks.length == 0 ? (
              <>
                <button className="btn btn-sm btn-outline-primary mr-2" onClick={this.props.setMode.bind(this, 'singleLinkCreation')}>{gettext('Generate Link')}</button>
                <button className="btn btn-sm btn-outline-primary" onClick={this.props.setMode.bind(this, 'linksCreation')}>{gettext('Generate links in batch')}</button>
              </>
            ) : (
              <>
                <button className="btn btn-sm btn-secondary mr-2" onClick={this.cancelSelectAllLinks}>{gettext('Cancel')}</button>
                <button className="btn btn-sm btn-secondary mr-2" onClick={this.toggleDeleteShareLinksDialog}>{gettext('Delete')}</button>
                <button className="btn btn-sm btn-secondary" onClick={this.exportSelectedLinks}>{gettext('Export')}</button>
              </>
            )}
          </div>
        </div>
        {shareLinks.length == 0 ? (
          <EmptyTip text={gettext('No share links')} className='m-0' />
        ) : (
          <div className='share-list-container share-link-list'>
            <table className="table-place-header">
              <thead>
                <tr>
                  <th width="3%" className="text-center">
                    <input
                      type="checkbox"
                      checked={isAllLinksSelected}
                      className="vam form-check-input"
                      onChange={this.toggleSelectAllLinks}
                      onKeyDown={Utils.onKeyDown}
                      aria-label={isAllLinksSelected ? gettext('Unselect items') : gettext('Select items')}
                    />
                  </th>
                  <th width="18%">{gettext('Link')}</th>
                  <th width="25%">{gettext('Permission')}</th>
                  <th width="20%">{gettext('Access scope')}</th>
                  <th width="20%">{gettext('Expiration')}</th>
                  <th width="11%">{gettext('Password')}</th>
                  <th width="14%"></th>
                </tr>
              </thead>
            </table>
            <div className='table-real-container' onScroll={handleScroll}>
              <table className="table-real-content table-thead-hidden">
                <thead>
                  <tr>
                    <th width="3%" className="text-center"></th>
                    <th width="18%">{gettext('Link')}</th>
                    <th width="25%">{gettext('Permission')}</th>
                    <th width="20%">{gettext('Access scope')}</th>
                    <th width="20%">{gettext('Expiration')}</th>
                    <th width="11%">{gettext('Password')}</th>
                    <th width="14%"></th>
                  </tr>
                </thead>
                <tbody>
                  {shareLinks.map((item, index) => {
                    return (
                      <LinkItem
                        key={index}
                        item={item}
                        permissionOptions={permissionOptions}
                        showLinkDetails={this.props.showLinkDetails}
                        toggleSelectLink={this.props.toggleSelectLink}
                        deleteLink={this.props.deleteLink}
                      />
                    );
                  })}
                </tbody>
              </table>
              {isLoadingMore && <Loading />}
            </div>
          </div>
        )}
        {this.state.isDeleteShareLinksDialogOpen && (
          <CommonOperationConfirmationDialog
            title={gettext('Delete share links')}
            message={gettext('Are you sure you want to delete the selected share link(s) ?')}
            executeOperation={this.props.deleteShareLinks}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleDeleteShareLinksDialog}
          />
        )}
      </Fragment>
    );
  }
}

LinkList.propTypes = propTypes;

export default LinkList;
