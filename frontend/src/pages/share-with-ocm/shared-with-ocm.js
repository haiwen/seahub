import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@reach/router';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';

class Content extends Component {

  render() {
    const { loading, errorMsg, items } = this.props;

    const emptyTip = (
      <EmptyTip>
        <h2>{gettext('No libraries have been shared with you')}</h2>
        <p>{gettext('No libraries have been shared directly with you. You can find more shared libraries at "Shared with groups".')}</p>
      </EmptyTip>
    );

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const table = (
        <table>
          <thead>
            <tr>
              <th width="4%"></th>
              <th width="20%">{gettext('Name')}</th>
              <th width="20%">{gettext('Shared from')}</th>
              <th width="26%">{gettext('At site')}</th>
              <th width="20%">{gettext('Time')}</th>
              <th width="10%">{/* operations */}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              return <Item key={index} item={item} deleteShare={this.props.deleteShare} />;
            })}
          </tbody>
        </table>
      );

      return items.length ? table : emptyTip;
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
      isOpMenuOpen: false // for mobile
    };
  }

  toggleOpMenu = () => {
    this.setState({
      isOpMenuOpen: !this.state.isOpMenuOpen
    });
  }

  handleMouseOver = () => {
    this.setState({
      showOpIcon: true
    });
  }

  handleMouseOut = () => {
    this.setState({
      showOpIcon: false
    });
  }

  deleteShare = () => {
    this.props.deleteShare(this.props.item);
  }

  render() {
    const item = this.props.item;

    item.icon_url = Utils.getLibIconUrl(item);
    item.icon_title = Utils.getLibIconTitle(item);
    item.url = `${siteRoot}#shared-libs/lib/${item.repo_id}/`;

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let shareRepoUrl =`${siteRoot}library/${item.repo_id}/${Utils.encodePath(item.repo_name)}/`;
    let deleteIcon = `action-icon sf2-icon-x3 ${iconVisibility ? 'invisible' : ''}`;
    return (
      <Fragment>
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td><img src={item.icon_url} title={item.icon_title} alt={item.icon_title} width="24" /></td>
          <td><Link to={shareRepoUrl}>{item.repo_name}</Link></td>
          <td>{item.from_user}</td>
          <td>{item.from_server_url}</td>
          <td title={moment(item.last_modified).format('llll')}>{moment(item.ctime).fromNow()}</td>
          <td>
            <a href="#" className={deleteIcon} title={gettext('Remove')} onClick={this.deleteShare}></a>
          </td>
        </tr>

      </Fragment>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired
};

class SharedWithOCM extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
    };
  }

  componentDidMount() {
    seafileAPI.listOCMSharesReceived().then((res) => {
      this.setState({
        loading: false,
        items: res.data.ocm_share_received_list
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  deleteShare = (item) => {
    let { id } = item;
    seafileAPI.deleteOCMShareReceived(id).then((res) => {
      toaster.success(gettext('delete success.'));
      let items = this.state.items.filter(item => {
        return item.id != id;
      });
      this.setState({items: items});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    return (
      <Fragment>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0">{gettext('Shared from other servers')}</h3>
            </div>
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.items}
                deleteShare={this.deleteShare}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default SharedWithOCM;
