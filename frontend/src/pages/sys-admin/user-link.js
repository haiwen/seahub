import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot } from '../../utils/constants';

const propTypes = {
  email: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired
};

class UserLink extends Component {

  render() {
    return <Link to={`${siteRoot}sys/users/${encodeURIComponent(this.props.email)}/`}>{this.props.name}</Link>;
  }
}

UserLink.propTypes = propTypes;

export default UserLink;
