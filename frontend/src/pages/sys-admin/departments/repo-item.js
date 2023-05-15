import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils.js';
import { siteRoot, gettext } from '../../../utils/constants';

const { enableSysAdminViewRepo } = window.sysadmin.pageOptions;

const RepoItemPropTypes = {
  repo: PropTypes.object.isRequired,
  showDeleteRepoDialog: PropTypes.func.isRequired
};

class RepoItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false
    };
  }

  onMouseEnter = () => {
    this.setState({ highlight: true });
  }

  onMouseLeave = () => {
    this.setState({ highlight: false });
  }

  render() {
    const { repo } = this.props;
    const repoName = repo.name || repo.repo_name;
    const highlight = this.state.highlight;
    let iconUrl = Utils.getLibIconUrl(repo);
    return (
      <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={iconUrl} width="24" alt={gettext('icon')}/></td>
        { enableSysAdminViewRepo ?
          <td><a href={`${siteRoot}sys/libraries/${repo.repo_id}/${encodeURIComponent(repoName)}/`}>{repoName}</a></td>
          :
          <td>{repoName}</td>
        }
        <td>{Utils.bytesToSize(repo.size)}</td>
        <td className="cursor-pointer text-center" onClick={this.props.showDeleteRepoDialog.bind(this, repo)}>
          <span className={`sf2-icon-delete action-icon ${highlight ? '' : 'vh'}`} title="Delete"></span>
        </td>
      </tr>
    );
  }
}

RepoItem.propTypes = RepoItemPropTypes;

export default RepoItem;
