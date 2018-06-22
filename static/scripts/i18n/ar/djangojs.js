

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=n==0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 && n%100<=99 ? 4 : 5;
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "%curr% of %total%": "%curr% \u0645\u0646 %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">\u0627\u0644\u0635\u0648\u0631\u0629</a> \u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u062d\u0645\u064a\u0644\u0647\u0627.", 
    "Are you sure you want to clear trash?": "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062a\u0646\u0638\u064a\u0641 \u0627\u0644\u0633\u0644\u0629\u061f", 
    "Are you sure you want to delete %s ?": "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 %s ?", 
    "Are you sure you want to delete %s completely?": "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 %s \u0646\u0647\u0627\u0626\u064a\u0627?", 
    "Are you sure you want to delete all %s's libraries?": "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u062c\u0645\u064a\u0639 \u0645\u0643\u062a\u0628\u0627\u062a %s?", 
    "Are you sure you want to delete these selected items?": "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u0647\u0630\u0647 \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0645\u062d\u062f\u062f\u0629\u061f", 
    "Are you sure you want to quit this group?": "\u0647\u0644 \u062a\u0631\u064a\u062f \u062d\u0642\u0627 \u0627\u0644\u062e\u0631\u0648\u062c \u0645\u0646 \u0647\u0630\u0647 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629\u061f", 
    "Are you sure you want to restore %s?": "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u0633\u062a\u0639\u0627\u062f\u0629 %s?", 
    "Are you sure you want to unlink this device?": "\u0647\u0644 \u0627\u0646\u062a \u0645\u062a\u0627\u0643\u062f \u0645\u0646 \u0641\u0635\u0644 \u0647\u0630\u0627 \u0627\u0644\u062c\u0647\u0627\u0632\u061f", 
    "Are you sure you want to unshare %s ?": "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0625\u0644\u063a\u0627\u0621 \u0645\u0634\u0627\u0631\u0643\u0629 %s ?", 
    "Cancel": "\u0625\u0644\u063a\u0627\u0621", 
    "Canceled.": "\u0645\u0644\u063a\u064a.", 
    "Change Password of Library {placeholder}": "\u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0645\u0643\u062a\u0628\u0629 {placeholder}", 
    "Clear Trash": "\u062a\u0646\u0638\u064a\u0641 \u0627\u0644\u0633\u0644\u0629", 
    "Close (Esc)": "\u0627\u063a\u0644\u0627\u0642(Esc)", 
    "Copy selected item(s) to:": "\u0646\u0633\u062e \u0627\u0644\u0639\u0646\u0635\u0631(\u0627\u0644\u0639\u0646\u0627\u0635\u0631) \u0627\u0644\u0645\u062d\u062f\u062f(\u0629) \u0625\u0644\u0649:", 
    "Copy {placeholder} to:": "\u0646\u0633\u062e {placeholder} \u0625\u0644\u0649:", 
    "Copying %(name)s": "\u062c\u0627\u0631\u064a \u0646\u0633\u062e %(name)s", 
    "Copying file %(index)s of %(total)s": "\u0646\u0633\u062e \u0645\u0644\u0641 %(index)s \u0645\u0646 %(total)s", 
    "Delete": "\u062d\u0630\u0641", 
    "Delete Group": "\u062d\u0630\u0641 \u0645\u062c\u0645\u0648\u0639\u0629", 
    "Delete Items": "\u062d\u0630\u0641 \u0639\u0646\u0627\u0635\u0631", 
    "Delete Library": "\u062d\u0630\u0641 \u0645\u0643\u062a\u0628\u0629", 
    "Delete Library By Owner": "\u062d\u0630\u0641 \u0645\u0643\u062a\u0628\u0629 \u0628\u0627\u0644\u0645\u0627\u0644\u0643", 
    "Delete Member": "\u062d\u0630\u0641 \u0639\u0636\u0648", 
    "Delete failed": "\u0641\u0634\u0644 \u0627\u0644\u062d\u0630\u0641", 
    "Delete files from this device the next time it comes online.": "\u062d\u0630\u0641 \u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u062c\u0647\u0627\u0632 \u0639\u0646\u062f \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0641\u064a \u0627\u0644\u0645\u0631\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629.", 
    "Deleted directories": "\u0645\u062c\u0644\u062f\u0627\u062a \u0645\u062d\u0630\u0648\u0641\u0629", 
    "Deleted files": "\u0645\u0644\u0641\u0627\u062a \u0645\u062d\u0630\u0648\u0641\u0629", 
    "Dismiss Group": "\u0646\u0628\u0630 \u0645\u062c\u0645\u0648\u0639\u0629", 
    "Edit failed": "\u0641\u0634\u0644 \u0627\u0644\u062a\u062d\u0631\u064a\u0631", 
    "Empty file upload result": "\u0646\u062a\u064a\u062c\u0629 \u062a\u062d\u0645\u064a\u0644 \u0645\u0644\u0641 \u0641\u0627\u0631\u063a", 
    "Encrypted library": "\u0645\u0643\u062a\u0628\u0629 \u0645\u0634\u0641\u0631\u0629", 
    "Error": "\u062e\u0637\u0623", 
    "Expired": "\u0645\u0646\u062a\u0647\u064a", 
    "Failed to copy %(name)s": "\u0641\u0634\u0644 \u0646\u0633\u062e %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "\u0641\u0634\u0644 \u062d\u0630\u0641 %(name)s \u0648 %(amount)s \u0639\u0646\u0627\u0635\u0631 \u0623\u062e\u0631\u0649.", 
    "Failed to delete %(name)s and 1 other item.": "\u0641\u0634\u0644 \u062d\u0630\u0641 %(name)s \u0648 \u0639\u0646\u0635\u0631 \u0622\u062e\u0631.", 
    "Failed to delete %(name)s.": "\u0641\u0634\u0644 \u062d\u0630\u0641 %(name)s.", 
    "Failed to move %(name)s": "\u0641\u0634\u0644 \u0646\u0642\u0644 %(name)s", 
    "Failed to send to {placeholder}": "\u0641\u0634\u0644 \u0641\u064a \u0627\u0644\u0627\u0631\u0633\u0627\u0644 \u0625\u0644\u0649 {placeholder}", 
    "Failed.": "\u0641\u0634\u0644.", 
    "Failed. Please check the network.": "\u0641\u0634\u0644. \u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0634\u0628\u0643\u0629.", 
    "File Upload canceled": "\u062a\u0645 \u0625\u0644\u063a\u0627\u0624 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0644\u0641", 
    "File Upload complete": "\u0627\u0643\u062a\u0645\u0644 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0644\u0641", 
    "File Upload failed": "\u0641\u0634\u0644 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0644\u0641", 
    "File Uploading...": "\u062c\u0627\u0631\u064a \u062a\u062c\u0645\u064a\u0644 \u0627\u0644\u0645\u0644\u0641...", 
    "File is locked": "\u0627\u0644\u0645\u0644\u0641 \u0645\u0642\u0641\u0644", 
    "File is too big": "\u0627\u0644\u0645\u0644\u0641 \u0643\u0628\u064a\u0631 \u062c\u062f\u0627", 
    "File is too small": "\u0627\u0644\u0645\u0644\u0641 \u0635\u063a\u064a\u0631 \u062c\u062f\u0627", 
    "Filetype not allowed": "\u0646\u0648\u0639 \u0627\u0644\u0645\u0644\u0641 \u063a\u064a\u0631 \u0645\u0633\u0645\u0648\u062d", 
    "Hide": "\u0625\u062e\u0641\u0627\u0621", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "\u062e\u0637\u0623 \u062f\u0627\u062e\u0644\u064a. \u0641\u0634\u0644 \u0646\u0633\u062e %(name)s \u0648 %(amount)s \u0639\u0646\u0627\u0635\u0631 \u0623\u062e\u0631\u0649.", 
    "Internal error. Failed to copy %(name)s.": "\u062e\u0637\u0623 \u062f\u0627\u062e\u0644\u064a. \u0641\u0634\u0644 \u0646\u0633\u062e %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "\u062e\u0637\u0623 \u062f\u0627\u062e\u0644\u064a. \u0641\u0634\u0644 \u0646\u0642\u0644 %(name)s \u0648 %(amount)s \u0639\u0646\u0627\u0635\u0631 \u0623\u062e\u0631\u0649.", 
    "Internal error. Failed to move %(name)s.": "\u062e\u0637\u0623 \u062f\u0627\u062e\u0644\u064a. \u0641\u0634\u0644 \u0646\u0642\u0644 %(name)s.", 
    "Invalid destination path": "\u0645\u0633\u0627\u0631 \u0648\u062c\u0647\u0629 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d", 
    "It is required.": "\u0645\u0637\u0644\u0648\u0628.", 
    "Just now": "\u0627\u0644\u0627\u0646", 
    "Loading failed": "\u0641\u0634\u0644 \u0627\u0644\u062a\u062d\u0645\u064a\u0644", 
    "Loading...": "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...", 
    "Modified files": "\u0645\u0644\u0641\u0627\u062a \u0645\u0639\u062f\u0644\u0629", 
    "Move selected item(s) to:": "\u0646\u0642\u0644 \u0627\u0644\u0639\u0646\u0635\u0631(\u0627\u0644\u0639\u0646\u0627\u0635\u0631) \u0627\u0644\u0645\u062d\u062f\u062f(\u0629) \u0625\u0644\u0649:", 
    "Move {placeholder} to:": "\u0646\u0642\u0644 {placeholder} \u0625\u0644\u0649:", 
    "Moving %(name)s": "\u062c\u0627\u0631\u064a \u0646\u0642\u0644 %(name)s", 
    "Moving file %(index)s of %(total)s": "\u0646\u0642\u0644 \u0645\u0644\u0641 %(index)s \u0645\u0646 %(total)s", 
    "Name is required": "\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628", 
    "Name is required.": "\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628.", 
    "New directories": "\u0645\u062c\u0644\u062f\u0627\u062a \u062c\u062f\u064a\u062f\u0629", 
    "New files": "\u0645\u0644\u0641\u0627\u062a \u062c\u062f\u064a\u062f\u0629", 
    "New password is too short": "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0642\u0635\u064a\u0631\u0629 \u062c\u062f\u0627", 
    "New passwords don't match": "\u0643\u0644\u0645\u062a\u064a \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u063a\u064a\u0631 \u0645\u062a\u0637\u0627\u0628\u0642\u0629", 
    "Next (Right arrow key)": "\u0627\u0644\u062a\u0627\u0644\u064a (\u0627\u0644\u064a\u0645\u064a\u0646)", 
    "No matches": "\u0644\u0627 \u062a\u0637\u0627\u0628\u0642", 
    "Only an extension there, please input a name.": "\u0647\u0646\u0627\u0644\u0643 \u0627\u0645\u062a\u062f\u0627\u062f \u0641\u0642\u0637\u060c \u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u062f\u062e\u0627\u0644 \u0627\u0644\u0627\u0633\u0645.", 
    "Open in New Tab": "\u0641\u062a\u062d \u0641\u064a \u0635\u0641\u062d\u0629 \u062c\u062f\u064a\u062f\u0629", 
    "Packaging...": "\u062c\u0627\u0631\u064a \u062a\u062c\u0647\u064a\u0632 \u0627\u0644\u062d\u0632\u0645...", 
    "Password is required.": "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0629.", 
    "Password is too short": "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0642\u0635\u064a\u0631\u0629 \u062c\u062f\u0627", 
    "Passwords don't match": "\u0643\u0644\u0645\u0627\u062a \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0645\u062a\u0637\u0627\u0628\u0642\u0629", 
    "Permission error": "\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0625\u0630\u0646", 
    "Please check the network.": "\u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0634\u0628\u0643\u0629", 
    "Please choose a CSV file": "\u0627\u0644\u0631\u062c\u0627\u0621 \u062a\u062d\u062f\u064a\u062f \u0645\u0644\u0641 CSV", 
    "Please click and choose a directory.": "\u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 \u0648 \u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u062c\u0644\u062f", 
    "Please enter 1 or more character": "\u0627\u0644\u0631\u062c\u0627\u0621 \u0625\u062f\u062e\u0627\u0644 \u062d\u0631\u0641 \u0648\u0627\u062d\u062f \u0623\u0648 \u0623\u0643\u062b\u0631", 
    "Please enter a new password": "\u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062c\u062f\u064a\u062f\u0629", 
    "Please enter days.": "\u0623\u062f\u062e\u0644 \u0627\u0644\u0623\u064a\u0627\u0645 \u0631\u062c\u0627\u0621.", 
    "Please enter password": "\u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u062f\u062e\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631", 
    "Please enter the new password again": "\u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u0639\u0627\u062f\u0629 \u0627\u062f\u062e\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629", 
    "Please enter the old password": "\u0631\u062c\u0627\u0621 \u0627\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u0642\u062f\u064a\u0645\u0629", 
    "Please enter the password again": "\u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u0639\u0627\u062f\u0629 \u0627\u062f\u062e\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631", 
    "Please enter valid days": "\u0627\u0644\u0631\u062c\u0627\u0621 \u0625\u062f\u062e\u0627\u0644 \u0623\u064a\u0627\u0645 \u0635\u062d\u064a\u062d\u0629", 
    "Please input at least an email.": "\u0627\u0644\u0631\u062c\u0627\u0621 \u0625\u062f\u062e\u0627\u0644 \u0628\u0631\u064a\u062f \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644.", 
    "Previous (Left arrow key)": "\u0627\u0644\u0633\u0627\u0628\u0642(\u0627\u0644\u064a\u0633\u0627\u0631)", 
    "Processing...": "\u062c\u0627\u0631\u064a \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629...", 
    "Quit Group": "\u062e\u0631\u0648\u062c \u0645\u0646 \u0645\u062c\u0645\u0648\u0639\u0629", 
    "Read-Only": "\u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0641\u0642\u0637", 
    "Read-Only library": "\u0645\u0643\u062a\u0628\u0629 \u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0641\u0642\u0637", 
    "Read-Write": "\u0642\u0631\u0627\u0621\u0629 - \u0643\u062a\u0627\u0628\u0629", 
    "Read-Write library": "\u0645\u0643\u062a\u0628\u0629 \u0642\u0631\u0627\u0621\u0629-\u0643\u062a\u0627\u0628\u0629", 
    "Really want to dismiss this group?": "\u0647\u0644 \u062a\u0631\u064a\u062f \u062d\u0642\u0627 \u0646\u0628\u0630 \u0647\u0630\u0647 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629\u061f", 
    "Rename File": "\u0627\u0639\u0627\u062f\u0629 \u062a\u0633\u0645\u064a\u0629 \u0645\u0644\u0641", 
    "Rename Folder": "\u0627\u0639\u0627\u062f\u0629 \u062a\u0633\u0645\u064a\u0629 \u0645\u062c\u0644\u062f", 
    "Renamed or Moved files": "\u0645\u0644\u0641\u0627\u062a \u0645\u0646\u0642\u0648\u0644\u0629 \u0627\u0648 \u0645\u0639\u0627\u062f \u062a\u0633\u0645\u064a\u062a\u0647\u0627", 
    "Replace file {filename}?": "\u0627\u0633\u062a\u0628\u062f\u0627\u0644 \u0627\u0644\u0645\u0644\u0641 {filename}?", 
    "Restore Library": "\u0627\u0633\u062a\u0639\u0627\u062f\u0629 \u0645\u0643\u062a\u0628\u0629", 
    "Saving...": "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638....", 
    "Search groups": "\u0628\u062d\u062b \u0639\u0646 \u0645\u062c\u0645\u0648\u0639\u0627\u062a", 
    "Search user or enter email and press Enter": "\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0633\u062a\u062e\u062f\u0645 \u0627\u0648 \u0627\u062f\u062e\u0644 \u0627\u0644\u0628\u0631\u064a\u062f \u0648 \u0627\u0636\u063a\u0637 \u0645\u0641\u062a\u0627\u062d \u0627\u0644\u0627\u062f\u062e\u0627\u0644", 
    "Search users or enter emails and press Enter": "\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0633\u062a\u062e\u062f\u0645 \u0627\u0648 \u0627\u062f\u062e\u0644 \u0639\u0646\u0627\u0648\u064a\u0646 \u0627\u0644\u0628\u0631\u064a\u062f \u0648 \u0627\u0636\u063a\u0637 \u0645\u0641\u062a\u0627\u062d \u0627\u0644\u0627\u062f\u062e\u0627\u0644", 
    "Searching...": "\u062c\u0627\u0631\u064a \u0627\u0644\u0628\u062d\u062b...", 
    "Select a group": "\u0627\u062e\u062a\u0631 \u0645\u062c\u0645\u0648\u0639\u0629", 
    "Select groups": "\u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u062c\u0645\u0648\u0639\u0627\u062a", 
    "Set {placeholder}'s permission": "\u0625\u0639\u062f\u0627\u062f \u0623\u0630\u0648\u0646\u0627\u062a {placeholder}", 
    "Share {placeholder}": "\u0645\u0634\u0627\u0631\u0643\u0629 {placeholder}", 
    "Show": "\u0625\u0638\u0647\u0627\u0631", 
    "Start": "\u0627\u0628\u062f\u0623", 
    "Success": "\u0646\u062c\u0627\u062d", 
    "Successfully changed library password.": "\u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0627\u0644\u0645\u0643\u062a\u0628\u0629 \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully clean all errors.": "\u062a\u0645 \u062a\u0635\u0641\u064a\u0629 \u0643\u0644 \u0627\u0644\u0623\u062e\u0637\u0627\u0621 \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully copied %(name)s": "\u062a\u0645 \u0646\u0633\u062e %(name)s \u0628\u0646\u062c\u0627\u062d", 
    "Successfully copied %(name)s and %(amount)s other items.": "\u062a\u0645 \u0646\u0633\u062e %(name)s \u0648 %(amount)s \u0639\u0646\u0627\u0635\u0631 \u0623\u062e\u0631\u0649 \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully copied %(name)s and 1 other item.": "\u062a\u0645 \u0646\u0633\u062e %(name)s \u0648 \u0639\u0646\u0635\u0631 \u0622\u062e\u0631 \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully copied %(name)s.": "\u062a\u0645 \u0646\u0633\u062e %(name)s \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully deleted %(name)s": "\u062a\u0645 \u062d\u0630\u0641 %(name)s \u0628\u0646\u062c\u0627\u062d", 
    "Successfully deleted %(name)s and %(amount)s other items.": "\u062a\u0645 \u062d\u0630\u0641 %(name)s \u0648 %(amount)s \u0639\u0646\u0627\u0635\u0631 \u0627\u062e\u0631\u0649 \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully deleted %(name)s and 1 other item.": "\u062a\u0645 \u062d\u0630\u0641 %(name)s \u0648 \u0639\u0646\u0635\u0631 \u0622\u062e\u0631 \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully deleted %(name)s.": "\u062a\u0645 \u062d\u0630\u0641 %(name)s \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully deleted 1 item": "\u062a\u0645 \u062d\u0630\u0641 \u0639\u0646\u0635\u0631 \u0648\u0627\u062d\u062f \u0628\u0646\u062c\u0627\u062d", 
    "Successfully deleted 1 item.": "\u062a\u0645 \u062d\u0630\u0641 \u0639\u0646\u0635\u0631 \u0648\u0627\u062d\u062f \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully deleted member {placeholder}": "\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0639\u0636\u0648 {placeholder} \u0628\u0646\u062c\u0627\u062d", 
    "Successfully deleted.": "\u062a\u0645 \u0627\u0644\u062d\u0630\u0641 \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully imported.": "\u062a\u0645 \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully modified permission": "\u062a\u0645 \u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0625\u0630\u0646 \u0628\u0646\u062c\u0627\u062d", 
    "Successfully moved %(name)s": "\u062a\u0645 \u0646\u0642\u0644 %(name)s \u0628\u0646\u062c\u0627\u062d", 
    "Successfully moved %(name)s and %(amount)s other items.": "\u062a\u0645 \u0646\u0642\u0644 %(name)s \u0648 %(amount)s \u0639\u0646\u0627\u0635\u0631 \u0623\u062e\u0631\u0649 \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully moved %(name)s and 1 other item.": "\u062a\u0645 \u0646\u0642\u0644 %(name)s \u0648 \u0639\u0646\u0635\u0631 \u0622\u062e\u0631 \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully moved %(name)s.": "\u062a\u0645 \u0646\u0642\u0644 %(name)s \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully sent to {placeholder}": "\u062a\u0645 \u0627\u0644\u0627\u0633\u0627\u0644 \u0627\u0644\u0649 {placeholder} \u0628\u0646\u062c\u0627\u062d", 
    "Successfully set library history.": "\u062a\u0645 \u0627\u0639\u062f\u0627\u062f \u0633\u062c\u0644 \u0627\u0644\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u062a\u0627\u0631\u064a\u062e\u064a \u0628\u0646\u062c\u0627\u062d", 
    "Successfully transferred the group.": "\u062a\u0645 \u062a\u062d\u0648\u064a\u0644 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629 \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully transferred the group. You are now a normal member of the group.": "\u062a\u0645 \u0646\u0642\u0644 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629 \u0628\u0646\u062c\u0627\u062d. \u0623\u0646\u062a \u0627\u0644\u0627\u0646 \u0639\u0636\u0648 \u0639\u0627\u062f\u064a \u0641\u064a \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629.", 
    "Successfully transferred the library.": "\u062a\u0645 \u062a\u062d\u0648\u064a\u0644 \u0627\u0644\u0645\u0643\u062a\u0628\u0629 \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully unlink %(name)s.": "\u062a\u0645 \u0641\u0635\u0644 %(name)s \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully unshared 1 item.": "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0645\u0634\u0627\u0631\u0643\u0629 \u0639\u0646\u0635\u0631 \u0628\u0646\u062c\u0627\u062d.", 
    "Successfully unshared library {placeholder}": "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0645\u0634\u0627\u0631\u0643\u0629 \u0645\u0643\u062a\u0628\u0629 {placeholder} \u0628\u0646\u062c\u0627\u062d", 
    "Successfully unstared {placeholder}": "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u062a\u0623\u0634\u064a\u0631 {placeholder} \u064a\u0646\u062c\u0627\u062d", 
    "Transfer Group {group_name} To": "\u062a\u062d\u0648\u064a\u0644 \u0645\u062c\u0645\u0648\u0639\u0629 {group_name} \u0625\u0644\u0649", 
    "Transfer Library {library_name} To": "\u062a\u062d\u0648\u064a\u0644 \u0645\u0643\u062a\u0628\u0629 {library_name} \u0625\u0644\u0649", 
    "Unlink device": "\u0641\u0635\u0644 \u062c\u0647\u0627\u0632", 
    "Unshare Library": "\u0625\u0644\u063a\u0627\u0621 \u0645\u0634\u0627\u0631\u0643\u0629 \u0645\u0643\u062a\u0628\u0629", 
    "Uploaded bytes exceed file size": "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062d\u0645\u0644\u0629 \u062a\u062c\u0627\u0648\u0632\u062a \u062d\u062c\u0645 \u0627\u0644\u0645\u0644\u0641", 
    "You can only select 1 item": "\u064a\u0645\u0643\u0646\u0643 \u0627\u062e\u062a\u064a\u0627\u0631 \u0639\u0646\u0635\u0631 \u0648\u0627\u062d\u062f \u0641\u0642\u0637", 
    "You cannot select any more choices": "\u0644\u0627 \u064a\u0645\u0643\u0646\u0643 \u062a\u062d\u062f\u064a\u062f \u0623\u064a \u062e\u064a\u0627\u0631\u0627\u062a \u0625\u0636\u0627\u0641\u064a\u0629", 
    "canceled": "\u0645\u0644\u063a\u064a", 
    "locked by {placeholder}": "\u0645\u0642\u0641\u0644 \u0628\u0648\u0627\u0633\u0637\u0629 {placeholder}", 
    "uploaded": "\u0645\u062d\u0645\u0644", 
    "{placeholder} Folder Permission": "\u0627\u0630\u0648\u0646\u0627\u062a \u0645\u062c\u0644\u062f {placeholder}", 
    "{placeholder} History Setting": "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0633\u062c\u0644 {placeholder} \u0627\u0644\u062a\u0627\u0631\u064a\u062e\u064a", 
    "{placeholder} Members": "\u0623\u0639\u0636\u0627\u0621 {placeholder}", 
    "{placeholder} Share Links": "\u0631\u0648\u0627\u0628\u0637 \u0645\u0634\u0627\u0631\u0643\u0629 {placeholder}"
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
    "DATE_FORMAT": "j F\u060c Y", 
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
    "SHORT_DATETIME_FORMAT": "m/d/Y P", 
    "SHORT_DATE_FORMAT": "d\u200f/m\u200f/Y", 
    "THOUSAND_SEPARATOR": ".", 
    "TIME_FORMAT": "g:i A", 
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

