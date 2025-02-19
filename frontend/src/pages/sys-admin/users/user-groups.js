import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { siteRoot, gettext } from '../../../utils/constants';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import MainPanelTopbar from '../main-panel-topbar';
import Nav from './user-nav';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({ isItemFreezed: true });
  };

  onUnfreezedItem = () => {
    this.setState({ isItemFreezed: false });
  };

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No groups')}>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="35%">{gettext('Name')}</th>
                <th width="30%">{gettext('Role')}</th>
                <th width="35%">{gettext('Created At')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                />);
              })}
            </tbody>
          </table>
        </Fragment>
      );
      return items.length ? table : emptyTip;
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  deleteItem: PropTypes.func,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
    };
  }

  handleMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true
      });
    }
  };

  handleMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: false
      });
    }
  };

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  };

  getRoleText = () => {
    let roleText;
    const { item } = this.props;
    switch (item.role) {
      case 'Owner':
        roleText = gettext('Owner');
        break;
      case 'Admin':
        roleText = gettext('Admin');
        break;
      case 'Member':
        roleText = gettext('Member');
        break;
    }
    return roleText;
  };

  render() {
    const { item } = this.props;
    const url = `${siteRoot}sys/groups/${item.id}/libraries/`;
    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><Link to={url}>{item.name}</Link></td>
          <td>{this.getRoleText()}</td>
          <td>{dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}</td>
        </tr>
      </Fragment>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  deleteItem: PropTypes.func,
};

class Groups extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userInfo: {},
      items: []
    };
  }

  componentDidMount() {
    const email = decodeURIComponent(this.props.email);
    systemAdminAPI.sysAdminGetUser(email).then((res) => {
      this.setState({
        userInfo: res.data
      });
    });
    systemAdminAPI.sysAdminListGroupsJoinedByUser(email).then(res => {
      this.setState({
        loading: false,
        items: res.data.group_list
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <Nav currentItem="groups" email={this.props.email} userName={this.state.userInfo.name} />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.items}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

Groups.propTypes = {
  email: PropTypes.string,
};

export default Groups;
