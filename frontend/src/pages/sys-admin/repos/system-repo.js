import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext, siteRoot } from '../../../utils/constants';
import Loading from '../../../components/loading';

class Content extends Component {
  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
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
      return table;
    }
  }
}


Content.propTypes = {
  resetPerPage: PropTypes.func,
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  currentPage: PropTypes.number,
  curPerPage: PropTypes.number,
  hasNextPage: PropTypes.bool,
};

class Item extends Component {
  render() {
    const item = this.props.item;
    return (
      <tr>
        <td><a href={`${siteRoot}sys/libraries/${item.id}/`}>{item.name}</a></td>
        <td>{item.id}</td>
        <td>{item.description}</td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

class SystemRepo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    systemAdminAPI.sysAdminGetSystemRepoInfo().then((res) => {
      let items = [];
      items.push(res.data);
      this.setState({
        items: items,
        loading: false
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
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <div className="cur-view-content">
            <Content
              loading={this.state.loading}
              errorMsg={this.state.errorMsg}
              items={this.state.items}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default SystemRepo;
