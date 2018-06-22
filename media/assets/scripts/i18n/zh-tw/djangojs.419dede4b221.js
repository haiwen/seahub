

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
    "Add User": "\u65b0\u589e\u4f7f\u7528\u8005", 
    "Added user {user}": "\u5df2\u65b0\u589e\u4f7f\u7528\u8005 {user}", 
    "Are you sure you want to clear trash?": "\u78ba\u5b9a\u8981\u6e05\u7a7a\u56de\u6536\u7ad9\u55ce\uff1f", 
    "Are you sure you want to delete %s ?": "\u78ba\u5b9a\u8981\u522a\u9664 %s \u55ce\uff1f", 
    "Are you sure you want to delete %s completely?": "\u78ba\u5b9a\u8981\u5b8c\u5168\u522a\u9664 %s \u55ce\uff1f", 
    "Are you sure you want to delete all %s's libraries?": "\u78ba\u5b9a\u8981\u522a\u9664\u6240\u6709 %s \u7684\u8cc7\u6599\u5eab\u55ce\uff1f", 
    "Are you sure you want to delete these selected items?": "\u78ba\u5b9a\u8981\u522a\u9664\u9078\u4e2d\u7684\u689d\u76ee\u55ce\uff1f", 
    "Are you sure you want to quit this group?": "\u78ba\u5b9a\u8981\u9000\u51fa\u8a72\u7fa4\u7d44\u55ce\uff1f", 
    "Are you sure you want to restore %s?": "\u78ba\u5b9a\u8981\u9084\u539f %s \uff1f", 
    "Are you sure you want to unlink this device?": "\u78ba\u5b9a\u8981\u65b7\u958b\u6b64\u8a2d\u5099\u7684\u9023\u63a5\u55ce\uff1f", 
    "Are you sure you want to unshare %s ?": "\u78ba\u5b9a\u8981\u53d6\u6d88\u5171\u4eab %s \u55ce\uff1f", 
    "Cancel": "\u53d6\u6d88", 
    "Canceled.": "\u5df2\u53d6\u6d88\u3002", 
    "Change Password of Library {placeholder}": "\u66f4\u6539\u8cc7\u6599\u5eab {placeholder} \u5bc6\u78bc", 
    "Clear Trash": "\u6e05\u7a7a\u56de\u6536\u7ad9", 
    "Close (Esc)": "\u95dc\u9589 (Esc)", 
    "Copy selected item(s) to:": "\u5c07\u5df2\u9078\u689d\u76ee\u8907\u88fd\u5230\uff1a", 
    "Copy {placeholder} to:": "\u8907\u88fd {placeholder} \u5230", 
    "Copying %(name)s": "\u6b63\u5728\u8907\u88fd %(name)s", 
    "Copying file %(index)s of %(total)s": "\u6b63\u5728\u5fa9\u88fd\u6587\u4ef6 %(index)s / %(total)s", 
    "Create Group": "\u5efa\u7acb\u7fa4\u7d44", 
    "Create Library": "\u5275\u5efa\u8cc7\u6599\u5eab", 
    "Created group {group_name}": "\u5efa\u7acb\u7fa4\u7d44 {group_name}", 
    "Created library {library_name} with {owner} as its owner": "\u5275\u5efa\u8cc7\u6599\u5eab {library_name} \u7531{owner}\u70ba\u64c1\u6709\u8005", 
    "Delete": "\u5220\u9664", 
    "Delete Group": "\u5220\u9664\u7fa4\u7ec4", 
    "Delete Items": "\u522a\u9664\u9805\u76ee", 
    "Delete Library": "\u522a\u9664\u8cc7\u6599\u5eab", 
    "Delete Library By Owner": "\u901a\u904e\u64c1\u6709\u8005\u522a\u9664\u8cc7\u6599\u5eab", 
    "Delete Member": "\u5220\u9664\u6210\u54e1", 
    "Delete User": "\u522a\u9664\u4f7f\u7528\u8005", 
    "Delete failed": "\u522a\u9664\u5931\u6557", 
    "Delete files from this device the next time it comes online.": "\u5728\u6b64\u8a2d\u5099\u4e0b\u6b21\u4e0a\u7dda\u6642\u522a\u9664\u6b64\u8a2d\u5099\u4e0a\u7684\u6587\u4ef6\u3002", 
    "Deleted directories": "\u522a\u9664\u7684\u76ee\u9304", 
    "Deleted files": "\u522a\u9664\u7684\u6587\u4ef6", 
    "Deleted group {group_name}": "\u5df2\u522a\u9664\u7fa4\u7d44 {group_name}", 
    "Deleted library {library_name}": "\u522a\u9664\u8cc7\u6599\u5eab {library_name}", 
    "Deleted user {user}": "\u522a\u9664\u4f7f\u7528\u8005 {user}", 
    "Dismiss Group": "\u89e3\u6563\u7fa4\u7d44", 
    "Edit failed": "\u7de8\u8f2f\u5931\u6557", 
    "Empty file upload result": "\u7a7a\u6587\u4ef6", 
    "Encrypted library": "\u52a0\u5bc6\u8cc7\u6599\u5eab", 
    "Error": "\u932f\u8aa4", 
    "Expired": "\u5df2\u904e\u671f", 
    "Failed to copy %(name)s": "\u8907\u88fd %(name)s \u5931\u6557", 
    "Failed to delete %(name)s and %(amount)s other items.": "\u522a\u9664 %(name)s \u4ee5\u53ca\u53e6\u5916 %(amount)s \u9805\u5931\u6557\u3002", 
    "Failed to delete %(name)s and 1 other item.": "\u522a\u9664 %(name)s \u4ee5\u53ca\u53e6\u59161\u9805\u5931\u6557\u3002", 
    "Failed to delete %(name)s.": "\u522a\u9664 %(name)s \u5931\u6557\u3002", 
    "Failed to move %(name)s": "\u79fb\u52d5 %(name)s \u5931\u6557", 
    "Failed to send to {placeholder}": "\u767c\u9001\u7d66 {placeholder} \u5931\u6557", 
    "Failed.": "\u5931\u6557\u3002", 
    "Failed. Please check the network.": "\u64cd\u4f5c\u5931\u6557\u3002\u8acb\u6aa2\u67e5\u7db2\u7d61\u662f\u5426\u5df2\u9023\u63a5\u3002", 
    "File Upload canceled": "\u6587\u4ef6\u4e0a\u50b3\u5df2\u53d6\u6d88", 
    "File Upload complete": "\u6587\u4ef6\u4e0a\u50b3\u5df2\u5b8c\u6210", 
    "File Upload failed": "\u6587\u4ef6\u4e0a\u50b3\u5931\u6557", 
    "File Uploading...": "\u6587\u4ef6\u4e0a\u50b3\u4e2d...", 
    "File is locked": "\u6587\u4ef6\u5df2\u9396\u5b9a", 
    "File is too big": "\u6587\u4ef6\u592a\u5927", 
    "File is too small": "\u6587\u4ef6\u592a\u5c0f", 
    "Filetype not allowed": "\u4e0d\u652f\u6301\u7684\u6587\u4ef6\u985e\u578b", 
    "Hide": "\u96b1\u85cf", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "\u5167\u90e8\u932f\u8aa4\u3002\u8907\u88fd %(name)s \u548c\u5176\u4ed6 %(amount)s \u9805\u5167\u5bb9\u5931\u6557\u3002", 
    "Internal error. Failed to copy %(name)s.": "\u5167\u90e8\u932f\u8aa4\u3002\u8907\u88fd %(name)s \u5931\u6557\u3002", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "\u5167\u90e8\u932f\u8aa4\u3002\u79fb\u52d5 %(name)s \u548c\u5176\u4ed6 %(amount)s \u9805\u5167\u5bb9\u5931\u6557\u3002", 
    "Internal error. Failed to move %(name)s.": "\u5167\u90e8\u932f\u8aa4\u3002\u79fb\u52d5 %(name)s \u5931\u6557", 
    "Invalid destination path": "\u76ee\u6a19\u8def\u5f91\u7121\u6548", 
    "It is required.": "\u5fc5\u586b\u9805\u3002", 
    "Just now": "\u525b\u525b", 
    "Loading failed": "\u52a0\u8f09\u5931\u6557", 
    "Loading...": "\u52a0\u8f09\u4e2d...", 
    "Log in": "\u767b\u5165", 
    "Modified files": "\u5df2\u4fee\u6539\u6587\u4ef6", 
    "Move selected item(s) to:": "\u5c07\u5df2\u9078\u689d\u76ee\u79fb\u52d5\u5230\uff1a", 
    "Move {placeholder} to:": "\u79fb\u52d5 {placeholder} \u5230", 
    "Moving %(name)s": "\u6b63\u5728\u79fb\u52d5 %(name)s", 
    "Moving file %(index)s of %(total)s": "\u6b63\u5728\u79fb\u52d5\u6587\u4ef6 %(index)s / %(total)s", 
    "Name is required": "\u540d\u7a31\u70ba\u5fc5\u586b\u9805", 
    "Name is required.": "\u5fc5\u9808\u586b\u5beb\u540d\u5b57\u3002", 
    "Name should not include '/'.": "\u540d\u5b57\u4e0d\u80fd\u5305\u542b \u2018/\u2019\u3002", 
    "New Excel File": "\u65b0\u5efaExcel\u6587\u4ef6", 
    "New File": "\u65b0\u5efa\u6587\u4ef6", 
    "New Markdown File": "\u65b0\u5efaMarkdown\u6587\u4ef6", 
    "New PowerPoint File": "\u65b0\u5efaPowerPoint\u6587\u4ef6", 
    "New Word File": "\u65b0\u5efaWord\u6587\u4ef6", 
    "New directories": "\u65b0\u76ee\u9304", 
    "New files": "\u65b0\u6587\u4ef6", 
    "New password is too short": "\u65b0\u5bc6\u78bc\u592a\u77ed", 
    "New passwords don't match": "\u5169\u6b21\u8f38\u5165\u7684\u65b0\u5bc6\u78bc\u4e0d\u4e00\u81f4", 
    "Next (Right arrow key)": "\u4e0b\u4e00\u5f35 (\u53f3\u65b9\u5411\u9375)", 
    "No matches": "\u6c92\u6709\u5339\u914d\u9805", 
    "Only an extension there, please input a name.": "\u8acb\u8f38\u5165\u5b8c\u6574\u7684\u6587\u4ef6\u540d\u3002", 
    "Open in New Tab": "\u5728\u65b0\u6a19\u7c64\u9801\u6253\u958b", 
    "Packaging...": "\u6b63\u5728\u5c01\u5305", 
    "Password is required.": "\u5bc6\u78bc\u70ba\u5fc5\u586b\u9805\u3002", 
    "Password is too short": "\u5bc6\u78bc\u592a\u77ed", 
    "Passwords don't match": "\u5169\u6b21\u8f38\u5165\u7684\u5bc6\u78bc\u4e0d\u4e00\u81f4", 
    "Permission error": "\u6b0a\u9650\u932f\u8aa4", 
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
    "Previous (Left arrow key)": "\u4e0a\u4e00\u5f35 (\u5de6\u65b9\u5411\u9375)", 
    "Processing...": "\u8655\u7406\u4e2d...", 
    "Quit Group": "\u9000\u51fa\u7fa4\u7d44", 
    "Read-Only": "\u552f\u8b80", 
    "Read-Only library": "\u552f\u8b80\u8cc7\u6599\u5eab", 
    "Read-Write": "\u53ef\u8b80\u5beb", 
    "Read-Write library": "\u53ef\u8b80\u5beb\u8cc7\u6599\u5eab", 
    "Really want to dismiss this group?": "\u78ba\u5b9a\u8981\u89e3\u6563\u8a72\u7fa4\u7d44\u55ce\uff1f", 
    "Refresh": "\u91cd\u65b0\u6574\u7406", 
    "Removed all items from trash.": "\u6e05\u7a7a\u6240\u6709\u56de\u6536\u7ad9\u7684\u9805\u76ee", 
    "Removed items older than {n} days from trash.": "\u6e05\u7a7a\u6240\u6709\u5927\u65bc {n} \u5929\u7684\u9805\u76ee", 
    "Rename File": "\u91cd\u65b0\u547d\u540d\u6587\u4ef6", 
    "Rename Folder": "\u91cd\u65b0\u547d\u540d\u76ee\u9304", 
    "Renamed or Moved files": "\u91cd\u547d\u540d\u6216\u79fb\u52d5\u7684\u6587\u4ef6", 
    "Replace file {filename}?": "\u8986\u84cb\u6587\u4ef6 {filename} \uff1f", 
    "Restore Library": "\u9084\u539f\u8cc7\u6599\u5eab", 
    "Saving...": "\u4fdd\u5b58\u4e2d...", 
    "Search groups": "\u67e5\u627e\u7fa4\u7d44", 
    "Search user or enter email and press Enter": "\u641c\u7d22\u7528\u6236\u6216\u8f38\u5165\u96fb\u5b50\u90f5\u4ef6\uff0c\u7136\u5f8c\u6309Enter", 
    "Search users or enter emails and press Enter": "\u641c\u7d22\u7528\u6236\u6216\u8f38\u5165\u96fb\u5b50\u90f5\u4ef6\uff0c\u7136\u5f8c\u6309Enter", 
    "Searching...": "\u641c\u7d22\u4e2d...", 
    "Select a group": "\u9078\u64c7\u4e00\u500b\u7fa4\u7d44", 
    "Select groups": "\u9078\u64c7\u7fa4\u7d44", 
    "Set {placeholder}'s permission": "\u8a2d\u7f6e {placeholder} \u6b0a\u9650", 
    "Share {placeholder}": "\u5171\u4eab {placeholder}", 
    "Show": "\u986f\u793a", 
    "Start": "\u4e0a\u50b3", 
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
    "Successfully restored library {placeholder}": "\u6210\u529f\u6062\u5fa9\u8cc7\u6599\u593e {placeholder}", 
    "Successfully sent to {placeholder}": "\u6210\u529f\u767c\u9001\u7d66 {placeholder}", 
    "Successfully set library history.": "\u6210\u529f\u8a2d\u7f6e\u8cc7\u6599\u5eab\u6b77\u53f2\u3002", 
    "Successfully transferred the group.": "\u7fa4\u7d44\u8f49\u8b93\u6210\u529f\u3002", 
    "Successfully transferred the group. You are now a normal member of the group.": "\u6210\u529f\u8f49\u8b93\u7fa4\u7d44\u3002\u60a8\u73fe\u5728\u5df2\u6210\u70ba\u7fa4\u4e3b\u7684\u666e\u901a\u6210\u54e1\u3002", 
    "Successfully transferred the library.": "\u8cc7\u6599\u5eab\u8f49\u8b93\u6210\u529f\u3002", 
    "Successfully unlink %(name)s.": "\u65b7\u958b %(name)s \u9023\u63a5\u6210\u529f\u3002", 
    "Successfully unshared 1 item.": "\u6210\u529f\u53d6\u6d88\u5171\u4eab 1 \u500b\u689d\u76ee\u3002", 
    "Successfully unshared library {placeholder}": "\u6210\u529f\u53d6\u6d88\u5171\u4eab\u8cc7\u6599\u5eab {placeholder}", 
    "Successfully unstared {placeholder}": "\u6210\u529f\u53d6\u6d88\u661f\u6a19 {placeholder}", 
    "Transfer Group": "\u8f49\u8b93\u7fa4\u7d44", 
    "Transfer Group {group_name} To": "\u5c07\u7fa4\u7d44 {group_name} \u8f49\u8b93\u7d66", 
    "Transfer Library": "\u8f49\u8b93\u8cc7\u6599\u5eab", 
    "Transfer Library {library_name} To": "\u8f49\u79fb\u8cc7\u6599\u5eab {library_name} \u7d66", 
    "Transferred group {group_name} from {user_from} to {user_to}": "\u8f49\u8b93\u7fa4\u7d44 {group_name} \u7531 {user_from} \u5230 {user_to}", 
    "Transferred library {library_name} from {user_from} to {user_to}": "\u8f49\u8b93\u8cc7\u6599\u5eab {library_name} \u7531 {user_from} \u5230 {user_to}", 
    "Unlink device": "\u65b7\u958b\u9023\u63a5\u8a2d\u5099", 
    "Unshare Library": "\u53d6\u6d88\u5171\u4eab\u8cc7\u6599\u5eab", 
    "Uploaded bytes exceed file size": "\u4e0a\u50b3\u5927\u5c0f\u8d85\u904e\u4e86\u6587\u4ef6\u5927\u5c0f", 
    "You can only select 1 item": "\u53ea\u80fd\u9078\u64c71\u500b\u9805\u76ee", 
    "You cannot select any more choices": "\u60a8\u4e0d\u80fd\u9078\u64c7\u66f4\u591a\u9805", 
    "You have logged out.": "\u4f60\u5df2\u7d93\u767b\u51fa\u3002", 
    "canceled": "\u5df2\u53d6\u6d88", 
    "locked by {placeholder}": "\u88ab {placeholder} \u9396\u5b9a", 
    "uploaded": "\u5df2\u4e0a\u8f09", 
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

