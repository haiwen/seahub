import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import EmptyTip from '../empty-tip';
import LinkItem from './link-item';

const propTypes = {
  shareLinks: PropTypes.array.isRequired,
  permissionOptions: PropTypes.array.isRequired,
  setMode: PropTypes.func.isRequired,
  showLinkDetails: PropTypes.func.isRequired,
  toggleSelectAllLinks: PropTypes.func.isRequired,
  toggleSelectLink: PropTypes.func.isRequired
};

class LinkList extends React.Component {

  toggleSelectAllLinks = (e) => {
    this.props.toggleSelectAllLinks(e.target.checked);
  }

  cancelSelectAllLinks = () => {
    this.props.toggleSelectAllLinks(false);
  }

  exportSelectedLinks = () => {
    const { shareLinks } = this.props;
    const selectedLinks = shareLinks.filter(item => item.isSelected);
    let url = `${siteRoot}share/link/export-excel/?`;
    url += selectedLinks.map(item => `token=${item.token}`).join('&');
    location.href = url;
  }

  render() {
    const { shareLinks, permissionOptions } = this.props;
    const selectedLinks = shareLinks.filter(item => item.isSelected);
    const isAllLinksSelected = shareLinks.length == selectedLinks.length;

    return (
      <Fragment>
        <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
          <h6 className="font-weight-normal m-0">{gettext('Share Link')}</h6>
          <div>
            {selectedLinks.length == 0 ? (
              <>
                <button className="btn btn-sm btn-outline-primary mr-2" onClick={this.props.setMode.bind(this, 'singleLinkCreation')}>{gettext('Generate Link')}</button>
                <button className="btn btn-sm btn-outline-primary" onClick={this.props.setMode.bind(this, 'linksCreation')}>{gettext('Generate links in batch')}</button>
              </>
            ) : (
              <>
                <button className="btn btn-sm btn-secondary mr-2" onClick={this.cancelSelectAllLinks}>{gettext('Cancel')}</button>
                <button className="btn btn-sm btn-primary" onClick={this.exportSelectedLinks}>{gettext('Export')}</button>
              </>
            )}
          </div>
        </div>
        {shareLinks.length == 0 ? (
          <EmptyTip forDialog={true}>
            <p className="text-secondary">{gettext('No share links')}</p>
          </EmptyTip>
        ) : (
          <table className="table-hover">
            <thead>
              <tr>
                <th width="5%" className="text-center">
                  <input type="checkbox" checked={isAllLinksSelected} className="vam" onChange={this.toggleSelectAllLinks} />
                </th>
                <th width="23%">{gettext('Link')}</th>
                <th width="30%">{gettext('Permission')}</th>
                <th width="28%">{gettext('Expiration')}</th>
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
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </Fragment>
    );
  }
}

LinkList.propTypes = propTypes;

export default LinkList;
