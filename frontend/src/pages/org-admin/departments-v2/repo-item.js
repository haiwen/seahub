import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Utils } from '../../../utils/utils';
import ModalPortal from '../../../components/modal-portal';
import DeleteRepoDialog from '../../../components/dialog/org-delete-repo-dialog';
import { gettext, lang } from '../../../utils/constants';
import '../../../css/org-department-item.css';

dayjs.locale(lang);

class RepoItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isDeleteDialogOpen: false
    };
  }

  onMouseEnter = () => {
    this.setState({ highlight: true });
  };

  onMouseLeave = () => {
    this.setState({ highlight: false });
  };

  toggleDeleteDialog = () => {
    this.setState({
      isDeleteDialogOpen: !this.state.isDeleteDialogOpen
    });
  };

  render() {
    const { repo, groupID } = this.props;
    const { highlight, isDeleteDialogOpen } = this.state;
    let iconUrl = Utils.getLibIconUrl(repo);
    return (
      <>
        <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td><img src={iconUrl} width="24" alt={gettext('icon')}/></td>
          <td>{repo.name}</td>
          <td>{Utils.bytesToSize(repo.size)}{' '}</td>
          <td className="cursor-pointer text-center">
            <span onClick={this.toggleDeleteDialog} className={`sf3-font-delete1 sf3-font op-icon ${highlight ? '' : 'vh'}`} title="Delete"></span>
          </td>
        </tr>
        {isDeleteDialogOpen && (
          <ModalPortal>
            <DeleteRepoDialog
              toggle={this.toggleDeleteDialog}
              onDeleteRepo={this.props.onDeleteRepo}
              repo={repo}
              groupID={groupID}
            />
          </ModalPortal>
        )}
      </>
    );
  }
}

const RepoItemPropTypes = {
  repo: PropTypes.object.isRequired,
  groupID: PropTypes.string.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
};

RepoItem.propTypes = RepoItemPropTypes;

export default RepoItem;
