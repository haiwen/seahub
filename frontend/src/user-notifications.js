import React from 'react';
import ReactDom from 'react-dom';
import { navigate } from '@gatsbyjs/reach-router';
import { Utils } from './utils/utils';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import Loading from './components/loading';
import Paginator from './components/paginator';
import CommonToolbar from './components/toolbar/common-toolbar';
import NoticeItem from './components/common/notice-item';

import './css/toolbar.css';
import './css/search.css';

import './css/user-notifications.css';

class UserNotifications extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      currentPage: 1,
      perPage: 25,
      hasNextPage: false,
      items: []
    };
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const {
      currentPage, perPage
    } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getItems(this.state.currentPage);
    });
  }

  getItems = (page) => {
    const { perPage } = this.state;
    seafileAPI.listNotifications(page, perPage).then((res) => {
      this.setState({
        isLoading: false,
        items: res.data.notification_list,
        currentPage: page,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.count)
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getItems(1);
    });
  }

  onSearchedClick = (selectedItem) => {
    if (selectedItem.is_dir === true) {
      let url = siteRoot + 'library/' + selectedItem.repo_id + '/' + selectedItem.repo_name + selectedItem.path;
      navigate(url, {repalce: true});
    } else {
      let url = siteRoot + 'lib/' + selectedItem.repo_id + '/file' + Utils.encodePath(selectedItem.path);
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    }
  }

  markAllRead = () => {
    seafileAPI.updateNotifications().then((res) => {
      this.setState({
        items: this.state.items.map(item => {
          item.seen = true;
          return item;
        })
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  clearAll = () => {
    seafileAPI.deleteNotifications().then((res) => {
      this.setState({
        items: []
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  render() {
    return (
      <React.Fragment>
        <div className="h-100 d-flex flex-column">
          <div className="top-header d-flex justify-content-between">
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
            </a>
            <CommonToolbar onSearchedClick={this.onSearchedClick} />
          </div>
          <div className="flex-auto container-fluid pt-4 pb-6 o-auto">
            <div className="row">
              <div className="col-md-10 offset-md-1">
                <div className="d-flex justify-content-between align-items-center flex-wrap op-bar">
                  <h2 className="h4 m-0 my-1">{gettext('Notifications')}</h2>
                  <div>
                    <button className="btn btn-secondary op-bar-btn" onClick={this.markAllRead}>{gettext('Mark all read')}</button>
                    <button className="btn btn-secondary op-bar-btn ml-2" onClick={this.clearAll}>{gettext('Clear')}</button>
                  </div>
                </div>
                <Content
                  isLoading={this.state.isLoading}
                  errorMsg={this.state.errorMsg}
                  items={this.state.items}
                  currentPage={this.state.currentPage}
                  hasNextPage={this.state.hasNextPage}
                  curPerPage={this.state.perPage}
                  resetPerPage={this.resetPerPage}
                  getListByPage={this.getItems}
                />
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

class Content extends React.Component {

  constructor(props) {
    super(props);
  }

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  }

  render() {
    const {
      isLoading, errorMsg, items,
      curPerPage, currentPage, hasNextPage
    } = this.props;

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error mt-6 text-center">{errorMsg}</p>;
    }

    const isDesktop = Utils.isDesktop();
    const theadData = isDesktop ? [
      {width: '7%', text: ''},
      {width: '73%', text: gettext('Message')},
      {width: '20%', text: gettext('Time')}
    ] : [
      {width: '15%', text: ''},
      {width: '52%', text: gettext('Message')},
      {width: '33%', text: gettext('Time')}
    ];

    return (
      <React.Fragment>
        <table className="table-hover">
          <thead>
            <tr>
              {theadData.map((item, index) => {
                return <th key={index} width={item.width}>{item.text}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              return (<NoticeItem key={index} noticeItem={item} tr={true} />);
            })}
          </tbody>
        </table>
        {items.length > 0 &&
        <Paginator
          gotoPreviousPage={this.getPreviousPage}
          gotoNextPage={this.getNextPage}
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          curPerPage={curPerPage}
          resetPerPage={this.props.resetPerPage}
        />
        }
      </React.Fragment>
    );
  }
}

ReactDom.render(<UserNotifications />, document.getElementById('wrapper'));
