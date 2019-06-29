import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'reactstrap';
import ModalPortal from '../modal-portal';
import FileParticipantDialog from '../dialog/file-participant-dialog';
import { gettext } from '../../utils/constants';
import '../../css/participants-list.css';

const propTypes = {
  onParticipantsChange: PropTypes.func.isRequired,
  participants: PropTypes.array.isRequired,
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  showIconTip: PropTypes.bool.isRequired,
};

class ParticipantsList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showDialog : false,
      tooltipOpen: false,
    };
  }

  toggleDialog = () => {
    this.setState({ showDialog: !this.state.showDialog });
  }

  tooltipToggle = () => {
    this.setState({ tooltipOpen: !this.state.tooltipOpen });
  }

  render() {
    const { participants, repoID, filePath, showIconTip } = this.props;
    return (
      <div className="participants mb-2 position-relative">
        {participants.map((item, index) => {
          return <Participant item={item} index={index} key={index}/>;
        })}
        <span className="add-participants" style={{left: participants.length * 21, top: 8 }} onClick={this.toggleDialog} id="add-participant-icon">
          <i className="fas fa-plus-circle"></i>
        </span>
        {showIconTip &&
          <Tooltip toggle={this.tooltipToggle} delay={{show: 0, hide: 0}} target="add-participant-icon" placement='bottom' isOpen={this.state.tooltipOpen}>
            {gettext('Add participants')}
          </Tooltip>
        }
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

const ParticipantPropTypes = {
  index: PropTypes.number.isRequired,
  item: PropTypes.object.isRequired,
};

class Participant extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showAvatarTooltip: false,
    };
  }

  toggleAvatarTooltip = () => {
    this.setState({ showAvatarTooltip: !this.state.showAvatarTooltip });
  }

  render() {
    const { item, index } = this.props;
    const target = 'participant-avatar-' + index;
    return (
      <span>
        <img src={item.avatar_url} className="avatar" id={target} alt="avatar" key={index} style={{left: index * -7 + 'px'}}/>
        <Tooltip toggle={this.toggleAvatarTooltip} delay={{show: 0, hide: 0}} target={target} placement='bottom' isOpen={this.state.showAvatarTooltip}>
          {item.name}
        </Tooltip>
      </span>
    );
  }
}

Participant.propTypes = ParticipantPropTypes;

export default ParticipantsList;
