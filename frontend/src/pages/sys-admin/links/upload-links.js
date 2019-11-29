import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, loginUrl, siteRoot } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import LinksNav from './links-nav';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';


class Content extends Component {

  constructor(props) {
    super(props);
  }

  getPreviousPage = () => {
    this.props.getUploadLinksByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getUploadLinksByPage(this.props.currentPage + 1);
  }

  render() {
    const { loading, errorMsg, items, perPage, currentPage, hasNextPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No Upload Links.')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="18%">{gettext('Name')}</th>
                <th width="18%">{gettext('Token')}</th>
                <th width="18%">{gettext('Owner')}</th>
                <th width="18%">{gettext('Created At')}</th>
                <th width="18%">{gettext('Count')}</th>
                <th width="10%">{/*Operations*/}</th>
              </tr>
            </thead>
            {items && 
              <tbody>
                {items.map((item, index) => {
                  return (<Item
                    key={index}
                    item={item}
                    deleteUploadLink={this.props.deleteUploadLink}
                  />);
                })}
              </tbody>
            }
          </table>
          <Paginator
            gotoPreviousPage={this.getPreviousPage}
            gotoNextPage={this.getNextPage}
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            canResetPerPage={true}
            curPerPage={perPage}
            resetPerPage={this.props.resetPerPage}
          />
        </Fragment>
      );
      return items.length ? table : emptyTip; 
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
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

  deleteUploadLink = () => {
    this.props.deleteUploadLink(this.props.item.token);
  }

  render() {
    let { isOpIconShown } = this.state;
    let { item } = this.props;
    let deleteIcon = `action-icon sf2-icon-delete ${isOpIconShown ? '' : 'invisible'}`;
    return (
      <Fragment>
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td>{item.path}</td>
          <td>{item.token}</td>
          <td><UserLink email={item.creator_email} name={item.creator_name} /></td>
          <td>{moment(item.ctime).fromNow()}</td>
          <td>{item.view_cnt}</td>
          <td>
            <a href="#" className={deleteIcon} title={gettext('Remove')} onClick={this.deleteUploadLink}></a>
          </td>
        </tr>
      </Fragment>
    );
  }
}

class UploadLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      uploadLinkList: [],
      perPage: 100,
      currentPage: 1,
      hasNextPage: false,
    };
    this.initPage = 1;
  }

  componentDidMount () {
    this.getUploadLinksByPage(this.initPage);
  }

  getUploadLinksByPage = (page) => {
    let { perPage } = this.state;
    seafileAPI.sysAdminListAllUploadLinks(page, perPage).then((res) => {
      this.setState({
        uploadLinkList: res.data.upload_link_list,
        loading: false,
        currentPage: page,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.count),
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
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

  deleteUploadLink = (linkToken) => {
    seafileAPI.sysAdminDeleteUploadLink(linkToken).then(res => {
      let newUploadLinkList = this.state.uploadLinkList.filter(item =>
        item.token != linkToken
      );
      this.setState({uploadLinkList: newUploadLinkList});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  resetPerPage = (newPerPage) => {
    this.setState({
      perPage: newPerPage,
    }, () => this.getUploadLinksByPage(this.initPage));
  }

  render() {
    let { uploadLinkList, currentPage, perPage, hasNextPage } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <LinksNav currentItem="uploadLinks" />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={uploadLinkList}
                currentPage={currentPage}
                perPage={perPage}
                hasNextPage={hasNextPage}
                getUploadLinksByPage={this.getUploadLinksByPage}
                resetPerPage={this.resetPerPage}
                deleteUploadLink={this.deleteUploadLink}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default UploadLinks;
