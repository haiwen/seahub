

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=0;
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "%curr% of %total%": "%curr% / %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">  \u5716\u7247 </a>  \u7121\u6cd5\u88ab\u52a0\u8f09\u3002", 
    "A file with the same name already exists in this folder.": "\u8a72\u8cc7\u6599\u593e\u4e0b\u6709\u540c\u540d\u6a94\u6848\u3002", 
    "About": "\u95dc\u65bc", 
    "About Us": "\u95dc\u65bc\u6211\u5011", 
    "Access Log": "\u700f\u89bd\u65e5\u8a8c", 
    "Actions": "\u64cd\u4f5c", 
    "Active": "\u5553\u52d5", 
    "Active Users": "\u6d3b\u8e8d\u7528\u6236\u6578", 
    "Activities": "\u6a94\u6848\u6d3b\u52d5", 
    "Add Admins": "\u65b0\u589e\u7ba1\u7406\u54e1", 
    "Add Library": "\u65b0\u589e\u8cc7\u6599\u5eab", 
    "Add Member": "\u6dfb\u52a0\u6210\u54e1", 
    "Add User": "\u65b0\u589e\u4f7f\u7528\u8005", 
    "Add Wiki": "\u6dfb\u52a0\u7dad\u57fa", 
    "Add admin": "\u65b0\u589e\u7ba1\u7406\u54e1", 
    "Add auto expiration": "\u589e\u52a0\u81ea\u52d5\u904e\u671f", 
    "Add password protection": "\u589e\u52a0\u5bc6\u78bc\u4fdd\u8b77", 
    "Add user": "\u65b0\u589e\u7528\u6236", 
    "Added user {user}": "\u5df2\u65b0\u589e\u4f7f\u7528\u8005 {user}", 
    "Admin": "\u7ba1\u7406", 
    "Admin Logs": "\u7ba1\u7406\u54e1\u65e5\u8a8c", 
    "All": "\u5168\u90e8", 
    "All Groups": "\u6240\u6709\u7fa4\u7d44", 
    "All Public Links": "\u5168\u90e8\u516c\u5171\u9023\u7d50", 
    "Anonymous User": "\u533f\u540d\u7528\u6236", 
    "Are you sure you want to clear trash?": "\u78ba\u5b9a\u8981\u6e05\u7a7a\u56de\u6536\u7ad9\u55ce\uff1f", 
    "Are you sure you want to delete %s ?": "\u78ba\u5b9a\u8981\u522a\u9664 %s \u55ce\uff1f", 
    "Are you sure you want to delete %s completely?": "\u78ba\u5b9a\u8981\u5b8c\u5168\u522a\u9664 %s \u55ce\uff1f", 
    "Are you sure you want to delete all %s's libraries?": "\u78ba\u5b9a\u8981\u522a\u9664\u6240\u6709 %s \u7684\u8cc7\u6599\u5eab\u55ce\uff1f", 
    "Are you sure you want to delete these selected items?": "\u78ba\u5b9a\u8981\u522a\u9664\u9078\u4e2d\u7684\u689d\u76ee\u55ce\uff1f", 
    "Are you sure you want to quit this group?": "\u78ba\u5b9a\u8981\u9000\u51fa\u8a72\u7fa4\u7d44\u55ce\uff1f", 
    "Are you sure you want to restore %s?": "\u78ba\u5b9a\u8981\u9084\u539f %s \uff1f", 
    "Are you sure you want to unlink this device?": "\u78ba\u5b9a\u8981\u65b7\u958b\u6b64\u8a2d\u5099\u7684\u9023\u63a5\u55ce\uff1f", 
    "Are you sure you want to unshare %s ?": "\u78ba\u5b9a\u8981\u53d6\u6d88\u5171\u4eab %s \u55ce\uff1f", 
    "Avatar": "\u982d\u50cf", 
    "Back": "\u8fd4\u56de", 
    "Broken (please contact your administrator to fix this library)": "\u640d\u58de (\u8acb\u806f\u7e6b\u60a8\u7684\u7ba1\u7406\u54e1\u4f86\u4fee\u5fa9\u8a72\u8cc7\u6599\u5eab)", 
    "Can not copy directory %(src)s to its subdirectory %(des)s": "\u4e0d\u80fd\u628a\u76ee\u9304 %(src)s \u8907\u88fd\u5230\u5b83\u7684\u5b50\u76ee\u9304 %(des)s \u4e2d", 
    "Can not move directory %(src)s to its subdirectory %(des)s": "\u4e0d\u80fd\u628a\u76ee\u9304 %(src)s \u79fb\u52d5\u5230\u5b83\u7684\u5b50\u76ee\u9304 %(des)s \u4e2d", 
    "Cancel": "\u53d6\u6d88", 
    "Cancel All": "\u5168\u90e8\u53d6\u6d88", 
    "Canceled.": "\u5df2\u53d6\u6d88\u3002", 
    "Change Password": "\u4fee\u6539\u5bc6\u78bc", 
    "Change Password of Library {placeholder}": "\u66f4\u6539\u8cc7\u6599\u5eab {placeholder} \u5bc6\u78bc", 
    "Clear Trash": "\u6e05\u7a7a\u56de\u6536\u7ad9", 
    "Clients": "\u5ba2\u6237\u7aef", 
    "Close": "\u95dc\u9589", 
    "Close (Esc)": "\u95dc\u9589 (Esc)", 
    "Comment": "\u8a55\u8ad6", 
    "Comments": "\u8a55\u8ad6", 
    "Confirm Password": "\u78ba\u8a8d\u5bc6\u78bc", 
    "Copy": "\u8907\u88fd", 
    "Copy selected item(s) to:": "\u5c07\u5df2\u9078\u689d\u76ee\u8907\u88fd\u5230\uff1a", 
    "Copy {placeholder} to:": "\u8907\u88fd {placeholder} \u5230", 
    "Copying %(name)s": "\u6b63\u5728\u8907\u88fd %(name)s", 
    "Copying file %(index)s of %(total)s": "\u6b63\u5728\u5fa9\u88fd\u6587\u4ef6 %(index)s / %(total)s", 
    "Count": "\u6578\u91cf", 
    "Create At / Last Login": "\u5efa\u7acb\u65bc/\u6700\u5f8c\u767b\u5165", 
    "Create Group": "\u5efa\u7acb\u7fa4\u7d44", 
    "Create Library": "\u5275\u5efa\u8cc7\u6599\u5eab", 
    "Created At": "\u5efa\u7acb\u6642\u9593", 
    "Created group {group_name}": "\u5efa\u7acb\u7fa4\u7d44 {group_name}", 
    "Created library": "\u5efa\u7acb\u4e86\u8cc7\u6599\u5eab", 
    "Created library {library_name} with {owner} as its owner": "\u5275\u5efa\u8cc7\u6599\u5eab {library_name} \u7531{owner}\u70ba\u64c1\u6709\u8005", 
    "Creator": "\u5efa\u7acb\u8005", 
    "Current Library": "\u7576\u524d\u8cc7\u6599\u5eab", 
    "Date": "\u65e5\u671f", 
    "Delete": "\u5220\u9664", 
    "Delete Group": "\u5220\u9664\u7fa4\u7ec4", 
    "Delete Items": "\u522a\u9664\u9805\u76ee", 
    "Delete Library": "\u522a\u9664\u8cc7\u6599\u5eab", 
    "Delete Library By Owner": "\u901a\u904e\u64c1\u6709\u8005\u522a\u9664\u8cc7\u6599\u5eab", 
    "Delete Member": "\u5220\u9664\u6210\u54e1", 
    "Delete User": "\u522a\u9664\u4f7f\u7528\u8005", 
    "Delete failed": "\u522a\u9664\u5931\u6557", 
    "Delete files from this device the next time it comes online.": "\u5728\u6b64\u8a2d\u5099\u4e0b\u6b21\u4e0a\u7dda\u6642\u522a\u9664\u6b64\u8a2d\u5099\u4e0a\u7684\u6587\u4ef6\u3002", 
    "Deleted Libraries": "\u5df2\u522a\u9664\u7684\u8cc7\u6599\u5eab", 
    "Deleted Time": "\u522a\u9664\u6642\u9593", 
    "Deleted directories": "\u522a\u9664\u7684\u76ee\u9304", 
    "Deleted files": "\u522a\u9664\u7684\u6587\u4ef6", 
    "Deleted group {group_name}": "\u5df2\u522a\u9664\u7fa4\u7d44 {group_name}", 
    "Deleted library": "\u5df2\u522a\u9664\u7684\u8cc7\u6599\u5eab", 
    "Deleted library {library_name}": "\u522a\u9664\u8cc7\u6599\u5eab {library_name}", 
    "Deleted user {user}": "\u522a\u9664\u4f7f\u7528\u8005 {user}", 
    "Details": "\u8a73\u60c5", 
    "Device Name": "\u8a2d\u5099\u540d\u7a31", 
    "Devices": "\u8a2d\u5099", 
    "Dismiss": "\u89e3\u6563", 
    "Dismiss Group": "\u89e3\u6563\u7fa4\u7d44", 
    "Document convertion failed.": "\u6587\u6a94\u8f49\u63db\u5931\u6557\u3002", 
    "Don't keep history": "\u4e0d\u4fdd\u7559\u6b77\u53f2", 
    "Don't replace": "\u4e0d\u53d6\u4ee3", 
    "Download": "\u4e0b\u8f09", 
    "Edit": "\u7de8\u8f2f", 
    "Edit Page": "\u7de8\u8f2f\u9801\u9762", 
    "Edit failed": "\u7de8\u8f2f\u5931\u6557", 
    "Edit failed.": "\u6b0a\u9650\u4fee\u6539\u5931\u6557", 
    "Email": "\u96fb\u5b50\u90f5\u4ef6", 
    "Empty file upload result": "\u7a7a\u6587\u4ef6", 
    "Encrypt": "\u52a0\u5bc6", 
    "Encrypted library": "\u52a0\u5bc6\u8cc7\u6599\u5eab", 
    "Error": "\u932f\u8aa4", 
    "Expiration": "\u904e\u671f\u6642\u9593", 
    "Expired": "\u5df2\u904e\u671f", 
    "Failed to copy %(name)s": "\u8907\u88fd %(name)s \u5931\u6557", 
    "Failed to delete %(name)s and %(amount)s other items.": "\u522a\u9664 %(name)s \u4ee5\u53ca\u53e6\u5916 %(amount)s \u9805\u5931\u6557\u3002", 
    "Failed to delete %(name)s and 1 other item.": "\u522a\u9664 %(name)s \u4ee5\u53ca\u53e6\u59161\u9805\u5931\u6557\u3002", 
    "Failed to delete %(name)s.": "\u522a\u9664 %(name)s \u5931\u6557\u3002", 
    "Failed to move %(name)s": "\u79fb\u52d5 %(name)s \u5931\u6557", 
    "Failed to send to {placeholder}": "\u767c\u9001\u7d66 {placeholder} \u5931\u6557", 
    "Failed.": "\u5931\u6557\u3002", 
    "Failed. Please check the network.": "\u64cd\u4f5c\u5931\u6557\u3002\u8acb\u6aa2\u67e5\u7db2\u7d61\u662f\u5426\u5df2\u9023\u63a5\u3002", 
    "Favorites": "\u6536\u85cf\u593e", 
    "File": "\u6a94\u6848", 
    "File Name": "\u6a94\u6848\u540d\u7a31", 
    "File Upload": "\u4e0a\u50b3\u6a94\u6848", 
    "File Upload canceled": "\u6587\u4ef6\u4e0a\u50b3\u5df2\u53d6\u6d88", 
    "File Upload complete": "\u6587\u4ef6\u4e0a\u50b3\u5df2\u5b8c\u6210", 
    "File Upload failed": "\u6587\u4ef6\u4e0a\u50b3\u5931\u6557", 
    "File Uploading...": "\u6587\u4ef6\u4e0a\u50b3\u4e2d...", 
    "File download is disabled: the share link traffic of owner is used up.": "\u6a94\u6848\u4e0b\u8f09\u5df2\u7981\u7528\uff1a\u5916\u93c8\u64c1\u6709\u8005\u7684\u6d41\u91cf\u5df2\u7528\u5b8c\u3002", 
    "File is locked": "\u6587\u4ef6\u5df2\u9396\u5b9a", 
    "File is too big": "\u6587\u4ef6\u592a\u5927", 
    "File is too small": "\u6587\u4ef6\u592a\u5c0f", 
    "Files": "\u6a94\u6848", 
    "Filetype not allowed": "\u4e0d\u652f\u6301\u7684\u6587\u4ef6\u985e\u578b", 
    "Folder": "\u8cc7\u6599\u593e", 
    "Folder Permission": "\u76ee\u9304\u6b0a\u9650", 
    "Folders": "\u8cc7\u6599\u593e", 
    "Generate": "\u751f\u6210\u9023\u7d50", 
    "Group": "\u7fa4\u7d44", 
    "Groups": "\u7fa4\u7d44", 
    "Help": "\u4f7f\u7528\u5e6b\u52a9", 
    "Hide": "\u96b1\u85cf", 
    "History": "\u6b77\u53f2", 
    "History Setting": "\u6b77\u53f2\u8a2d\u5b9a", 
    "IP": "IP", 
    "Inactive": "\u4e0d\u5553\u52d5", 
    "Info": "\u8cc7\u8a0a", 
    "Institutions": "\u6a5f\u69cb", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "\u5167\u90e8\u932f\u8aa4\u3002\u8907\u88fd %(name)s \u548c\u5176\u4ed6 %(amount)s \u9805\u5167\u5bb9\u5931\u6557\u3002", 
    "Internal error. Failed to copy %(name)s.": "\u5167\u90e8\u932f\u8aa4\u3002\u8907\u88fd %(name)s \u5931\u6557\u3002", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "\u5167\u90e8\u932f\u8aa4\u3002\u79fb\u52d5 %(name)s \u548c\u5176\u4ed6 %(amount)s \u9805\u5167\u5bb9\u5931\u6557\u3002", 
    "Internal error. Failed to move %(name)s.": "\u5167\u90e8\u932f\u8aa4\u3002\u79fb\u52d5 %(name)s \u5931\u6557", 
    "Invalid destination path": "\u76ee\u6a19\u8def\u5f91\u7121\u6548", 
    "Invitations": "\u9080\u8acb", 
    "It is required.": "\u5fc5\u586b\u9805\u3002", 
    "Just now": "\u525b\u525b", 
    "Keep full history": "\u4fdd\u7559\u6240\u6709\u6b77\u53f2", 
    "Last Access": "\u6700\u5f8c\u700f\u89bd\u6642\u9593", 
    "Last Update": "\u66f4\u65b0\u6642\u9593", 
    "Leave Share": "\u9000\u51fa\u5171\u4eab", 
    "Libraries": "\u8cc7\u6599\u5eab", 
    "Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.": "\u4ee5\u53ef\u8b80\u5beb\u65b9\u5f0f\u5171\u4eab\u7684\u8cc7\u6599\u5eab\u53ef\u4ee5\u88ab\u5176\u4ed6\u7fa4\u7d44\u6210\u54e1\u4e0b\u8f09\u548c\u540c\u6b65\uff0c\u800c\u4ee5\u552f\u8b80\u65b9\u5f0f\u5171\u4eab\u7684\u8cc7\u6599\u5eab\u53ea\u80fd\u88ab\u4e0b\u8f09\uff0c\u5176\u4ed6\u4eba\u7684\u4fee\u6539\u5c07\u4e0d\u6703\u88ab\u4e0a\u50b3\u3002", 
    "Library": "\u8cc7\u6599\u5eab", 
    "Library Type": "\u8cc7\u6599\u5eab\u985e\u578b", 
    "Limits": "\u7528\u6236\u6578\u9650\u5236", 
    "Link": "\u93c8\u7d50", 
    "Linked Devices": "\u5df2\u9023\u63a5\u7684\u8a2d\u5099", 
    "Links": "\u9023\u7d50", 
    "List": "\u5217\u8868", 
    "Loading failed": "\u52a0\u8f09\u5931\u6557", 
    "Loading...": "\u52a0\u8f09\u4e2d...", 
    "Location": "\u4f4d\u7f6e", 
    "Lock": "\u9396\u5b9a", 
    "Log in": "\u767b\u5165", 
    "Log out": "\u9000\u51fa", 
    "Logs": "\u65e5\u8a8c", 
    "Manage Members": "\u7ba1\u7406\u6210\u54e1", 
    "Member": "\u6210\u54e1", 
    "Members": "\u6210\u54e1", 
    "Modification Details": "\u4fee\u6539\u8a73\u60c5", 
    "Modified files": "\u5df2\u4fee\u6539\u6587\u4ef6", 
    "More": "\u66f4\u591a", 
    "More Operations": "\u66f4\u591a\u64cd\u4f5c", 
    "Move": "\u79fb\u52d5", 
    "Move selected item(s) to:": "\u5c07\u5df2\u9078\u689d\u76ee\u79fb\u52d5\u5230\uff1a", 
    "Move {placeholder} to:": "\u79fb\u52d5 {placeholder} \u5230", 
    "Moving %(name)s": "\u6b63\u5728\u79fb\u52d5 %(name)s", 
    "Moving file %(index)s of %(total)s": "\u6b63\u5728\u79fb\u52d5\u6587\u4ef6 %(index)s / %(total)s", 
    "My Groups": "\u6211\u7684\u7fa4\u7d44", 
    "My Libraries": "\u6211\u7684\u8cc7\u6599\u5eab", 
    "Name": "\u540d\u7a31", 
    "Name is required": "\u540d\u7a31\u70ba\u5fc5\u586b\u9805", 
    "Name is required.": "\u5fc5\u9808\u586b\u5beb\u540d\u5b57\u3002", 
    "Name should not include '/'.": "\u540d\u5b57\u4e0d\u80fd\u5305\u542b \u2018/\u2019\u3002", 
    "Name(optional)": "\u540d\u5b57(\u53ef\u9078)", 
    "New": "\u65b0\u5efa", 
    "New Excel File": "\u65b0\u5efaExcel\u6587\u4ef6", 
    "New File": "\u65b0\u5efa\u6587\u4ef6", 
    "New Folder": "\u65b0\u5efa\u8cc7\u6599\u593e", 
    "New Group": "\u65b0\u5efa\u7fa4\u7d44", 
    "New Library": "\u65b0\u5efa\u8cc7\u6599\u5eab", 
    "New Markdown File": "\u65b0\u5efaMarkdown\u6587\u4ef6", 
    "New Password": "\u65b0\u5bc6\u78bc", 
    "New Password Again": "\u518d\u6b21\u8f38\u5165\u65b0\u5bc6\u78bc", 
    "New PowerPoint File": "\u65b0\u5efaPowerPoint\u6587\u4ef6", 
    "New Word File": "\u65b0\u5efaWord\u6587\u4ef6", 
    "New directories": "\u65b0\u76ee\u9304", 
    "New files": "\u65b0\u6587\u4ef6", 
    "New password is too short": "\u65b0\u5bc6\u78bc\u592a\u77ed", 
    "New passwords don't match": "\u5169\u6b21\u8f38\u5165\u7684\u65b0\u5bc6\u78bc\u4e0d\u4e00\u81f4", 
    "Next": "\u4e0b\u4e00\u9801", 
    "Next (Right arrow key)": "\u4e0b\u4e00\u5f35 (\u53f3\u65b9\u5411\u9375)", 
    "No comment yet.": "\u9084\u6c92\u6709\u8a55\u8ad6", 
    "No deleted libraries.": "\u6c92\u6709\u5df2\u522a\u9664\u7684\u8cc7\u6599\u5eab", 
    "No libraries": "\u6c92\u6709\u8cc7\u6599\u5eab", 
    "No library is shared to this group": "\u9084\u6c92\u6709\u8cc7\u6599\u5eab\u5171\u4eab\u5230\u7fa4\u7d44", 
    "No matches": "\u6c92\u6709\u5339\u914d\u9805", 
    "No members": "\u66ab\u7121\u6210\u54e1", 
    "Notifications": "\u901a\u77e5", 
    "Old Password": "\u820a\u5bc6\u78bc", 
    "Only an extension there, please input a name.": "\u8acb\u8f38\u5165\u5b8c\u6574\u7684\u6587\u4ef6\u540d\u3002", 
    "Only keep a period of history:": "\u50c5\u4fdd\u7559\u4e00\u6bb5\u6642\u9593\u7684\u6b77\u53f2:", 
    "Open in New Tab": "\u5728\u65b0\u6a19\u7c64\u9801\u6253\u958b", 
    "Open parent folder": "\u958b\u555f\u7236\u76ee\u9304", 
    "Open via Client": "\u5ba2\u6236\u7aef\u6253\u958b", 
    "Operations": "\u64cd\u4f5c", 
    "Organization": "\u5718\u9ad4", 
    "Organization Admin": "\u7d44\u7e54\u7ba1\u7406", 
    "Organizations": "\u7d44\u7e54", 
    "Other Libraries": "\u5176\u4ed6\u8cc7\u6599\u5eab", 
    "Owner": "\u64c1\u6709\u8005", 
    "Packaging...": "\u6b63\u5728\u5c01\u5305", 
    "Pages": "\u9801\u9762", 
    "Password": "\u5bc6\u78bc", 
    "Password again": "\u8acb\u518d\u6b21\u8f38\u5165\u5bc6\u78bc", 
    "Password is required.": "\u5bc6\u78bc\u70ba\u5fc5\u586b\u9805\u3002", 
    "Password is too short": "\u5bc6\u78bc\u592a\u77ed", 
    "Passwords don't match": "\u5169\u6b21\u8f38\u5165\u7684\u5bc6\u78bc\u4e0d\u4e00\u81f4", 
    "Permission": "\u8b80\u5beb\u6b0a\u9650", 
    "Permission denied": "\u6c92\u6709\u6b0a\u9650", 
    "Permission error": "\u6b0a\u9650\u932f\u8aa4", 
    "Platform": "\u5e73\u53f0", 
    "Please check the network.": "\u8acb\u6aa2\u67e5\u7db2\u7d61\u662f\u5426\u5df2\u9023\u63a5\u3002", 
    "Please choose a CSV file": "\u8acb\u6dfb\u52a0 CSV \u6587\u4ef6", 
    "Please click and choose a directory.": "\u8acb\u9ede\u64ca\u9078\u64c7\u76ee\u6a19\u76ee\u9304\u3002", 
    "Please enter 1 or more character": "\u8acb\u8f38\u5165 1 \u500b\u6216\u66f4\u591a\u5b57\u7b26", 
    "Please enter a new password": "\u8acb\u8f38\u5165\u65b0\u5bc6\u78bc\u3002", 
    "Please enter days.": "\u8acb\u8f38\u5165\u5929\u6578", 
    "Please enter password": "\u8acb\u8f38\u5165\u5bc6\u78bc", 
    "Please enter the new password again": "\u8acb\u518d\u6b21\u8f38\u5165\u65b0\u5bc6\u78bc", 
    "Please enter the old password": "\u8acb\u8f38\u5165\u820a\u5bc6\u78bc\u3002", 
    "Please enter the password again": "\u8acb\u518d\u6b21\u8f38\u5165\u5bc6\u78bc", 
    "Please enter valid days": "\u8acb\u8f38\u5165\u6709\u6548\u7684\u5929\u6578", 
    "Please input at least an email.": "\u8acb\u8f38\u5165\u81f3\u5c11\u4e00\u500b\u90f5\u7bb1\u3002", 
    "Previous": "\u524d\u4e00\u9801", 
    "Previous (Left arrow key)": "\u4e0a\u4e00\u5f35 (\u5de6\u65b9\u5411\u9375)", 
    "Processing...": "\u8655\u7406\u4e2d...", 
    "Quit Group": "\u9000\u51fa\u7fa4\u7d44", 
    "Read-Only": "\u552f\u8b80", 
    "Read-Only library": "\u552f\u8b80\u8cc7\u6599\u5eab", 
    "Read-Write": "\u53ef\u8b80\u5beb", 
    "Read-Write library": "\u53ef\u8b80\u5beb\u8cc7\u6599\u5eab", 
    "Really want to dismiss this group?": "\u78ba\u5b9a\u8981\u89e3\u6563\u8a72\u7fa4\u7d44\u55ce\uff1f", 
    "Refresh": "\u91cd\u65b0\u6574\u7406", 
    "Remove": "\u522a\u9664", 
    "Removed all items from trash.": "\u6e05\u7a7a\u6240\u6709\u56de\u6536\u7ad9\u7684\u9805\u76ee", 
    "Removed items older than {n} days from trash.": "\u6e05\u7a7a\u6240\u6709\u5927\u65bc {n} \u5929\u7684\u9805\u76ee", 
    "Rename": "\u91cd\u547d\u540d", 
    "Rename File": "\u91cd\u65b0\u547d\u540d\u6587\u4ef6", 
    "Rename Folder": "\u91cd\u65b0\u547d\u540d\u76ee\u9304", 
    "Renamed or Moved files": "\u91cd\u547d\u540d\u6216\u79fb\u52d5\u7684\u6587\u4ef6", 
    "Replace": "\u53d6\u4ee3", 
    "Replace file {filename}?": "\u8986\u84cb\u6587\u4ef6 {filename} \uff1f", 
    "Replacing it will overwrite its content.": "\u66ff\u63db\u5b83\u6703\u8986\u84cb\u5df2\u6709\u5167\u5bb9\u3002", 
    "Reset Password": "\u91cd\u7f6e\u5bc6\u78bc", 
    "ResetPwd": "\u91cd\u7f6e\u5bc6\u78bc", 
    "Restore": "\u9084\u539f", 
    "Restore Library": "\u9084\u539f\u8cc7\u6599\u5eab", 
    "Revoke Admin": "\u53d6\u6d88\u7ba1\u7406\u54e1", 
    "Role": "\u7528\u6236\u89d2\u8272", 
    "Saving...": "\u4fdd\u5b58\u4e2d...", 
    "Seafile": "\u6d77\u6587\u4e92\u77e5", 
    "Seafile Wiki enables you to organize your knowledge in a simple way. The contents of wiki is stored in a normal library with pre-defined file/folder structure. This enables you to edit your wiki in your desktop and then sync back to the server.": "Seafile Wiki \u80fd\u8b93\u4f60\u4ee5\u4e00\u7a2e\u975e\u5e38\u7c21\u55ae\u7684\u65b9\u5f0f\u7ba1\u7406\u4f60\u7684\u77e5\u8b58\u3002Wiki \u7684\u5167\u5bb9\u4ee5\u9810\u5b9a\u7fa9\u7684\u6a94\u6848/\u76ee\u9304\u7d50\u69cb\u5132\u5b58\u5728\u4e00\u500b\u666e\u901a\u7684\u8cc7\u6599\u5eab\u4e2d\uff0c\u9019\u6a23\u4fbf\u53ef\u4ee5\u5728\u672c\u5730\u7de8\u8f2f\uff0c\u7136\u5f8c\u540c\u6b65\u56de\u4f3a\u670d\u5668\u3002", 
    "Search Files": "\u641c\u5c0b\u6a94\u6848", 
    "Search files in this library": "\u5728\u7576\u524d\u8cc7\u6599\u5eab\u641c\u5c0b\u6a94\u6848", 
    "Search groups": "\u67e5\u627e\u7fa4\u7d44", 
    "Search user or enter email and press Enter": "\u641c\u7d22\u7528\u6236\u6216\u8f38\u5165\u96fb\u5b50\u90f5\u4ef6\uff0c\u7136\u5f8c\u6309Enter", 
    "Search users or enter emails and press Enter": "\u641c\u7d22\u7528\u6236\u6216\u8f38\u5165\u96fb\u5b50\u90f5\u4ef6\uff0c\u7136\u5f8c\u6309Enter", 
    "Searching...": "\u641c\u7d22\u4e2d...", 
    "See All Notifications": "\u67e5\u770b\u6240\u6709\u63d0\u9192\u3002", 
    "Select a group": "\u9078\u64c7\u4e00\u500b\u7fa4\u7d44", 
    "Select groups": "\u9078\u64c7\u7fa4\u7d44", 
    "Select libraries to share": "\u9078\u64c7\u8981\u5171\u4eab\u7684\u8cc7\u6599\u5eab", 
    "Server Version: ": "\u4f3a\u670d\u5668\u7248\u672c\uff1a", 
    "Set Quota": "\u8a2d\u5b9a\u5bb9\u91cf", 
    "Set {placeholder}'s permission": "\u8a2d\u7f6e {placeholder} \u6b0a\u9650", 
    "Settings": "\u8a2d\u5b9a", 
    "Share": "\u5171\u4eab", 
    "Share Admin": "\u5171\u4eab\u7ba1\u7406", 
    "Share From": "\u5171\u4eab\u4f86\u6e90", 
    "Share Links": "\u5171\u4eab\u7db2\u5740", 
    "Share To": "\u5171\u4eab\u7d66", 
    "Share existing libraries": "\u5171\u4eab\u5df2\u6709\u8cc7\u6599\u5eab", 
    "Share to group": "\u5171\u4eab\u5230\u7fa4\u7d44", 
    "Share to user": "\u5171\u4eab\u5230\u7528\u6236", 
    "Share {placeholder}": "\u5171\u4eab {placeholder}", 
    "Shared with all": "\u8207\u6240\u6709\u4eba\u5171\u4eab", 
    "Shared with groups": "\u7fa4\u7d44\u5171\u4eab", 
    "Shared with me": "\u8207\u6211\u5171\u4eab", 
    "Show": "\u986f\u793a", 
    "Side Nav Menu": "\u5074\u908a\u5c0e\u822a\u9078\u55ae", 
    "Size": "\u5927\u5c0f", 
    "Sort:": "\u6392\u5e8f\uff1a", 
    "Space Used": "\u5df2\u7528\u7a7a\u9593", 
    "Start": "\u4e0a\u50b3", 
    "Status": "\u72c0\u614b", 
    "Submit": "\u63d0\u4ea4", 
    "Success": "\u6210\u529f", 
    "Successfully changed library password.": "\u8cc7\u6599\u5eab\u5bc6\u78bc\u91cd\u7f6e\u6210\u529f\u3002", 
    "Successfully clean all errors.": "\u6e05\u9664\u6240\u6709\u932f\u8aa4\u6210\u529f\u3002", 
    "Successfully copied %(name)s": "\u6210\u529f\u8907\u88fd %(name)s", 
    "Successfully copied %(name)s and %(amount)s other items.": "\u6210\u529f\u8907\u88fd %(name)s \u548c\u5176\u4ed6 %(amount)s \u9805\u689d\u76ee\u3002", 
    "Successfully copied %(name)s and 1 other item.": "\u6210\u529f\u8907\u88fd %(name)s \u548c\u53e61\u9805\u689d\u76ee\u3002", 
    "Successfully copied %(name)s.": "\u6210\u529f\u8907\u88fd %(name)s\u3002", 
    "Successfully deleted %(name)s": "\u522a\u9664 %(name)s \u6210\u529f", 
    "Successfully deleted %(name)s and %(amount)s other items.": "\u6210\u529f\u522a\u9664 %(name)s \u548c\u5176\u4ed6 %(amount)s \u9805\u5167\u5bb9\u3002", 
    "Successfully deleted %(name)s and 1 other item.": "\u6210\u529f\u522a\u9664 %(name)s \u548c\u5176\u4ed61\u9805\u5167\u5bb9\u3002", 
    "Successfully deleted %(name)s.": "\u6210\u529f\u522a\u9664 %(name)s", 
    "Successfully deleted %s": "%s \u522a\u9664\u6210\u529f\u3002", 
    "Successfully deleted 1 item": "\u6210\u529f\u522a\u9664 1 \u500b\u689d\u76ee", 
    "Successfully deleted 1 item.": "\u6210\u529f\u522a\u9664 1 \u500b\u9805\u76ee\u3002", 
    "Successfully deleted member {placeholder}": "\u6210\u529f\u522a\u9664\u6210\u54e1 {placeholder}", 
    "Successfully deleted.": "\u522a\u9664\u6210\u529f\u3002", 
    "Successfully imported.": "\u5c0e\u5165\u6210\u529f\u3002", 
    "Successfully invited %(email).": "\u6210\u529f\u9080\u8acb %(email)", 
    "Successfully modified permission": "\u6210\u529f\u66f4\u6539\u6b0a\u9650", 
    "Successfully moved %(name)s": "\u6210\u529f\u79fb\u52d5 %(name)s\u3002", 
    "Successfully moved %(name)s and %(amount)s other items.": "\u6210\u529f\u79fb\u52d5 %(name)s \u548c\u5176\u4ed6 %(amount)s \u9805\u689d\u76ee\u3002", 
    "Successfully moved %(name)s and 1 other item.": "\u6210\u529f\u79fb\u52d5 %(name)s \u548c\u53e61\u9805\u689d\u76ee\u3002", 
    "Successfully moved %(name)s.": "\u6210\u529f\u79fb\u52d5 %(name)s\u3002", 
    "Successfully reset password to %(passwd)s for user %(user)s.": "\u6210\u529f\u5c07\u7528\u6236 %(user)s \u7684\u5bc6\u78bc\u91cd\u7f6e\u70ba %(passwd)s\u3002", 
    "Successfully restored library {placeholder}": "\u6210\u529f\u6062\u5fa9\u8cc7\u6599\u593e {placeholder}", 
    "Successfully revoke the admin permission of %s": "\u6210\u529f\u53d6\u6d88 %s \u7684\u7ba1\u7406\u6b0a\u9650", 
    "Successfully sent to {placeholder}": "\u6210\u529f\u767c\u9001\u7d66 {placeholder}", 
    "Successfully set %s as admin.": "\u6210\u529f\u8a2d\u5b9a %s \u70ba\u7ba1\u7406\u54e1\u3002", 
    "Successfully set library history.": "\u6210\u529f\u8a2d\u7f6e\u8cc7\u6599\u5eab\u6b77\u53f2\u3002", 
    "Successfully transferred the group.": "\u7fa4\u7d44\u8f49\u8b93\u6210\u529f\u3002", 
    "Successfully transferred the group. You are now a normal member of the group.": "\u6210\u529f\u8f49\u8b93\u7fa4\u7d44\u3002\u60a8\u73fe\u5728\u5df2\u6210\u70ba\u7fa4\u4e3b\u7684\u666e\u901a\u6210\u54e1\u3002", 
    "Successfully transferred the library.": "\u8cc7\u6599\u5eab\u8f49\u8b93\u6210\u529f\u3002", 
    "Successfully unlink %(name)s.": "\u65b7\u958b %(name)s \u9023\u63a5\u6210\u529f\u3002", 
    "Successfully unshared 1 item.": "\u6210\u529f\u53d6\u6d88\u5171\u4eab 1 \u500b\u689d\u76ee\u3002", 
    "Successfully unshared library {placeholder}": "\u6210\u529f\u53d6\u6d88\u5171\u4eab\u8cc7\u6599\u5eab {placeholder}", 
    "Successfully unstared {placeholder}": "\u6210\u529f\u53d6\u6d88\u661f\u6a19 {placeholder}", 
    "System Admin": "\u7cfb\u7d71\u7ba1\u7406", 
    "Tags": "\u6a19\u7c64", 
    "Terms and Conditions": "\u8edf\u4ef6\u4f7f\u7528\u689d\u6b3e", 
    "The password will be kept in the server for only 1 hour.": "\u5bc6\u78bc\u5c07\u5728\u4f3a\u670d\u5668\u4e0a\u5132\u5b58\u4e00\u5c0f\u6642\u3002", 
    "This library is password protected": "\u8a72\u8cc7\u6599\u5eab\u5df2\u52a0\u5bc6", 
    "Time": "\u6642\u9593", 
    "Tip: libraries deleted 30 days ago will be cleaned automatically.": "\u63d0\u793a\uff1a30\u5929\u524d\u522a\u9664\u7684\u8cc7\u6599\u5eab\u6703\u88ab\u81ea\u52d5\u6e05\u7a7a\u3002", 
    "Tools": "\u5de5\u5177", 
    "Total Users": "\u7e3d\u7528\u6236", 
    "Transfer": "\u8f49\u8b93", 
    "Transfer Group": "\u8f49\u8b93\u7fa4\u7d44", 
    "Transfer Group {group_name} To": "\u5c07\u7fa4\u7d44 {group_name} \u8f49\u8b93\u7d66", 
    "Transfer Library": "\u8f49\u8b93\u8cc7\u6599\u5eab", 
    "Transfer Library {library_name} To": "\u8f49\u79fb\u8cc7\u6599\u5eab {library_name} \u7d66", 
    "Transferred group {group_name} from {user_from} to {user_to}": "\u8f49\u8b93\u7fa4\u7d44 {group_name} \u7531 {user_from} \u5230 {user_to}", 
    "Transferred library {library_name} from {user_from} to {user_to}": "\u8f49\u8b93\u8cc7\u6599\u5eab {library_name} \u7531 {user_from} \u5230 {user_to}", 
    "Trash": "\u8cc7\u6e90\u56de\u6536\u7b52", 
    "Type": "\u985e\u578b", 
    "Unlink": "\u65b7\u958b\u9023\u63a5", 
    "Unlink device": "\u65b7\u958b\u9023\u63a5\u8a2d\u5099", 
    "Unlock": "\u89e3\u9396", 
    "Unshare": "\u53d6\u6d88\u5171\u4eab", 
    "Unshare Library": "\u53d6\u6d88\u5171\u4eab\u8cc7\u6599\u5eab", 
    "Unstar": "\u53d6\u6d88\u661f\u6a19", 
    "Update": "\u66f4\u65b0", 
    "Upload": "\u4e0a\u50b3", 
    "Upload Files": "\u4e0a\u50b3\u6a94\u6848", 
    "Upload Folder": "\u4e0a\u50b3\u76ee\u9304", 
    "Upload Link": "\u4e0a\u50b3\u9023\u7d50", 
    "Upload Links": "\u4e0a\u50b3\u9023\u7d50", 
    "Uploaded bytes exceed file size": "\u4e0a\u50b3\u5927\u5c0f\u8d85\u904e\u4e86\u6587\u4ef6\u5927\u5c0f", 
    "Used:": "\u5df2\u7528\u7a7a\u9593\uff1a", 
    "User": "\u7528\u6236", 
    "Users": "\u7528\u6236", 
    "View": "\u67e5\u770b", 
    "Virus Scan": "\u6383\u63cf\u75c5\u6bd2", 
    "Visits": "\u700f\u89bd\u6b21\u6578", 
    "Wrong password": "\u5bc6\u78bc\u932f\u8aa4", 
    "You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.": "\u4f60\u53ef\u4ee5\u65b0\u5efa\u4e00\u500b\u8cc7\u6599\u5eab\u4f86\u7d44\u7e54\u4f60\u7684\u6a94\u6848\u8cc7\u6599\uff0c\u6bd4\u5982\u70ba\u6bcf\u500b\u9805\u76ee\u5efa\u7acb\u4e00\u500b\u8cc7\u6599\u5eab\uff0c\u6bcf\u500b\u8cc7\u6599\u5eab\u53ef\u4ee5\u55ae\u7368\u5730\u540c\u6b65\u548c\u5171\u4eab\u3002", 
    "You can only select 1 item": "\u53ea\u80fd\u9078\u64c71\u500b\u9805\u76ee", 
    "You can share a single folder with a registered user if you don't want to share a whole library.": "\u5982\u679c\u4f60\u4e0d\u60f3\u5171\u4eab\u6574\u500b\u8cc7\u6599\u5eab\uff0c\u4f60\u53ef\u4ee5\u5171\u4eab\u55ae\u500b\u8cc7\u6599\u593e\u7d66\u5df2\u8a3b\u518a\u7684\u7528\u6236\u3002", 
    "You can share libraries by clicking the \"New Library\" button above or the \"Share\" icon on your libraries list.": "\u4f60\u53ef\u4ee5\u900f\u904e\u6309\u4e0a\u65b9\u7684\u201c\u65b0\u5efa\u8cc7\u6599\u5eab\u201d\u6309\u9215\u6216\u8cc7\u6599\u5eab\u5217\u8868\u88e1\u7684\u201c\u5171\u4eab\u201d\u5716\u793a\u4f86\u5171\u4eab\u8cc7\u6599\u5eab\u3002", 
    "You can share the generated link to others and then they can upload files to this directory via the link.": "\u4f60\u53ef\u4ee5\u5171\u4eab\u751f\u6210\u597d\u7684\u9023\u7d50\u7d66\u5225\u4eba\uff0c\u4ed6\u5011\u5c31\u80fd\u900f\u904e\u9019\u500b\u9023\u7d50\u4e0a\u50b3\u6a94\u6848\u5230\u9019\u500b\u8cc7\u6599\u593e\u3002", 
    "You cannot select any more choices": "\u60a8\u4e0d\u80fd\u9078\u64c7\u66f4\u591a\u9805", 
    "You have logged out.": "\u4f60\u5df2\u7d93\u767b\u51fa\u3002", 
    "You have not created any libraries": "\u4f60\u9084\u672a\u5efa\u7acb\u8cc7\u6599\u5eab", 
    "all members": "\u6240\u6709\u6210\u54e1", 
    "canceled": "\u5df2\u53d6\u6d88", 
    "days": "\u5929", 
    "icon": "\u5716\u793a", 
    "last update": "\u66f4\u65b0\u6642\u9593", 
    "locked": "\u5df2\u9396\u5b9a", 
    "locked by {placeholder}": "\u88ab {placeholder} \u9396\u5b9a", 
    "name": "\u540d\u7a31", 
    "starred": "\u5df2\u52a0\u661f\u6a19", 
    "unstarred": "\u672a\u52a0\u661f\u6a19", 
    "uploaded": "\u5df2\u4e0a\u8f09", 
    "you can also press \u2190 ": "\u53ef\u7528\u65b9\u5411\u9375 \u2190 ", 
    "{placeholder} Folder Permission": "{placeholder} \u76ee\u9304\u6b0a\u9650", 
    "{placeholder} History Setting": "{placeholder} \u6b77\u53f2\u8a2d\u7f6e", 
    "{placeholder} Members": "{placeholder} \u6210\u54e1", 
    "{placeholder} Share Links": "{placeholder} \u5171\u4eab\u5916\u93c8"
  };
  for (var key in newcatalog) {
    django.catalog[key] = newcatalog[key];
  }
  

  if (!django.jsi18n_initialized) {
    django.gettext = function(msgid) {
      var value = django.catalog[msgid];
      if (typeof(value) == 'undefined') {
        return msgid;
      } else {
        return (typeof(value) == 'string') ? value : value[0];
      }
    };

    django.ngettext = function(singular, plural, count) {
      var value = django.catalog[singular];
      if (typeof(value) == 'undefined') {
        return (count == 1) ? singular : plural;
      } else {
        return value[django.pluralidx(count)];
      }
    };

    django.gettext_noop = function(msgid) { return msgid; };

    django.pgettext = function(context, msgid) {
      var value = django.gettext(context + '\x04' + msgid);
      if (value.indexOf('\x04') != -1) {
        value = msgid;
      }
      return value;
    };

    django.npgettext = function(context, singular, plural, count) {
      var value = django.ngettext(context + '\x04' + singular, context + '\x04' + plural, count);
      if (value.indexOf('\x04') != -1) {
        value = django.ngettext(singular, plural, count);
      }
      return value;
    };

    django.interpolate = function(fmt, obj, named) {
      if (named) {
        return fmt.replace(/%\(\w+\)s/g, function(match){return String(obj[match.slice(2,-2)])});
      } else {
        return fmt.replace(/%s/g, function(match){return String(obj.shift())});
      }
    };


    /* formatting library */

    django.formats = {
    "DATETIME_FORMAT": "N j, Y, P", 
    "DATETIME_INPUT_FORMATS": [
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d", 
      "%m/%d/%Y %H:%M:%S", 
      "%m/%d/%Y %H:%M:%S.%f", 
      "%m/%d/%Y %H:%M", 
      "%m/%d/%Y", 
      "%m/%d/%y %H:%M:%S", 
      "%m/%d/%y %H:%M:%S.%f", 
      "%m/%d/%y %H:%M", 
      "%m/%d/%y"
    ], 
    "DATE_FORMAT": "N j, Y", 
    "DATE_INPUT_FORMATS": [
      "%Y-%m-%d", 
      "%m/%d/%Y", 
      "%m/%d/%y", 
      "%b %d %Y", 
      "%b %d, %Y", 
      "%d %b %Y", 
      "%d %b, %Y", 
      "%B %d %Y", 
      "%B %d, %Y", 
      "%d %B %Y", 
      "%d %B, %Y"
    ], 
    "DECIMAL_SEPARATOR": ".", 
    "FIRST_DAY_OF_WEEK": "0", 
    "MONTH_DAY_FORMAT": "F j", 
    "NUMBER_GROUPING": "0", 
    "SHORT_DATETIME_FORMAT": "m/d/Y P", 
    "SHORT_DATE_FORMAT": "m/d/Y", 
    "THOUSAND_SEPARATOR": ",", 
    "TIME_FORMAT": "P", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H:%M:%S.%f", 
      "%H:%M"
    ], 
    "YEAR_MONTH_FORMAT": "F Y"
  };

    django.get_format = function(format_type) {
      var value = django.formats[format_type];
      if (typeof(value) == 'undefined') {
        return format_type;
      } else {
        return value;
      }
    };

    /* add to global namespace */
    globals.pluralidx = django.pluralidx;
    globals.gettext = django.gettext;
    globals.ngettext = django.ngettext;
    globals.gettext_noop = django.gettext_noop;
    globals.pgettext = django.pgettext;
    globals.npgettext = django.npgettext;
    globals.interpolate = django.interpolate;
    globals.get_format = django.get_format;

    django.jsi18n_initialized = true;
  }

}(this));

