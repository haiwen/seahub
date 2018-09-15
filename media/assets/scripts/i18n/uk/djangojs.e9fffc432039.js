

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=(n % 1 == 0 && n % 10 == 1 && n % 100 != 11 ? 0 : n % 1 == 0 && n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 1 : n % 1 == 0 && (n % 10 ==0 || (n % 10 >=5 && n % 10 <=9) || (n % 100 >=11 && n % 100 <=14 )) ? 2: 3);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "Are you sure you want to delete %s ?": "\u0412\u0438 \u0432\u043f\u0435\u0432\u043d\u0435\u043d\u0456, \u0449\u043e \u0445\u043e\u0447\u0435\u0442\u0435 \u0432\u0438\u0434\u0430\u043b\u0438\u0442\u0438 %s ?", 
    "Are you sure you want to delete these selected items?": "\u0412\u0438 \u0432\u043f\u0435\u0432\u043d\u0435\u043d\u0456, \u0449\u043e \u0445\u043e\u0447\u0435\u0442\u0435 \u0432\u0438\u0434\u0430\u043b\u0438\u0442\u0438 %s ?", 
    "Are you sure you want to quit this group?": "\u0412\u0438 \u0432\u043f\u0435\u0432\u043d\u0435\u043d\u0456 \u0449\u043e \u0445\u043e\u0447\u0435\u0442\u0435 \u0432\u0438\u0439\u0442\u0438 \u0437 \u0433\u0440\u0443\u043f\u0438?", 
    "Are you sure you want to unshare %s ?": "\u0412\u0438 \u0432\u043f\u0435\u0432\u043d\u0435\u043d\u0456, \u0449\u043e \u0445\u043e\u0447\u0435\u0442\u0435 \u0437\u0430\u0431\u043e\u0440\u043e\u043d\u0438\u0442\u0438 \u0434\u043e\u0441\u0442\u0443\u043f %s ?", 
    "Cancel": "\u0421\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438", 
    "Canceled.": "\u0421\u043a\u0430\u0441\u043e\u0432\u0430\u043d\u043e.", 
    "Copying %(name)s": "\u041a\u043e\u043f\u0456\u044e\u0432\u0430\u043d\u043d\u044f %(name)s", 
    "Copying file %(index)s of %(total)s": "\u041a\u043e\u043f\u0456\u044e\u0432\u0430\u043d\u043d\u044f \u0444\u0430\u0439\u043b\u0443 %(index)s \u0456\u0437 %(total)s", 
    "Delete": "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438", 
    "Delete Group": "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0433\u0440\u0443\u043f\u0443", 
    "Delete Items": "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438", 
    "Delete Library": "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0431\u0456\u0431\u043b\u0456\u043e\u0442\u0435\u043a\u0443", 
    "Delete Member": "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0443\u0447\u0430\u0441\u043d\u0438\u043a\u0430", 
    "Delete User": "\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u043a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0430", 
    "Deleted directories": "\u0412\u0438\u0434\u0430\u043b\u0435\u043d\u0456 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0438", 
    "Deleted files": "\u0412\u0438\u0434\u0430\u043b\u0435\u043d\u0456 \u0444\u0430\u0439\u043b\u0438", 
    "Dismiss Group": "\u0412\u0438\u043a\u043b\u044e\u0447\u0438\u0442\u0438 \u0433\u0440\u0443\u043f\u0443", 
    "Edit Page": "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0441\u0442\u043e\u0440\u0456\u043d\u043a\u0443", 
    "Empty file upload result": "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f \u043f\u043e\u0440\u043e\u0436\u043d\u044c\u043e\u0433\u043e \u0444\u0430\u0439\u043b\u0443", 
    "Error": "\u041f\u043e\u043c\u0438\u043b\u043a\u0430", 
    "Failed.": "\u041d\u0435\u0432\u0434\u0430\u043b\u043e.", 
    "Failed. Please check the network.": "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f. \u0411\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430, \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043c\u0435\u0440\u0435\u0436\u0435\u0432\u0435 \u0437'\u0454\u0434\u043d\u0430\u043d\u043d\u044f.", 
    "File Upload canceled": "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f \u0444\u0430\u0439\u043b\u0443 \u0432\u0456\u0434\u043c\u0456\u043d\u0435\u043d\u043e", 
    "File Upload complete": "\u0424\u0430\u0439\u043b \u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u0438\u0439", 
    "File Upload failed": "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f \u0444\u0430\u0439\u043b\u0443 \u043d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f", 
    "File Uploading...": "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f \u0444\u0430\u0439\u043b\u0443...", 
    "File is too big": "\u0424\u0430\u0439\u043b \u0437\u0430\u043d\u0430\u0434\u0442\u043e \u0432\u0435\u043b\u0438\u043a\u0438\u0439", 
    "File is too small": "\u0424\u0430\u0439\u043b \u0437\u0430\u043d\u0430\u0434\u0442\u043e \u043c\u0430\u043b\u0438\u0439", 
    "Filetype not allowed": "\u0417\u0430\u0431\u043e\u0440\u043e\u043d\u0435\u043d\u0438\u0439 \u0442\u0438\u043f \u0444\u0430\u0439\u043b\u0456\u0432", 
    "Internal error. Failed to copy %(name)s.": "\u0412\u043d\u0443\u0442\u0440\u0456\u0448\u043d\u044f \u043f\u043e\u043c\u0438\u043b\u043a\u0430. \u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0441\u043a\u043e\u043f\u0456\u044e\u0432\u0430\u0442\u0438  %(name)s.", 
    "Internal error. Failed to move %(name)s.": "\u0412\u043d\u0443\u0442\u0440\u0456\u0448\u043d\u044f \u043f\u043e\u043c\u0438\u043b\u043a\u0430. \u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043f\u0435\u0440\u0435\u043c\u0456\u0441\u0442\u0438\u0442\u0438  %(name)s.", 
    "Invalid destination path": "\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 \u0448\u043b\u044f\u0445 \u043f\u0440\u0438\u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044f", 
    "It is required.": "\u041f\u043e\u0442\u0440\u0456\u0431\u0435\u043d Email.", 
    "Just now": "\u041f\u0440\u043e\u0441\u0442\u043e \u0437\u0430\u0440\u0430\u0437", 
    "Last Update": "\u041e\u0441\u0442\u0430\u043d\u043d\u0454 \u043e\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u044f", 
    "Loading failed": "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f \u043d\u0435 \u0443\u0441\u043f\u0456\u0448\u043d\u0435", 
    "Loading...": "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f...", 
    "Log out": "\u0412\u0438\u0445\u0456\u0434", 
    "Modified files": "\u041c\u043e\u0434\u0438\u0444\u0456\u043a\u043e\u0432\u0430\u043d\u0456 \u0444\u0430\u0439\u043b\u0438", 
    "Moving %(name)s": "\u041f\u0435\u0440\u0435\u043c\u0456\u0449\u0435\u043d\u043d\u044f %(name)s", 
    "Moving file %(index)s of %(total)s": "\u041f\u0435\u0440\u0435\u043c\u0456\u0449\u0435\u043d\u043d\u044f \u0444\u0430\u0439\u043b\u0443 %(index)s \u0456\u0437 %(total)s", 
    "Name": "\u0418\u043c'\u044f", 
    "Name is required": "\u041f\u043e\u0442\u0440\u0456\u0431\u0435\u043d\u0435 \u0441\u0442\u0430\u0440\u0435 \u0456\u043c'\u044f", 
    "Name is required.": "\u041f\u043e\u0442\u0440\u0456\u0431\u0435\u043d\u0435 \u0441\u0442\u0430\u0440\u0435 \u0456\u043c'\u044f", 
    "New File": "\u041d\u043e\u0432\u0438\u0439 \u0444\u0430\u0439\u043b", 
    "New directories": "\u041d\u043e\u0432\u0456 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0438", 
    "New files": "\u041d\u043e\u0432\u0438\u0439 \u0444\u0430\u0439\u043b", 
    "New password is too short": "\u041d\u043e\u0432\u0438\u0439 \u043f\u0430\u0440\u043e\u043b\u044c \u0434\u0443\u0436\u0435 \u043a\u043e\u0440\u043e\u0442\u043a\u0438\u0439", 
    "New passwords don't match": "\u041d\u043e\u0432\u0456 \u043f\u0430\u0440\u043e\u043b\u0456 \u043d\u0435 \u0441\u043f\u0456\u0432\u043f\u0430\u0434\u0430\u044e\u0442\u044c", 
    "No matches": "\u0417\u0431\u0456\u0433\u0456\u0432 \u043d\u0435\u043c\u0430\u0454", 
    "Only an extension there, please input a name.": "\u0422\u0443\u0442 \u0442\u0456\u043b\u044c\u043a\u0438 \u0440\u043e\u0437\u0448\u0438\u0440\u0435\u043d\u043d\u044f, \u0431\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430, \u0432\u0432\u0435\u0434\u0456\u0442\u044c \u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044f.", 
    "Pages": "\u0421\u0442\u043e\u0440\u0456\u043d\u043a\u0438", 
    "Password is required.": "\u041f\u043e\u0442\u0440\u0456\u0431\u0435\u043d \u043f\u0430\u0440\u043e\u043b\u044c.", 
    "Password is too short": "\u041f\u0430\u0440\u043e\u043b\u044c \u0434\u0443\u0436\u0435 \u043a\u043e\u0440\u043e\u0442\u043a\u0438\u0439", 
    "Passwords don't match": "\u041f\u0430\u0440\u043e\u043b\u0456 \u043d\u0435 \u0437\u0431\u0456\u0433\u0430\u044e\u0442\u044c\u0441\u044f", 
    "Please check the network.": "\u0411\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430, \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043c\u0435\u0440\u0435\u0436\u0435\u0432\u0435 \u0437\u2019\u0454\u0434\u043d\u0430\u043d\u043d\u044f.", 
    "Please choose a CSV file": "\u0411\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430, \u0432\u0438\u0431\u0435\u0440\u0456\u0442\u044c CSV \u0444\u0430\u0439\u043b", 
    "Please click and choose a directory.": "\u041a\u043b\u0456\u043a\u043d\u0456\u0442\u044c \u0434\u043b\u044f \u0432\u0438\u0431\u043e\u0440\u0443 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443", 
    "Please enter 1 or more character": "\u0411\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430, \u0432\u0432\u0435\u0434\u0456\u0442\u044c 1 \u0430\u0431\u043e \u0431\u0456\u043b\u044c\u0448\u0435 \u043b\u0456\u0442\u0435\u0440", 
    "Please enter password": "\u0411\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430, \u0432\u0432\u0435\u0434\u0456\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c", 
    "Please enter the new password again": "\u0411\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430, \u0432\u0432\u0435\u0434\u0456\u0442\u044c \u0437\u043d\u043e\u0432\u0443 \u043d\u043e\u0432\u0438\u0439 \u043f\u0430\u0440\u043e\u043b\u044c ", 
    "Please enter the old password": "\u0411\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430 \u0432\u0432\u0435\u0434\u0456\u0442\u044c \u0441\u0442\u0430\u0440\u0438\u0439 \u043f\u0430\u0440\u043e\u043b\u044c", 
    "Please enter the password again": "\u0411\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430 \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0456\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c", 
    "Please enter valid days": "\u0411\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430, \u0432\u0432\u0435\u0434\u0456\u0442\u044c \u043a\u0456\u043b\u044c\u043a\u0456\u0441\u0442\u044c \u0434\u0456\u0439\u0441\u043d\u0438\u0445 \u0434\u043d\u0456\u0432", 
    "Please input at least an email.": "\u0411\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430, \u0432\u0432\u0435\u0434\u0456\u0442\u044c \u043f\u0440\u0438\u043d\u0430\u0439\u043c\u043d\u0456, email.", 
    "Processing...": "\u041e\u0431\u0440\u043e\u0431\u043a\u0430 ...", 
    "Quit Group": "\u0412\u0438\u0439\u0442\u0438 \u0437 \u0433\u0440\u0443\u043f\u0438", 
    "Read-Only": "\u0422\u0456\u043b\u044c\u043a\u0438 \u0434\u043b\u044f \u0447\u0438\u0442\u0430\u043d\u043d\u044f", 
    "Read-Write": "\u0427\u0438\u0442\u0430\u043d\u043d\u044f+\u0417\u0430\u043f\u0438\u0441", 
    "Really want to dismiss this group?": "\u0412\u0438 \u0434\u0456\u0439\u0441\u043d\u043e \u0445\u043e\u0447\u0435\u0442\u0435 \u0432\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0446\u044e \u0433\u0440\u0443\u043f\u0443?", 
    "Rename": "\u041f\u0435\u0440\u0435\u0439\u043c\u0435\u043d\u0443\u0432\u0430\u0442\u0438", 
    "Rename File": "\u041f\u0435\u0440\u0435\u0439\u043c\u0435\u043d\u0443\u0432\u0430\u0442\u0438 \u0444\u0430\u0439\u043b", 
    "Renamed or Moved files": "\u043f\u0435\u0440\u0435\u0439\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0456 \u0430\u0431\u043e \u043f\u0435\u0440\u0435\u043c\u0456\u0449\u0435\u043d\u0456 \u0444\u0430\u0439\u043b\u0438", 
    "Restore Library": "\u0412\u0456\u0434\u043d\u043e\u0432\u0438\u0442\u0438 \u0431\u0456\u0431\u043b\u0456\u043e\u0442\u0435\u043a\u0443", 
    "Saving...": "\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043d\u044f...", 
    "Search files in this wiki": "\u041f\u043e\u0448\u0443\u043a \u0444\u0430\u0439\u043b\u0456\u0432 \u0432 wiki", 
    "Searching...": "\u041f\u043e\u0448\u0443\u043a...", 
    "Settings": "\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f", 
    "Size": "\u0420\u043e\u0437\u043c\u0456\u0440", 
    "Start": "\u041f\u043e\u0437\u043d\u0430\u0447\u0438\u0442\u0438", 
    "Submit": "\u0413\u043e\u0442\u043e\u0432\u043e", 
    "Successfully copied %(name)s and %(amount)s other items.": "\u0423\u0441\u043f\u0456\u0448\u043d\u043e \u0441\u043a\u043e\u043f\u0456\u0439\u043e\u0432\u0430\u043d\u043e %(name)s \u0442\u0430 %(amount)s \u0456\u043d\u0448\u0438\u0445 \u043f\u043e\u0437\u0438\u0446\u0456\u0439.", 
    "Successfully copied %(name)s.": "\u0423\u0441\u043f\u0456\u0448\u043d\u043e \u0441\u043a\u043e\u043f\u0456\u0439\u043e\u0432\u0430\u043d\u043e %(name)s.", 
    "Successfully deleted %(name)s": "\u0423\u0441\u043f\u0456\u0448\u043d\u043e \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u043e %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "\u0423\u0441\u043f\u0456\u0448\u043d\u043e \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u0456 %(name)s \u0442\u0430 %(amount)s \u0456\u043d\u0448\u0438\u0445 \u043f\u043e\u0437\u0438\u0446\u0456\u0439.", 
    "Successfully deleted %(name)s.": "\u0423\u0441\u043f\u0456\u0448\u043d\u043e \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u0456 %(name)s.", 
    "Successfully moved %(name)s and %(amount)s other items.": "\u0423\u0441\u043f\u0456\u0448\u043d\u043e \u043f\u0435\u0440\u0435\u043c\u0456\u0449\u0435\u043d\u043e %(name)s \u0442\u0430 %(amount)s \u0456\u043d\u0448\u0438\u0445 \u043f\u043e\u0437\u0438\u0446\u0456\u0439.", 
    "Successfully moved %(name)s.": "\u0423\u0441\u043f\u0456\u0448\u043d\u043e \u043f\u0435\u0440\u0435\u043c\u0456\u0449\u0435\u043d\u043e %(name)s.", 
    "System Admin": "\u0421\u0438\u0441\u0442\u0435\u043c\u043d\u0438\u0439 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440", 
    "Transfer Library": "\u041f\u0435\u0440\u0435\u043d\u043e\u0441 \u0431\u0456\u0431\u043b\u0456\u043e\u0442\u0435\u043a\u0438", 
    "Unshare Library": "\u0421\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u0441\u043f\u0456\u043b\u044c\u043d\u0438\u0439 \u0434\u043e\u0441\u0442\u0443\u043f \u0434\u043e \u0431\u0456\u0431\u043b\u0456\u043e\u0442\u0435\u043a\u0438", 
    "Uploaded bytes exceed file size": "\u041f\u0435\u0440\u0435\u0432\u0438\u0449\u0435\u043d\u043d\u044f \u043b\u0456\u043c\u0456\u0442\u0443 \u0440\u043e\u0437\u043c\u0456\u0440\u0443 \u0444\u0430\u0439\u043b\u0443", 
    "Used": "\u0412\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0454\u0442\u044c\u0441\u044f", 
    "You cannot select any more choices": "\u0412\u0438 \u043d\u0435 \u043c\u043e\u0436\u0435\u0442\u0435 \u043e\u0431\u0440\u0430\u0442\u0438 \u0431\u0456\u043b\u044c\u0448\u0435 \u0432\u0430\u0440\u0456\u0430\u043d\u0442\u0456\u0432", 
    "canceled": "\u0441\u043a\u0430\u0441\u043e\u0432\u0430\u043d\u043e", 
    "uploaded": "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043e"
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
    "DATETIME_FORMAT": "d E Y \u0440. H:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d.%m.%Y %H:%M:%S", 
      "%d.%m.%Y %H:%M:%S.%f", 
      "%d.%m.%Y %H:%M", 
      "%d.%m.%Y", 
      "%d %B %Y %H:%M:%S", 
      "%d %B %Y %H:%M:%S.%f", 
      "%d %B %Y %H:%M", 
      "%d %B %Y", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "d E Y \u0440.", 
    "DATE_INPUT_FORMATS": [
      "%d.%m.%Y", 
      "%d %B %Y", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "d F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d.m.Y H:i", 
    "SHORT_DATE_FORMAT": "d.m.Y", 
    "THOUSAND_SEPARATOR": "\u00a0", 
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

