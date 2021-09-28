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
              <th width="5%"></th>
              <th width="30%">{gettext('Name')}</th>
              <th width="35%">{gettext('Shared by')}</th>
              <th width="20%">{gettext('Time')}</th>
              <th width="5%">{/* operations */}</th>
              <th width="5%">{/* operations */}</th>
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

  downloadFile = () => {
    let downloadUrl = siteRoot + 'ocm-via-webdav/download-received-file/?share_id=' + this.props.item.id;
    window.location.href = downloadUrl;
  }

  leaveShare = (e) => {
    e.preventDefault();
    this.props.leaveShare(this.props.item);
  }

  render() {
    const item = this.props.item;
    const { isOpIconShown } = this.state;

    item.icon_url = Utils.getFileIconUrl(item.name);
    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={item.icon_url} width="24" /></td>
        <td>
          {item.name}
	</td>
        <td>{item.shared_by}</td>
        <td title={moment(item.last_modified).format('llll')}>{moment(item.ctime).fromNow()}</td>
        <td>
          <a href="#" className={`action-icon sf2-icon-download ${isOpIconShown ? '' : 'invisible'}`} title={gettext('Download')} onClick={this.downloadFile}></a>
        </td>
        <td>
          <a href="#" className={`action-icon sf2-icon-x3 ${isOpIconShown ? '' : 'invisible'}`} title={gettext('Leave Share')} onClick={this.leaveShare}></a>
        </td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired
};

class OCMViaWebdav extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    const url = seafileAPI.server + '/ocm-via-webdav/received-shares/';
    seafileAPI.req.get(url).then((res) => {
      this.setState({
        loading: false,
        items: res.data.received_share_list
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  leaveShare = (item) => {
    const { id, name } = item;
    const url = seafileAPI.server + '/ocm-via-webdav/received-shares/' + id + '/';
    seafileAPI.req.delete(url).then((res) => {
      let items = this.state.items.filter(item => {
        return item.id != id;
      });
      this.setState({items: items});
      toaster.success(gettext('Successfully unshared {name}').replace('{name}', name));
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

export default OCMViaWebdav;
