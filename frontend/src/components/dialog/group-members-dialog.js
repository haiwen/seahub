import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import Loading from '../loading';

const propTypes = {
  groupID: PropTypes.number.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class GroupMembers extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true, // first loading
      isLoadingMore: false,
      groupMembers: [],
      page: 1,
      perPage: 100,
      hasNextPage: false
    };
  }

  componentDidMount() {
    this.listGroupMembers(this.state.page);
  }

  listGroupMembers = (page) => {
    const { groupID } = this.props;
    const { perPage, groupMembers } = this.state;
    seafileAPI.listGroupMembers(groupID, page, perPage).then((res) => {
      const members = res.data;
      this.setState({
        isLoading: false,
        isLoadingMore: false,
        page: page,
        hasNextPage: members.length < perPage ? false : true,
        groupMembers: groupMembers.concat(members)
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.setState({
        isLoading: false,
        isLoadingMore: false,
        hasNextPage: false
      });
    });
  };

  handleScroll = (event) => {
    // isLoadingMore: to avoid repeated request
    const { page, hasNextPage, isLoadingMore } = this.state;
    if (hasNextPage && !isLoadingMore) {
      const clientHeight = event.target.clientHeight;
      const scrollHeight = event.target.scrollHeight;
      const scrollTop = event.target.scrollTop;
      const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
      if (isBottom) { // scroll to the bottom
        this.setState({ isLoadingMore: true }, () => {
          this.listGroupMembers(page + 1);
        });
      }
    }
  };

  render() {
    const {
      isLoading, hasNextPage, groupMembers, perPage
    } = this.state;

    let memberNumber;
    if (groupMembers.length < perPage) {
      memberNumber = groupMembers.length;
    } else {
      memberNumber = `${perPage}+`;
    }
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <SeahubModalHeader toggle={this.props.toggleDialog}>{`${gettext('Group members')} (${memberNumber})`}</SeahubModalHeader>
        <ModalBody className="px-0 group-members-container" onScroll={this.handleScroll}>
          {isLoading ? <Loading /> : (
            <>
              <ul className="list-unstyled">
                {groupMembers.map((item, index) => {
                  return (
                    <li key={index} className="group-member px-4 py-2 d-flex align-items-center">
                      <img src={item.avatar_url} alt={item.name} className="avatar" />
                      <span className="ml-2 text-truncate" title={item.name}>{item.name}</span>
                    </li>
                  );
                })}
              </ul>
              {hasNextPage && <Loading />}
            </>
          )}
        </ModalBody>
      </Modal>
    );
  }
}

GroupMembers.propTypes = propTypes;

export default GroupMembers;
