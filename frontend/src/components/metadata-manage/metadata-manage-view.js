import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import seahubManageAPI from './seahub-manage-api';

const propTypes = {
  repoID: PropTypes.string.isRequired,
};

class MetadataManageView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlight: false,
      isShowOperationMenu: false,
    };
  }

  onMouseEnter = () => {
    this.setState({
      isShowOperationMenu: true,
      isHighlight: true,
    });
  };

  onMouseOver = () => {
    this.setState({
      isShowOperationMenu: true,
      isHighlight: true,
    });
  };

  onMouseLeave = () => {
    this.setState({
      isShowOperationMenu: false,
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
    seahubManageAPI.getMetadataManagementEnabledStatus(this.props.repoID).then((res) => {
      if (res.data.enabled){
        this.viewMetadata();
      } else if (confirm(gettext('Enable-Metadata-Manage?'))){
        seahubManageAPI.enableMetadataManagement(this.props.repoID).then((res) => {
          this.viewMetadata();
        }).catch((error) => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  viewMetadata = () => {

  };

  render() {
    let hlClass = this.state.isHighlight ? 'tree-node-inner-hover ' : '';
    return (
      <div className="tree-node">
        <div
          className={`tree-node-inner text-nowrap ${hlClass}`}
          title="Metadata"
          onMouseEnter={this.onMouseEnter}
          onMouseOver={this.onMouseOver}
          onMouseLeave={this.onMouseLeave}
          onMouseDown={this.onItemMouseDown}
          onClick={this.onClick}
        >
          <div className="tree-node-text">{gettext('Metadata-View')}
            <div className="left-icon">
              <i className="tree-node-icon">
                <span class="sf2-icon-cog2" aria-hidden="true" />
              </i>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

MetadataManageView.propTypes = propTypes;

export default MetadataManageView;
