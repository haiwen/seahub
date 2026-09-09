import React, { Component } from 'react';
import { Link } from '@gatsbyjs/reach-router';
import PropTypes from 'prop-types';
import { siteRoot } from '../../utils/constants';

const propTypes = {
  email: PropTypes.string,
  name: PropTypes.string.isRequired
};

class UserLink extends Component {

  render() {
    return <Link to={`${siteRoot}org/useradmin/info/${encodeURIComponent(this.props.email)}/`}>{this.props.name}</Link>;
  }
}

UserLink.propTypes = propTypes;

export default UserLink;
