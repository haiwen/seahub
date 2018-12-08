import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Utils } from '../../utils/utils';
import { siteRoot, } from '../../utils/constants';

const propTypes = {
  repo: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  isShowRepoOwner: PropTypes.bool.isRequired,
  isStuff: PropTypes.bool.isRequired,
};

class RepoListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isOperationShow: false,
      isItemMenuShow: false,
    };
  }

  onMouseEnter = () => {
    this.setState({highlight: true});
  }
  
  onMouseLeave = () => {
    this.setState({highlight: false});
  }

  getRepoComputeParams = () => {
    let repo = this.props.repo;
    let currentGroup = this.props.currentGroup; //todo--change to libray
    let isReadyOnly = false;
    if ( repo.permission === 'r' || repo.permission === 'preview') {
      isReadyOnly = true;
    }
    let iconUrl = Utils.getLibIconUrl({
      is_encryted: repo.encrypted, 
      is_readyonly: isReadyOnly,
      size: Utils.isHiDPI() ? 48 : 24
    });
    let iconTitle = Utils.getLibIconTitle({
      'encrypted': repo.encrypted,
      'is_admin': repo.is_admin,
      'permission': repo.permission
    });

    //todo change to library; div-view is not compatibility
    let libPath = `${siteRoot}#group/${currentGroup.id}/lib/${this.props.repo.repo_id}/`;

    return { iconUrl, iconTitle, libPath };
  }

  generatorMenu = () => {
    //todo
  }

  renderPCUI = () => {
    let { iconUrl, iconTitle, libPath } = this.getRepoComputeParams();
    let { repo, isShowRepoOwner } = this.props;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={iconUrl} title={repo.iconTitle} alt={iconTitle} width="24" /></td>
        <td><a href={libPath}>{repo.repo_name}</a></td>
        <td>{}</td>
        <td>{repo.size}</td>
        <td title={moment(repo.last_modified).format('llll')}>{moment(repo.last_modified).fromNow()}</td>
        {isShowRepoOwner && <td title={repo.owner_contact_email}>{repo.owner_name}</td>}
      </tr>
    );
  }
  
  renderMobileUI = () => {
    let { iconUrl, iconTitle, libPath } = this.getRepoComputeParams();
    let { repo, isShowRepoOwner } = this.props;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''}  onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={iconUrl} title={iconTitle} alt={iconTitle}/></td>
        <td>
          <a href={libPath}>{repo.repo_name}</a><br />
          {isShowRepoOwner ? <span className="item-meta-info" title={repo.owner_contact_email}>{repo.owner_name}</span> : null}
          <span className="item-meta-info">{repo.size}</span>
          <span className="item-meta-info" title={moment(repo.last_modified).format('llll')}>{moment(repo.last_modified).fromNow()}</span>
        </td>
        <td>{}</td>
      </tr>
    );
  }

  render() {
    if (window.innerWidth >= 768) {
      return this.renderPCUI();
    } else {
      return this.renderMobileUI();
    }
  }
}

RepoListItem.propTypes = propTypes;

export default RepoListItem;
