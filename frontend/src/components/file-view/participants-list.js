import React from 'react';
import PropTypes from 'prop-types';
import ModalPortal from '../modal-portal';
import FileParticipantDialog from '../dialog/file-participant-dialog';
import { serviceURL } from '../../utils/constants';
import '../../css/participants-list.css';

const propTypes = {
  onParticipantsChange: PropTypes.func.isRequired,
  participants: PropTypes.array.isRequired,
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
};

class ParticipantsList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showDialog : false,
    };
  }

  toggleDialog = () => {
    this.setState({ showDialog: !this.state.showDialog });
  }

  render() {
    const { participants, repoID, filePath } = this.props;
    return (
      <div className="participants mb-2 position-relative">
        {participants.map((item, index) => {
          return <img src={serviceURL + item.avatar_url} className="avatar" alt="avatar" key={index} style={{left: index * -7 + 'px'}}/>;
        })}
        <span className="add-participants" style={{left: participants.length * 21, top: 8 }} onClick={this.toggleDialog}>
          <i className="fas fa-plus-circle"></i>
        </span>
        {this.state.showDialog &&
          <ModalPortal>
            <FileParticipantDialog
              repoID={repoID}
              filePath={filePath}
              toggleFileParticipantDialog={this.toggleDialog}
              fileParticipantList={participants}
              onParticipantsChange={this.props.onParticipantsChange}
            />
          </ModalPortal>
        }
      </div>
    );
  }
}

ParticipantsList.propTypes = propTypes;

export default ParticipantsList;
