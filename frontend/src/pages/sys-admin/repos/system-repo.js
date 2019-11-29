import React, { Component, Fragment } from 'react';
import { Link } from '@reach/router';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { loginUrl, gettext, siteRoot } from '../../../utils/constants';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import EmptyTip from '../../../components/empty-tip';
import MainPanelTopbar from '../main-panel-topbar';
import ReposNav from './repos-nav';

class Content extends Component {

  constructor(props) {
    super(props);
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
          <h2>{gettext('No System Library.')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="33%">{gettext('Name')}</th>
                <th width="34%">ID</th>
                <th width="33%">{gettext('Description')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item key={index} item={item}/>);
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
  }

  render() {
    const item = this.props.item;
    return (
      <tr>
        <td><Link to={`${siteRoot}sys/libraries/${item.id}/`}>{item.name}</Link></td>
        <td>{item.id}</td>
        <td>{item.description}</td>
      </tr>
    );
  }
}

class SystemRepo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminGetSystemRepoInfo().then((res) => {
      let items = [];
      items.push(res.data);
      this.setState({
        items: items,
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
      <Fragment>
        <MainPanelTopbar/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <ReposNav currentItem="system" />
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

export default SystemRepo;
