import React, { Component } from 'react';
import FilesActivities from './files-activities';

class MyFilesActivities extends Component {

  render() {
    return <FilesActivities onlyMine={true} />;
  }
}

export default MyFilesActivities;
