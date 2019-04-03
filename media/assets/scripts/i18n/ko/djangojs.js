

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
    "%curr% of %total%": "%total% \uc911 %curr%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">\uc774\ubbf8\uc9c0</a>\ub97c \ubd88\ub7ec\uc62c \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.", 
    "A file with the same name already exists in this folder.": "\ub3d9\uc77c\ud55c \uc774\ub984\uc758 \ud30c\uc77c\uc774 \uc774 \ud3f4\ub354\uc5d0 \uc788\uc2b5\ub2c8\ub2e4.", 
    "About": "\uc815\ubcf4", 
    "About Us": "\uc815\ubcf4", 
    "Access Log": "\uc811\uadfc \uae30\ub85d", 
    "Actions": "\ub3d9\uc791", 
    "Active": "\ud65c\uc131", 
    "Active Users": "\ud65c\ub3d9 \uc0ac\uc6a9\uc790", 
    "Activities": "\ud65c\ub3d9", 
    "Add Admins": "\uad00\ub9ac\uc790 \ucd94\uac00", 
    "Add Library": "\ub77c\uc774\ube0c\ub7ec\ub9ac \ucd94\uac00", 
    "Add Member": "\uad6c\uc131\uc6d0 \ucd94\uac00", 
    "Add User": "\uc0ac\uc6a9\uc790 \ucd94\uac00", 
    "Add Wiki": "\uc704\ud0a4 \ucd94\uac00", 
    "Add admin": "\uad00\ub9ac\uc790 \ucd94\uac00", 
    "Add auto expiration": "\uc790\ub3d9 \uc720\ud6a8\uae30\uac04 \ucd94\uac00", 
    "Add password protection": "\uc554\ud638 \ubcf4\ud638 \ucd94\uac00", 
    "Add user": "\uc0ac\uc6a9\uc790 \ucd94\uac00", 
    "Added user {user}": "{user} \uc0ac\uc6a9\uc790\ub97c \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4", 
    "Admin": "\uad00\ub9ac\uc790", 
    "Admin Logs": "\uad00\ub9ac\uc790 \ub85c\uadf8", 
    "All": "\ubaa8\ub450", 
    "All Groups": "\ubaa8\ub4e0 \uadf8\ub8f9", 
    "All Public Links": "\ubaa8\ub4e0 \uacf5\uac1c \ub9c1\ud06c", 
    "Anonymous User": "\uc190\ub2d8 \uc0ac\uc6a9\uc790", 
    "Are you sure you want to clear trash?": "\uc815\ub9d0\ub85c \ud734\uc9c0\ud1b5\uc744 \ube44\uc6b8\uae4c\uc694?", 
    "Are you sure you want to delete %s ?": "\uc815\ub9d0\ub85c %s\uc744(\ub97c) \uc0ad\uc81c\ud560\uae4c\uc694?", 
    "Are you sure you want to delete %s completely?": "\uc815\ub9d0\ub85c %s\uc744(\ub97c) \uc644\uc804\ud788 \uc0ad\uc81c\ud560\uae4c\uc694?", 
    "Are you sure you want to delete all %s's libraries?": "\uc815\ub9d0\ub85c %s\uc758 \ubaa8\ub4e0 \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \uc0ad\uc81c\ud560\uae4c\uc694?", 
    "Are you sure you want to delete these selected items?": "\uc815\ub9d0\ub85c \uc120\ud0dd\ud55c \ud56d\ubaa9\uc744 \uc0ad\uc81c\ud560\uae4c\uc694?", 
    "Are you sure you want to quit this group?": "\uc815\ub9d0\ub85c \uc774 \uadf8\ub8f9\uc5d0\uc11c \ub098\uac00\uc2dc\uaca0\uc2b5\ub2c8\uae4c?", 
    "Are you sure you want to restore %s?": "\uc815\ub9d0\ub85c %s\uc744(\ub97c) \ubcf5\uc6d0\ud560\uae4c\uc694?", 
    "Are you sure you want to unlink this device?": "\uc815\ub9d0\ub85c \uc774 \uc7a5\uce58\uc758 \uc5f0\uacb0\uc744 \ub04a\uc73c\uc2dc\uaca0\uc2b5\ub2c8\uae4c?", 
    "Are you sure you want to unshare %s ?": "\uc815\ub9d0\ub85c %s \uacf5\uc720\ub97c \ucde8\uc18c\ud560\uae4c\uc694?", 
    "Avatar": "\uc544\ubc14\ud0c0", 
    "Back": "\ub4a4\ub85c", 
    "Broken (please contact your administrator to fix this library)": "\uae68\uc9d0(\uad00\ub9ac\uc790\uc5d0\uac8c \uc774 \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \ubcf5\uad6c\ud558\ub77c\uace0 \uc54c\ub824\uc8fc\uc2ed\uc2dc\uc624)", 
    "Can not copy directory %(src)s to its subdirectory %(des)s": "%(src)s \ub514\ub809\ud130\ub9ac\ub97c %(des)s \ud558\uc704 \ub514\ub809\ud130\ub9ac\ub85c \ubcf5\uc0ac\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4", 
    "Can not move directory %(src)s to its subdirectory %(des)s": "%(src)s \ub514\ub809\ud130\ub9ac\ub97c %(des)s \ud558\uc704 \ub514\ub809\ud130\ub9ac\ub85c \uc774\ub3d9\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4", 
    "Cancel": "\ucde8\uc18c", 
    "Cancel All": "\ubaa8\ub450 \ucde8\uc18c", 
    "Canceled.": "\ucde8\uc18c\ud588\uc2b5\ub2c8\ub2e4.", 
    "Change Password": "\uc554\ud638 \ubc14\uafb8\uae30", 
    "Change Password of Library {placeholder}": "{placeholder} \ub77c\uc774\ube0c\ub7ec\ub9ac\uc758 \uc554\ud638 \ubc14\uafb8\uae30", 
    "Clear Trash": "\ud734\uc9c0\ud1b5 \ube44\uc6b0\uae30", 
    "Clients": "\ud074\ub77c\uc774\uc5b8\ud2b8", 
    "Close": "\ub2eb\uae30", 
    "Close (Esc)": "\ub2eb\uae30(Esc)", 
    "Comment": "\ub313\uae00", 
    "Comments": "\ub313\uae00", 
    "Confirm Password": "\uc554\ud638 \ud655\uc778", 
    "Copy": "\ubcf5\uc0ac", 
    "Copy selected item(s) to:": "\uc120\ud0dd\ud55c \ud56d\ubaa9\uc744 \ubcf5\uc0ac\ud560 \uc704\uce58:", 
    "Copy {placeholder} to:": "\ub2e4\uc74c\uc73c\ub85c {placeholder} \ubcf5\uc0ac:", 
    "Copying %(name)s": "{placeholder} \ubcf5\uc0ac \uc911", 
    "Copying file %(index)s of %(total)s": "\ud30c\uc77c %(total)s\uac1c \uc911 %(index)s\uac1c \ubcf5\uc0ac \uc911", 
    "Count": "\uac2f\uc218", 
    "Create At / Last Login": "\ub9cc\ub4e0 \ub0a0\uc9dc / \ub9c8\uc9c0\ub9c9 \ub85c\uadf8\uc778", 
    "Create Group": "\uadf8\ub8f9 \ub9cc\ub4e4\uae30", 
    "Create Library": "\ub77c\uc774\ube0c\ub7ec\ub9ac \ub9cc\ub4e4\uae30", 
    "Created At": "\ub9cc\ub4e0 \ub0a0\uc9dc", 
    "Created group {group_name}": "{group_name} \uadf8\ub8f9\uc744 \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4", 
    "Created library": "\ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \ub9cc\ub4e6", 
    "Created library {library_name} with {owner} as its owner": "{owner}\uc774(\uac00) \ubcf4\uc720\ud55c {library_name} \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4", 
    "Creator": "\ub9cc\ub4e0 \uc0ac\ub78c", 
    "Current Library": "\ud604\uc7ac \ub77c\uc774\ube0c\ub7ec\ub9ac", 
    "Date": "\ub0a0\uc9dc", 
    "Delete": "\uc0ad\uc81c", 
    "Delete Group": "\uadf8\ub8f9 \uc0ad\uc81c ", 
    "Delete Items": "\ud56d\ubaa9 \uc0ad\uc81c", 
    "Delete Library": "\ub77c\uc774\ube0c\ub7ec\ub9ac \uc0ad\uc81c", 
    "Delete Library By Owner": "\uc18c\uc720\uc790 \uad8c\ud55c\uc73c\ub85c \ub77c\uc774\ube0c\ub7ec\ub9ac \uc0ad\uc81c", 
    "Delete Member": "\uad6c\uc131\uc6d0 \uc0ad\uc81c", 
    "Delete User": "\uc0ac\uc6a9\uc790 \uc0ad\uc81c", 
    "Delete failed": "\uc0ad\uc81c \uc2e4\ud328", 
    "Delete files from this device the next time it comes online.": "\uc774 \uc7a5\uce58\ub85c \ub098\uc911\uc5d0 \uc811\uc18d\ud560 \ub54c, \uc7a5\uce58\uc758 \ud30c\uc77c\uc744 \uc0ad\uc81c\ud569\ub2c8\ub2e4.", 
    "Deleted Libraries": "\uc0ad\uc81c\ud55c \ub77c\uc774\ube0c\ub7ec\ub9ac", 
    "Deleted Time": "\uc0ad\uc81c \uc2dc\uac01", 
    "Deleted directories": "\uc0ad\uc81c\ud55c \ub514\ub809\ud130\ub9ac", 
    "Deleted files": "\uc0ad\uc81c\ud55c \ud30c\uc77c", 
    "Deleted group {group_name}": "{group_name} \uadf8\ub8f9\uc744 \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4", 
    "Deleted library": "\uc0ad\uc81c\ud55c \ub77c\uc774\ube0c\ub7ec\ub9ac", 
    "Deleted library {library_name}": "{library_name} \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4", 
    "Deleted user {user}": "{user} \uc0ac\uc6a9\uc790\ub97c \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4", 
    "Details": "\uc0c1\uc138", 
    "Device Name": "\uc7a5\uce58 \uc774\ub984", 
    "Devices": "\uc7a5\uce58", 
    "Dismiss": "\ud0c8\ud1f4", 
    "Dismiss Group": "\uadf8\ub8f9 \uc0ad\uc81c", 
    "Document convertion failed.": "\ubb38\uc11c \ubcc0\ud658\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Don't keep history": "\uc774\ub825 \uc720\uc9c0\ud558\uc9c0 \uc54a\uc74c", 
    "Don't replace": "\ubc14\uafb8\uc9c0 \uc54a\uc74c", 
    "Download": "\ub2e4\uc6b4\ub85c\ub4dc", 
    "Edit": "\ud3b8\uc9d1", 
    "Edit Page": "\ud398\uc774\uc9c0 \ud3b8\uc9d1", 
    "Edit failed": "\ud3b8\uc9d1 \uc2e4\ud328", 
    "Edit failed.": "\ud3b8\uc9d1\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Email": "\uc804\uc790\uba54\uc77c", 
    "Empty file upload result": "\uc5c5\ub85c\ub4dc \uacb0\uacfc\uac00 \ube48 \ud30c\uc77c\uc785\ub2c8\ub2e4", 
    "Encrypt": "\uc554\ud638\ud654", 
    "Encrypted library": "\uc554\ud638\ud654 \ub77c\uc774\ube0c\ub7ec\ub9ac", 
    "Error": "\uc624\ub958", 
    "Expiration": "\uc720\ud6a8\uae30\uac04", 
    "Expired": "\uc720\ud6a8\uae30\uac04 \uacbd\uacfc\ud568", 
    "Failed to copy %(name)s": "%(name)s \ubcf5\uc0ac\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Failed to delete %(name)s and %(amount)s other items.": "%(name)s \ubc0f \ud56d\ubaa9 %(amount)s\uac1c \uc0ad\uc81c\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Failed to delete %(name)s and 1 other item.": "%(name)s \ubc0f \ud56d\ubaa9 1\uac1c \uc0ad\uc81c\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Failed to delete %(name)s.": "%(name)s \uc0ad\uc81c\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Failed to move %(name)s": "%(name)s \uc774\ub3d9\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Failed to send to {placeholder}": "{placeholder}\uc5d0\uac8c \ubcf4\ub0b4\uae30\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4", 
    "Failed.": "\uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Failed. Please check the network.": "\uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. \ub124\ud2b8\uc6cc\ud06c\ub97c \ud655\uc778\ud558\uc138\uc694.", 
    "Favorites": "\uc990\uaca8\ucc3e\uae30", 
    "File": "\ud30c\uc77c", 
    "File Name": "\ud30c\uc77c \uc774\ub984", 
    "File Upload": "\ud30c\uc77c \uc5c5\ub85c\ub4dc", 
    "File Upload canceled": "\ud30c\uc77c \uc5c5\ub85c\ub4dc\ub97c \ucde8\uc18c\ud588\uc2b5\ub2c8\ub2e4", 
    "File Upload complete": "\ud30c\uc77c \uc5c5\ub85c\ub4dc\uac00 \ub05d\ub0ac\uc2b5\ub2c8\ub2e4", 
    "File Upload failed": "\ud30c\uc77c \uc5c5\ub85c\ub4dc\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4", 
    "File Uploading...": "\ud30c\uc77c \uc5c5\ub85c\ub4dc \uc911...", 
    "File download is disabled: the share link traffic of owner is used up.": "\ud30c\uc77c \ub2e4\uc6b4\ub85c\ub4dc\ub97c \ube44\ud65c\uc131\ud654\ud588\uc2b5\ub2c8\ub2e4: \uc18c\uc720\uc790\uc758 \uacf5\uc720 \ub9c1\ud06c \ud2b8\ub798\ud53d\uc774 \uc0ac\uc6a9 \uc911\uc785\ub2c8\ub2e4.", 
    "File is locked": "\ud30c\uc77c\uc774 \uc7a0\uaca8\uc788\uc2b5\ub2c8\ub2e4", 
    "File is too big": "\ud30c\uc77c\uc774 \ub108\ubb34 \ud07d\ub2c8\ub2e4", 
    "File is too small": "\ud30c\uc77c\uc774 \ub108\ubb34 \uc791\uc2b5\ub2c8\ub2e4", 
    "Files": "\ud30c\uc77c", 
    "Filetype not allowed": "\ud30c\uc77c \ud615\uc2dd\uc744 \ud5c8\uc6a9\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4", 
    "Folder": "\ud3f4\ub354", 
    "Folder Permission": "\ud3f4\ub354 \uad8c\ud55c", 
    "Folders": "\ud3f4\ub354", 
    "Generate": "\ub9cc\ub4e4\uae30", 
    "Group": "\uadf8\ub8f9", 
    "Groups": "\uadf8\ub8f9", 
    "Help": "\ub3c4\uc6c0\ub9d0", 
    "Hide": "\uc228\uae40", 
    "History": "\uc774\ub825", 
    "History Setting": "\uae30\ub85d \uc124\uc815", 
    "IP": "IP", 
    "Inactive": "\ube44\ud65c\uc131", 
    "Info": "\uc815\ubcf4", 
    "Institutions": "\ub2e8\uccb4", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "\ub0b4\ubd80 \uc624\ub958\uc785\ub2c8\ub2e4. %(name)s \ubc0f \ud56d\ubaa9 %(amount)s\uac1c \ubcf5\uc0ac\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Internal error. Failed to copy %(name)s.": "\ub0b4\ubd80 \uc624\ub958\uc785\ub2c8\ub2e4. %(name)s \ubcf5\uc0ac\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "\ub0b4\ubd80 \uc624\ub958\uc785\ub2c8\ub2e4. %(name)s \ubc0f \ud56d\ubaa9 %(amount)s\uac1c \uc774\ub3d9\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Internal error. Failed to move %(name)s.": "\ub0b4\ubd80 \uc624\ub958\uc785\ub2c8\ub2e4. %(name)s \uc774\ub3d9\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Invalid destination path": "\uc798\ubabb\ub41c \ub300\uc0c1 \uacbd\ub85c", 
    "Invitations": "\ucd08\ub300", 
    "It is required.": "\ud544\uc694\ud569\ub2c8\ub2e4.", 
    "Just now": "\uc9c0\uae08", 
    "Keep full history": "\uc804\uccb4 \uc774\ub825 \uc720\uc9c0", 
    "Last Access": "\ucd5c\uadfc \uc811\uadfc", 
    "Last Update": "\ucd5c\uadfc \uc5c5\ub370\uc774\ud2b8", 
    "Leave Share": "\uacf5\uc720\uc5d0\uc11c \ub098\uac00\uae30", 
    "Libraries": "\ub77c\uc774\ube0c\ub7ec\ub9ac", 
    "Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.": "\uae30\ub85d \uac00\ub2a5\ud558\uac8c \uacf5\uc720\ud55c \ub77c\uc774\ube0c\ub7ec\ub9ac\ub294 \ub2e4\ub978 \uadf8\ub8f9 \uad6c\uc131\uc6d0\uc774 \ub2e4\uc6b4\ub85c\ub4dc\ud558\uace0 \ub3d9\uae30\ud654\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \uc77d\uae30 \uc804\uc6a9 \ub77c\uc774\ube0c\ub7ec\ub9ac\ub294 \ub2e4\uc6b4\ub85c\ub4dc \uac00\ub2a5\ud558\uc9c0\ub9cc \ub2e4\ub978 \uadf8\ub8f9 \uad6c\uc131\uc6d0\uc774 \uc5c5\ub85c\ub4dc\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.", 
    "Library": "\ub77c\uc774\ube0c\ub7ec\ub9ac", 
    "Library Type": "\ub77c\uc774\ube0c\ub7ec\ub9ac \ud615\uc2dd", 
    "Limits": "\uc81c\ud55c", 
    "Link": "\uc5f0\uacb0", 
    "Linked Devices": "\uc5f0\uacb0\ud55c \uc7a5\uce58", 
    "Links": "\ub9c1\ud06c", 
    "List": "\ubaa9\ub85d", 
    "Loading failed": "\ubd88\ub7ec\uc624\uae30\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4", 
    "Loading...": "\ubd88\ub7ec\uc624\ub294 \uc911...", 
    "Location": "\uc704\uce58", 
    "Lock": "\uc7a0\uadf8\uae30", 
    "Log in": "\ub85c\uadf8\uc778", 
    "Log out": "\ub85c\uadf8\uc544\uc6c3", 
    "Logs": "\uae30\ub85d", 
    "Manage Members": "\uad6c\uc131\uc6d0 \uad00\ub9ac", 
    "Member": "\uad6c\uc131\uc6d0", 
    "Members": "\uad6c\uc131\uc6d0", 
    "Modification Details": "\uc218\uc815 \uc138\ubd80 \ub0b4\uc6a9", 
    "Modified files": "\uc218\uc815\ud55c \ud30c\uc77c", 
    "More": "\uc880 \ub354 \ubcf4\uae30", 
    "More Operations": "\ub2e4\ub978 \ub3d9\uc791", 
    "Move": "\uc774\ub3d9", 
    "Move selected item(s) to:": "\uc120\ud0dd\ud55c \ud56d\ubaa9\uc744 \uc62e\uae38 \uc704\uce58:", 
    "Move {placeholder} to:": "\ub2e4\uc74c\uc73c\ub85c {placeholder} \uc774\ub3d9:", 
    "Moving %(name)s": "{placeholder} \uc774\ub3d9 \uc911", 
    "Moving file %(index)s of %(total)s": "\ud30c\uc77c %(total)s\uac1c \uc911 %(index)s\uac1c \uc774\ub3d9 \uc911", 
    "My Groups": "\ub0b4 \uadf8\ub8f9", 
    "My Libraries": "\ub0b4 \ub77c\uc774\ube0c\ub7ec\ub9ac", 
    "Name": "\uc774\ub984", 
    "Name is required": "\uc774\ub984\uc774 \ud544\uc694\ud569\ub2c8\ub2e4", 
    "Name is required.": "\uc774\ub984\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.", 
    "Name should not include '/'.": "\uc774\ub984\uc5d0 '/' \ubb38\uc790\ub97c \ub123\uc73c\uba74 \uc548\ub429\ub2c8\ub2e4.", 
    "Name(optional)": "\uc774\ub984(\uc120\ud0dd)", 
    "New": "\uc0c8\ub85c \ub9cc\ub4e4\uae30", 
    "New Excel File": "\uc0c8 \uc561\uc140 \ud30c\uc77c", 
    "New File": "\uc0c8 \ud30c\uc77c", 
    "New Folder": "\uc0c8 \ud3f4\ub354", 
    "New Group": "\uc0c8 \uadf8\ub8f9", 
    "New Library": "\uc0c8 \ub77c\uc774\ube0c\ub7ec\ub9ac", 
    "New Markdown File": "\uc0c8 \ub9c8\ud06c\ub2e4\uc6b4 \ud30c\uc77c", 
    "New Password": "\uc0c8 \uc554\ud638", 
    "New Password Again": "\uc0c8 \uc554\ud638\ub97c \ub2e4\uc2dc \uc785\ub825\ud558\uc138\uc694", 
    "New PowerPoint File": "\uc0c8 \ud30c\uc6cc\ud3ec\uc778\ud2b8 \ud30c\uc77c", 
    "New Word File": "\uc0c8 \uc6cc\ub4dc \ud30c\uc77c", 
    "New directories": "\uc0c8 \ub514\ub809\ud130\ub9ac", 
    "New files": "\uc0c8 \ud30c\uc77c", 
    "New password is too short": "\uc0c8 \uc554\ud638\uac00 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4", 
    "New passwords don't match": "\uc0c8 \uc554\ud638\uac00 \uc77c\uce58\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4", 
    "Next": "\ub2e4\uc74c", 
    "Next (Right arrow key)": "\ub2e4\uc74c(\uc624\ub978\ucabd \ud654\uc0b4\ud45c \ud0a4)", 
    "No comment yet.": "\uc544\uc9c1 \ub313\uae00\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.", 
    "No deleted libraries.": "\uc0ad\uc81c\ud55c \ub77c\uc774\ube0c\ub7ec\ub9ac\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.", 
    "No libraries": "\ub77c\uc774\ube0c\ub7ec\ub9ac \uc5c6\uc74c", 
    "No library is shared to this group": "\uc774 \uadf8\ub8f9\uc5d0 \uacf5\uc720\ud558\ub294 \ub77c\uc774\ube0c\ub7ec\ub9ac\uac00 \uc5c6\uc2b5\ub2c8\ub2e4", 
    "No matches": "\uc77c\uce58\ud558\ub294 \uacb0\uacfc\uac00 \uc5c6\uc2b5\ub2c8\ub2e4", 
    "No members": "\uad6c\uc131\uc6d0 \uc5c6\uc74c", 
    "Notifications": "\uc54c\ub9bc", 
    "Old Password": "\uc774\uc804 \uc554\ud638", 
    "Only an extension there, please input a name.": "\ud655\uc7a5\uc790\ub9cc \uc788\uc2b5\ub2c8\ub2e4. \uc774\ub984\uc744 \uc785\ub825\ud558\uc138\uc694.", 
    "Only keep a period of history:": "\ud2b9\uc815 \uae30\uac04\ub3d9\uc548\uc758 \uc774\ub825 \uc720\uc9c0:", 
    "Open in New Tab": "\uc0c8 \ud0ed \uc5f4\uae30", 
    "Open via Client": "\ud074\ub77c\uc774\uc5b8\ud2b8\ub85c \uc5f4\uae30", 
    "Operations": "\uc791\uc5c5", 
    "Organization": "\uc870\uc9c1", 
    "Organization Admin": "\uc870\uc9c1 \uad00\ub9ac\uc790", 
    "Organizations": "\uc870\uc9c1", 
    "Other Libraries": "\ub2e4\ub978 \ub77c\uc774\ube0c\ub7ec\ub9ac", 
    "Owner": "\uc18c\uc720\uc790", 
    "Packaging...": "\uafb8\ub7ec\ubbf8 \ucc98\ub9ac \uc911...", 
    "Pages": "\ud398\uc774\uc9c0", 
    "Password": "\uc554\ud638", 
    "Password again": "\uc554\ud638\ub97c \ub2e4\uc2dc \uc785\ub825\ud558\uc138\uc694", 
    "Password is required.": "\uc554\ud638\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.", 
    "Password is too short": "\uc554\ud638\uac00 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4", 
    "Passwords don't match": "\uc554\ud638\uac00 \uc77c\uce58\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4", 
    "Permission": "\uad8c\ud55c", 
    "Permission denied": "\uad8c\ud55c\uc774 \uac70\ubd80\ub418\uc5c8\uc2b5\ub2c8\ub2e4", 
    "Permission error": "\uad8c\ud55c \uc624\ub958", 
    "Platform": "\ud50c\ub7ab\ud3fc", 
    "Please check the network.": "\ub124\ud2b8\uc6cc\ud06c\ub97c \ud655\uc778\ud558\uc138\uc694.", 
    "Please choose a CSV file": "CSV \ud30c\uc77c\uc744 \uc120\ud0dd\ud558\uc2ed\uc2dc\uc624", 
    "Please click and choose a directory.": "\ub514\ub809\ud130\ub9ac\ub97c \ub20c\ub7ec \uc120\ud0dd\ud558\uc2ed\uc2dc\uc624.", 
    "Please enter 1 or more character": "\ud558\ub098 \uc774\uc0c1\uc758 \ubb38\uc790\ub97c \uc785\ub825\ud558\uc138\uc694", 
    "Please enter a new password": "\uc0c8 \uc554\ud638\ub97c \uc785\ub825\ud558\uc2ed\uc2dc\uc624", 
    "Please enter days.": "\uc77c\uc790\ub97c \uc785\ub825\ud558\uc138\uc694.", 
    "Please enter password": "\uc554\ud638\ub97c \uc785\ub825\ud558\uc138\uc694", 
    "Please enter the new password again": "\uc0c8 \uc554\ud638\ub97c \ub2e4\uc2dc \uc785\ub825\ud558\uc2ed\uc2dc\uc624", 
    "Please enter the old password": "\uc774\uc804 \uc554\ud638\ub97c \uc785\ub825\ud558\uc2ed\uc2dc\uc624", 
    "Please enter the password again": "\uc554\ud638\ub97c \ub2e4\uc2dc \uc785\ub825\ud558\uc138\uc694", 
    "Please enter valid days": "\uc720\ud6a8 \uae30\uac04\uc744 \uc785\ub825\ud558\uc138\uc694", 
    "Please input at least an email.": "\ucd5c\uc18c\ud55c \ud558\ub098\uc758 \uc804\uc790\uba54\uc77c \uc8fc\uc18c\ub97c \uc785\ub825\ud558\uc138\uc694.", 
    "Previous": "\uc774\uc804", 
    "Previous (Left arrow key)": "\uc774\uc804(\uc67c\ucabd \ud654\uc0b4\ud45c \ud0a4)", 
    "Processing...": "\ucc98\ub9ac \uc911...", 
    "Quit Group": "\uadf8\ub8f9 \ub098\uac00\uae30", 
    "Read-Only": "\uc77d\uae30 \uc804\uc6a9", 
    "Read-Only library": "\uc77d\uae30 \uc804\uc6a9 \ub77c\uc774\ube0c\ub7ec\ub9ac", 
    "Read-Write": "\uc77d\uae30-\uc4f0\uae30", 
    "Read-Write library": "\uc77d\uae30-\uc4f0\uae30 \ub77c\uc774\ube0c\ub7ec\ub9ac", 
    "Really want to dismiss this group?": "\uc815\ub9d0 \uadf8\ub8f9\uc744 \uc0ad\uc81c\ud558\uc2dc\uaca0\uc2b5\ub2c8\uae4c?", 
    "Refresh": "\uc0c8\ub85c \uace0\uce68", 
    "Remove": "\uc81c\uac70", 
    "Rename": "\uc774\ub984 \ubc14\uafb8\uae30", 
    "Rename File": "\ud30c\uc77c \uc774\ub984 \ubc14\uafb8\uae30", 
    "Rename Folder": "\ud3f4\ub354 \uc774\ub984 \ubc14\uafb8\uae30", 
    "Renamed or Moved files": "\uc774\ub984 \ubc14\uafb8\uac70\ub098 \uc62e\uae34 \ud30c\uc77c", 
    "Replace": "\ubc14\uafb8\uae30", 
    "Replace file {filename}?": "{filename} \ud30c\uc77c\uc744 \ubc14\uafc0\uae4c\uc694?", 
    "Replacing it will overwrite its content.": "\uc774\ub97c \ubc14\uafb8\uba74 \ub0b4\uc6a9\uc744 \ub36e\uc5b4\uc501\ub2c8\ub2e4.", 
    "Reset Password": "\uc554\ud638 \uc7ac\uc124\uc815", 
    "ResetPwd": "\uc554\ud638\uc7ac\uc124\uc815", 
    "Restore": "\ubcf5\uc6d0", 
    "Restore Library": "\ub77c\uc774\ube0c\ub7ec\ub9ac \ubcf5\uad6c", 
    "Revoke Admin": "\uad00\ub9ac\uc790 \ud574\uc784", 
    "Role": "\uc5ed\ud560", 
    "Saving...": "\uc800\uc7a5 \uc911...", 
    "Seafile": "Seafile", 
    "Seafile Wiki enables you to organize your knowledge in a simple way. The contents of wiki is stored in a normal library with pre-defined file/folder structure. This enables you to edit your wiki in your desktop and then sync back to the server.": "Seafile \uc704\ud0a4\ub294 \uc5ec\ub7ec\ubd84\uc758 \uc9c0\uc2dd\uc744 \uac04\ub2e8\ud55c \ubc29\uc2dd\uc73c\ub85c \uc870\uc9c1\ud654\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \uc704\ud0a4\uc758 \ub0b4\uc6a9\uc740 \uc120\uc815\uc758 \ud30c\uc77c/\ud3f4\ub354 \uad6c\uc870\uc758 \uc77c\ubc18 \ub77c\uc774\ubc84\ub9ac\uc5d0 \uc800\uc7a5\ud569\ub2c8\ub2e4. \uc774\ub97c \ud1b5\ud574 \ub370\uc2a4\ud06c\ud1b1\uc758 \uc704\ud0a4\ub97c \ud3b8\uc9d1\ud558\uace0 \uc11c\ubc84\ub85c \ub2e4\uc2dc \ub3d9\uae30\ud654\ud560 \uc218 \uc788\uac8c \ud569\ub2c8\ub2e4.", 
    "Search Files": "\ud30c\uc77c \uac80\uc0c9", 
    "Search files in this library": "\uc774 \ub77c\uc774\ube0c\ub7ec\ub9ac\uc5d0\uc11c \ud30c\uc77c \uac80\uc0c9", 
    "Search groups": "\uadf8\ub8f9 \uac80\uc0c9", 
    "Search user or enter email and press Enter": "\uc0ac\uc6a9\uc790\ub97c \uac80\uc0c9\ud558\uac70\ub098 \uc804\uc790\uba54\uc77c \uc8fc\uc18c\ub97c \uc785\ub825\ud55c \ud6c4 \uc5d4\ud130 \ud0a4\ub97c \ub204\ub974\uc2ed\uc2dc\uc624", 
    "Search users or enter emails and press Enter": "\uc0ac\uc6a9\uc790\ub97c \uac80\uc0c9\ud558\uac70\ub098 \uc804\uc790\uba54\uc77c \uc8fc\uc18c\ub97c \uc785\ub825\ud55c \ud6c4 \uc5d4\ud130 \ud0a4\ub97c \ub204\ub974\uc2ed\uc2dc\uc624", 
    "Searching...": "\uac80\uc0c9 \uc911...", 
    "See All Notifications": "\ubaa8\ub4e0 \uc54c\ub9bc \ubcf4\uae30", 
    "Select a group": "\uadf8\ub8f9 \uc120\ud0dd", 
    "Select groups": "\uadf8\ub8f9 \uc120\ud0dd", 
    "Select libraries to share": "\uacf5\uc720\ud560 \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \uc120\ud0dd\ud558\uc138\uc694", 
    "Server Version: ": "\uc11c\ubc84 \ubc84\uc804: ", 
    "Set Quota": "\uc81c\ud55c \uc6a9\ub7c9 \uc124\uc815", 
    "Set {placeholder}'s permission": "{placeholder} \uad8c\ud55c \uc124\uc815", 
    "Settings": "\uc124\uc815", 
    "Share": "\uacf5\uc720", 
    "Share Admin": "\uacf5\uc720 \uad00\ub9ac", 
    "Share From": "\ub2e4\uc74c\uc774 \uacf5\uc720\ud568", 
    "Share Links": "\ub9c1\ud06c \uacf5\uc720", 
    "Share To": "\ub2e4\uc74c\uacfc \uacf5\uc720", 
    "Share existing libraries": "\uae30\uc874 \ub77c\uc774\ube0c\ub7ec\ub9ac \uacf5\uc720", 
    "Share to group": "\uadf8\ub8f9\uacfc \uacf5\uc720", 
    "Share to user": "\uc0ac\uc6a9\uc790\uc640 \uacf5\uc720", 
    "Share {placeholder}": "{placeholder} \uacf5\uc720", 
    "Shared with all": "\ubaa8\ub450\uc5d0\uac8c \uacf5\uc720\ud568", 
    "Shared with groups": "\uadf8\ub8f9\uc5d0 \uacf5\uc720\ud568", 
    "Shared with me": "\ub098\uc5d0\uac8c \uacf5\uc720\ud568", 
    "Show": "\ud45c\uc2dc", 
    "Side Nav Menu": "\uce21\uba74 \ud0d0\uc0c9 \uba54\ub274", 
    "Size": "\ud06c\uae30", 
    "Sort:": "\uc815\ub82c:", 
    "Space Used": "\uc0ac\uc6a9 \uacf5\uac04", 
    "Start": "\uc2dc\uc791", 
    "Status": "\uc0c1\ud0dc", 
    "Submit": "\ubcf4\ub0b4\uae30", 
    "Success": "\uc131\uacf5", 
    "Successfully changed library password.": "\ub77c\uc774\ube0c\ub7ec\ub9ac \uc554\ud638\ub97c \uc131\uacf5\uc801\uc73c\ub85c \ubc14\uafb8\uc5c8\uc2b5\ub2c8\ub2e4.", 
    "Successfully clean all errors.": "\ubaa8\ub4e0 \uc624\ub958 \uba54\uc2dc\uc9c0 \uc0ad\uc81c\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully copied %(name)s": "%(name)s \ubcf5\uc0ac\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s \ubc0f \ud56d\ubaa9 %(amount)s\uac1c\ub97c \uc131\uacf5\uc801\uc73c\ub85c \ubcf5\uc0ac\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully copied %(name)s and 1 other item.": "%(name)s \ubc0f \ud56d\ubaa9 1\uac1c\ub97c \uc131\uacf5\uc801\uc73c\ub85c \ubcf5\uc0ac\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully copied %(name)s.": "%(name)s\uc744(\ub97c) \uc131\uacf5\uc801\uc73c\ub85c \ubcf5\uc0ac\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully deleted %(name)s": "%(name)s\uc744(\ub97c) \uc131\uacf5\uc801\uc73c\ub85c \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4", 
    "Successfully deleted %(name)s and %(amount)s other items.": "%(name)s \ubc0f \ud56d\ubaa9 %(amount)s\uac1c\ub97c \uc131\uacf5\uc801\uc73c\ub85c \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully deleted %(name)s and 1 other item.": "%(name)s \ubc0f \ud56d\ubaa9 1\uac1c\ub97c \uc131\uacf5\uc801\uc73c\ub85c \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully deleted %(name)s.": "%(name)s\uc744(\ub97c) \uc131\uacf5\uc801\uc73c\ub85c \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully deleted %s": "%s \uc0ad\uc81c\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4", 
    "Successfully deleted 1 item": "\ud56d\ubaa9 1\uac1c \uc0ad\uc81c\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4", 
    "Successfully deleted 1 item.": "\ud56d\ubaa9 1\uac1c \uc0ad\uc81c\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully deleted member {placeholder}": "{placeholder} \uad6c\uc131\uc6d0\uc744 \uc131\uacf5\uc801\uc73c\ub85c \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4", 
    "Successfully deleted.": "\uc0ad\uc81c\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully imported.": "\uac00\uc838\uc624\uae30\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully modified permission": "\uad8c\ud55c \uc124\uc815\uc744 \uc131\uacf5\uc801\uc73c\ub85c \ubc14\uafe8\uc2b5\ub2c8\ub2e4", 
    "Successfully moved %(name)s": "%(name)s \uc774\ub3d9\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s \ubc0f \ud56d\ubaa9 %(amount)s\uac1c\ub97c \uc131\uacf5\uc801\uc73c\ub85c \uc774\ub3d9\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully moved %(name)s and 1 other item.": "%(name)s \ubc0f \ud56d\ubaa9 1\uac1c\ub97c \uc131\uacf5\uc801\uc73c\ub85c \uc774\ub3d9\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully moved %(name)s.": "%(name)s\uc744(\ub97c) \uc131\uacf5\uc801\uc73c\ub85c \uc774\ub3d9\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully reset password to %(passwd)s for user %(user)s.": "%(user)s\ub2d8\uc758 \uc554\ud638\ub97c %(passwd)s(\uc73c)\ub85c \ubc14\uafb8\uae30\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully restored library {placeholder}": "{placeholder} \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \uc131\uacf5\uc801\uc73c\ub85c \ubcf5\uc6d0\ud588\uc2b5\ub2c8\ub2e4", 
    "Successfully revoke the admin permission of %s": "%s \uc0ac\uc6a9\uc790\uc758 \uad00\ub9ac\uc790 \uad8c\ud55c \ucde8\uc18c\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4", 
    "Successfully sent to {placeholder}": "{placeholder}\uc5d0\uac8c \uc131\uacf5\uc801\uc73c\ub85c \ubcf4\ub0c8\uc2b5\ub2c8\ub2e4", 
    "Successfully set %s as admin.": "%s \uc0ac\uc6a9\uc790\uc758 \uad00\ub9ac\uc790 \uc124\uc815\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully set library history.": "\ub77c\uc774\ube0c\ub7ec\ub9ac \uae30\ub85d \uc124\uc815\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully transferred the group.": "\uadf8\ub8f9 \uc774\uc804\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully transferred the group. You are now a normal member of the group.": "\uadf8\ub8f9\uc744 \uc628\uc804\ud788 \uc774\uc804\ud588\uc2b5\ub2c8\ub2e4. \uc774\uc81c \uadf8\ub8f9\uc758 \uc77c\ubc18 \uad6c\uc131\uc6d0\uc785\ub2c8\ub2e4.", 
    "Successfully transferred the library.": "\ub77c\uc774\ube0c\ub7ec\ub9ac \uc804\uc1a1\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully unlink %(name)s.": "%(name)s \ub9c1\ud06c \ub04a\uae30\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully unshared 1 item.": "\ud56d\ubaa9 1\uac1c \uacf5\uc720 \ud574\uc81c\uc5d0 \uc131\uacf5\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully unshared library {placeholder}": "{placeholder} \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \uc131\uacf5\uc801\uc73c\ub85c \uacf5\uc720 \ud574\uc81c\ud588\uc2b5\ub2c8\ub2e4", 
    "Successfully unstared {placeholder}": "{placeholder}\uc744(\ub97c) \uc131\uacf5\uc801\uc73c\ub85c \ubcc4\ud45c \ud574\uc81c\ud588\uc2b5\ub2c8\ub2e4.", 
    "System Admin": "\uc2dc\uc2a4\ud15c \uad00\ub9ac\uc790", 
    "Terms and Conditions": "\uc774\uc6a9 \uc57d\uad00", 
    "The password will be kept in the server for only 1 hour.": "\uc554\ud638\ub294 \ud55c \uc2dc\uac04\ub3d9\uc548\ub9cc \uc11c\ubc84\uc5d0\uc11c \uc720\uc9c0\ud569\ub2c8\ub2e4.", 
    "This library is password protected": "\uc774 \ub77c\uc774\ube0c\ub7ec\ub9ac\ub294 \uc554\ud638\ub85c \ubcf4\ud638\ud588\uc2b5\ub2c8\ub2e4", 
    "Time": "\uc2dc\uac04", 
    "Tip: libraries deleted 30 days ago will be cleaned automatically.": "\uc694\ub839: 30\uc77c \uc774\uc804\uc5d0 \uc0ad\uc81c\ud55c \ub77c\uc774\ube0c\ub7ec\ub9ac\ub294 \uc790\ub3d9\uc73c\ub85c \uc9c0\uc6c1\ub2c8\ub2e4.", 
    "Tools": "\ub3c4\uad6c", 
    "Total Users": "\uc804\uccb4 \uc0ac\uc6a9\uc790", 
    "Transfer": "\ubcf4\ub0b4\uae30", 
    "Transfer Group": "\uadf8\ub8f9 \ubcf4\ub0b4\uae30", 
    "Transfer Group {group_name} To": "{group_name} \uadf8\ub8f9 \uc774\uc804 \ub300\uc0c1", 
    "Transfer Library": "\ub77c\uc774\ube0c\ub7ec\ub9ac \uc774\uc804", 
    "Transfer Library {library_name} To": "\ub2e4\uc74c \uc704\uce58\ub85c {library_name} \ub77c\uc774\ube0c\ub7ec\ub9ac \uc804\uc1a1", 
    "Transferred group {group_name} from {user_from} to {user_to}": "{user_from} \uc0ac\uc6a9\uc790\uac00 {user_to} \uc0ac\uc6a9\uc790\uc5d0\uac8c \uadf8\ub8f9\uc744 \uc804\ub2ec\ud588\uc2b5\ub2c8\ub2e4", 
    "Transferred library {library_name} from {user_from} to {user_to}": "{user_from} \uc0ac\uc6a9\uc790\uac00 {user_to} \uc0ac\uc6a9\uc790\uc5d0\uac8c {library_name} \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \uc804\ub2ec\ud588\uc2b5\ub2c8\ub2e4", 
    "Trash": "\ud734\uc9c0\ud1b5", 
    "Type": "\ud615\uc2dd", 
    "Unlink": "\ub9c1\ud06c \ub04a\uae30", 
    "Unlink device": "\uc7a5\uce58 \uc5f0\uacb0 \ub04a\uae30", 
    "Unlock": "\uc7a0\uae08 \ud574\uc81c", 
    "Unshare": "\uacf5\uc720 \ud574\uc81c", 
    "Unshare Library": "\ub77c\uc774\ube0c\ub7ec\ub9ac \uacf5\uc720 \ucde8\uc18c", 
    "Unstar": "\ubcc4\ud45c \uc9c0\uc6b0\uae30", 
    "Update": "\uc5c5\ub370\uc774\ud2b8", 
    "Upload": "\uc5c5\ub85c\ub4dc", 
    "Upload Files": "\ud30c\uc77c \uc5c5\ub85c\ub4dc", 
    "Upload Folder": "\ud3f4\ub354 \uc5c5\ub85c\ub4dc", 
    "Upload Link": "\uc5c5\ub85c\ub4dc \ub9c1\ud06c", 
    "Upload Links": "\uc5c5\ub85c\ub4dc \ub9c1\ud06c", 
    "Uploaded bytes exceed file size": "\uc5c5\ub85c\ub4dc\ud55c \ud30c\uc77c \ud06c\uae30 \uc81c\ud55c\uc744 \ub118\uc5b4\uc130\uc2b5\ub2c8\ub2e4", 
    "Used:": "\uc0ac\uc6a9\ud568:", 
    "User": "\uc0ac\uc6a9\uc790", 
    "Users": "\uc0ac\uc6a9\uc790", 
    "View": "\ubcf4\uae30", 
    "Virus Scan": "\ubc14\uc774\ub7ec\uc2a4 \uac80\uc0ac", 
    "Visits": "\ubc29\ubb38", 
    "Wrong password": "\uc798\ubabb\ub41c \uc554\ud638\uc785\ub2c8\ub2e4", 
    "You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.": "\ud30c\uc77c\uc744 \ubaa8\uc744 \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \ub9cc\ub4e4 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \uac01\uac01\uc758 \ud504\ub85c\uc81d\ud2b8\uc5d0 \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \ub9cc\ub4e4 \uc218 \uc788\uc73c\uba70 \uac01\uac01\uc758 \ub77c\uc774\ube0c\ub7ec\ub9ac\ub294 \uac1c\ubcc4\uc801\uc73c\ub85c \ub3d9\uae30\ud654 \ud558\uace0 \uacf5\uc720\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.", 
    "You can only select 1 item": "\ud56d\ubaa9 1\uac1c\ub9cc \uc120\ud0dd\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4", 
    "You can share a single folder with a registered user if you don't want to share a whole library.": "\uc804\uccb4 \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \uacf5\uc720\ud558\uc9c0 \uc54a\ub294\ub2e4\uba74 \ub4f1\ub85d \uc0ac\uc6a9\uc790\uc5d0\uac8c \ub2e8\uc77c \ud3f4\ub354\ub9cc\uc744 \uacf5\uc720\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.", 
    "You can share libraries by clicking the \"New Library\" button above or the \"Share\" icon on your libraries list.": "\uc0c1\ub2e8\uc758 \"\uc0c8 \ub77c\uc774\ube0c\ub7ec\ub9ac\" \ubc84\ud2bc\uc744 \ub204\ub974\uac70\ub098 \ub77c\uc774\ube0c\ub7ec\ub9ac \ubaa9\ub85d\uc5d0\uc11c \"\uacf5\uc720\" \uc544\uc774\ucf58\"\uc744 \ub204\ub974\uba74 \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \uacf5\uc720\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.", 
    "You can share the generated link to others and then they can upload files to this directory via the link.": "\ub9cc\ub4e0 \ub9c1\ud06c\ub97c \ub2e4\ub978 \uc0ac\uc6a9\uc790\uc5d0\uac8c \uacf5\uc720\ud560 \uc218 \uc788\uc73c\uba70 \ub2e4\ub978 \uc0ac\uc6a9\uc790\ub4e4\uc740 \ub9c1\ud06c\ub97c \ud1b5\ud574 \uc774 \ub514\ub809\ud130\ub9ac\ub85c \ud30c\uc77c\uc744 \uc5c5\ub85c\ub4dc\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.", 
    "You cannot select any more choices": "\ub354 \uc774\uc0c1 \uc120\ud0dd\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4", 
    "You have logged out.": "\ub85c\uadf8\uc544\uc6c3 \ud588\uc2b5\ub2c8\ub2e4.", 
    "You have not created any libraries": "\ub9cc\ub4e0 \ub77c\uc774\ube0c\ub7ec\ub9ac\uac00 \uc5c6\uc2b5\ub2c8\ub2e4", 
    "all members": "\ubaa8\ub4e0 \uad6c\uc131\uc6d0", 
    "canceled": "\ucde8\uc18c\ud568", 
    "days": "\uc77c", 
    "icon": "\uc544\uc774\ucf58", 
    "last update": "\ucd5c\uadfc \uc5c5\ub370\uc774\ud2b8\uc77c", 
    "locked": "\uc7a0\uae08", 
    "locked by {placeholder}": "{placeholder}\uc774(\uac00) \uc7a0\uae08", 
    "name": "\uc774\ub984", 
    "starred": "\ubcc4\ud45c \ud45c\uc2dc\ud568", 
    "unstarred": "\ubcc4\ud45c \uc9c0\uc6c0", 
    "uploaded": "\uc5c5\ub85c\ub4dc\ud568", 
    "you can also press \u2190 ": "\u2190\ub97c \ub204\ub97c \uc218 \uc788\uc2b5\ub2c8\ub2e4", 
    "{placeholder} Folder Permission": "{placeholder} \ud3f4\ub354 \uc0ac\uc6a9 \uad8c\ud55c", 
    "{placeholder} History Setting": "{placeholder} \uae30\ub85d \uc124\uc815", 
    "{placeholder} Members": "{placeholder} \uad6c\uc131\uc6d0", 
    "{placeholder} Share Links": "{placeholder} \uacf5\uc720 \ub9c1\ud06c"
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
    "DATETIME_FORMAT": "Y\ub144 n\uc6d4 j\uc77c g:i A", 
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
      "%m/%d/%y", 
      "%Y\ub144 %m\uc6d4 %d\uc77c %H\uc2dc %M\ubd84 %S\ucd08", 
      "%Y\ub144 %m\uc6d4 %d\uc77c %H\uc2dc %M\ubd84"
    ], 
    "DATE_FORMAT": "Y\ub144 n\uc6d4 j\uc77c", 
    "DATE_INPUT_FORMATS": [
      "%Y-%m-%d", 
      "%m/%d/%Y", 
      "%m/%d/%y", 
      "%Y\ub144 %m\uc6d4 %d\uc77c"
    ], 
    "DECIMAL_SEPARATOR": ".", 
    "FIRST_DAY_OF_WEEK": "0", 
    "MONTH_DAY_FORMAT": "n\uc6d4 j\uc77c", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "Y-n-j H:i", 
    "SHORT_DATE_FORMAT": "Y-n-j.", 
    "THOUSAND_SEPARATOR": ",", 
    "TIME_FORMAT": "A g:i", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H:%M:%S.%f", 
      "%H:%M", 
      "%H\uc2dc %M\ubd84 %S\ucd08", 
      "%H\uc2dc %M\ubd84"
    ], 
    "YEAR_MONTH_FORMAT": "Y\ub144 n\uc6d4"
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

