import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { gettext, siteRoot, mediaUrl } from '../../utils/constants';
import { Utils } from '../../utils/utils';
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
    orgAdminAPI.orgAdminGetGroup(orgID, this.props.groupID).then((res) => {
      this.setState(Object.assign({
        loading: false
      }, res.data));
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
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
  render() {
    const {
      loading, errorMsg,
      group_name, creator_email, creator_name
    } = this.props.data;

    if (loading) {
      return <Loading />;
    }
    if (errorMsg) {
      return (
        <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-center">
          <img src={`${mediaUrl}img/error-tip.png`} alt="" width="100" />
          <p className="mt-2">{errorMsg}</p>
        </div>
      );
    }

    return (
      <dl className='mt-0'>
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

Content.propTypes = {
  data: PropTypes.object.isRequired,
};

OrgGroupInfo.propTypes = {
  groupID: PropTypes.string,
};

export default OrgGroupInfo;
