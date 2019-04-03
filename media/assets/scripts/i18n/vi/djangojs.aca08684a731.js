

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
    "A file with the same name already exists in this folder.": "M\u1ed9t file tr\u00f9ng t\u00ean \u0111\u00e3 t\u1ed3n t\u1ea1i trong th\u01b0 m\u1ee5c n\u00e0y.", 
    "About Us": "Li\u00ean h\u1ec7", 
    "Access Log": "L\u1ecbch s\u1eed truy c\u1eadp", 
    "Active": "\u0110\u00e3 k\u00edch ho\u1ea1t", 
    "Active Users": "Ng\u01b0\u1eddi d\u00f9ng \u0111\u00e3 k\u00edch ho\u1ea1t", 
    "Activities": "C\u00e1c ho\u1ea1t \u0111\u1ed9ng", 
    "Add Admins": "Th\u00eam Admin", 
    "Add Library": "Th\u00eam th\u01b0 vi\u1ec7n", 
    "Add admin": "Th\u00eam Admin", 
    "Add auto expiration": "Th\u00eam h\u1ebft h\u1ea1n t\u1ef1 \u0111\u1ed9ng", 
    "Add user": "Th\u00eam ng\u01b0\u1eddi d\u00f9ng", 
    "Admin": "Admin", 
    "All": "T\u1ea5t c\u1ea3", 
    "All Groups": "T\u1ea5t c\u1ea3 Group", 
    "Are you sure you want to clear trash?": "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n l\u00e0m s\u1ea1ch th\u00f9ng r\u00e1c?", 
    "Are you sure you want to delete %s ?": "B\u1ea1n ch\u1eafc ch\u1eafn mu\u1ed1n x\u00f3a %s ?", 
    "Are you sure you want to delete %s completely?": "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n x\u00f3a %s ho\u00e0n to\u00e0n?", 
    "Are you sure you want to delete all %s's libraries?": "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n x\u00f3a t\u1ea5t c\u1ea3 %s's th\u01b0 vi\u1ec7n?", 
    "Are you sure you want to delete these selected items?": "B\u1ea1n c\u00f3 ch\u1eafc b\u1ea1n mu\u1ed1n x\u00f3a nh\u1eefng item \u0111\u00e3 ch\u1ecdn", 
    "Are you sure you want to quit this group?": "B\u1ea1n c\u00f3 mu\u1ed1n tho\u00e1t kh\u1ecfi Group?", 
    "Are you sure you want to restore %s?": "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n kh\u00f4i ph\u1ee5c %s?", 
    "Avatar": "H\u00ecnh \u0111\u1ea1i di\u1ec7n", 
    "Can not copy directory %(src)s to its subdirectory %(des)s": "Kh\u00f4ng th\u1ec3 sao ch\u00e9p th\u01b0 m\u1ee5c %(src)s \u0111\u1ebfn th\u01b0 m\u1ee5c con %(des)s", 
    "Can not move directory %(src)s to its subdirectory %(des)s": "Kh\u00f4ng th\u1ec3 chuy\u1ec3n th\u01b0 m\u1ee5c %(src)s \u0111\u1ebfn th\u01b0 m\u1ee5c con %(des)s", 
    "Cancel": "H\u1ee7y", 
    "Cancel All": "H\u1ee7y t\u1ea5t c\u1ea3", 
    "Canceled.": "H\u1ee7y b\u1ecf", 
    "Change Password": "Thay \u0111\u1ed5i m\u1eadt kh\u1ea9u", 
    "Clear Trash": "L\u00e0m s\u1ea1ch th\u00f9ng r\u00e1c", 
    "Close": "\u0110\u00f3ng", 
    "Confirm Password": "X\u00e1c nh\u1eadn m\u1eadt kh\u1ea9u", 
    "Copy": "Sao ch\u00e9p", 
    "Copying %(name)s": "\u0110ang sao ch\u00e9p %(name)s", 
    "Copying file %(index)s of %(total)s": "Copying file %(index)s of %(total)s", 
    "Create At / Last Login": "Kh\u1edfi t\u1ea1o l\u00fac / \u0110\u0103ng nh\u1eadp l\u1ea7n cu\u1ed1i", 
    "Created library": "\u0110\u00e3 t\u1ea1o th\u01b0 vi\u1ec7n", 
    "Creator": "Ng\u01b0\u1eddi t\u1ea1o", 
    "Current Library": "Th\u01b0 vi\u1ec7n hi\u1ec7n t\u1ea1i", 
    "Delete": "X\u00f3a", 
    "Delete Group": "X\u00f3a nh\u00f3m", 
    "Delete Items": "X\u00f3a item", 
    "Delete Library": "X\u00f3a th\u01b0 vei65n", 
    "Delete Library By Owner": "Th\u01b0 vi\u1ec7n x\u00f3a b\u1edfi ng\u01b0\u1eddi t\u1ea1o", 
    "Delete Member": "X\u00f3a th\u00e0nh vi\u00ean", 
    "Delete User": "X\u00f3a ng\u01b0\u1eddi d\u00f9ng", 
    "Deleted Time": "Th\u1eddi gian x\u00f3a", 
    "Deleted directories": "X\u00f3a th\u01b0 m\u1ee5c", 
    "Deleted files": "X\u00f3a t\u1eadp tin", 
    "Deleted library": "X\u00f3a th\u01b0 vi\u1ec7n", 
    "Device Name": "T\u00ean thi\u1ebft b\u1ecb", 
    "Devices": "C\u00e1c thi\u1ebft b\u1ecb", 
    "Dismiss": "H\u1ee7y", 
    "Dismiss Group": "Gi\u1ea3i t\u00e1n Group", 
    "Document convertion failed.": "Chuy\u1ec3n \u0111\u1ed5i t\u00e0i li\u1ec7u th\u1ea5t b\u1ea1i.", 
    "Don't keep history": "Don't keep history", 
    "Don't replace": "Kh\u00f4ng thay th\u1ebf", 
    "Download": "T\u1ea3i xu\u1ed1ng", 
    "Edit": "Ch\u1ec9nh s\u1eeda", 
    "Edit Page": "Ch\u1ec9nh s\u1eeda trang", 
    "Edit failed.": "Ch\u1ec9nh s\u1eeda th\u1ea5t b\u1ea1i", 
    "Email": "Email", 
    "Empty file upload result": "K\u1ebft qu\u1ea3 t\u1ea3i l\u00ean t\u1eadp tin r\u1ed7ng", 
    "Encrypt": "M\u00e3 h\u00f3a", 
    "Error": "L\u1ed7i", 
    "Expiration": "H\u1ebft h\u1ea1n", 
    "Failed to send to {placeholder}": "G\u1edfi th\u1ea5t b\u1ea1i \u0111\u1ebfn {placeholder}", 
    "Failed.": "Th\u1ea5t b\u1ea1i.", 
    "Failed. Please check the network.": "Th\u1ea5t b\u1ea1i. Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i network.", 
    "File": "T\u1eadp tin", 
    "File Name": "T\u00ean t\u1eadp tin", 
    "File Upload": "File Upload", 
    "File Upload canceled": "H\u1ee7y t\u1ea3i d\u1eef li\u1ec7u", 
    "File Upload complete": "T\u1ea3i l\u00ean th\u00e0nh c\u00f4ng", 
    "File Upload failed": "T\u1ea3i l\u00ean th\u1ea5t b\u1ea1i", 
    "File Uploading...": "\u0110ang t\u1ea3i d\u1eef li\u1ec7u", 
    "File download is disabled: the share link traffic of owner is used up.": "Kh\u00f4ng th\u1ec3 t\u1ea3i xu\u1ed1ng: \u0111\u00e3 d\u00f9ng h\u1ebft b\u0103ng th\u00f4ng chia s\u1ebb", 
    "File is locked": "D\u1eef li\u1ec7u b\u1ecb kh\u00f3a", 
    "File is too big": "T\u1eadp tin qu\u00e1 l\u1edbn", 
    "File is too small": "T\u1eadp tin qu\u00e1 nh\u1ecf", 
    "Files": "T\u1eadp tin", 
    "Filetype not allowed": "\u0110\u1ecbnh d\u1ea1ng t\u1eadp tin kh\u00f4ng \u0111\u01b0\u1ee3c cho ph\u00e9p", 
    "Folder": "Th\u01b0 m\u1ee5c", 
    "Folder Permission": "Folder Permission", 
    "Folders": "Th\u01b0 m\u1ee5c", 
    "Generate": "Kh\u1edfi t\u1ea1o", 
    "Group": "Group", 
    "Groups": "H\u1ed9i Nh\u00f3m", 
    "Help": "Tr\u1ee3 gi\u00fap", 
    "Hide": "\u1ea8n", 
    "History": "L\u1ecbch s\u1eed", 
    "IP": "\u0110\u1ecba ch\u1ec9 IP", 
    "Inactive": "Ch\u01b0a k\u00edch ho\u1ea1t", 
    "Info": "Th\u00f4ng tin", 
    "Internal error. Failed to copy %(name)s.": "L\u1ed7i n\u1ed9i b\u1ed9. Sao ch\u00e9p %(name)s th\u1ea5t b\u1ea1i", 
    "Internal error. Failed to move %(name)s.": "L\u1ed7i n\u1ed9i b\u1ed9. Chuy\u1ec3n %(name)s th\u1ea5t b\u1ea1i", 
    "Invalid destination path": "\u0110\u01b0\u1eddng d\u1eabn kh\u00f4ng h\u1ee3p l\u1ec7", 
    "It is required.": "\u0110i\u1ec1u n\u00e0y \u0111\u01b0\u1ee3c y\u00eau c\u1ea7u", 
    "Just now": "V\u1eeba m\u1edbi", 
    "Keep full history": "Keep full history", 
    "Last Access": "Truy c\u1eadp l\u1ea7n cu\u1ed1i", 
    "Last Update": "C\u1eadp nh\u1eadt", 
    "Libraries": "Th\u01b0 vi\u1ec7n", 
    "Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.": "Th\u01b0 vi\u1ec7n chia s\u1ebb c\u00f3 th\u1ec3 t\u1ea3i v\u00e0 \u0111\u1ed3ng b\u1ed9 b\u1edfi c\u00e1c th\u00e0nh vi\u00ean trong Group. Th\u01b0 vi\u1ec7n (ch\u1ec9 \u0111\u1ecdc) ch\u1ec9 c\u00f3 th\u1ec3 t\u1ea3i v\u1ec1, nh\u1eefng thay \u0111\u1ed5i b\u1edfi c\u00e1c th\u00e0nh vi\u00ean kh\u00e1c s\u1ebd kh\u00f4ng \u0111\u01b0\u1ee3c c\u1eadp nh\u1eadt", 
    "Library": "Th\u01b0 vi\u1ec7n", 
    "Limits": "Gi\u1edbi h\u1ea1n", 
    "Links": "Links", 
    "Loading failed": "L\u1ed7i loading", 
    "Loading...": "\u0110ang t\u1ea3i...", 
    "Lock": "Kh\u00f3a", 
    "Log out": "\u0110\u0103ng xu\u1ea5t", 
    "Logs": "Logs", 
    "Members": "Th\u00e0nh vi\u00ean", 
    "Modification Details": "Chi ti\u1ebft thay \u0111\u1ed5i", 
    "Modified files": "S\u1eeda \u0111\u1ed5i t\u1eadp tin", 
    "More": "Th\u00eam", 
    "Move": "Di chuy\u1ec3n", 
    "Moving %(name)s": "\u0110ang di chuy\u1ec3n %(name)s", 
    "Moving file %(index)s of %(total)s": "Moving file %(index)s of %(total)s", 
    "My Groups": "Groups c\u1ee7a t\u00f4i", 
    "Name": "T\u00ean", 
    "Name is required": "Y\u00eau c\u1ea7u t\u00ean", 
    "Name is required.": "Y\u00eau c\u1ea7u t\u00ean.", 
    "New File": "T\u1eadp tin m\u1edbi", 
    "New Folder": "Th\u01b0 m\u1ee5c m\u1edbi", 
    "New Group": "T\u1ea1o Group m\u1edbi", 
    "New Library": "T\u1ea1o th\u01b0 vi\u1ec7n m\u1edbi", 
    "New Password": "M\u1eadt kh\u1ea9u m\u1edbi", 
    "New Password Again": "Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u m\u1edbi", 
    "New directories": "Th\u01b0 m\u1ee5c m\u1edbi", 
    "New files": "T\u1eadp tin m\u1edbi", 
    "New password is too short": "M\u1eadt kh\u1ea9u m\u1edbi qu\u00e1 ng\u1eafn", 
    "New passwords don't match": "M\u1eadt kh\u1ea9u m\u1edbi kh\u00f4ng tr\u00f9ng kh\u1edbp", 
    "Next": "Ti\u1ebfp theo", 
    "No library is shared to this group": "Ch\u01b0a c\u00f3 th\u01b0 vi\u1ec7n n\u00e0o \u0111\u01b0\u1ee3c chia s\u1ebb trong Group", 
    "No matches": "Kh\u00f4ng t\u00ecm th\u1ea5y", 
    "Notifications": "Th\u00f4ng b\u00e1o", 
    "Old Password": "M\u1eadt kh\u1ea9u c\u0169", 
    "Only an extension there, please input a name.": "Ch\u1ec9 c\u00f3 m\u1ed9t ph\u1ea7n m\u1edf r\u1ed9ng n\u00e0y, vui l\u00f2ng nh\u1eadp t\u00ean", 
    "Open in New Tab": "M\u1edf \u1edf Tab m\u1edbi", 
    "Operations": "T\u00ednh n\u0103ng", 
    "Organization": "T\u1ed5 ch\u1ee9c", 
    "Organizations": "T\u1ed5 ch\u1ee9c", 
    "Other Libraries": "Th\u01b0 vi\u1ec7n kh\u00e1c", 
    "Pages": "Trang", 
    "Password": "M\u1eadt kh\u1ea9u", 
    "Password again": "Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u", 
    "Password is required.": "Y\u00eau c\u1ea7u m\u1eadt kh\u1ea9u.", 
    "Password is too short": "M\u1eadt kh\u1ea9u qu\u00e1 ng\u1eafn", 
    "Passwords don't match": "M\u1eadt kh\u1ea9u kh\u00f4ng tr\u00f9ng kh\u1edbp", 
    "Permission": "Quy\u1ec1n h\u1ea1n", 
    "Permission denied": "Kh\u00f4ng c\u00f3 quy\u1ec1n", 
    "Platform": "N\u1ec1n t\u1ea3ng", 
    "Please check the network.": "Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i network.", 
    "Please click and choose a directory.": "Vui l\u00f2ng click v\u00e0 ch\u1ecdn th\u01b0 m\u1ee5c", 
    "Please enter 1 or more character": "Vui l\u00f2ng th\u00eam k\u00fd t\u1ef1", 
    "Please enter password": "Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u", 
    "Please enter the new password again": "Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u m\u1edbi l\u1ea7n n\u1eefa", 
    "Please enter the old password": "Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u c\u0169", 
    "Please enter the password again": "Vui l\u00f2ng nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u", 
    "Please enter valid days": "Vui l\u00f2ng nh\u1eadp s\u1ed1 \u0111\u00fang", 
    "Please input at least an email.": "Vui l\u00f2ng ch\u1ecdn \u00edt nh\u1ea5t m\u1ed9t \u0111\u1ecba ch\u1ec9 email", 
    "Previous": "Tr\u01b0\u1edbc", 
    "Processing...": "\u0110ang x\u1eed l\u00fd...", 
    "Quit Group": "Tho\u00e1t kh\u1ecfi Group", 
    "Read-Only": "Ch\u1ec9 xem", 
    "Read-Write": "Xem - \u0110i\u1ec1u ch\u1ec9nh", 
    "Really want to dismiss this group?": "B\u1ea1n c\u00f3 th\u1ef1c s\u1ef1 mu\u1ed1n gi\u1ea3i t\u00e1n Group n\u00e0y?", 
    "Remove": "Lo\u1ea1i b\u1ecf", 
    "Rename": "\u0110\u1ed5i t\u00ean", 
    "Rename File": "\u0110\u1ed5i t\u00ean file", 
    "Renamed or Moved files": "\u0110\u1ed5i t\u00ean ho\u1eb7c chuy\u1ec3n t\u1eadp tin", 
    "Replace": "Thay th\u1ebf", 
    "Replacing it will overwrite its content.": "Thay th\u1ebf s\u1ebd ghi \u0111\u00e8 n\u1ed9i dung.", 
    "Reset Password": "\u0110\u00e3 \u0111\u1ed5i M\u1eadt kh\u1ea9u", 
    "ResetPwd": "Thay \u0111\u1ed5i m\u1eadt kh\u1ea9u", 
    "Restore": "Kh\u00f4i ph\u1ee5c", 
    "Restore Library": "Kh\u00f4i ph\u1ee5c th\u01b0 vi\u1ec7n", 
    "Revoke Admin": "H\u1ee7y b\u1ecf quy\u1ec1n Admin", 
    "Role": "Vai tr\u00f2", 
    "Saving...": "\u0110ang l\u01b0u...", 
    "Seafile": "Seafile", 
    "Seafile Wiki enables you to organize your knowledge in a simple way. The contents of wiki is stored in a normal library with pre-defined file/folder structure. This enables you to edit your wiki in your desktop and then sync back to the server.": "Seafile Wiki cho ph\u00e9p b\u1ea1n s\u1eafp x\u1ebfp c\u00e1c ki\u1ebfn th\u1ee9c m\u1ed9t c\u00e1ch \u0111\u01a1n gi\u1ea3n. N\u1ed9i dung c\u1ee7a wiki \u0111\u01b0\u1ee3c  l\u01b0u tr\u1eef trong m\u1ed9t th\u01b0 vi\u1ec7n v\u1edbi m\u1ed9t c\u1ea5u tr\u00fac nh\u1eefng file/folder c\u00f3 s\u1eb5n ", 
    "Search Files": "T\u00ecm ki\u1ebfm", 
    "Search files in this library": "T\u00ecm trong th\u01b0 vi\u1ec7n", 
    "Searching...": "\u0110ang t\u00ecm...", 
    "See All Notifications": "Xem t\u1ea5t c\u1ea3 th\u00f4ng b\u00e1o", 
    "Select libraries to share": "Ch\u1ecdn th\u01b0 vi\u1ec7n \u0111\u1ec3 chia s\u1ebb", 
    "Server Version: ": "Phi\u00ean b\u1ea3n: ", 
    "Set Quota": "Thi\u1ebft l\u1eadp Quota", 
    "Settings": "C\u00e0i \u0111\u1eb7t", 
    "Share": "Chia s\u1ebb", 
    "Share Admin": "Qu\u1ea3n l\u00fd chia s\u1ebb", 
    "Share From": "Chia s\u1ebb t\u1eeb", 
    "Share To": "Chia s\u1ebb \u0111\u1ebfn", 
    "Share existing libraries": "Chia s\u1ebb th\u01b0 vi\u1ec7n hi\u1ec7n c\u00f3", 
    "Size": "Dung l\u01b0\u1ee3ng", 
    "Space Used": "Dung l\u01b0\u1ee3ng \u0111\u00e3 d\u00f9ng", 
    "Start": "B\u1eaft \u0111\u1ea7u", 
    "Status": "Tr\u1ea1ng th\u00e1i", 
    "Submit": "C\u1eadp nh\u1eadt", 
    "Success": "Th\u00e0nh c\u00f4ng", 
    "Successfully copied %(name)s": "Sao ch\u00e9p %(name)s th\u00e0nh c\u00f4ng", 
    "Successfully copied %(name)s and %(amount)s other items.": "Sao ch\u00e9p %(name)s v\u00e0 %(amount)s item kh\u00e1c th\u00e0nh c\u00f4ng.", 
    "Successfully copied %(name)s and 1 other item.": "Sao ch\u00e9p %(name)s v\u00e0 1 item kh\u00e1c th\u00e0nh c\u00f4ng.", 
    "Successfully copied %(name)s.": "Sao ch\u00e9p %(name)s th\u00e0nh c\u00f4ng.", 
    "Successfully deleted %(name)s": "X\u00f3a %(name)s th\u00e0nh c\u00f4ng", 
    "Successfully deleted %(name)s and %(amount)s other items.": "X\u00f3a %(name)s v\u00e0 %(amount)s item kh\u00e1c th\u00e0nh c\u00f4ng", 
    "Successfully deleted %(name)s.": "X\u00f3a %(name)s th\u00e0nh c\u00f4ng", 
    "Successfully deleted %s": "X\u00f3a %s th\u00e0nh c\u00f4ng", 
    "Successfully deleted.": "X\u00f3a th\u00e0nh c\u00f4ng.", 
    "Successfully moved %(name)s": "Chuy\u1ec3n %(name)s th\u00e0nh c\u00f4ng ", 
    "Successfully moved %(name)s and %(amount)s other items.": "Di chuy\u1ec3n %(name)s v\u00e0 %(amount)s item kh\u00e1c th\u00e0nh c\u00f4ng.", 
    "Successfully moved %(name)s and 1 other item.": "Di chuy\u1ec3n %(name)s v\u00e0 1 item kh\u00e1c th\u00e0nh c\u00f4ng.", 
    "Successfully moved %(name)s.": "Di chuy\u1ec3n %(name)s th\u00e0nh c\u00f4ng.", 
    "Successfully reset password to %(passwd)s for user %(user)s.": "Thay \u0111\u1ed5i m\u1eadt kh\u1ea9u th\u00e0nh c\u00f4ng sang %(passwd)s cho ng\u01b0\u1eddi d\u00f9ng %(user)s.", 
    "Successfully revoke the admin permission of %s": "H\u1ee7y quy\u1ec1n admin c\u1ee7a %s th\u00e0nh c\u00f4ng", 
    "Successfully sent to {placeholder}": "G\u1edfi th\u00e0nh c\u00f4ng \u0111\u1ebfn {placeholder}", 
    "Successfully set %s as admin.": "Thi\u1ebft l\u1eadp quy\u1ec1n admin cho %s th\u00e0nh c\u00f4ng", 
    "System Admin": "System Admin", 
    "The password will be kept in the server for only 1 hour.": "M\u1eadt kh\u1ea9u ch\u1ec9 \u0111\u01b0\u1ee3c l\u01b0u t\u1ea1m tr\u00ean m\u00e1y ch\u1ee7 trong 1 gi\u1edd.", 
    "This library is password protected": "Th\u01b0 vi\u1ec7n n\u00e0y b\u1ea3o v\u1ec7 v\u1edbi m\u1eadt kh\u1ea9u", 
    "Time": "Th\u1eddi gian", 
    "Tip: libraries deleted 30 days ago will be cleaned automatically.": "M\u1eb9o: nh\u1eefng th\u01b0 vi\u1ec7n b\u1ecb x\u00f3a 30 ng\u00e0y tr\u01b0\u1edbc s\u1ebd \u0111\u01b0\u1ee3c t\u1ef1 \u0111\u1ed9ng x\u00f3a.", 
    "Total Users": "T\u1ed5ng s\u1ed1 ng\u01b0\u1eddi d\u00f9ng", 
    "Transfer": "Chuy\u1ec3n", 
    "Transfer Library": "Chuy\u1ec3n th\u01b0 vi\u1ec7n", 
    "Trash": "Th\u00f9ng r\u00e1c", 
    "Unlink": "B\u1ecf li\u00ean k\u1ebft", 
    "Unlock": "M\u1edf kh\u00f3a", 
    "Unshare": "Ng\u1eebng chia s\u1ebb", 
    "Unstar": "H\u1ee7y \u0111\u00e1nh d\u1ea5u", 
    "Update": "C\u1eadp nh\u1eadt", 
    "Upload": "T\u1ea3i l\u00ean", 
    "Upload Files": "T\u1ea3i d\u1eef li\u1ec7u", 
    "Upload Folder": "Th\u01b0 m\u1ee5c t\u1ea3i l\u00ean", 
    "Upload Links": "Link t\u1ea3i l\u00ean", 
    "Uploaded bytes exceed file size": "\u0110\u00e3 t\u1ea3i l\u00ean nh\u1eefng byte v\u01b0\u1ee3t qu\u00e1 k\u00edch th\u01b0\u1edbc c\u1ee7a file", 
    "Used:": "\u0110\u00e3 d\u00f9ng", 
    "User": "Ng\u01b0\u1eddi d\u00f9ng", 
    "Users": "Ng\u01b0\u1eddi d\u00f9ng", 
    "View": "Xem", 
    "Visits": "# Truy c\u1eadp", 
    "Wrong password": "Sai m\u1eadt kh\u1ea9u", 
    "You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.": "B\u1ea1n c\u00f3 th\u1ec3 t\u1ea1o th\u01b0 vi\u1ec7n \u0111\u1ec3 s\u1eafp x\u1ebfp d\u1eef li\u1ec7u. V\u00ed d\u1ee5, b\u1ea1n c\u00f3 th\u1ec3 t\u1ea1o m\u1ed7i th\u01b0 vi\u1ec7n cho m\u1ed7i d\u1ef1 \u00e1n. M\u1ed7i th\u01b0 vi\u1ec7n c\u00f3 th\u1ec3 \u0111\u1ed3ng b\u1ed9 v\u00e0 chia s\u1ebb \u0111\u1ed9c l\u1eadp.", 
    "You can share a single folder with a registered user if you don't want to share a whole library.": "N\u1ebfu kh\u00f4ng mu\u1ed1n chia s\u1ebb to\u00e0n b\u1ed9 th\u01b0 vi\u1ec7n, b\u1ea1n c\u00f3 th\u1ec3 chia s\u1ebb m\u1ed9t th\u01b0 m\u1ee5c v\u1edbi m\u1ed9t ng\u01b0\u1eddi d\u00f9ng \u0111\u00e3 \u0111\u0103ng k\u00fd", 
    "You can share libraries by clicking the \"New Library\" button above or the \"Share\" icon on your libraries list.": "B\u1ea1n c\u00f3 th\u1ec3 chia s\u1ebb th\u01b0 vi\u1ec7n b\u1eb1ng c\u00e1ch click v\u00e0o \"Th\u01b0 vi\u1ec7n m\u1edbi\" b\u00ean tr\u00ean ho\u1eb7c Icon \"Chia s\u1ebb\" trong danh s\u00e1ch th\u01b0 vi\u1ec7n c\u1ee7a b\u1ea1n", 
    "You can share the generated link to others and then they can upload files to this directory via the link.": "B\u1ea1n c\u00f3 th\u1ec3 chia s\u1ebb link v\u00e0 ng\u01b0\u1eddi kh\u00e1c c\u00f3 th\u1ec3 t\u1ea3i l\u00ean v\u00e0o th\u01b0 m\u1ee5c t\u1eeb link n\u00e0y.", 
    "You cannot select any more choices": "B\u1ea1n kh\u00f4ng th\u1ec3 ch\u1ecdn th\u00eam", 
    "You have not created any libraries": "B\u1ea1n ch\u01b0a t\u1ea1o th\u01b0 vi\u1ec7n n\u00e0o", 
    "all members": "t\u1ea5t c\u1ea3 th\u00e0nh vi\u00ean", 
    "canceled": "\u0111\u00e3 h\u1ee7y b\u1ecf", 
    "icon": "icon", 
    "locked": "\u0111\u00e3 kh\u00f3a", 
    "name": "T\u00ean", 
    "starred": "\u0111\u00e1nh d\u1ea5u", 
    "unstarred": "b\u1ecf \u0111\u00e1nh d\u1ea5u", 
    "uploaded": "\u0111\u00e3 t\u1ea3i l\u00ean", 
    "you can also press \u2190 ": "b\u1ea1n c\u0169ng c\u00f3 th\u1ec3 nh\u1ea5n \u2190 "
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
    "DATETIME_FORMAT": "H:i \\N\\g\u00e0\\y d \\t\\h\u00e1\\n\\g n \\n\u0103\\m Y", 
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
    "DATE_FORMAT": "\\N\\g\u00e0\\y d \\t\\h\u00e1\\n\\g n \\n\u0103\\m Y", 
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
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "0", 
    "MONTH_DAY_FORMAT": "j F", 
    "NUMBER_GROUPING": "0", 
    "SHORT_DATETIME_FORMAT": "H:i d-m-Y", 
    "SHORT_DATE_FORMAT": "d-m-Y", 
    "THOUSAND_SEPARATOR": ".", 
    "TIME_FORMAT": "H:i", 
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

