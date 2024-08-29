import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot } from '../../utils/constants';
import { fileAccessLogAPI } from '../../utils/file-access-log-api';
import toaster from '../toast';
import Loading from '../loading';
import EmptyTip from '../empty-tip';

import '../../css/file-access-log.css';

moment.locale(window.app.config.lang);

const propTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  fileName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class FileAccessLog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true, // first loading
      isLoadingMore: false,
      items: [],
      page: 1,
      perPage: 100,
      hasNextPage: false
    };
  }

  componentDidMount() {
    this.listFileAccessLog(this.state.page);
  }

  listFileAccessLog = (page) => {
    const { repoID, filePath } = this.props;
    const { perPage, items } = this.state;
    const avatarSize = 24 * 2;
    fileAccessLogAPI.listFileAccessLog(repoID, filePath, page, perPage, avatarSize).then((res) => {
      const { data: newItems } = res.data;
      console.log(newItems);
      this.setState({
        isLoading: false,
        isLoadingMore: false,
        page: page,
        hasNextPage: newItems.length < perPage ? false : true,
        items: items.concat(newItems)
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
          this.listFileAccessLog(page + 1);
        });
      }
    }
  };

  render() {
    const {
      isLoading, hasNextPage, items
    } = this.state;

    const { fileName } = this.props;
    let title = gettext('{placeholder} Access Log');
    title = title.replace('{placeholder}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(fileName) + '</span>');

    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog} className="file-access-log-container">
        <ModalHeader toggle={this.props.toggleDialog}>
          <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
        </ModalHeader>
        <ModalBody className="file-access-log-content-container" onScroll={this.handleScroll}>
          {isLoading ? <Loading /> : (
            <>
              {items.length > 0 ? (
                <>
                  <table className="table-hover">
                    <thead>
                      <tr>
                        <th width="25%" className="pl10">{gettext('User')}</th>
                        <th width="15%">{gettext('Type')}</th>
                        <th width="40%">{gettext('IP')} / {gettext('Device Name')}</th>
                        <th width="20%">{gettext('Date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        return (
                          <tr key={index}>
                            <td className="pl10">
                              <img src={item.avatar_url} alt='' width="24" className="rounded-circle mr-2" />
                              {item.email ? <a href={`${siteRoot}profile/${encodeURIComponent(item.email)}/`} target="_blank" rel="noreferrer">{item.name}</a> : <span>{gettext('Anonymous User')}</span>}
                            </td>
                            <td>{item.etype}</td>
                            <td className="pr-4">
                              {`${item.ip}${item.device ? '/' + item.device : ''}`}
                            </td>
                            <td>{moment(item.time).format('YYYY-MM-DD HH:mm:ss')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {hasNextPage && <Loading />}
                </>
              ) : (
                <EmptyTip text={gettext('This file has (apparently) not been accessed yet')} />
              )}
            </>
          )}
        </ModalBody>
      </Modal>
    );
  }
}

FileAccessLog.propTypes = propTypes;

export default FileAccessLog;
