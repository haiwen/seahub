import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@gatsbyjs/reach-router';
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
        <p>{gettext('No libraries have been shared with you from other servers.')}</p>
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
              <th width="20%">{gettext('Shared by')}</th>
              <th width="26%">{gettext('At server')}</th>
              <th width="20%">{gettext('Time')}</th>
              <th width="10%">{/* operations */}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              return <Item
                key={index}
                item={item}
                leaveShare={this.props.leaveShare}
              />;
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
      isOpIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({
      isOpIconShown: true
    });
  }

  handleMouseOut = () => {
    this.setState({
      isOpIconShown: false
    });
  }

  leaveShare = (e) => {
    e.preventDefault();
    this.props.leaveShare(this.props.item);
  }

  render() {
    const item = this.props.item;
    const { isOpIconShown } = this.state;

    item.icon_url = Utils.getLibIconUrl(item);
    item.icon_title = Utils.getLibIconTitle(item);

    let shareRepoUrl =`${siteRoot}remote-library/${this.props.item.provider_id}/${this.props.item.repo_id}/${Utils.encodePath(this.props.item.repo_name)}/`;
    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
        <td><img src={item.icon_url} title={item.icon_title} alt={item.icon_title} width="24" /></td>
        <td><Link to={shareRepoUrl}>{item.repo_name}</Link></td>
        <td>{item.from_user}</td>
        <td>{item.from_server_url}</td>
        <td title={moment(item.last_modified).format('llll')}>{moment(item.ctime).fromNow()}</td>
        <td>
          <a href="#" role="button" className={`action-icon sf2-icon-x3 ${isOpIconShown ? '' : 'invisible'}`} title={gettext('Leave Share')} aria-label={gettext('Leave Share')} onClick={this.leaveShare}></a>
        </td>
      </tr>
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
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listOCMSharesReceived().then((res) => {
      this.setState({
        loading: false,
        items: res.data.ocm_share_received_list
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  leaveShare = (item) => {
    const { id, repo_name } = item;
    seafileAPI.deleteOCMShareReceived(id).then((res) => {
      let items = this.state.items.filter(item => {
        return item.id != id;
      });
      this.setState({items: items});
      toaster.success(gettext('Successfully unshared {name}').replace('{name}', repo_name));
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
                leaveShare={this.leaveShare}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default SharedWithOCM;
