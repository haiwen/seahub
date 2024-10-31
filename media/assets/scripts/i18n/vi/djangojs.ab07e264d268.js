

'use strict';
{
  const globals = this;
  const django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    const v = 0;
    if (typeof v === 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  const newcatalog = {
    "(current notification)": "(th\u00f4ng b\u00e1o hi\u1ec7n t\u1ea1i)",
    "(current version)": "(phi\u00ean b\u1ea3n hi\u1ec7n t\u1ea1i)",
    "1 month ago": "1 th\u00e1ng tr\u01b0\u1edbc",
    "1 week ago": "1 tu\u1ea7n tr\u01b0\u1edbc",
    "3 days ago": "3 ng\u00e0y tr\u01b0\u1edbc",
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
    "Add new notification": "Th\u00eam th\u00f4ng b\u00e1o m\u1edbi",
    "Added": "\u0110\u00e3 th\u00eam",
    "Admin": "Admin",
    "Admins": "Admins",
    "All": "T\u1ea5t c\u1ea3",
    "All Groups": "T\u1ea5t c\u1ea3 Group",
    "All Notifications": "T\u1ea5t c\u1ea3 th\u00f4ng b\u00e1o",
    "All file types": "T\u1ea5t c\u1ea3 c\u00e1c d\u1ea1ng file",
    "Are you sure you want to clear trash?": "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n l\u00e0m s\u1ea1ch th\u00f9ng r\u00e1c?",
    "Are you sure you want to delete %s ?": "B\u1ea1n ch\u1eafc ch\u1eafn mu\u1ed1n x\u00f3a %s ?",
    "Are you sure you want to restore this library?": "B\u1ea1n c\u00f3 mu\u1ed1n kh\u00f4i ph\u1ee5c th\u01b0 vi\u1ec7n n\u00e0y?",
    "Audio": "Audio",
    "Avatar": "H\u00ecnh \u0111\u1ea1i di\u1ec7n",
    "Avatar:": "Avatar:",
    "Can not copy directory %(src)s to its subdirectory %(des)s": "Kh\u00f4ng th\u1ec3 sao ch\u00e9p th\u01b0 m\u1ee5c %(src)s \u0111\u1ebfn th\u01b0 m\u1ee5c con %(des)s",
    "Can not move directory %(src)s to its subdirectory %(des)s": "Kh\u00f4ng th\u1ec3 chuy\u1ec3n th\u01b0 m\u1ee5c %(src)s \u0111\u1ebfn th\u01b0 m\u1ee5c con %(des)s",
    "Cancel": "H\u1ee7y",
    "Cancel All": "H\u1ee7y t\u1ea5t c\u1ea3",
    "Change": "Thay \u0111\u1ed5i",
    "Change Password": "Thay \u0111\u1ed5i m\u1eadt kh\u1ea9u",
    "Clean": "X\u00f3a",
    "Clear": "X\u00f3a",
    "Clear Trash": "L\u00e0m s\u1ea1ch th\u00f9ng r\u00e1c",
    "Close": "\u0110\u00f3ng",
    "Community Edition": "Phi\u00ean b\u1ea3n Community",
    "Confirm Password": "X\u00e1c nh\u1eadn m\u1eadt kh\u1ea9u",
    "Contact Email:": "Email li\u00ean h\u1ec7:",
    "Copy": "Sao ch\u00e9p",
    "Create": "T\u1ea1o l\u1eadp",
    "Created library": "\u0110\u00e3 t\u1ea1o th\u01b0 vi\u1ec7n",
    "Creator": "Ng\u01b0\u1eddi t\u1ea1o",
    "Current Library": "Th\u01b0 vi\u1ec7n hi\u1ec7n t\u1ea1i",
    "Current Path: ": "\u0110\u01b0\u1eddng d\u1eabn hi\u1ec7n t\u1ea1i",
    "Current path: ": "\u0110\u01b0\u1eddng d\u1eabn hi\u1ec7n t\u1ea1i",
    "Custom file types": "T\u00f9y ch\u1ec9nh c\u00e1c d\u1ea1ng file",
    "Database": "Database",
    "Delete": "X\u00f3a",
    "Delete Account": "X\u00f3a t\u00e0i kho\u1ea3n",
    "Delete Group": "X\u00f3a nh\u00f3m",
    "Delete Library": "X\u00f3a th\u01b0 vei65n",
    "Delete Member": "X\u00f3a th\u00e0nh vi\u00ean",
    "Delete Notification": "X\u00f3a th\u00f4ng b\u00e1o",
    "Delete Time": "Th\u1eddi gian x\u00f3a",
    "Delete User": "X\u00f3a ng\u01b0\u1eddi d\u00f9ng",
    "Deleted": "\u0110\u00e3 x\u00f3a",
    "Deleted Time": "Th\u1eddi gian x\u00f3a",
    "Deleted directories": "X\u00f3a th\u01b0 m\u1ee5c",
    "Deleted files": "X\u00f3a t\u1eadp tin",
    "Deleted library": "X\u00f3a th\u01b0 vi\u1ec7n",
    "Description": "M\u00f4 t\u1ea3",
    "Description is required": "Y\u00eau c\u1ea7u m\u00f4 t\u1ea3",
    "Detail": "Chi ti\u1ebft",
    "Device Name": "T\u00ean thi\u1ebft b\u1ecb",
    "Devices": "C\u00e1c thi\u1ebft b\u1ecb",
    "Directory": "Th\u01b0 m\u1ee5c",
    "Document convertion failed.": "Chuy\u1ec3n \u0111\u1ed5i t\u00e0i li\u1ec7u th\u1ea5t b\u1ea1i.",
    "Documents": "T\u00e0i li\u1ec7u",
    "Don't keep history": "Don't keep history",
    "Don't replace": "Kh\u00f4ng thay th\u1ebf",
    "Download": "T\u1ea3i xu\u1ed1ng",
    "Edit": "Ch\u1ec9nh s\u1eeda",
    "Edit succeeded": "Ch\u1ec9nh s\u1eeda th\u00e0nh c\u00f4ng",
    "Email": "Email",
    "Encrypt": "M\u00e3 h\u00f3a",
    "Error": "L\u1ed7i",
    "Exit System Admin": "Tho\u00e1t kh\u1ecfi h\u1ec7 th\u1ed1ng qu\u1ea3n l\u00fd",
    "Expiration": "H\u1ebft h\u1ea1n",
    "Export Excel": "Xu\u1ea5t file Excel",
    "Failed": "Failed",
    "Failed. Please check the network.": "Th\u1ea5t b\u1ea1i. Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i network.",
    "File": "T\u1eadp tin",
    "File Upload": "File Upload",
    "File Uploading...": "\u0110ang t\u1ea3i d\u1eef li\u1ec7u",
    "File download is disabled: the share link traffic of owner is used up.": "Kh\u00f4ng th\u1ec3 t\u1ea3i xu\u1ed1ng: \u0111\u00e3 d\u00f9ng h\u1ebft b\u0103ng th\u00f4ng chia s\u1ebb",
    "Files": "T\u1eadp tin",
    "Folder": "Th\u01b0 m\u1ee5c",
    "Folder Permission": "Folder Permission",
    "Folders": "Th\u01b0 m\u1ee5c",
    "Generate": "Kh\u1edfi t\u1ea1o",
    "Group": "Group",
    "Groups": "H\u1ed9i Nh\u00f3m",
    "Guest": "T\u00e0i kho\u1ea3n Kh\u00e1ch",
    "Help": "Tr\u1ee3 gi\u00fap",
    "Hide": "\u1ea8n",
    "History": "L\u1ecbch s\u1eed",
    "IP": "\u0110\u1ecba ch\u1ec9 IP",
    "Images": "H\u00ecnh \u1ea3nh",
    "In all libraries": "Trong t\u1ea5t c\u1ea3 c\u00e1c th\u01b0 vi\u1ec7n",
    "Inactive": "Ch\u01b0a k\u00edch ho\u1ea1t",
    "Info": "Th\u00f4ng tin",
    "Input file extensions here, separate with ','": "\u0110i\u1ec1n \u0111\u1ecbnh d\u1ea1ng file, c\u00e1ch bi\u1ec7t b\u1edfi d\u1ea5u ','",
    "Internal Server Error": "Internal Server Error",
    "Invalid destination path": "\u0110\u01b0\u1eddng d\u1eabn kh\u00f4ng h\u1ee3p l\u1ec7",
    "It is required.": "\u0110i\u1ec1u n\u00e0y \u0111\u01b0\u1ee3c y\u00eau c\u1ea7u",
    "Keep full history": "Keep full history",
    "LDAP": "LDAP",
    "Language": "Ng\u00f4n ng\u1eef",
    "Language Setting": "C\u00e0i \u0111\u1eb7t ng\u00f4n ng\u1eef",
    "Last Access": "Truy c\u1eadp l\u1ea7n cu\u1ed1i",
    "Last Login": "L\u1ea7n \u0111\u0103ng nh\u1eadp cu\u1ed1i",
    "Last Update": "C\u1eadp nh\u1eadt",
    "Libraries": "Th\u01b0 vi\u1ec7n",
    "Library": "Th\u01b0 vi\u1ec7n",
    "Limits": "Gi\u1edbi h\u1ea1n",
    "Links": "Links",
    "Lock": "Kh\u00f3a",
    "Log out": "\u0110\u0103ng xu\u1ea5t",
    "Logs": "Logs",
    "Mark all read": "\u0110\u00e1nh d\u1ea5u \u0111\u00e3 \u0111\u1ecdc",
    "Members": "Th\u00e0nh vi\u00ean",
    "Message": "Tin nh\u1eafn",
    "Message (optional):": "L\u1eddi nh\u1eafn (t\u00f9y ch\u1ecdn)",
    "Modification Details": "Chi ti\u1ebft thay \u0111\u1ed5i",
    "Modified": "\u0110\u00e3 s\u1eeda \u0111\u1ed5i",
    "Modified files": "S\u1eeda \u0111\u1ed5i t\u1eadp tin",
    "Modifier": "\u0110i\u1ec1u ch\u1ec9nh",
    "Month:": "Th\u00e1ng:",
    "More": "Th\u00eam",
    "Move": "Di chuy\u1ec3n",
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
    "No result": "Kh\u00f4ng t\u00ecm th\u1ea5y k\u1ebft qu\u1ea3",
    "None": "None",
    "Notification Detail": "Chi ti\u1ebft th\u00f4ng b\u00e1o",
    "Notifications": "Th\u00f4ng b\u00e1o",
    "Number of groups": "S\u1ed0 l\u01b0\u1ee3ng nh\u00f3m",
    "Old Password": "M\u1eadt kh\u1ea9u c\u0169",
    "Operation succeeded.": "Thao t\u00e1c th\u00e0nh c\u00f4ng",
    "Operations": "T\u00ednh n\u0103ng",
    "Organization": "T\u1ed5 ch\u1ee9c",
    "Organizations": "T\u1ed5 ch\u1ee9c",
    "Other Libraries": "Th\u01b0 vi\u1ec7n kh\u00e1c",
    "Password": "M\u1eadt kh\u1ea9u",
    "Password again": "Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u",
    "Password is too short": "M\u1eadt kh\u1ea9u qu\u00e1 ng\u1eafn",
    "Password:": "M\u1eadt kh\u1ea9u:",
    "Passwords don't match": "M\u1eadt kh\u1ea9u kh\u00f4ng tr\u00f9ng kh\u1edbp",
    "Permission": "Quy\u1ec1n h\u1ea1n",
    "Permission denied": "Kh\u00f4ng c\u00f3 quy\u1ec1n",
    "Platform": "N\u1ec1n t\u1ea3ng",
    "Please check the network.": "Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i network.",
    "Please enter 1 or more character": "Vui l\u00f2ng th\u00eam k\u00fd t\u1ef1",
    "Please enter days": "Vui l\u00f2ng nh\u1eadp s\u1ed1 ng\u00e0y",
    "Please enter password": "Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u",
    "Please enter the new password again": "Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u m\u1edbi l\u1ea7n n\u1eefa",
    "Please enter the old password": "Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u c\u0169",
    "Please enter the password again": "Vui l\u00f2ng nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u",
    "Please input at least an email.": "Vui l\u00f2ng ch\u1ecdn \u00edt nh\u1ea5t m\u1ed9t \u0111\u1ecba ch\u1ec9 email",
    "Previous": "Tr\u01b0\u1edbc",
    "Professional Edition": "Phi\u00ean b\u1ea3n Professional",
    "Profile": "H\u1ed3 S\u01a1 C\u00e1 Nh\u00e2n",
    "Profile Setting": "C\u00e0i \u0111\u1eb7t h\u1ed3 s\u01a1 c\u00e1 nh\u00e2n",
    "Read-Only": "Ch\u1ec9 xem",
    "Read-Write": "Xem - \u0110i\u1ec1u ch\u1ec9nh",
    "Really want to delete your account?": "B\u1ea1n c\u00f3 th\u1eadt s\u1ef1 mu\u1ed1n x\u00f3a t\u00e0i kho\u1ea3n c\u1ee7a b\u1ea1n?",
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
    "Result": "K\u1ebft qu\u1ea3",
    "Revoke Admin": "H\u1ee7y b\u1ecf quy\u1ec1n Admin",
    "Role": "Vai tr\u00f2",
    "Saving...": "\u0110ang l\u01b0u...",
    "Seafile": "Seafile",
    "Search Files": "T\u00ecm ki\u1ebfm",
    "Search files in this library": "T\u00ecm trong th\u01b0 vi\u1ec7n",
    "Search users...": "T\u00ecm ng\u01b0\u1eddi d\u00f9ng...",
    "See All Notifications": "Xem t\u1ea5t c\u1ea3 th\u00f4ng b\u00e1o",
    "Select libraries to share": "Ch\u1ecdn th\u01b0 vi\u1ec7n \u0111\u1ec3 chia s\u1ebb",
    "Send": "G\u1edfi",
    "Send to:": "G\u1edfi \u0111\u1ebfn:",
    "Sending...": "\u0110ang g\u1edfi...",
    "Server Version: ": "Phi\u00ean b\u1ea3n: ",
    "Set Quota": "Thi\u1ebft l\u1eadp Quota",
    "Set to current": "C\u00e0i \u0111\u1eb7t v\u1ec1 hi\u1ec7n t\u1ea1i",
    "Settings": "C\u00e0i \u0111\u1eb7t",
    "Share": "Chia s\u1ebb",
    "Share Admin": "Qu\u1ea3n l\u00fd chia s\u1ebb",
    "Share From": "Chia s\u1ebb t\u1eeb",
    "Share To": "Chia s\u1ebb \u0111\u1ebfn",
    "Share existing libraries": "Chia s\u1ebb th\u01b0 vi\u1ec7n hi\u1ec7n c\u00f3",
    "Shared By": "Chia s\u1ebb b\u1edfi",
    "Shared Links": "Links chia s\u1ebb",
    "Shared by: ": "\u0110\u01b0\u1ee3c chia s\u1ebb b\u1edfi:",
    "Size": "Dung l\u01b0\u1ee3ng",
    "Space Used": "Dung l\u01b0\u1ee3ng \u0111\u00e3 d\u00f9ng",
    "Status": "Tr\u1ea1ng th\u00e1i",
    "Submit": "C\u1eadp nh\u1eadt",
    "Success": "Th\u00e0nh c\u00f4ng",
    "Successfully copied %(name)s and %(amount)s other items.": "Sao ch\u00e9p %(name)s v\u00e0 %(amount)s item kh\u00e1c th\u00e0nh c\u00f4ng.",
    "Successfully copied %(name)s and 1 other item.": "Sao ch\u00e9p %(name)s v\u00e0 1 item kh\u00e1c th\u00e0nh c\u00f4ng.",
    "Successfully copied %(name)s.": "Sao ch\u00e9p %(name)s th\u00e0nh c\u00f4ng.",
    "Successfully deleted %s": "X\u00f3a %s th\u00e0nh c\u00f4ng",
    "Successfully moved %(name)s and %(amount)s other items.": "Di chuy\u1ec3n %(name)s v\u00e0 %(amount)s item kh\u00e1c th\u00e0nh c\u00f4ng.",
    "Successfully moved %(name)s and 1 other item.": "Di chuy\u1ec3n %(name)s v\u00e0 1 item kh\u00e1c th\u00e0nh c\u00f4ng.",
    "Successfully moved %(name)s.": "Di chuy\u1ec3n %(name)s th\u00e0nh c\u00f4ng.",
    "Successfully reset password to %(passwd)s for user %(user)s.": "Thay \u0111\u1ed5i m\u1eadt kh\u1ea9u th\u00e0nh c\u00f4ng sang %(passwd)s cho ng\u01b0\u1eddi d\u00f9ng %(user)s.",
    "Successfully revoke the admin permission of %s": "H\u1ee7y quy\u1ec1n admin c\u1ee7a %s th\u00e0nh c\u00f4ng",
    "Successfully sent to {placeholder}": "G\u1edfi th\u00e0nh c\u00f4ng \u0111\u1ebfn {placeholder}",
    "Successfully set %s as admin.": "Thi\u1ebft l\u1eadp quy\u1ec1n admin cho %s th\u00e0nh c\u00f4ng",
    "System": "H\u1ec7 th\u1ed1ng",
    "System Admin": "System Admin",
    "System Info": "Th\u00f4ng tin h\u1ec7 th\u1ed1ng",
    "Text files": "File v\u0103n b\u1ea3n",
    "The owner of this library has run out of space.": "Ch\u1ee7 th\u01b0 vi\u1ec7n n\u00e0y \u0111\u00e3 d\u00f9ng h\u1ebft dung l\u01b0\u1ee3ng",
    "The password will be kept in the server for only 1 hour.": "M\u1eadt kh\u1ea9u ch\u1ec9 \u0111\u01b0\u1ee3c l\u01b0u t\u1ea1m tr\u00ean m\u00e1y ch\u1ee7 trong 1 gi\u1edd.",
    "This library is password protected": "Th\u01b0 vi\u1ec7n n\u00e0y b\u1ea3o v\u1ec7 v\u1edbi m\u1eadt kh\u1ea9u",
    "This operation will not be reverted. Please think twice!": "X\u00f3a t\u00e0i kho\u1ea3n s\u1ebd kh\u00f4ng th\u1ec3 ph\u1ee5c h\u1ed3i. Vui l\u00f2ng suy ngh\u0129 l\u1ea7n n\u1eefa!",
    "Time": "Th\u1eddi gian",
    "Tip: 0 means default limit": "M\u1eb9o: \u0111i\u1ec1n 0 cho thi\u1ebft l\u1eadp kh\u00f4ng gi\u1edbi h\u1ea1n",
    "Total Users": "T\u1ed5ng s\u1ed1 ng\u01b0\u1eddi d\u00f9ng",
    "Traffic": "B\u0103ng th\u00f4ng",
    "Transfer": "Chuy\u1ec3n",
    "Transfer Library": "Chuy\u1ec3n th\u01b0 vi\u1ec7n",
    "Trash": "Th\u00f9ng r\u00e1c",
    "Unknown": "Kh\u00f4ng x\u00e1c \u0111\u1ecbnh",
    "Unlink": "B\u1ecf li\u00ean k\u1ebft",
    "Unlock": "M\u1edf kh\u00f3a",
    "Unshare": "Ng\u1eebng chia s\u1ebb",
    "Unstar": "H\u1ee7y \u0111\u00e1nh d\u1ea5u",
    "Update": "C\u1eadp nh\u1eadt",
    "Upgrade to Pro Edition": "N\u00e2ng c\u1ea5p l\u00ean phi\u00ean b\u1ea3n Professional",
    "Upload": "T\u1ea3i l\u00ean",
    "Upload Files": "T\u1ea3i d\u1eef li\u1ec7u",
    "Upload Folder": "Th\u01b0 m\u1ee5c t\u1ea3i l\u00ean",
    "Upload Links": "Link t\u1ea3i l\u00ean",
    "Used:": "\u0110\u00e3 d\u00f9ng",
    "User": "Ng\u01b0\u1eddi d\u00f9ng",
    "User Permission": "User Permission",
    "Username:": "T\u00ean \u0111\u0103ng nh\u1eadp",
    "Users": "Ng\u01b0\u1eddi d\u00f9ng",
    "Video": "Video",
    "View": "Xem",
    "Visits": "# Truy c\u1eadp",
    "Wrong password": "Sai m\u1eadt kh\u1ea9u",
    "You can also add a user as a guest, who will not be allowed to create libraries and groups.": "B\u1ea1n c\u00f3 th\u1ec3 th\u00eam t\u00e0i kho\u1ea3n 'Kh\u00e1ch' nh\u01b0 ng\u01b0\u1eddi d\u00f9ng, nh\u01b0ng kh\u00f4ng t\u1ea1o \u0111\u01b0\u1ee3c th\u01b0 vi\u1ec7n v\u00e0 nh\u00f3m.",
    "You can use this field at login.": "B\u1ea1n c\u00f3 th\u1ec3 ch\u1ecdn feild n\u00e0y khi \u0111\u0103ng nh\u1eadp",
    "Your notifications will be sent to this email.": "Th\u00f4ng b\u00e1o s\u1ebd \u0111\u01b0\u1ee3c g\u1edfi \u0111\u1ebfn email c\u1ee7a b\u1ea1n.",
    "all": "t\u1ea5t c\u1ea3",
    "all members": "t\u1ea5t c\u1ea3 th\u00e0nh vi\u00ean",
    "icon": "icon",
    "locked": "\u0111\u00e3 kh\u00f3a",
    "name": "T\u00ean",
    "starred": "\u0111\u00e1nh d\u1ea5u",
    "to": "\u0111\u1ebfn",
    "unstarred": "b\u1ecf \u0111\u00e1nh d\u1ea5u",
    "you can also press \u2190 ": "b\u1ea1n c\u0169ng c\u00f3 th\u1ec3 nh\u1ea5n \u2190 "
  };
  for (const key in newcatalog) {
    django.catalog[key] = newcatalog[key];
  }
  

  if (!django.jsi18n_initialized) {
    django.gettext = function(msgid) {
      const value = django.catalog[msgid];
      if (typeof value === 'undefined') {
        return msgid;
      } else {
        return (typeof value === 'string') ? value : value[0];
      }
    };

    django.ngettext = function(singular, plural, count) {
      const value = django.catalog[singular];
      if (typeof value === 'undefined') {
        return (count == 1) ? singular : plural;
      } else {
        return value.constructor === Array ? value[django.pluralidx(count)] : value;
      }
    };

    django.gettext_noop = function(msgid) { return msgid; };

    django.pgettext = function(context, msgid) {
      let value = django.gettext(context + '\x04' + msgid);
      if (value.includes('\x04')) {
        value = msgid;
      }
      return value;
    };

    django.npgettext = function(context, singular, plural, count) {
      let value = django.ngettext(context + '\x04' + singular, context + '\x04' + plural, count);
      if (value.includes('\x04')) {
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
      "%m/%d/%Y %H:%M:%S",
      "%m/%d/%Y %H:%M:%S.%f",
      "%m/%d/%Y %H:%M",
      "%m/%d/%y %H:%M:%S",
      "%m/%d/%y %H:%M:%S.%f",
      "%m/%d/%y %H:%M"
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
    "FIRST_DAY_OF_WEEK": 0,
    "MONTH_DAY_FORMAT": "j F",
    "NUMBER_GROUPING": 0,
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
      const value = django.formats[format_type];
      if (typeof value === 'undefined') {
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
};

