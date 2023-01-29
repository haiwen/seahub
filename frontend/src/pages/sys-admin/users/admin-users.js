import React, { Component, Fragment } from 'react';
import Users from './users';

class AdminUsers extends Component {

  render() {
    return <Users isAdmin={true} {...this.props} />;
  }
}

export default AdminUsers;
