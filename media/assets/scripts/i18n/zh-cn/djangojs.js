

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
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">\u56fe\u7247</a> \u65e0\u6cd5\u88ab\u52a0\u8f7d\u3002", 
    "Add User": "\u6dfb\u52a0\u7528\u6237", 
    "Added user {user}": "\u5df2\u6dfb\u52a0\u7528\u6237 {user}", 
    "Are you sure you want to clear trash?": "\u786e\u5b9a\u8981\u6e05\u7a7a\u56de\u6536\u7ad9\u5417\uff1f", 
    "Are you sure you want to delete %s ?": "\u786e\u5b9a\u8981\u5220\u9664 %s \u5417\uff1f", 
    "Are you sure you want to delete %s completely?": "\u786e\u5b9a\u8981\u5b8c\u5168\u5220\u9664 %s \u5417\uff1f", 
    "Are you sure you want to delete all %s's libraries?": "\u786e\u5b9a\u8981\u5220\u9664\u6240\u6709 %s \u7684\u8d44\u6599\u5e93\u5417\uff1f", 
    "Are you sure you want to delete these selected items?": "\u786e\u5b9a\u8981\u5220\u9664\u9009\u4e2d\u7684\u6761\u76ee\u5417\uff1f", 
    "Are you sure you want to quit this group?": "\u786e\u5b9a\u8981\u9000\u51fa\u8be5\u7fa4\u7ec4\u5417\uff1f", 
    "Are you sure you want to restore %s?": "\u786e\u5b9a\u8981\u8fd8\u539f %s \uff1f", 
    "Are you sure you want to unlink this device?": "\u786e\u5b9a\u8981\u65ad\u5f00\u6b64\u8bbe\u5907\u7684\u8fde\u63a5\u5417\uff1f", 
    "Are you sure you want to unshare %s ?": "\u786e\u5b9a\u8981\u53d6\u6d88\u5171\u4eab %s \u5417\uff1f", 
    "Cancel": "\u53d6\u6d88", 
    "Canceled.": "\u5df2\u53d6\u6d88\u3002", 
    "Change Password of Library {placeholder}": "\u66f4\u6539\u8d44\u6599\u5e93 {placeholder} \u5bc6\u7801", 
    "Clear Trash": "\u6e05\u7a7a\u56de\u6536\u7ad9", 
    "Close (Esc)": "\u5173\u95ed (Esc)", 
    "Copy selected item(s) to:": "\u5c06\u5df2\u9009\u6761\u76ee\u590d\u5236\u5230\uff1a", 
    "Copy {placeholder} to:": "\u590d\u5236 {placeholder} \u5230", 
    "Copying %(name)s": "\u6b63\u5728\u590d\u5236 %(name)s", 
    "Copying file %(index)s of %(total)s": "\u6b63\u5728\u590d\u5236\u6587\u4ef6  %(index)s / %(total)s", 
    "Create Group": "\u521b\u5efa\u7fa4\u7ec4", 
    "Create Library": "\u521b\u5efa\u8d44\u6599\u5e93", 
    "Created group {group_name}": "\u5df2\u521b\u5efa\u7fa4\u7ec4 {group_name}", 
    "Created library {library_name} with {owner} as its owner": "\u521b\u5efa\u8d44\u6599\u5e93 {library_name} \u5e76\u628a\u8d44\u6599\u5e93\u62e5\u6709\u8005\u8bbe\u4e3a {owner}", 
    "Delete": "\u5220\u9664", 
    "Delete Department": "\u5220\u9664\u90e8\u95e8", 
    "Delete Group": "\u5220\u9664\u7fa4\u7ec4", 
    "Delete Items": "\u5220\u9664\u6761\u76ee", 
    "Delete Library": "\u5220\u9664\u8d44\u6599\u5e93", 
    "Delete Library By Owner": "\u901a\u8fc7\u62e5\u6709\u8005\u5220\u9664\u8d44\u6599\u5e93", 
    "Delete Member": "\u5220\u9664\u6210\u5458", 
    "Delete User": "\u5220\u9664\u7528\u6237", 
    "Delete failed": "\u5220\u9664\u5931\u8d25", 
    "Delete files from this device the next time it comes online.": "\u5728\u6b64\u8bbe\u5907\u4e0b\u6b21\u4e0a\u7ebf\u65f6\u5220\u9664\u6b64\u8bbe\u5907\u4e0a\u7684\u6587\u4ef6\u3002", 
    "Deleted directories": "\u5220\u9664\u7684\u76ee\u5f55", 
    "Deleted files": "\u5220\u9664\u7684\u6587\u4ef6", 
    "Deleted group {group_name}": "\u5df2\u5220\u9664\u7fa4\u7ec4 {group_name}", 
    "Deleted library {library_name}": "\u5220\u9664\u8d44\u6599\u5e93 {library_name}", 
    "Deleted user {user}": "\u5df2\u5220\u9664\u7528\u6237 {user}", 
    "Dismiss Group": "\u89e3\u6563\u7fa4\u7ec4", 
    "Edit failed": "\u7f16\u8f91\u5931\u8d25", 
    "Empty file upload result": "\u7a7a\u6587\u4ef6", 
    "Encrypted library": "\u52a0\u5bc6\u8d44\u6599\u5e93", 
    "Error": "\u9519\u8bef", 
    "Expired": "\u5df2\u8fc7\u671f", 
    "Failed to copy %(name)s": "\u590d\u5236 %(name)s \u5931\u8d25", 
    "Failed to delete %(name)s and %(amount)s other items.": "\u5220\u9664 %(name)s \u4ee5\u53ca\u53e6\u5916 %(amount)s \u9879\u5931\u8d25\u3002", 
    "Failed to delete %(name)s and 1 other item.": "\u5220\u9664 %(name)s \u4ee5\u53ca\u53e6\u59161\u9879\u5931\u8d25\u3002", 
    "Failed to delete %(name)s.": "\u5220\u9664 %(name)s \u5931\u8d25\u3002", 
    "Failed to move %(name)s": "\u79fb\u52a8 %(name)s \u5931\u8d25", 
    "Failed to send to {placeholder}": "\u53d1\u9001\u7ed9 {placeholder} \u5931\u8d25", 
    "Failed.": "\u5931\u8d25\u3002", 
    "Failed. Please check the network.": "\u64cd\u4f5c\u5931\u8d25\u3002\u8bf7\u68c0\u67e5\u7f51\u7edc\u662f\u5426\u5df2\u8fde\u63a5\u3002", 
    "File Upload canceled": "\u6587\u4ef6\u4e0a\u4f20\u5df2\u53d6\u6d88", 
    "File Upload complete": "\u6587\u4ef6\u4e0a\u4f20\u5df2\u5b8c\u6210", 
    "File Upload failed": "\u6587\u4ef6\u4e0a\u4f20\u5931\u8d25", 
    "File Uploading...": "\u6587\u4ef6\u4e0a\u4f20\u4e2d...", 
    "File is locked": "\u6587\u4ef6\u5df2\u9501\u5b9a", 
    "File is too big": "\u6587\u4ef6\u592a\u5927", 
    "File is too small": "\u6587\u4ef6\u592a\u5c0f", 
    "Filetype not allowed": "\u4e0d\u652f\u6301\u7684\u6587\u4ef6\u7c7b\u578b", 
    "Hide": "\u9690\u85cf", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "\u5185\u90e8\u9519\u8bef\u3002\u590d\u5236 %(name)s \u548c\u5176\u4ed6 %(amount)s \u9879\u5185\u5bb9\u5931\u8d25\u3002", 
    "Internal error. Failed to copy %(name)s.": "\u5185\u90e8\u9519\u8bef\u3002\u590d\u5236 %(name)s \u5931\u8d25\u3002", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "\u5185\u90e8\u9519\u8bef\u3002\u79fb\u52a8 %(name)s \u548c\u5176\u4ed6 %(amount)s \u9879\u5185\u5bb9\u5931\u8d25\u3002", 
    "Internal error. Failed to move %(name)s.": "\u5185\u90e8\u9519\u8bef\u3002\u79fb\u52a8 %(name)s \u5931\u8d25\u3002", 
    "Internal link copied to clipboard": "\u5185\u90e8\u94fe\u63a5\u5df2\u7ecf\u88ab\u590d\u5236\u5230\u526a\u5207\u677f", 
    "Invalid destination path": "\u76ee\u6807\u8def\u5f84\u65e0\u6548", 
    "Invalid quota.": "\u914d\u989d\u65e0\u6548\u3002", 
    "It is required.": "\u5fc5\u586b\u9879\u3002", 
    "Just now": "\u521a\u624d", 
    "Loading failed": "\u52a0\u8f7d\u5931\u8d25", 
    "Loading...": "\u52a0\u8f7d\u4e2d...", 
    "Log in": "\u767b\u5f55", 
    "Maximum number of files exceeded": "\u6587\u4ef6\u592a\u591a", 
    "Modified files": "\u4fee\u6539\u4e86\u7684\u6587\u4ef6", 
    "Move selected item(s) to:": "\u5c06\u5df2\u9009\u6761\u76ee\u79fb\u52a8\u5230\uff1a", 
    "Move {placeholder} to:": "\u79fb\u52a8 {placeholder} \u5230", 
    "Moving %(name)s": "\u6b63\u5728\u79fb\u52a8 %(name)s", 
    "Moving file %(index)s of %(total)s": "\u6b63\u5728\u79fb\u52a8\u6587\u4ef6 %(index)s / %(total)s", 
    "Name is required": "\u540d\u79f0\u4e3a\u5fc5\u586b\u9879", 
    "Name is required.": "\u5fc5\u987b\u586b\u5199\u540d\u5b57\u3002", 
    "Name should not include '/'.": "\u540d\u5b57\u4e0d\u80fd\u5305\u542b \u2018/\u2019\u3002", 
    "New Department": "\u65b0\u5efa\u90e8\u95e8", 
    "New Excel File": "\u65b0\u5efa Excel \u6587\u4ef6", 
    "New File": "\u65b0\u5efa\u6587\u4ef6", 
    "New Markdown File": "\u65b0\u5efa Markdown \u6587\u4ef6", 
    "New PowerPoint File": "\u65b0\u5efa PowerPoint \u6587\u4ef6", 
    "New Sub-department": "\u65b0\u5efa\u5b50\u90e8\u95e8", 
    "New Word File": "\u65b0\u5efa Word \u6587\u4ef6", 
    "New directories": "\u65b0\u76ee\u5f55", 
    "New files": "\u65b0\u6587\u4ef6", 
    "New password is too short": "\u65b0\u5bc6\u7801\u592a\u77ed", 
    "New passwords don't match": "\u4e24\u6b21\u8f93\u5165\u7684\u65b0\u5bc6\u7801\u4e0d\u4e00\u81f4", 
    "Next (Right arrow key)": "\u4e0b\u4e00\u5f20\uff08\u53f3\u65b9\u5411\u952e\uff09", 
    "No matches": "\u6ca1\u6709\u5339\u914d\u9879", 
    "Only an extension there, please input a name.": "\u8bf7\u8f93\u5165\u5b8c\u6574\u7684\u6587\u4ef6\u540d\u3002", 
    "Open in New Tab": "\u5728\u65b0\u6807\u7b7e\u9875\u6253\u5f00", 
    "Packaging...": "\u6b63\u5728\u6253\u5305", 
    "Password is required.": "\u5bc6\u7801\u4e3a\u5fc5\u586b\u9879\u3002", 
    "Password is too short": "\u5bc6\u7801\u592a\u77ed", 
    "Passwords don't match": "\u4e24\u6b21\u8f93\u5165\u7684\u5bc6\u7801\u4e0d\u4e00\u81f4", 
    "Permission error": "\u6743\u9650\u9519\u8bef", 
    "Please check the network.": "\u8bf7\u68c0\u67e5\u7f51\u7edc\u662f\u5426\u5df2\u8fde\u63a5\u3002", 
    "Please choose a CSV file": "\u8bf7\u6dfb\u52a0 CSV \u6587\u4ef6", 
    "Please click and choose a directory.": "\u8bf7\u70b9\u51fb\u9009\u62e9\u76ee\u6807\u76ee\u5f55\u3002", 
    "Please enter 1 or more character": "\u8bf7\u8f93\u5165 1 \u4e2a\u6216\u66f4\u591a\u5b57\u7b26", 
    "Please enter a new password": "\u8bf7\u8f93\u5165\u65b0\u5bc6\u7801\u3002", 
    "Please enter days.": "\u8bf7\u8f93\u5165\u5929\u6570\u3002", 
    "Please enter password": "\u8bf7\u8f93\u5165\u5bc6\u7801", 
    "Please enter the new password again": "\u8bf7\u518d\u6b21\u8f93\u5165\u65b0\u5bc6\u7801", 
    "Please enter the old password": "\u8bf7\u8f93\u5165\u65e7\u5bc6\u7801\u3002", 
    "Please enter the password again": "\u8bf7\u518d\u6b21\u8f93\u5165\u5bc6\u7801", 
    "Please enter valid days": "\u8bf7\u8f93\u5165\u6709\u6548\u7684\u5929\u6570", 
    "Please input at least an email.": "\u8bf7\u8f93\u5165\u81f3\u5c11\u4e00\u4e2a\u90ae\u7bb1\u3002", 
    "Previous (Left arrow key)": "\u4e0a\u4e00\u5f20\uff08\u5de6\u65b9\u5411\u952e\uff09", 
    "Processing...": "\u5904\u7406\u4e2d...", 
    "Quit Group": "\u9000\u51fa\u7fa4\u7ec4", 
    "Read-Only": "\u53ea\u8bfb", 
    "Read-Only library": "\u53ea\u8bfb\u8d44\u6599\u5e93", 
    "Read-Write": "\u53ef\u8bfb\u5199", 
    "Read-Write library": "\u53ef\u8bfb\u5199\u8d44\u6599\u5e93", 
    "Really want to dismiss this group?": "\u786e\u5b9a\u8981\u89e3\u6563\u8be5\u7fa4\u7ec4\u5417\uff1f", 
    "Refresh": "\u5237\u65b0", 
    "Removed all items from trash.": "\u5220\u9664\u4e86\u56de\u6536\u7ad9\u4e2d\u7684\u6240\u6709\u6761\u76ee.", 
    "Removed items older than {n} days from trash.": "\u5220\u9664\u4e86\u56de\u6536\u7ad9\u4e2d{n}\u5929\u524d\u7684\u6761\u76ee.", 
    "Rename File": "\u91cd\u547d\u540d\u6587\u4ef6", 
    "Rename Folder": "\u91cd\u547d\u540d\u76ee\u5f55", 
    "Renamed or Moved files": "\u91cd\u547d\u540d\u6216\u79fb\u52a8\u7684\u6587\u4ef6", 
    "Replace file {filename}?": "\u8986\u76d6\u6587\u4ef6 {filename} \uff1f", 
    "Restore Library": "\u8fd8\u539f\u8d44\u6599\u5e93", 
    "Saving...": "\u4fdd\u5b58\u4e2d...", 
    "Search groups": "\u67e5\u627e\u7fa4\u7ec4", 
    "Search user or enter email and press Enter": "\u641c\u7d22\u7528\u6237\u6216\u8f93\u5165\u7535\u5b50\u90ae\u4ef6\uff0c\u7136\u540e\u6309Enter", 
    "Search users or enter emails and press Enter": "\u641c\u7d22\u7528\u6237\u6216\u8f93\u5165\u7535\u5b50\u90ae\u4ef6\uff0c\u7136\u540e\u6309Enter", 
    "Searching...": "\u641c\u7d22\u4e2d...", 
    "Select a group": "\u9009\u62e9\u4e00\u4e2a\u7fa4\u7ec4", 
    "Select groups": "\u9009\u62e9\u7fa4\u7ec4", 
    "Set {placeholder}'s permission": "\u8bbe\u7f6e {placeholder} \u6743\u9650", 
    "Share {placeholder}": "\u5171\u4eab {placeholder}", 
    "Show": "\u663e\u793a", 
    "Start": "\u4e0a\u4f20", 
    "Success": "\u6210\u529f", 
    "Successfully added label(s) for library {placeholder}": "\u7ed9\u8d44\u6599\u5e93 {placeholder} \u6dfb\u52a0\u6807\u7b7e\u6210\u529f", 
    "Successfully changed library password.": "\u8d44\u6599\u5e93\u5bc6\u7801\u91cd\u7f6e\u6210\u529f\u3002", 
    "Successfully clean all errors.": "\u6e05\u9664\u6240\u6709\u9519\u8bef\u6210\u529f\u3002", 
    "Successfully copied %(name)s": "\u6210\u529f\u62f7\u8d1d %(name)s", 
    "Successfully copied %(name)s and %(amount)s other items.": "\u6210\u529f\u590d\u5236 %(name)s \u548c\u5176\u4ed6 %(amount)s \u9879\u6761\u76ee\u3002", 
    "Successfully copied %(name)s and 1 other item.": "\u6210\u529f\u590d\u5236 %(name)s \u548c\u53e61\u9879\u6761\u76ee\u3002", 
    "Successfully copied %(name)s.": "\u6210\u529f\u590d\u5236 %(name)s\u3002", 
    "Successfully deleted %(name)s": "\u5220\u9664 %(name)s \u6210\u529f", 
    "Successfully deleted %(name)s and %(amount)s other items.": "\u6210\u529f\u5220\u9664 %(name)s \u548c\u5176\u4ed6 %(amount)s \u9879\u5185\u5bb9\u3002", 
    "Successfully deleted %(name)s and 1 other item.": "\u6210\u529f\u5220\u9664 %(name)s \u548c\u5176\u4ed6\u4e00\u9879\u5185\u5bb9\u3002", 
    "Successfully deleted %(name)s.": "\u6210\u529f\u5220\u9664 %(name)s\u3002", 
    "Successfully deleted 1 item": "\u6210\u529f\u5220\u9664 1 \u4e2a\u6761\u76ee", 
    "Successfully deleted 1 item.": "\u6210\u529f\u5220\u9664 1 \u4e2a\u6761\u76ee\u3002", 
    "Successfully deleted library {placeholder}": "\u6210\u529f\u5220\u9664\u8d44\u6599\u5e93{placeholder}", 
    "Successfully deleted member {placeholder}": "\u6210\u529f\u5220\u9664\u6210\u5458 {placeholder}", 
    "Successfully deleted.": "\u5220\u9664\u6210\u529f\u3002", 
    "Successfully imported.": "\u5bfc\u5165\u6210\u529f\u3002", 
    "Successfully invited %(email) and %(num) other people.": "\u6210\u529f\u9080\u8bf7\u4e86 %(email) \u548c\u5176\u4ed6 %(num) \u4e2a\u4eba\u3002", 
    "Successfully invited %(email).": "\u6210\u529f\u9080\u8bf7\u4e86  %(email)\u3002", 
    "Successfully modified permission": "\u6210\u529f\u66f4\u6539\u6743\u9650", 
    "Successfully moved %(name)s": "\u6210\u529f\u79fb\u52a8 %(name)s\u3002", 
    "Successfully moved %(name)s and %(amount)s other items.": "\u6210\u529f\u79fb\u52a8 %(name)s \u548c\u5176\u4ed6 %(amount)s \u9879\u6761\u76ee\u3002", 
    "Successfully moved %(name)s and 1 other item.": "\u6210\u529f\u79fb\u52a8 %(name)s \u548c\u53e61\u9879\u6761\u76ee\u3002", 
    "Successfully moved %(name)s.": "\u6210\u529f\u79fb\u52a8 %(name)s\u3002", 
    "Successfully restored library {placeholder}": "\u6210\u529f\u8fd8\u539f\u8d44\u6599\u5e93 {placeholder}", 
    "Successfully sent to {placeholder}": "\u6210\u529f\u53d1\u9001\u7ed9 {placeholder}", 
    "Successfully set library history.": "\u6210\u529f\u8bbe\u7f6e\u8d44\u6599\u5e93\u5386\u53f2\u3002", 
    "Successfully transferred the group.": "\u7fa4\u7ec4\u8f6c\u8ba9\u6210\u529f\u3002", 
    "Successfully transferred the group. You are now a normal member of the group.": "\u6210\u529f\u8f6c\u8ba9\u7fa4\u7ec4\u3002\u60a8\u73b0\u5728\u5df2\u6210\u4e3a\u7fa4\u4e3b\u7684\u666e\u901a\u6210\u5458\u3002", 
    "Successfully transferred the library.": "\u8d44\u6599\u5e93\u8f6c\u8ba9\u6210\u529f\u3002", 
    "Successfully unlink %(name)s.": "\u65ad\u5f00 %(name)s \u8fde\u63a5\u6210\u529f\u3002", 
    "Successfully unshared 1 item.": "\u6210\u529f\u53d6\u6d88\u5171\u4eab 1 \u4e2a\u6761\u76ee\u3002", 
    "Successfully unshared library {placeholder}": "\u6210\u529f\u53d6\u6d88\u5171\u4eab\u8d44\u6599\u5e93 {placeholder}", 
    "Successfully unstared {placeholder}": "\u6210\u529f\u53d6\u6d88\u661f\u6807 {placeholder}", 
    "Tag should not include ','.": "\u6807\u7b7e\u4e0d\u5e94\u8be5\u5305\u542b ','\u3002", 
    "Transfer Group": "\u8f6c\u8ba9\u7fa4\u7ec4", 
    "Transfer Group {group_name} To": "\u5c06\u7fa4\u7ec4  {group_name} \u8f6c\u8ba9\u7ed9", 
    "Transfer Library": "\u8f6c\u8ba9\u8d44\u6599\u5e93", 
    "Transfer Library {library_name} To": "\u8f6c\u79fb\u8d44\u6599\u5e93 {library_name} \u7ed9", 
    "Transferred group {group_name} from {user_from} to {user_to}": "\u5df2\u628a\u7fa4\u7ec4 {group_name} \u4ece {user_from} \u8f6c\u8ba9\u7ed9 {user_to}", 
    "Transferred library {library_name} from {user_from} to {user_to}": "\u5df2\u628a\u8d44\u6599\u5e93 {library_name} \u4ece {user_from} \u8f6c\u8ba9\u7ed9 {user_to}", 
    "Unlink device": "\u65ad\u5f00\u8fde\u63a5\u8bbe\u5907", 
    "Unshare Library": "\u53d6\u6d88\u5171\u4eab\u8d44\u6599\u5e93", 
    "Uploaded bytes exceed file size": "\u4e0a\u4f20\u5927\u5c0f\u8d85\u8fc7\u4e86\u6587\u4ef6\u5927\u5c0f", 
    "You can only select 1 item": "\u53ea\u80fd\u9009\u62e91\u4e2a\u9879\u76ee", 
    "You cannot select any more choices": "\u60a8\u4e0d\u80fd\u9009\u62e9\u66f4\u591a\u9879", 
    "You have logged out.": "\u4f60\u5df2\u7ecf\u767b\u51fa\u3002", 
    "canceled": "\u5df2\u53d6\u6d88", 
    "locked by {placeholder}": "\u88ab {placeholder} \u9501\u5b9a", 
    "uploaded": "\u5df2\u4e0a\u4f20", 
    "{placeholder} Folder Permission": "{placeholder} \u76ee\u5f55\u6743\u9650", 
    "{placeholder} History Setting": "{placeholder} \u5386\u53f2\u8bbe\u7f6e", 
    "{placeholder} Members": "{placeholder} \u6210\u5458", 
    "{placeholder} Share Links": "{placeholder} \u5171\u4eab\u5916\u94fe"
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

