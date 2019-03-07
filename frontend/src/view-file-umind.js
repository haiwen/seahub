import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import { gettext, lang } from './utils/constants';
import toaster from './components/toast';

const { UMind, React, ReactDOM } = window;
const { repoID, filePath, fileName, username } = window.app.pageOptions;

const DEFAULT_DATA = {
  roots: [{
    label: '中心主题',
    children: [{
      label: '分支主题 1',
    }, {
      label: '分支主题 2',
    }, {
      label: '分支主题 3',
    }],
  }],
};

class ViewFileUmind extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      data: DEFAULT_DATA,
      isDataLoading: true
    };
    this.locale = 'zh-CN';
    this.config =  {
      file: {
        id: repoID + filePath,
      },
      user: {
        id: username,
      },
      socket: {
        url: 'https://umind.alibaba-inc.com',
        events: {
          user: 'user',
          operation: 'operation',
        },
        onUserListChange: () => {},
      },
    };
  }

  componentDidMount() {
    seafileAPI.getFileDownloadLink(repoID, filePath).then(res => {
      let url = res.data;
      seafileAPI.getFileContent(url).then(res => {
        if (res.data) {
          this.setState({
            isDataLoading: false,
            data: res.data
          });
        } else {
          this.setState({
            isDataLoading: false,
            data: DEFAULT_DATA
          });
        }
      }).catch(() => {
        // toaster.success(gettext('file loading error'));
      });
    });
  }

  handleSave = (data) => {
    let dirPath = Utils.getDirName(filePath);
    seafileAPI.getUpdateLink(repoID, dirPath).then(res => {
      let updateLink = res.data;
      let updateData = JSON.stringify(data);
      seafileAPI.updateFile(updateLink, filePath, fileName, updateData).then(res => {
        // toaster.success(gettext('File saved.'));
      }).catch(() => {
        // toaster.success(gettext('File saved failed.'));
      });
    });
  }

  render() {
    return (
      <UMind.default locale={this.locale} config={this.config} data={this.state.data} save={this.handleSave} />
    );
  }
}

ReactDOM.render(<ViewFileUmind />, document.getElementById('root'));