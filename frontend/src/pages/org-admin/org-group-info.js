import React, { Component, Fragment } from 'react';
import { Link } from '@reach/router';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, loginUrl, siteRoot } from '../../utils/constants';
import Loading from '../../components/loading';
import OrgAdminGroupNav from '../../components/org-admin-group-nav';
import MainPanelTopbar from './main-panel-topbar';

import '../../css/org-admin-user.css';

const { orgID } = window.org.pageOptions;

class OrgGroupInfo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: ''
    };
  }

  componentDidMount() {
    seafileAPI.orgAdminGetGroup(orgID, this.props.groupID).then((res) => {
      this.setState(Object.assign({
        loading: false
      }, res.data)); 
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
            <OrgAdminGroupNav groupID={this.props.groupID} currentItem='info' />
            <div className="cur-view-content">
              <Content 
                data={this.state}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    const {
      loading, errorMsg,
      group_name, creator_email, creator_name
    } = this.props.data;

    if (loading) {
      return <Loading />;
    }
    if (errorMsg) {
      return <p className="error text-center mt-2">{errorMsg}</p>;
    }

    return (
      <dl>
        <dt>{gettext('Name')}</dt>
        <dd>{group_name}</dd>

        <dt>{gettext('Creator')}</dt>
        <dd>
          <Link to={`${siteRoot}org/useradmin/info/${encodeURIComponent(creator_email)}/`}>{creator_name}</Link>
        </dd>
      </dl>
    ); 
  }
}

export default OrgGroupInfo;
