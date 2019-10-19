import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('This user has no shared libraries')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="5%">{/*icon*/}</th>
                <th width="20%">{gettext('Name')}</th>
                <th width="10%">{gettext('Share From')}</th>
                <th width="25%">{gettext('Size')}</th>
                <th width="19%">{gettext('Last Update')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item 
                  key={index}
                  item={item}
                  deleteRepo={this.props.deleteRepo}
                  transferRepo={this.props.transferRepo}
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

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
      role: this.props.item.role,
      quota_total: this.props.item.quota_total
    };
  }

  handleMouseOver = () => {
    this.setState({showOpIcon: true});
  }

  handleMouseOut = () => {
    this.setState({showOpIcon: false});
  }

  render() {
    let { item } = this.props;

    let iconUrl = Utils.getLibIconUrl(item);
    let iconTitle = Utils.getLibIconTitle(item);

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>{item.name}</td>
          <td>{item.owner}</td>
          <td>{Utils.bytesToSize(item.size)}</td>
          <td>{moment(item.last_modify).fromNow()}</td>
        </tr>
      </Fragment>
    );
  }
}

class UserShareInRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      repoList: [],
      isShowImportWaitingDialog: false,
      isShowAddUserWaitingDialog: false
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListShareInRepo(this.props.email).then(res => {
      this.setState({
        repoList: res.data.repo_list,
        loading: false
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

  render() {
    return (
      <div className="cur-view-content">
        <Content
          loading={this.state.loading}
          errorMsg={this.state.errorMsg}
          items={this.state.repoList}
        />
      </div>
    );
  }
}

export default UserShareInRepos;