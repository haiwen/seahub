

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
    "Are you sure you want to clear trash?": "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n l\u00e0m s\u1ea1ch th\u00f9ng r\u00e1c?", 
    "Are you sure you want to delete %s ?": "B\u1ea1n ch\u1eafc ch\u1eafn mu\u1ed1n x\u00f3a %s ?", 
    "Are you sure you want to delete %s completely?": "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n x\u00f3a %s ho\u00e0n to\u00e0n?", 
    "Are you sure you want to delete all %s's libraries?": "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n x\u00f3a t\u1ea5t c\u1ea3 %s's th\u01b0 vi\u1ec7n?", 
    "Are you sure you want to delete these selected items?": "B\u1ea1n c\u00f3 ch\u1eafc b\u1ea1n mu\u1ed1n x\u00f3a nh\u1eefng item \u0111\u00e3 ch\u1ecdn", 
    "Are you sure you want to quit this group?": "B\u1ea1n c\u00f3 mu\u1ed1n tho\u00e1t kh\u1ecfi Group?", 
    "Are you sure you want to restore %s?": "B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n kh\u00f4i ph\u1ee5c %s?", 
    "Cancel": "H\u1ee7y", 
    "Canceled.": "H\u1ee7y b\u1ecf", 
    "Clear Trash": "L\u00e0m s\u1ea1ch th\u00f9ng r\u00e1c", 
    "Copying %(name)s": "\u0110ang sao ch\u00e9p %(name)s", 
    "Copying file %(index)s of %(total)s": "Copying file %(index)s of %(total)s", 
    "Delete": "X\u00f3a", 
    "Delete Group": "X\u00f3a nh\u00f3m", 
    "Delete Items": "X\u00f3a item", 
    "Delete Library": "X\u00f3a th\u01b0 vei65n", 
    "Delete Library By Owner": "Th\u01b0 vi\u1ec7n x\u00f3a b\u1edfi ng\u01b0\u1eddi t\u1ea1o", 
    "Delete Member": "X\u00f3a th\u00e0nh vi\u00ean", 
    "Delete User": "X\u00f3a ng\u01b0\u1eddi d\u00f9ng", 
    "Deleted directories": "X\u00f3a th\u01b0 m\u1ee5c", 
    "Deleted files": "X\u00f3a t\u1eadp tin", 
    "Dismiss Group": "Gi\u1ea3i t\u00e1n Group", 
    "Edit Page": "Ch\u1ec9nh s\u1eeda trang", 
    "Empty file upload result": "K\u1ebft qu\u1ea3 t\u1ea3i l\u00ean t\u1eadp tin r\u1ed7ng", 
    "Error": "L\u1ed7i", 
    "Failed to send to {placeholder}": "G\u1edfi th\u1ea5t b\u1ea1i \u0111\u1ebfn {placeholder}", 
    "Failed.": "Th\u1ea5t b\u1ea1i.", 
    "Failed. Please check the network.": "Th\u1ea5t b\u1ea1i. Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i network.", 
    "File Upload canceled": "H\u1ee7y t\u1ea3i d\u1eef li\u1ec7u", 
    "File Upload complete": "T\u1ea3i l\u00ean th\u00e0nh c\u00f4ng", 
    "File Upload failed": "T\u1ea3i l\u00ean th\u1ea5t b\u1ea1i", 
    "File Uploading...": "\u0110ang t\u1ea3i d\u1eef li\u1ec7u", 
    "File is locked": "D\u1eef li\u1ec7u b\u1ecb kh\u00f3a", 
    "File is too big": "T\u1eadp tin qu\u00e1 l\u1edbn", 
    "File is too small": "T\u1eadp tin qu\u00e1 nh\u1ecf", 
    "Filetype not allowed": "\u0110\u1ecbnh d\u1ea1ng t\u1eadp tin kh\u00f4ng \u0111\u01b0\u1ee3c cho ph\u00e9p", 
    "Hide": "\u1ea8n", 
    "Internal error. Failed to copy %(name)s.": "L\u1ed7i n\u1ed9i b\u1ed9. Sao ch\u00e9p %(name)s th\u1ea5t b\u1ea1i", 
    "Internal error. Failed to move %(name)s.": "L\u1ed7i n\u1ed9i b\u1ed9. Chuy\u1ec3n %(name)s th\u1ea5t b\u1ea1i", 
    "Invalid destination path": "\u0110\u01b0\u1eddng d\u1eabn kh\u00f4ng h\u1ee3p l\u1ec7", 
    "It is required.": "\u0110i\u1ec1u n\u00e0y \u0111\u01b0\u1ee3c y\u00eau c\u1ea7u", 
    "Just now": "V\u1eeba m\u1edbi", 
    "Last Update": "C\u1eadp nh\u1eadt", 
    "Loading failed": "L\u1ed7i loading", 
    "Loading...": "\u0110ang t\u1ea3i...", 
    "Log out": "\u0110\u0103ng xu\u1ea5t", 
    "Modified files": "S\u1eeda \u0111\u1ed5i t\u1eadp tin", 
    "Moving %(name)s": "\u0110ang di chuy\u1ec3n %(name)s", 
    "Moving file %(index)s of %(total)s": "Moving file %(index)s of %(total)s", 
    "Name": "T\u00ean", 
    "Name is required": "Y\u00eau c\u1ea7u t\u00ean", 
    "Name is required.": "Y\u00eau c\u1ea7u t\u00ean.", 
    "New File": "T\u1eadp tin m\u1edbi", 
    "New Folder": "Th\u01b0 m\u1ee5c m\u1edbi", 
    "New directories": "Th\u01b0 m\u1ee5c m\u1edbi", 
    "New files": "T\u1eadp tin m\u1edbi", 
    "New password is too short": "M\u1eadt kh\u1ea9u m\u1edbi qu\u00e1 ng\u1eafn", 
    "New passwords don't match": "M\u1eadt kh\u1ea9u m\u1edbi kh\u00f4ng tr\u00f9ng kh\u1edbp", 
    "No matches": "Kh\u00f4ng t\u00ecm th\u1ea5y", 
    "Only an extension there, please input a name.": "Ch\u1ec9 c\u00f3 m\u1ed9t ph\u1ea7n m\u1edf r\u1ed9ng n\u00e0y, vui l\u00f2ng nh\u1eadp t\u00ean", 
    "Open in New Tab": "M\u1edf \u1edf Tab m\u1edbi", 
    "Pages": "Trang", 
    "Password is required.": "Y\u00eau c\u1ea7u m\u1eadt kh\u1ea9u.", 
    "Password is too short": "M\u1eadt kh\u1ea9u qu\u00e1 ng\u1eafn", 
    "Passwords don't match": "M\u1eadt kh\u1ea9u kh\u00f4ng tr\u00f9ng kh\u1edbp", 
    "Please check the network.": "Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i network.", 
    "Please click and choose a directory.": "Vui l\u00f2ng click v\u00e0 ch\u1ecdn th\u01b0 m\u1ee5c", 
    "Please enter 1 or more character": "Vui l\u00f2ng th\u00eam k\u00fd t\u1ef1", 
    "Please enter password": "Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u", 
    "Please enter the new password again": "Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u m\u1edbi l\u1ea7n n\u1eefa", 
    "Please enter the old password": "Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u c\u0169", 
    "Please enter the password again": "Vui l\u00f2ng nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u", 
    "Please enter valid days": "Vui l\u00f2ng nh\u1eadp s\u1ed1 \u0111\u00fang", 
    "Please input at least an email.": "Vui l\u00f2ng ch\u1ecdn \u00edt nh\u1ea5t m\u1ed9t \u0111\u1ecba ch\u1ec9 email", 
    "Processing...": "\u0110ang x\u1eed l\u00fd...", 
    "Quit Group": "Tho\u00e1t kh\u1ecfi Group", 
    "Read-Only": "Ch\u1ec9 xem", 
    "Read-Write": "Xem - \u0110i\u1ec1u ch\u1ec9nh", 
    "Really want to dismiss this group?": "B\u1ea1n c\u00f3 th\u1ef1c s\u1ef1 mu\u1ed1n gi\u1ea3i t\u00e1n Group n\u00e0y?", 
    "Rename": "\u0110\u1ed5i t\u00ean", 
    "Rename File": "\u0110\u1ed5i t\u00ean file", 
    "Renamed or Moved files": "\u0110\u1ed5i t\u00ean ho\u1eb7c chuy\u1ec3n t\u1eadp tin", 
    "Restore Library": "Kh\u00f4i ph\u1ee5c th\u01b0 vi\u1ec7n", 
    "Saving...": "\u0110ang l\u01b0u...", 
    "Search files in this wiki": "T\u00ecm trong Wiki", 
    "Searching...": "\u0110ang t\u00ecm...", 
    "Settings": "C\u00e0i \u0111\u1eb7t", 
    "Size": "Dung l\u01b0\u1ee3ng", 
    "Start": "B\u1eaft \u0111\u1ea7u", 
    "Submit": "C\u1eadp nh\u1eadt", 
    "Success": "Th\u00e0nh c\u00f4ng", 
    "Successfully copied %(name)s": "Sao ch\u00e9p %(name)s th\u00e0nh c\u00f4ng", 
    "Successfully copied %(name)s and %(amount)s other items.": "Sao ch\u00e9p %(name)s v\u00e0 %(amount)s item kh\u00e1c th\u00e0nh c\u00f4ng.", 
    "Successfully copied %(name)s and 1 other item.": "Sao ch\u00e9p %(name)s v\u00e0 1 item kh\u00e1c th\u00e0nh c\u00f4ng.", 
    "Successfully copied %(name)s.": "Sao ch\u00e9p %(name)s th\u00e0nh c\u00f4ng.", 
    "Successfully deleted %(name)s": "X\u00f3a %(name)s th\u00e0nh c\u00f4ng", 
    "Successfully deleted %(name)s and %(amount)s other items.": "X\u00f3a %(name)s v\u00e0 %(amount)s item kh\u00e1c th\u00e0nh c\u00f4ng", 
    "Successfully deleted %(name)s.": "X\u00f3a %(name)s th\u00e0nh c\u00f4ng", 
    "Successfully deleted.": "X\u00f3a th\u00e0nh c\u00f4ng.", 
    "Successfully moved %(name)s": "Chuy\u1ec3n %(name)s th\u00e0nh c\u00f4ng ", 
    "Successfully moved %(name)s and %(amount)s other items.": "Di chuy\u1ec3n %(name)s v\u00e0 %(amount)s item kh\u00e1c th\u00e0nh c\u00f4ng.", 
    "Successfully moved %(name)s and 1 other item.": "Di chuy\u1ec3n %(name)s v\u00e0 1 item kh\u00e1c th\u00e0nh c\u00f4ng.", 
    "Successfully moved %(name)s.": "Di chuy\u1ec3n %(name)s th\u00e0nh c\u00f4ng.", 
    "Successfully sent to {placeholder}": "G\u1edfi th\u00e0nh c\u00f4ng \u0111\u1ebfn {placeholder}", 
    "System Admin": "System Admin", 
    "Transfer Library": "Chuy\u1ec3n th\u01b0 vi\u1ec7n", 
    "Uploaded bytes exceed file size": "\u0110\u00e3 t\u1ea3i l\u00ean nh\u1eefng byte v\u01b0\u1ee3t qu\u00e1 k\u00edch th\u01b0\u1edbc c\u1ee7a file", 
    "Used": "\u0110\u00e3 d\u00f9ng", 
    "You cannot select any more choices": "B\u1ea1n kh\u00f4ng th\u1ec3 ch\u1ecdn th\u00eam", 
    "canceled": "\u0111\u00e3 h\u1ee7y b\u1ecf", 
    "uploaded": "\u0111\u00e3 t\u1ea3i l\u00ean"
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

