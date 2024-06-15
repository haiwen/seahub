import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import toaster from '../toast';
import seahubMetadataAPI from './seahub-metadata-api';
import { hideMenu, showMenu } from '../context-menu/actions';
import TextTranslation from '../../utils/text-translation';
import { siteRoot } from '../../utils/constants';

const propTypes = {
  repoID: PropTypes.string.isRequired,
};

class MetadataManage extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlight: false,
      menuList: []
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

  getMenuList = () => {
    let { ENABLE_METADATA, DISABLE_METADATA } =  TextTranslation;
    seahubMetadataAPI.getMetadataManagementEnabledStatus(this.props.repoID).then((res) => {
      if (res.data.enabled){
        this.setState({ menuList: [DISABLE_METADATA] });
      } else {
        this.setState({ menuList: [ENABLE_METADATA] });
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.setState({ menuList: [] });
    });
  };

  onItemContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();

    let x = event.clientX || (event.touches && event.touches[0].pageX);
    let y = event.clientY || (event.touches && event.touches[0].pageY);

    hideMenu();

    this.getMenuList();

    let showMenuConfig = {
      id: 'tree-node-contextmenu',
      position: { x, y },
      target: event.target,
      menuList: this.state.menuList,
    };

    showMenu(showMenuConfig);
  };

  onClick = () => {
    seahubMetadataAPI.getMetadataManagementEnabledStatus(this.props.repoID).then((res) => {
      if (res.data.enabled && confirm(gettext('Enable metadata management?'))){
        seahubMetadataAPI.enableMetadataManagement(this.props.repoID).catch((error) => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onView = () => {
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
          title="Metadata"
          onMouseEnter={this.onMouseEnter}
          onMouseOver={this.onMouseOver}
          onMouseLeave={this.onMouseLeave}
          onMouseDown={this.onItemMouseDown}
          onClick={this.onEnable}
          onContextMenu={this.onItemContextMenu}
        >
          <div className="tree-node-text">{gettext('Metadata')}
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

MetadataManage.propTypes = propTypes;

export default MetadataManage;
