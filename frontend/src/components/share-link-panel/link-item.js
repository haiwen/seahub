import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { isPro, gettext } from '../../utils/constants';
import ShareLinkPermissionEditor from '../../components/select-editor/share-link-permission-editor';
import { Utils } from '../../utils/utils';

const propTypes = {
  item: PropTypes.object.isRequired,
  permissionOptions: PropTypes.array,
  showLinkDetails : PropTypes.func.isRequired
};

class LinkItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemOpVisible: false
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

  viewDetails = (e) => {
    e.preventDefault();
    this.props.showLinkDetails(this.props.item);
  }

  render() {
    const { isItemOpVisible } = this.state;
    const { item, permissionOptions } = this.props;
    const { permissions, link, expire_date } = item;
    const currentPermission = Utils.getShareLinkPermissionStr(permissions);
    return (
      <tr onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
        <td>{this.cutLink(link)}</td>
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
          <a href="#" role="button" onClick={this.viewDetails} className={isItemOpVisible ? '' : 'invisible'}>{gettext('Details')}</a>
        </td>
      </tr>
    );
  }
}

LinkItem.propTypes = propTypes;

export default LinkItem;
