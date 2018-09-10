import { slug, repoID, siteRoot } from '../components/constance';
import { SeafileAPI } from 'seafile-js';
import cookie from 'react-cookies';
import { bytesToSize } from '../components/utils'

let seafileAPI = new SeafileAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
seafileAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

class EditorUtilities {
  
  getFiles() {
    return seafileAPI.listWikiDir(slug, "/").then(items => {
        const files = items.data.dir_file_list.map(item => {
          return {
            name: item.name,
            type: item.type === 'dir' ? 'dir' : 'file',
            isExpanded: item.type === 'dir' ? true : false,
            parent_path: item.parent_dir,
            last_update_time: item.last_update_time,
            size: bytesToSize(item.size)
          }
        })
        return files;
      })
  }

  listRepoDir() {
    return seafileAPI.listDir(repoID, "/",{recursive: true}).then(items => {
        const files = items.data.map(item => {
          return {
            name: item.name,
            type: item.type === 'dir' ? 'dir' : 'file',
            isExpanded: item.type === 'dir' ? true : false,
            parent_path: item.parent_dir,
            last_update_time: item.mtime,
            size: item.size ? bytesToSize(item.size) : '0 bytes'
          }
        })

        return files;
      })
  }


  createFile(filePath) {
    return seafileAPI.createFile(repoID, filePath)
  }

  deleteFile(filePath) {
    return seafileAPI.deleteFile(repoID, filePath)
  }

  renameFile(filePath, newFileName) {
    return seafileAPI.renameFile(repoID, filePath, newFileName)
  }

  createDir(dirPath) {
    return seafileAPI.createDir(repoID, dirPath)
  }

  deleteDir(dirPath) {
    return seafileAPI.deleteDir(repoID, dirPath)
  }

  renameDir(dirPath, newDirName) {
    return seafileAPI.renameDir(repoID, dirPath, newDirName)
  }

  getWikiFileContent(slug, filePath) {
    return seafileAPI.getWikiFileContent(slug, filePath);
  }

  getSource() {
    return seafileAPI.getSource();
  }

  searchFiles(queryData,cancelToken) {
    return seafileAPI.searchFiles(queryData,cancelToken);
  }

  getAccountInfo() {
    return seafileAPI.getAccountInfo();
  }

}

const editorUtilities = new EditorUtilities();

export default editorUtilities;
export { seafileAPI };
