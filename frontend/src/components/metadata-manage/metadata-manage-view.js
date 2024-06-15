import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import toaster from '../toast';
import seahubMetadataAPI from './seahub-metadata-api';
import { siteRoot } from '../../utils/constants';

const propTypes = {
  repoID: PropTypes.string.isRequired,
};

class MetadataManageView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlight: false,
    };
  }

  onMouseEnter = () => {
    this.setState({
      isHighlight: true,
    });
  };

  onMouseOver = () => {
    this.setState({
      isHighlight: true,
    });
  };

  onMouseLeave = () => {
    this.setState({
      isHighlight: false,
    });
  };

  onItemMouseDown = (event) => {
    event.stopPropagation();
    if (event.button === 2) {
      return;
    }
  };

  onClick = () => {
    seahubMetadataAPI.getMetadataManagementEnabledStatus(this.props.repoID).then((res) => {
      if (res.data.enabled){
        this.viewMetadata();
      } else {
        let message = gettext('This repo has not enabled metadata management, please enabled firstly');
        toaster.notify(message);
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  viewMetadata = () => {
    let server = siteRoot.substring(0, siteRoot.length-1);
    window.open(server + '/repos/' + this.props.repoID + '/metadata/table-view/', '_blank');
  };

  render() {
    let hlClass = this.state.isHighlight ? 'tree-node-inner-hover ' : '';
    return (
      <div className="tree-node">
        <div
          className={`tree-node-inner text-nowrap ${hlClass}`}
          title="Metadata Views"
          onMouseEnter={this.onMouseEnter}
          onMouseOver={this.onMouseOver}
          onMouseLeave={this.onMouseLeave}
          onMouseDown={this.onItemMouseDown}
          onClick={this.onClick}
          onContextMenu={this.onItemContextMenu}
        >
          <div style={{ paddingLeft: 44.8 }}>{gettext('Metadata Views')}
          </div>
        </div>
      </div>
    );
  }
}

MetadataManageView.propTypes = propTypes;

export default MetadataManageView;
