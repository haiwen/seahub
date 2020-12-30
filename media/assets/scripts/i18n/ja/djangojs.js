

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
    "(current notification)": "(\u73fe\u5728\u306e\u901a\u77e5)",
    "(current version)": "\uff08\u73fe\u5728\u306e\u7248\uff09",
    "1 month ago": "\u4e00\u30f6\u6708\u524d",
    "1 week ago": "\u4e00\u9031\u9593\u524d",
    "3 days ago": "\uff13\u65e5\u524d",
    "About Us": "\u79c1\u9054\u306b\u3064\u3044\u3066",
    "Abuse Content": "\u8aa4\u7528\u306e\u5185\u5bb9",
    "Abuse Type": "\u8aa4\u7528\u7a2e\u985e",
    "Active": "\u30a2\u30af\u30c6\u30a3\u30d6",
    "Add": "\u8ffd\u52a0",
    "Add Admins": "\u7ba1\u7406\u8005\u8ffd\u52a0",
    "Add admin": "\u7ba1\u7406\u8005\u306e\u8ffd\u52a0",
    "Add auto expiration": "\u6709\u52b9\u671f\u9650\u3092\u8a2d\u5b9a",
    "Add new notification": "\u65b0\u898f\u901a\u77e5\u3092\u8ffd\u52a0",
    "Add new reviewer": "\u65b0\u3057\u3044\u30ec\u30d3\u30e5\u30fc\u3092\u8ffd\u52a0",
    "Add participants": "\u53c2\u52a0\u8005\u3092\u8ffd\u52a0",
    "Add password protection": "\u30d1\u30b9\u30ef\u30fc\u30c9\u4fdd\u8b77\u3092\u8ffd\u52a0",
    "Add user": "\u30e6\u30fc\u30b6\u306e\u8ffd\u52a0",
    "Added": "\u8ffd\u52a0",
    "Admin": "\u7ba1\u7406",
    "Admins": "\u7ba1\u7406\u8005\u4e00\u89a7",
    "All": "\u5168\u3066",
    "All Groups": "\u5168\u3066\u306e\u30b0\u30eb\u30fc\u30d7",
    "All Notifications": "\u5168\u3066\u306e\u901a\u77e5",
    "All Public Links": "\u5168\u3066\u306e\u516c\u958b\u30ea\u30f3\u30af",
    "All file types": "\u5168\u3066\u306e\u30d5\u30a1\u30a4\u30eb\u30bf\u30a4\u30d7",
    "An internal link is a link to a file or folder that can be accessed by users with read permission to the file or folder.": "\u5185\u90e8\u30ea\u30f3\u30af\u306f\u3001\u30d5\u30a1\u30a4\u30eb\u307e\u305f\u306f\u30d5\u30a9\u30eb\u30c0\u30fc\u3078\u306e\u8aad\u307f\u53d6\u308a\u30a2\u30af\u30bb\u30b9\u8a31\u53ef\u3092\u6301\u3064\u30e6\u30fc\u30b6\u30fc\u304c\u30a2\u30af\u30bb\u30b9\u3067\u304d\u308b\u30d5\u30a1\u30a4\u30eb\u307e\u305f\u306f\u30d5\u30a9\u30eb\u30c0\u30fc\u3078\u306e\u30ea\u30f3\u30af\u3067\u3059\u3002",
    "Are you sure you want to clear trash?": "\u30b4\u30df\u7bb1\u3092\u7a7a\u306b\u3057\u3066\u3088\u3044\u3067\u3057\u3087\u3046\u304b\uff1f",
    "Are you sure you want to delete %s ?": "%s \u3092\u524a\u9664\u3057\u3066\u5b9c\u3057\u3044\u3067\u3057\u3087\u3046\u304b\uff1f",
    "Are you sure you want to restore this library?": "\u3053\u306e\u30e9\u30a4\u30d6\u30e9\u30ea\u3092\u672c\u5f53\u306b\u5fa9\u5143\u3057\u3066\u826f\u3044\u3067\u3059\u304b\uff1f",
    "Audio": "\u30aa\u30fc\u30c7\u30a3\u30aa",
    "Avatar": "\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u753b\u50cf",
    "Avatar:": "\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u753b\u50cf:",
    "Back": "\u30d0\u30c3\u30af",
    "Can not select self as a related file.": "\u81ea\u5206\u3092\u95a2\u9023\u30d5\u30a1\u30a4\u30eb\u3068\u3057\u3066\u9078\u629e\u3059\u308b\u3053\u3068\u306f\u3067\u304d\u307e\u305b\u3093\u3002",
    "Cancel": "\u30ad\u30e3\u30f3\u30bb\u30eb",
    "Cancel All": "\u5168\u3066\u3092\u30ad\u30e3\u30f3\u30bb\u30eb",
    "Change": "\u66f4\u65b0",
    "Change Password": "\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u5909\u66f4",
    "Change Password of Library {placeholder}": "\u30e9\u30a4\u30d6\u30e9\u30ea\u306e\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u5909\u66f4\u3059\u308b {placeholder}",
    "Clean": "\u30b4\u30df\u7bb1\u3092\u7a7a\u306b\u3059\u308b",
    "Clear": "\u30af\u30ea\u30a2",
    "Clear Trash": "\u30b4\u30df\u7bb1\u3092\u7a7a\u306b\u3059\u308b",
    "Clear files in trash and history\uff1a": "\u30b4\u30df\u7bb1\u3068\u5c65\u6b74\u306e\u30d5\u30a1\u30a4\u30eb\u3092\u6d88\u53bb\u3059\u308b\uff1a",
    "Close": "\u9589\u3058\u308b",
    "Column": "\u30ab\u30e9\u30e0",
    "Comments": "\u30b3\u30e1\u30f3\u30c8",
    "Confirm Password": "\u30d1\u30b9\u30ef\u30fc\u30c9\u78ba\u8a8d",
    "Contact Email": "\u9023\u7d61\u5148\u30e1\u30fc\u30eb",
    "Contact Information": "\u9023\u7d61\u5148",
    "Contact information is required.": "\u9023\u7d61\u5148\u60c5\u5831\u304c\u5fc5\u8981",
    "Copy": "\u30b3\u30d4\u30fc",
    "Copyright Infringement": "\u8457\u4f5c\u6a29\u4fb5\u5bb3",
    "Count": "\u56de\u6570",
    "Created At": "\u4f5c\u6210\u65e5",
    "Created library": "\u30e9\u30a4\u30d6\u30e9\u30ea\u3092\u4f5c\u6210\u3057\u307e\u3057\u305f",
    "Creator": "\u4f5c\u6210\u8005",
    "Current Library": "\u73fe\u5728\u306e\u30e9\u30a4\u30d6\u30e9\u30ea\u30fc",
    "Current Path: ": "\u73fe\u5728\u306e\u30d5\u30a1\u30a4\u30eb\u30d1\u30b9\uff1a",
    "Current path: ": "\u73fe\u5728\u306e\u30d1\u30b9\uff1a",
    "Custom file types": "\u72ec\u81ea\u306e\u30d5\u30a1\u30a4\u30eb\u30bf\u30a4\u30d7",
    "Database": "\u4e00\u89a7",
    "Date": "\u65e5\u4ed8",
    "Default": "\u65e2\u5b9a",
    "Delete": "\u524a\u9664",
    "Delete Account": "\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u524a\u9664",
    "Delete Group": "\u30b0\u30eb\u30fc\u30d7\u524a\u9664",
    "Delete Library": "\u30e9\u30a4\u30d6\u30e9\u30ea\u524a\u9664",
    "Delete Member": "\u30e1\u30f3\u30d0\u30fc\u524a\u9664",
    "Delete Notification": "\u901a\u77e5\u306e\u524a\u9664",
    "Delete Time": "\u524a\u9664\u65e5\u6642",
    "Delete User": "\u30e6\u30fc\u30b6\u524a\u9664",
    "Delete draft": "\u524a\u9664\u30c9\u30e9\u30d5\u30c8",
    "Deleted": "\u524a\u9664",
    "Deleted directories": "\u524a\u9664\u3055\u308c\u305f\u30c7\u30a3\u30ec\u30af\u30c8\u30ea\u30fc",
    "Deleted files": "\u524a\u9664\u3055\u308c\u305f\u30d5\u30a1\u30a4\u30eb",
    "Description": "\u8aac\u660e",
    "Detail": "\u8a73\u7d30",
    "Details": "\u8a73\u7d30",
    "Device": "\u7aef\u672b",
    "Device Name": "\u30c7\u30d0\u30a4\u30b9\u540d",
    "Devices": "\u30c7\u30d0\u30a4\u30b9",
    "Directory": "\u30c7\u30a3\u30ec\u30af\u30c8\u30ea",
    "Document convertion failed.": "\u6587\u66f8\u5909\u63db\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002",
    "Documents": "\u30c9\u30ad\u30e5\u30e1\u30f3\u30c8",
    "Don't keep history": "\u5c65\u6b74\u3092\u4fdd\u5b58\u3057\u306a\u3044",
    "Download": "\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9",
    "Draft": "\u30c9\u30e9\u30d5\u30c8",
    "Edit": "\u7de8\u96c6",
    "Edit failed.": "\u7de8\u96c6\u5931\u6557\u3002",
    "Edit succeeded": "\u7de8\u96c6\u5b8c\u4e86",
    "Email": "\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9",
    "Encrypt": "\u6697\u53f7\u5316",
    "Error": "\u30a8\u30e9\u30fc",
    "Exit Institution Admin": "\u6a5f\u95a2\u7ba1\u7406\u8005\u3092\u629c\u3051\u308b",
    "Exit Organization Admin": "\u7d44\u7e54\u7ba1\u7406\u3092\u629c\u3051\u308b",
    "Exit System Admin": "\u30b7\u30b9\u30c6\u30e0\u7ba1\u7406\u3092\u629c\u3051\u308b",
    "Failed. Please check the network.": "\u64cd\u4f5c\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u3092\u3054\u78ba\u8a8d\u304f\u3060\u3055\u3044\u3002",
    "Favorites": "\u304a\u6c17\u306b\u5165\u308a",
    "File": "\u30d5\u30a1\u30a4\u30eb",
    "File History": "\u30d5\u30a1\u30a4\u30eb\u5c65\u6b74",
    "File Upload": "\u30d5\u30a1\u30a4\u30eb\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9",
    "File Uploading...": "\u30d5\u30a1\u30a4\u30eb\u306e\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u4e2d",
    "Files": "\u30d5\u30a1\u30a4\u30eb",
    "Folder": "\u30d5\u30a9\u30eb\u30c0",
    "Folder Permission": "\u30d5\u30a9\u30eb\u30c0\u30fc\u6a29\u9650",
    "Folders": "\u30d5\u30a9\u30eb\u30c0",
    "Generate": "\u751f\u6210",
    "Group": "\u30b0\u30eb\u30fc\u30d7",
    "Groups": "\u30b0\u30eb\u30fc\u30d7",
    "Guest": "\u30b2\u30b9\u30c8",
    "Help": "\u30d8\u30eb\u30d7",
    "History": "\u5c65\u6b74",
    "History Versions": "\u5c65\u6b74\u30d0\u30fc\u30b8\u30e7\u30f3",
    "IP": "IP",
    "Images": "\u753b\u50cf",
    "In all libraries": "\u3059\u3079\u3066\u306e\u30e9\u30a4\u30d6\u30e9\u30ea\u3067",
    "Inactive": "\u7121\u52b9",
    "Info": "\u60c5\u5831",
    "Input file extensions here, separate with ','": "','\u3067\u533a\u5207\u3063\u3066\u30d5\u30a1\u30a4\u30eb\u62e1\u5f35\u5b50\u3092\u5165\u308c\u3066\u304f\u3060\u3055\u3044\u3002",
    "Institution Admin": "\u6a5f\u95a2\u7ba1\u7406\u8005",
    "Internal Link": "\u5185\u90e8\u30ea\u30f3\u30af",
    "Internal Server Error": "\u30b5\u30fc\u30d0\u5185\u90e8\u30a8\u30e9\u30fc",
    "Internal link has been copied to clipboard": "\u5185\u90e8\u30ea\u30f3\u30af\u304c\u30af\u30ea\u30c3\u30d7\u30dc\u30fc\u30c9\u306b\u30b3\u30d4\u30fc\u3055\u308c\u307e\u3057\u305f",
    "Invalid destination path": "\u884c\u304d\u5148\u30d1\u30b9\u540d\u304c\u4e0d\u6b63\u3067\u3059\u3002",
    "It is required.": "\u5165\u529b\u5fc5\u9808\u3067\u3059",
    "Keep full history": "\u5168\u3066\u306e\u5c65\u6b74\u3092\u4fdd\u5b58\u3059\u308b",
    "LDAP": "LDAP",
    "Language": "\u8a00\u8a9e",
    "Language Setting": "\u8a00\u8a9e\u8a2d\u5b9a",
    "Last Access": "\u524d\u56de\u306e\u30a2\u30af\u30bb\u30b9",
    "Last Update": "\u524d\u56de\u306e\u66f4\u65b0",
    "Libraries": "\u30e9\u30a4\u30d6\u30e9\u30ea\u30fc",
    "Library": "\u30e9\u30a4\u30d6\u30e9\u30ea\u30fc",
    "Links": "\u30ea\u30f3\u30af",
    "Local draft": "\u30ed\u30fc\u30ab\u30eb\u30c9\u30e9\u30d5\u30c8",
    "Location": "\u30ed\u30b1\u30fc\u30b7\u30e7\u30f3",
    "Log out": "\u30ed\u30b0\u30a2\u30a6\u30c8",
    "Logs": "\u30ed\u30b0",
    "Mark all read": "\u5168\u3066\u3092\u65e2\u8aad\u306b\u3059\u308b",
    "Mark as resolved": "\u89e3\u6c7a\u6e08\u307f\u3068\u3057\u3066\u30de\u30fc\u30af",
    "Members": "\u30e1\u30f3\u30d0\u30fc",
    "Message": "\u30e1\u30c3\u30bb\u30fc\u30b8",
    "Message (optional):": "\u30e1\u30c3\u30bb\u30fc\u30b8\uff08\u4efb\u610f\uff09\uff1a",
    "Modification Details": "\u5909\u66f4\u306e\u8a73\u7d30",
    "Modified": "\u5909\u66f4\u6e08\u307f",
    "Modified files": "\u5909\u66f4\u3055\u308c\u305f\u30d5\u30a1\u30a4\u30eb",
    "Month:": "\u6708\uff1a",
    "More": "\u7d9a\u304d",
    "More Operations": "\u305d\u306e\u4ed6\u306e\u64cd\u4f5c",
    "Move": "\u79fb\u52d5",
    "My Groups": "\u53c2\u52a0\u30b0\u30eb\u30fc\u30d7",
    "Name": "\u6c0f\u540d",
    "Name is required": "\u540d\u524d\u306f\u5fc5\u9808\u9805\u76ee\u3067\u3059\u3002",
    "Name is required.": "\u6c0f\u540d\u306f\u5fc5\u9808\u9805\u76ee\u3067\u3059\u3002",
    "Name should not include '/'.": "\u540d\u524d\u306b\u306f\u300c/\u300d\u3092\u542b\u3081\u306a\u3044\u3067\u304f\u3060\u3055\u3044\u3002",
    "Name(optional)": "\u6c0f\u540d\uff08\u4efb\u610f\uff09",
    "New Draft": "\u65b0\u3057\u3044\u30c9\u30e9\u30d5\u30c8",
    "New File": "\u65b0\u898f\u30d5\u30a1\u30a4\u30eb",
    "New Group": "\u30b0\u30eb\u30fc\u30d7\u4f5c\u6210",
    "New Library": "\u65b0\u3057\u3044\u30e9\u30a4\u30d6\u30e9\u30ea\u30fc",
    "New Password": "\u65b0\u898f\u30d1\u30b9\u30ef\u30fc\u30c9\u5165\u529b",
    "New Password Again": "\u518d\u5ea6\u30d1\u30b9\u30ef\u30fc\u30c9\u5165\u529b",
    "New directories": "\u65b0\u898f\u30c7\u30a3\u30ec\u30af\u30c8\u30ea\u30fc",
    "New files": "\u65b0\u898f\u30d5\u30a1\u30a4\u30eb",
    "New password is too short": "\u65b0\u3057\u3044\u30d1\u30b9\u30ef\u30fc\u30c9\u306f\u77ed\u3059\u304e\u307e\u3059",
    "New passwords don't match": "\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u4e00\u81f4\u3057\u307e\u305b\u3093\u3002",
    "Next": "\u6b21\u3078",
    "No comment yet.": "\u30b3\u30e1\u30f3\u30c8\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093",
    "No result": "\u7d50\u679c\u306a\u3057",
    "None": "\u306a\u3057",
    "Notification Detail": "\u901a\u77e5\u306e\u8a73\u7d30",
    "Notifications": "\u901a\u77e5",
    "Number of groups": "\u30b0\u30eb\u30fc\u30d7\u6570",
    "Old Password": "\u65e7\u3044\u30d1\u30b9\u30ef\u30fc\u30c9",
    "Only keep a period of history:": "\u5c65\u6b74\u4fdd\u5b58\u671f\u9593\uff1a",
    "Operation": "\u64cd\u4f5c",
    "Operation succeeded.": "\u64cd\u4f5c\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002",
    "Operations": "\u64cd\u4f5c",
    "Organization": "\u7d44\u7e54",
    "Organization Admin": "\u7d44\u7e54\u7ba1\u7406\u8005",
    "Organizations": "\u7d44\u7e54",
    "Other": "\u305d\u306e\u4ed6",
    "Other Libraries": "\u73fe\u5728\u306e\u30e9\u30a4\u30d6\u30e9\u30ea\u30fc",
    "Out of quota.": "\u30af\u30a9\u30fc\u30bf\u3092\u8d85\u3048\u3066\u3044\u307e\u3059",
    "Owner": "\u6240\u6709\u8005",
    "Participants": "\u53c2\u52a0\u8005",
    "Password": "\u30d1\u30b9\u30ef\u30fc\u30c9",
    "Password again": "\u30d1\u30b9\u30ef\u30fc\u30c9 (\u78ba\u8a8d)",
    "Password is too short": "\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u77ed\u3059\u304e\u307e\u3059\u3002",
    "Password:": "\u30d1\u30b9\u30ef\u30fc\u30c9:",
    "Passwords don't match": "\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u4e00\u81f4\u3057\u307e\u305b\u3093\u3002",
    "Permission": "\u6a29\u9650",
    "Permission denied": "\u6a29\u9650\u304c\u3042\u308a\u307e\u305b\u3093\u3002",
    "Platform": "\u30d7\u30e9\u30c3\u30c8\u30d5\u30a9\u30fc\u30e0",
    "Please check the network.": "\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u3092\u3054\u78ba\u8a8d\u304f\u3060\u3055\u3044\u3002",
    "Please enter a new password": "\u65b0\u3057\u3044\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044",
    "Please enter a non-negative integer": "\u975e\u8ca0\u306e\u6574\u6570\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044",
    "Please enter days": "\u65e5\u6570\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "Please enter password": "\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044",
    "Please enter the new password again": "\u65b0\u3057\u3044\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u518d\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044",
    "Please enter the old password": "\u65e7\u3044\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044",
    "Please enter the password again": "\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u518d\u5ea6\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044",
    "Please input at least an email.": "1\u3064\u306e\u4ee5\u4e0a\u306e\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044",
    "Preview and download": "\u30d7\u30ec\u30d3\u30e5\u30fc\u3068\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9",
    "Preview only": "\u30d7\u30ec\u30d3\u30e5\u30fc\u306e\u307f",
    "Previous": "\u524d\u3078",
    "Profile": "\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb",
    "Profile Setting": "\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u8a2d\u5b9a",
    "Publish": "\u516c\u958b",
    "Read-Only": "\u8aad\u307f\u306e\u307f",
    "Read-Write": "\u8aad\u307f/\u66f8\u304d",
    "Really want to delete your account?": "\u672c\u5f53\u306b\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f",
    "Refresh": "\u66f4\u65b0",
    "Related Files": "\u95a2\u9023\u30d5\u30a1\u30a4\u30eb",
    "Remove": "\u524a\u9664",
    "Rename": "\u540d\u524d\u306e\u5909\u66f4",
    "Rename File": "\u30d5\u30a1\u30a4\u30eb\u3092\u6539\u540d",
    "Renamed or Moved files": "\u30d5\u30a1\u30a4\u30eb\u306f\u3001\u6539\u540d\u3055\u308c\u305f\u304b\u79fb\u52d5\u3055\u308c\u305f",
    "Report Abuse": "\u4e0d\u6b63\u4f7f\u7528\u3092\u5831\u544a",
    "Request a review": "\u30ec\u30d3\u30e5\u30fc\u3092\u30ea\u30af\u30a8\u30b9\u30c8",
    "Reset Password": "\u30d1\u30b9\u30ef\u30fc\u30c9\u306e\u518d\u8a2d\u5b9a",
    "ResetPwd": "ResetPwd",
    "Restore": "\u5fa9\u5143",
    "Restore Library": "\u30e9\u30a4\u30d6\u30e9\u30ea\u306e\u5fa9\u5143",
    "Result": "\u7d50\u679c",
    "Revoke Admin": "\u7ba1\u7406\u6a29\u9650\u306e\u53d6\u308a\u5916\u3057",
    "Role": "\u5f79\u5272",
    "Save": "\u4fdd\u5b58",
    "Saving...": "\u4fdd\u5b58\u4e2d...",
    "Seafile": "Seafile",
    "Search Files": "\u30d5\u30a1\u30a4\u30eb\u306e\u691c\u7d22",
    "Search files in this library": "\u3053\u306e\u30e9\u30a4\u30d6\u30e9\u30ea\u306e\u30d5\u30a1\u30a4\u30eb\u3092\u691c\u7d22",
    "Search users...": "\u30e6\u30fc\u30b6\u306e\u691c\u7d22\u4e2d...",
    "See All Notifications": "\u3059\u3079\u3066\u306e\u901a\u77e5\u3092\u8868\u793a",
    "Select File": "\u30d5\u30a1\u30a4\u30eb\u3092\u9078\u629e",
    "Select related file for {placeholder}": "{placeholder}\u306e\u95a2\u9023\u30d5\u30a1\u30a4\u30eb\u3092\u9078\u629e\u3057\u307e\u3059",
    "Send": "\u9001\u4fe1",
    "Send to:": "\u9001\u4fe1\u5148\uff1a",
    "Sending...": "\u9001\u4fe1\u4e2d...",
    "Server Version: ": "\u30b5\u30fc\u30d0\u5074\u306e\u7248\uff1a",
    "Set Admin": "\u7ba1\u7406\u6a29\u9650\u3092\u8a2d\u5b9a",
    "Set Quota": "\u6700\u5927\u5229\u7528\u53ef\u80fd\u5bb9\u91cf\u8a2d\u5b9a",
    "Set permission": "\u8a31\u53ef\u3092\u8a2d\u5b9a",
    "Set to current": "\u901a\u77e5\u9818\u57df\u306b\u8868\u793a\u3059\u308b",
    "Settings": "\u8a2d\u5b9a",
    "Share": "\u5171\u6709",
    "Share Admin": "\u5171\u6709\u7ba1\u7406",
    "Share From": "\u5171\u6709\u5143",
    "Share Link": "\u5171\u6709\u30ea\u30f3\u30af",
    "Share To": "\u5171\u6709\u5148",
    "Shared By": "\u5171\u6709\u8005",
    "Shared Links": "\u5171\u6709\u30ea\u30f3\u30af",
    "Shared by: ": "\u5171\u6709\u8005\uff1a",
    "Shared with all": "\u3059\u3079\u3066\u5171\u6709\u3059\u308b",
    "Shared with groups": "\u30b0\u30eb\u30fc\u30d7\u3068\u5171\u6709",
    "Shared with me": "\u79c1\u3068\u5171\u6709",
    "Show resolved comments": "\u89e3\u6c7a\u3055\u308c\u305f\u30b3\u30e1\u30f3\u30c8\u3092\u8868\u793a",
    "Size": "\u30b5\u30a4\u30ba",
    "Space Used": "\u5229\u7528\u91cf",
    "Status": "\u72b6\u614b",
    "Submit": "\u767b\u9332",
    "Success": "\u6210\u529f",
    "Successfully changed library password.": "\u30e9\u30a4\u30d6\u30e9\u30ea\u306e\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u6b63\u5e38\u306b\u5909\u66f4\u3055\u308c\u307e\u3057\u305f",
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s \u306e\u307b\u304b%(amount)s\u9805\u76ee\u3092\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f\u3002",
    "Successfully copied %(name)s and 1 other item.": " %(name)s \u307b\u304b\uff11\u9805\u76ee\u3092\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f\u3002",
    "Successfully copied %(name)s.": "\u300c%(name)s\u300d\u3092\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f\u3002",
    "Successfully deleted %s": "%s \u3092\u524a\u9664\u3057\u307e\u3057\u305f\u3002",
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s \u306e\u307b\u304b%(amount)s\u9805\u76ee\u3092\u79fb\u52d5\u3057\u307e\u3057\u305f\u3002",
    "Successfully moved %(name)s and 1 other item.": " %(name)s \u307b\u304b\uff11\u9805\u76ee\u3092\u79fb\u52d5\u3057\u307e\u3057\u305f\u3002",
    "Successfully moved %(name)s.": "\u300c%(name)s\u300d\u3092\u79fb\u52d5\u3057\u307e\u3057\u305f\u3002",
    "Successfully reset password to %(passwd)s for user %(user)s.": "%(user)s\u306e\u30d1\u30b9\u30ef\u30fc\u30c9\u3092 %(passwd)s \u306b\u30ea\u30bb\u30c3\u30c8\u3057\u307e\u3057\u305f\u3002",
    "Successfully revoke the admin permission of %s": "%s \u306e\u7ba1\u7406\u6a29\u9650\u3092\u5265\u596a\u3057\u307e\u3057\u305f\u3002",
    "Sync Download": "Sync\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9",
    "Sync Upload": "\u540c\u671f\u306e\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9",
    "System": "\u30b7\u30b9\u30c6\u30e0",
    "System Admin": "\u30b7\u30b9\u30c6\u30e0\u7ba1\u7406",
    "Tags": "\u30bf\u30b0",
    "Text files": "\u30c6\u30ad\u30b9\u30c8 \u30d5\u30a1\u30a4\u30eb",
    "The password will be kept in the server for only 1 hour.": "\u30d1\u30b9\u30ef\u30fc\u30c9\u306f\u30b5\u30fc\u30d0\u306b\uff11\u6642\u9593\u3060\u3051\u4fdd\u6301\u3055\u308c\u307e\u3059\u3002",
    "This file has been updated.": "\u3053\u306e\u30d5\u30a1\u30a4\u30eb\u306f\u66f4\u65b0\u3055\u308c\u307e\u3057\u305f",
    "This file is in draft stage.": "\u3053\u306e\u30d5\u30a1\u30a4\u30eb\u306f\u30c9\u30e9\u30d5\u30c8\u6bb5\u968e\u3067\u3059",
    "This operation will not be reverted. Please think twice!": "\u3053\u306e\u64cd\u4f5c\u306f\u30ad\u30e3\u30f3\u30bb\u30eb\u3067\u304d\u307e\u305b\u3093\u3002\u3088\u304f\u8003\u3048\u3066\uff01",
    "Time": "\u65e5\u6642",
    "Tip: 0 means default limit": "\u30d2\u30f3\u30c8\uff1a 0 \u306f\u65e2\u5b9a\u5024\u3092\u610f\u5473\u3057\u307e\u3059",
    "Tools": "\u30c4\u30fc\u30eb",
    "Traffic": "\u901a\u4fe1\u91cf",
    "Transfer": "\u79fb\u8ee2",
    "Transfer Library": "\u30e9\u30a4\u30d6\u30e9\u30ea\u306e\u79fb\u8ee2",
    "Trash": "\u30b4\u30df\u7bb1",
    "Type": "\u7a2e\u985e",
    "Unknown": "\u4e0d\u660e",
    "Unshare": "\u5171\u6709\u3092\u5916\u3059",
    "Unshare Library": "\u30e9\u30a4\u30d6\u30e9\u30ea\u5171\u6709\u3092\u5916\u3059",
    "Unstar": "\u661f\u3092\u5916\u3059",
    "Update": "\u66f4\u65b0",
    "Upload": "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9",
    "Upload Files": "\u30d5\u30a1\u30a4\u30eb\u306e\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9",
    "Upload Folder": "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u3059\u308b\u30d5\u30a9\u30eb\u30c0",
    "Upload Link": "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u30ea\u30f3\u30af",
    "Upload Links": "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u30ea\u30f3\u30af",
    "Upload file": "\u30d5\u30a1\u30a4\u30eb\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9",
    "Use draft": "\u4f7f\u7528\u30c9\u30e9\u30d5\u30c8",
    "Used:": "\u5229\u7528\u4e2d\uff1a",
    "User": "\u30e6\u30fc\u30b6",
    "User Permission": "\u30e6\u30fc\u30b6\u6a29\u9650",
    "User {user_link} has added you to {group_link}": "\u30e6\u30fc\u30b6\u30fc{user_link}\u304c\u3042\u306a\u305f\u3092{group_link}\u306b\u8ffd\u52a0\u3057\u307e\u3057\u305f",
    "Users": "\u30e6\u30fc\u30b6",
    "Video": "\u30d3\u30c7\u30aa",
    "View": "\u95b2\u89a7",
    "View Draft": "\u30c9\u30e9\u30d5\u30c8\u3092\u898b\u308b",
    "View Snapshot": "\u30b9\u30ca\u30c3\u30d7\u30b7\u30e7\u30c3\u30c8\u3092\u898b\u308b",
    "Virus": "\u30a6\u30a4\u30eb\u30b9",
    "Visits": "\u8a2a\u554f\u8005",
    "Web Download": "Web\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9",
    "Web Upload": "Web\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9",
    "Wrong password": "\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u9055\u3044\u307e\u3059\u3002",
    "You can also add a user as a guest, who will not be allowed to create libraries and groups.": "\u30e6\u30fc\u30b6\u3092\u30b2\u30b9\u30c8\u3068\u3057\u3066\u8ffd\u52a0\u3059\u308b\u3053\u3068\u3082\u3067\u304d\u307e\u3059\u3002\u30b2\u30b9\u30c8\u306e\u5834\u5408\u306f\u3001\u30e9\u30a4\u30d6\u30e9\u30ea\u3084\u30b0\u30eb\u30fc\u30d7\u3092\u4f5c\u6210\u3067\u304d\u307e\u305b\u3093\u3002",
    "You have an unsaved draft. Do you like to use it?": "\u672a\u4fdd\u5b58\u306e\u30c9\u30e9\u30d5\u30c8\u304c\u3042\u308a\u307e\u3059\u3002\u305d\u308c\u3092\u4f7f\u7528\u3059\u308b\u5fc5\u8981\u304c\u3042\u308a\u307e\u3059\u304b\uff1f",
    "all": "\u3059\u3079\u3066",
    "all members": "\u5168\u3066\u306e\u30e1\u30f3\u30d0\u30fc",
    "days": "\u65e5",
    "file": "\u30d5\u30a1\u30a4\u30eb",
    "icon": "\u30a2\u30a4\u30b3\u30f3",
    "name": "\u6c0f\u540d",
    "related files": "\u95a2\u9023\u30d5\u30a1\u30a4\u30eb",
    "shared by:": "\u5171\u6709\u8005\uff1a",
    "you can also press \u2190 ": " \u2190 \u3092\u4f7f\u3046\u3053\u3068\u3082\u3067\u304d\u307e\u3059"
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
        return value.constructor === Array ? value[django.pluralidx(count)] : value;
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
    "DATETIME_FORMAT": "Y\u5e74n\u6708j\u65e5G:i",
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
    "DATE_FORMAT": "Y\u5e74n\u6708j\u65e5",
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
    "FIRST_DAY_OF_WEEK": 0,
    "MONTH_DAY_FORMAT": "n\u6708j\u65e5",
    "NUMBER_GROUPING": 0,
    "SHORT_DATETIME_FORMAT": "Y/m/d G:i",
    "SHORT_DATE_FORMAT": "Y/m/d",
    "THOUSAND_SEPARATOR": ",",
    "TIME_FORMAT": "G:i",
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S",
      "%H:%M:%S.%f",
      "%H:%M"
    ],
    "YEAR_MONTH_FORMAT": "Y\u5e74n\u6708"
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

