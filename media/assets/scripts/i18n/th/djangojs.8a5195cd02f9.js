

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
    "Are you sure you want to delete %s ?": "\u0e04\u0e38\u0e13\u0e41\u0e19\u0e48\u0e43\u0e08\u0e27\u0e48\u0e32\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e25\u0e1a %s ?", 
    "Are you sure you want to delete these selected items?": "\u0e04\u0e38\u0e13\u0e41\u0e19\u0e48\u0e43\u0e08\u0e27\u0e48\u0e32\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e25\u0e1a\u0e44\u0e2d\u0e40\u0e17\u0e21\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e01\u0e40\u0e2b\u0e25\u0e48\u0e32\u0e19\u0e35\u0e49?", 
    "Are you sure you want to quit this group?": "\u0e04\u0e38\u0e13\u0e41\u0e19\u0e48\u0e43\u0e08\u0e04\u0e38\u0e13\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e01\u0e25\u0e38\u0e48\u0e21 ?", 
    "Are you sure you want to unshare %s ?": "\u0e04\u0e38\u0e13\u0e41\u0e19\u0e48\u0e43\u0e08\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e41\u0e1a\u0e48\u0e07\u0e1b\u0e31\u0e19  %s ?", 
    "Cancel": "\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01", 
    "Canceled.": "\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e41\u0e25\u0e49\u0e27", 
    "Delete": "\u0e25\u0e1a", 
    "Delete Group": "\u0e25\u0e1a\u0e01\u0e25\u0e38\u0e48\u0e21", 
    "Delete Items": "\u0e25\u0e1a\u0e44\u0e2d\u0e40\u0e17\u0e21", 
    "Delete Member": "\u0e25\u0e1a\u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01", 
    "Delete User": "\u0e25\u0e1a\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49", 
    "Deleted directories": "\u0e25\u0e1a\u0e44\u0e14\u0e40\u0e23\u0e47\u0e01\u0e17\u0e2d\u0e23\u0e35\u0e48\u0e41\u0e25\u0e49\u0e27", 
    "Deleted files": "\u0e25\u0e1a\u0e44\u0e1f\u0e25\u0e4c\u0e41\u0e25\u0e49\u0e27", 
    "Dismiss Group": "\u0e25\u0e30\u0e17\u0e34\u0e49\u0e07\u0e01\u0e25\u0e38\u0e48\u0e21", 
    "Edit Page": "\u0e41\u0e01\u0e49\u0e44\u0e02\u0e2b\u0e19\u0e49\u0e32\u0e40\u0e1e\u0e08", 
    "Empty file upload result": "\u0e1c\u0e25\u0e01\u0e32\u0e23\u0e2d\u0e31\u0e1e\u0e42\u0e2b\u0e25\u0e14\u0e44\u0e1f\u0e25\u0e4c\u0e27\u0e48\u0e32\u0e07", 
    "Error": "\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14", 
    "Failed.": "\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14", 
    "Failed. Please check the network.": "\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14. \u0e42\u0e1b\u0e23\u0e14\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e40\u0e04\u0e23\u0e37\u0e2d\u0e02\u0e48\u0e32\u0e22", 
    "File is too big": "\u0e44\u0e1f\u0e25\u0e4c\u0e02\u0e19\u0e32\u0e14\u0e43\u0e2b\u0e0d\u0e48\u0e40\u0e01\u0e34\u0e19\u0e44\u0e1b", 
    "File is too small": "\u0e44\u0e1f\u0e25\u0e4c\u0e02\u0e19\u0e32\u0e14\u0e40\u0e25\u0e47\u0e01\u0e40\u0e01\u0e34\u0e19\u0e44\u0e1b", 
    "Filetype not allowed": "\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e44\u0e1f\u0e25\u0e4c\u0e44\u0e21\u0e48\u0e2d\u0e19\u0e38\u0e0d\u0e32\u0e15", 
    "Internal error. Failed to copy %(name)s.": "Internal error \u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01 %(name)s \u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14", 
    "Internal error. Failed to move %(name)s.": "Internal error \u0e22\u0e49\u0e32\u0e22 %(name)s \u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14", 
    "Invalid destination path": "\u0e1e\u0e32\u0e18\u0e1b\u0e25\u0e32\u0e22\u0e17\u0e32\u0e07\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07", 
    "It is required.": "\u0e21\u0e31\u0e19\u0e08\u0e33\u0e40\u0e1b\u0e47\u0e19", 
    "Just now": "\u0e40\u0e14\u0e35\u0e4b\u0e22\u0e27\u0e19\u0e35\u0e49", 
    "Last Update": "\u0e1b\u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e38\u0e07\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14", 
    "Loading...": "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e42\u0e2b\u0e25\u0e14...", 
    "Log out": "\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a", 
    "Modified files": "\u0e1b\u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e38\u0e07\u0e44\u0e1f\u0e25\u0e4c\u0e41\u0e25\u0e49\u0e27", 
    "Name": "\u0e0a\u0e37\u0e48\u0e2d", 
    "Name is required": "\u0e0a\u0e37\u0e48\u0e2d \u0e08\u0e33\u0e40\u0e1b\u0e47\u0e19", 
    "Name is required.": "\u0e0a\u0e37\u0e48\u0e2d \u0e08\u0e33\u0e40\u0e1b\u0e47\u0e19", 
    "New File": "\u0e44\u0e1f\u0e25\u0e4c\u0e43\u0e2b\u0e21\u0e48", 
    "New directories": "\u0e44\u0e14\u0e40\u0e23\u0e47\u0e01\u0e17\u0e2d\u0e23\u0e35\u0e48\u0e43\u0e2b\u0e21\u0e48", 
    "New files": "\u0e44\u0e1f\u0e25\u0e4c\u0e43\u0e2b\u0e21\u0e48", 
    "New password is too short": "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e2a\u0e31\u0e49\u0e19\u0e40\u0e01\u0e34\u0e19\u0e44\u0e1b", 
    "New passwords don't match": "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e44\u0e21\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19", 
    "Only an extension there, please input a name.": "\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e2a\u0e48\u0e27\u0e19\u0e02\u0e22\u0e32\u0e22\u0e40\u0e2b\u0e25\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19, \u0e42\u0e1b\u0e23\u0e14\u0e43\u0e2a\u0e48\u0e0a\u0e37\u0e48\u0e2d ", 
    "Pages": "\u0e40\u0e1e\u0e08", 
    "Password is required.": "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e08\u0e33\u0e40\u0e1b\u0e47\u0e19", 
    "Password is too short": "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e2a\u0e31\u0e49\u0e19\u0e40\u0e01\u0e34\u0e19\u0e44\u0e1b", 
    "Passwords don't match": "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e44\u0e21\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19", 
    "Please check the network.": "\u0e42\u0e1b\u0e23\u0e14\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e40\u0e04\u0e23\u0e37\u0e2d\u0e02\u0e48\u0e32\u0e22", 
    "Please choose a CSV file": "\u0e42\u0e1b\u0e23\u0e14\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e44\u0e1f\u0e25\u0e4c CSV ", 
    "Please click and choose a directory.": "\u0e42\u0e1b\u0e23\u0e14\u0e01\u0e14\u0e41\u0e25\u0e30\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e44\u0e14\u0e40\u0e23\u0e01\u0e17\u0e2d\u0e23\u0e35\u0e48", 
    "Please enter password": "\u0e42\u0e1b\u0e23\u0e14\u0e01\u0e23\u0e2d\u0e01\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19", 
    "Please enter the new password again": "\u0e42\u0e1b\u0e23\u0e14\u0e01\u0e23\u0e2d\u0e01\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", 
    "Please enter the old password": "\u0e42\u0e1b\u0e23\u0e14\u0e01\u0e23\u0e2d\u0e01\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e40\u0e01\u0e48\u0e32", 
    "Please enter the password again": "\u0e42\u0e1b\u0e23\u0e14\u0e01\u0e23\u0e2d\u0e01\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", 
    "Please input at least an email.": "\u0e42\u0e1b\u0e23\u0e14\u0e1b\u0e49\u0e2d\u0e19\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22\u0e2b\u0e19\u0e36\u0e48\u0e07\u0e2d\u0e35\u0e40\u0e21\u0e25\u0e25\u0e4c", 
    "Processing...": "\u0e1b\u0e23\u0e30\u0e21\u0e27\u0e25\u0e1c\u0e25...", 
    "Quit Group": "\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e01\u0e25\u0e38\u0e48\u0e21", 
    "Read-Only": "\u0e2d\u0e48\u0e32\u0e19\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e40\u0e14\u0e35\u0e22\u0e27", 
    "Read-Write": "\u0e2d\u0e48\u0e32\u0e19-\u0e40\u0e02\u0e35\u0e22\u0e19", 
    "Really want to dismiss this group?": "\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e25\u0e30\u0e17\u0e34\u0e49\u0e07\u0e01\u0e25\u0e38\u0e48\u0e21\u0e08\u0e23\u0e34\u0e07\u0e2b\u0e23\u0e37\u0e2d?", 
    "Rename": "\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d", 
    "Rename File": "\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d\u0e44\u0e1f\u0e25\u0e4c", 
    "Renamed or Moved files": "\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d\u0e2b\u0e23\u0e37\u0e2d\u0e22\u0e49\u0e32\u0e22\u0e44\u0e1f\u0e25\u0e4c", 
    "Restore Library": "\u0e01\u0e39\u0e49\u0e04\u0e37\u0e19\u0e04\u0e25\u0e31\u0e07\u0e41\u0e1f\u0e49\u0e21\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25", 
    "Saving...": "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01...", 
    "Search files in this wiki": "\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e44\u0e1f\u0e25\u0e4c\u0e43\u0e19 wiki \u0e19\u0e35\u0e49", 
    "Settings": "\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32", 
    "Size": "\u0e02\u0e19\u0e32\u0e14", 
    "Start": "\u0e40\u0e23\u0e34\u0e48\u0e21", 
    "Submit": "\u0e2a\u0e48\u0e07", 
    "Successfully copied %(name)s and %(amount)s other items.": "\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01 %(name)s and %(amount)s \u0e44\u0e2d\u0e40\u0e17\u0e47\u0e21\u0e2d\u0e37\u0e48\u0e19\u0e46 \u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08", 
    "Successfully copied %(name)s.": "\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01 %(name)s \u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08", 
    "Successfully deleted %(name)s": "\u0e25\u0e1a %(name)s \u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08", 
    "Successfully deleted %(name)s and %(amount)s other items.": "\u0e25\u0e1a %(name)s \u0e41\u0e25\u0e30 %(amount)s \u0e44\u0e2d\u0e40\u0e17\u0e47\u0e21\u0e2d\u0e37\u0e48\u0e19\u0e46 \u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08", 
    "Successfully deleted %(name)s.": "\u0e25\u0e1a %(name)s \u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08", 
    "Successfully moved %(name)s and %(amount)s other items.": "\u0e22\u0e49\u0e32\u0e22 %(name)s \u0e41\u0e25\u0e30 %(amount)s \u0e44\u0e2d\u0e40\u0e17\u0e47\u0e21\u0e2d\u0e37\u0e48\u0e19\u0e46\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08", 
    "Successfully moved %(name)s.": "\u0e22\u0e49\u0e32\u0e22 %(name)s \u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08", 
    "System Admin": "\u0e2a\u0e48\u0e27\u0e19\u0e1c\u0e39\u0e49\u0e14\u0e39\u0e41\u0e25\u0e23\u0e30\u0e1a\u0e1a", 
    "Transfer Library": "\u0e04\u0e25\u0e31\u0e07\u0e41\u0e1f\u0e49\u0e21\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e16\u0e48\u0e32\u0e22\u0e42\u0e2d\u0e19", 
    "Unshare Library": "\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e41\u0e1a\u0e48\u0e07\u0e1b\u0e31\u0e19\u0e04\u0e25\u0e31\u0e07\u0e41\u0e1f\u0e49\u0e21\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25", 
    "Uploaded bytes exceed file size": "\u0e02\u0e19\u0e32\u0e14\u0e44\u0e1a\u0e15\u0e4c\u0e17\u0e35\u0e48\u0e2d\u0e31\u0e1e\u0e42\u0e2b\u0e25\u0e14\u0e40\u0e01\u0e34\u0e19\u0e02\u0e19\u0e32\u0e14\u0e44\u0e1f\u0e25\u0e4c", 
    "Used": "\u0e43\u0e0a\u0e49\u0e44\u0e1b"
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
    "DATETIME_FORMAT": "j F Y, G:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d/%m/%Y %H:%M:%S.%f", 
      "%d/%m/%Y %H:%M:%S", 
      "%d/%m/%Y %H:%M", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "j F Y", 
    "DATE_INPUT_FORMATS": [
      "%d/%m/%Y", 
      "%d %b %Y", 
      "%d %B %Y", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ".", 
    "FIRST_DAY_OF_WEEK": "0", 
    "MONTH_DAY_FORMAT": "j F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "j M Y, G:i", 
    "SHORT_DATE_FORMAT": "j M Y", 
    "THOUSAND_SEPARATOR": ",", 
    "TIME_FORMAT": "G:i", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S.%f", 
      "%H:%M:%S", 
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

