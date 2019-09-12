import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, siteRoot } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import { Link } from '@reach/router';
import ReposNav from './repos-nav';
import MainPanelTopbar from '../main-panel-topbar';

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
                <th width="34%">{gettext('ID')}</th>
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
    this.state = {
      isOpIconShown: false,
    };
  }

  handleMouseOver = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isOpIconShown: false});
  }

  render() {
    let item = this.props.item;
    return (
      <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
        <td><Link to={siteRoot + 'sys/libraries/' + item.id + '/'}>{item.name}</Link></td>
        <td>{item.id}</td>
        <td>{item.description}</td>
      </tr>
    );
  }
}

class ReposSystem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      sysRepoTmplates: []
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminGetSystemRepoInfo().then((res) => {
      let items = this.state.sysRepoTmplates;
      let new_item = {
        name: res.data.name,
        id: res.data.id,
        description: res.data.description
      };
      items = items.concat(new_item);
      this.setState({
        sysRepoTmplates: items,
        loading: false
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
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
                items={this.state.sysRepoTmplates}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default ReposSystem;
