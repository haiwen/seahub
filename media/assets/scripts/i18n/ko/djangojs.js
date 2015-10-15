

(function (globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function (n) {
    var v=0;
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  
  /* gettext library */

  django.catalog = {
    "%curr% of %total%": "%total% \uc911 %curr%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">\uc774\ubbf8\uc9c0</a>\ub97c \ubd88\ub7ec\uc62c \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.", 
    "Are you sure you want to delete these selected items?": "\uc815\ub9d0\ub85c \uc120\ud0dd\ud55c \ud56d\ubaa9\uc744 \uc0ad\uc81c\ud560\uae4c\uc694?", 
    "Cancel": "\ucde8\uc18c", 
    "Canceled.": "\ucde8\uc18c\ud588\uc2b5\ub2c8\ub2e4.", 
    "Close (Esc)": "\ub2eb\uae30(Esc)", 
    "Copy {placeholder} to:": "\ub2e4\uc74c\uc73c\ub85c {placeholder} \ubcf5\uc0ac:", 
    "Copying %(name)s": "{placeholder} \ubcf5\uc0ac \uc911", 
    "Copying file %(index)s of %(total)s": "\ud30c\uc77c %(total)s\uac1c \uc911 %(index)s\uac1c \ubcf5\uc0ac \uc911", 
    "Delete": "\uc0ad\uc81c", 
    "Delete Items": "\ud56d\ubaa9 \uc0ad\uc81c", 
    "Delete failed": "\uc0ad\uc81c \uc2e4\ud328", 
    "Delete succeeded.": "\uc0c1\uacf5\uc801\uc73c\ub85c \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4.", 
    "Edit failed": "\ud3b8\uc9d1 \uc2e4\ud328", 
    "Empty file upload result": "\uc5c5\ub85c\ub4dc \uacb0\uacfc\uac00 \ube48 \ud30c\uc77c\uc785\ub2c8\ub2e4", 
    "Error": "\uc624\ub958", 
    "Failed to copy %(name)s": "%(name)s \ubcf5\uc0ac\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Failed to delete %(name)s and %(amount)s other items.": "%(name)s \ubc0f \ud56d\ubaa9 %(amount)s\uac1c \uc0ad\uc81c\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Failed to delete %(name)s and 1 other item.": "%(name)s \ubc0f \ud56d\ubaa9 1\uac1c \uc0ad\uc81c\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Failed to delete %(name)s.": "%(name)s \uc0ad\uc81c\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Failed to get update url": "\uc5c5\ub85c\ub4dc URL \uac00\uc838\uc624\uae30\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4", 
    "Failed to get upload url": "\uc5c5\ub85c\ub4dc URL \uac00\uc838\uc624\uae30\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4", 
    "Failed to move %(name)s": "%(name)s \uc774\ub3d9\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Failed to send to {placeholder}": "{placeholder}\uc5d0\uac8c \ubcf4\ub0b4\uae30\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4", 
    "Failed to share to {placeholder}": "{placeholder}\uc5d0\uac8c \uacf5\uc720\ud558\uae30\ub97c \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4", 
    "Failed.": "\uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Failed. Please check the network.": "\uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. \ub124\ud2b8\uc6cc\ud06c\ub97c \ud655\uc778\ud558\uc138\uc694.", 
    "File Upload canceled": "\ud30c\uc77c \uc5c5\ub85c\ub4dc\ub97c \ucde8\uc18c\ud588\uc2b5\ub2c8\ub2e4", 
    "File Upload complete": "\ud30c\uc77c \uc5c5\ub85c\ub4dc\uac00 \ub05d\ub0ac\uc2b5\ub2c8\ub2e4", 
    "File Upload failed": "\ud30c\uc77c \uc5c5\ub85c\ub4dc\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4", 
    "File Uploading...": "\ud30c\uc77c \uc5c5\ub85c\ub4dc \uc911...", 
    "File is locked": "\ud30c\uc77c\uc774 \uc7a0\uaca8\uc788\uc2b5\ub2c8\ub2e4", 
    "File is too big": "\ud30c\uc77c\uc774 \ub108\ubb34 \ud07d\ub2c8\ub2e4", 
    "File is too small": "\ud30c\uc77c\uc774 \ub108\ubb34 \uc791\uc2b5\ub2c8\ub2e4", 
    "Filetype not allowed": "\ud30c\uc77c \ud615\uc2dd\uc744 \ud5c8\uc6a9\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4", 
    "Hide": "\uc228\uae40", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "\ub0b4\ubd80 \uc624\ub958\uc785\ub2c8\ub2e4. %(name)s \ubc0f \ud56d\ubaa9 %(amount)s\uac1c \ubcf5\uc0ac\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Internal error. Failed to copy %(name)s.": "\ub0b4\ubd80 \uc624\ub958\uc785\ub2c8\ub2e4. %(name)s \ubcf5\uc0ac\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "\ub0b4\ubd80 \uc624\ub958\uc785\ub2c8\ub2e4. %(name)s \ubc0f \ud56d\ubaa9 %(amount)s\uac1c \uc774\ub3d9\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Internal error. Failed to move %(name)s.": "\ub0b4\ubd80 \uc624\ub958\uc785\ub2c8\ub2e4. %(name)s \uc774\ub3d9\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", 
    "Invalid destination path": "\uc798\ubabb\ub41c \ub300\uc0c1 \uacbd\ub85c", 
    "It is required.": "\ud544\uc694\ud569\ub2c8\ub2e4.", 
    "Just now": "\uc9c0\uae08", 
    "Loading...": "\ubd88\ub7ec\uc624\ub294 \uc911...", 
    "Max number of files exceeded": "\ucd5c\ub300 \ud30c\uc77c \uac2f\uc218\ub97c \ub118\uc5b4\uc130\uc2b5\ub2c8\ub2e4", 
    "Move {placeholder} to:": "\ub2e4\uc74c\uc73c\ub85c {placeholder} \uc774\ub3d9:", 
    "Moving %(name)s": "{placeholder} \uc774\ub3d9 \uc911", 
    "Moving file %(index)s of %(total)s": "\ud30c\uc77c %(total)s\uac1c \uc911 %(index)s\uac1c \uc774\ub3d9 \uc911", 
    "Name is required": "\uc774\ub984\uc774 \ud544\uc694\ud569\ub2c8\ub2e4", 
    "Next (Right arrow key)": "\ub2e4\uc74c(\uc624\ub978\ucabd \ud654\uc0b4\ud45c \ud0a4)", 
    "Only an extension there, please input a name.": "\ud655\uc7a5\uc790\ub9cc \uc788\uc2b5\ub2c8\ub2e4. \uc774\ub984\uc744 \uc785\ub825\ud558\uc138\uc694.", 
    "Open in New Tab": "\uc0c8 \ud0ed \uc5f4\uae30", 
    "Password is required.": "\uc554\ud638\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.", 
    "Password is too short": "\uc554\ud638\uac00 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4", 
    "Passwords don't match": "\uc554\ud638\uac00 \uc77c\uce58\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4", 
    "Permission error": "\uad8c\ud55c \uc624\ub958", 
    "Please check the network.": "\ub124\ud2b8\uc6cc\ud06c\ub97c \ud655\uc778\ud558\uc138\uc694.", 
    "Please choose a directory": "\ub514\ub809\ud130\ub9ac\ub97c \uc120\ud0dd\ud558\uc138\uc694", 
    "Please enter days.": "\uc77c\uc790\ub97c \uc785\ub825\ud558\uc138\uc694.", 
    "Please enter password": "\uc554\ud638\ub97c \uc785\ub825\ud558\uc138\uc694", 
    "Please enter the password again": "\uc554\ud638\ub97c \ub2e4\uc2dc \uc785\ub825\ud558\uc138\uc694", 
    "Please enter valid days": "\uc720\ud6a8 \uae30\uac04\uc744 \uc785\ub825\ud558\uc138\uc694", 
    "Please input at least an email.": "\ucd5c\uc18c\ud55c \ud558\ub098\uc758 \uc804\uc790\uba54\uc77c \uc8fc\uc18c\ub97c \uc785\ub825\ud558\uc138\uc694.", 
    "Previous (Left arrow key)": "\uc774\uc804(\uc67c\ucabd \ud654\uc0b4\ud45c \ud0a4)", 
    "Processing...": "\ucc98\ub9ac \uc911...", 
    "Really want to delete {lib_name}?": "{lib_name} \ub77c\uc774\ube0c\ub7ec\ub9ac\ub97c \uc815\ub9d0 \uc0ad\uc81c\ud560\uae4c\uc694?", 
    "Rename Directory": "\ub514\ub809\ud130\ub9ac \uc774\ub984 \ubc14\uafb8\uae30", 
    "Rename File": "\ud30c\uc77c \uc774\ub984 \ubc14\uafb8\uae30", 
    "Replace file {filename}?": "{filename} \ud30c\uc77c\uc744 \ubc14\uafc0\uae4c\uc694?", 
    "Saving...": "\uc800\uc7a5 \uc911...", 
    "Search users or enter emails": "\uc0ac\uc6a9\uc790 \uac80\uc0c9 \ub610\ub294 \uc804\uc790\uba54\uc77c \uc8fc\uc18c \uc785\ub825", 
    "Select groups": "\uadf8\ub8f9 \uc120\ud0dd", 
    "Set {placeholder}'s permission": "{placeholder} \uad8c\ud55c \uc124\uc815", 
    "Share failed": "\uacf5\uc720 \uc2e4\ud328", 
    "Share {placeholder}": "{placeholder} \uacf5\uc720", 
    "Show": "\ud45c\uc2dc", 
    "Start": "\uc2dc\uc791", 
    "Success": "\uc131\uacf5", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s \ubc0f \ud56d\ubaa9 %(amount)s\uac1c\ub97c \uc131\uacf5\uc801\uc73c\ub85c \ubcf5\uc0ac\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully copied %(name)s and 1 other item.": "%(name)s \ubc0f \ud56d\ubaa9 1\uac1c\ub97c \uc131\uacf5\uc801\uc73c\ub85c \ubcf5\uc0ac\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully copied %(name)s.": "%(name)s\uc744(\ub97c) \uc131\uacf5\uc801\uc73c\ub85c \ubcf5\uc0ac\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully deleted %(name)s": "%(name)s\uc744(\ub97c) \uc131\uacf5\uc801\uc73c\ub85c \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4", 
    "Successfully deleted %(name)s and %(amount)s other items.": "%(name)s \ubc0f \ud56d\ubaa9 %(amount)s\uac1c\ub97c \uc131\uacf5\uc801\uc73c\ub85c \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully deleted %(name)s and 1 other item.": "%(name)s \ubc0f \ud56d\ubaa9 1\uac1c\ub97c \uc131\uacf5\uc801\uc73c\ub85c \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully deleted %(name)s.": "%(name)s\uc744(\ub97c) \uc131\uacf5\uc801\uc73c\ub85c \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s \ubc0f \ud56d\ubaa9 %(amount)s\uac1c\ub97c \uc131\uacf5\uc801\uc73c\ub85c \uc774\ub3d9\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully moved %(name)s and 1 other item.": "%(name)s \ubc0f \ud56d\ubaa9 1\uac1c\ub97c \uc131\uacf5\uc801\uc73c\ub85c \uc774\ub3d9\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully moved %(name)s.": "%(name)s\uc744(\ub97c) \uc131\uacf5\uc801\uc73c\ub85c \uc774\ub3d9\ud588\uc2b5\ub2c8\ub2e4.", 
    "Successfully sent to {placeholder}": "{placeholder}\uc5d0\uac8c \uc131\uacf5\uc801\uc73c\ub85c \ubcf4\ub0c8\uc2b5\ub2c8\ub2e4", 
    "Successfully unshared {placeholder}": "{placeholder}\uc744(\ub97c) \uc131\uacf5\uc801\uc73c\ub85c \uacf5\uc720 \ud574\uc81c\ud588\uc2b5\ub2c8\ub2e4", 
    "Successfully unstared {placeholder}": "{placeholder}\uc744(\ub97c) \uc131\uacf5\uc801\uc73c\ub85c \ubcc4\ud45c \ud574\uc81c\ud588\uc2b5\ub2c8\ub2e4.", 
    "Uploaded bytes exceed file size": "\uc5c5\ub85c\ub4dc\ud55c \ud30c\uc77c \ud06c\uae30 \uc81c\ud55c\uc744 \ub118\uc5b4\uc130\uc2b5\ub2c8\ub2e4", 
    "You don't have any library at present.": "\ud604\uc7ac \uc5b4\ub5a4 \ub77c\uc774\ube0c\ub7ec\ub9ac\ub3c4 \uc5c6\uc2b5\ub2c8\ub2e4.", 
    "You have not renamed it.": "\uc774\ub984\uc744 \ubc14\uafb8\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.", 
    "canceled": "\ucde8\uc18c\ud568", 
    "locked by {placeholder}": "{placeholder}\uc774(\uac00) \uc7a0\uae08", 
    "uploaded": "\uc5c5\ub85c\ub4dc\ud568"
  };

  django.gettext = function (msgid) {
    var value = django.catalog[msgid];
    if (typeof(value) == 'undefined') {
      return msgid;
    } else {
      return (typeof(value) == 'string') ? value : value[0];
    }
  };

  django.ngettext = function (singular, plural, count) {
    var value = django.catalog[singular];
    if (typeof(value) == 'undefined') {
      return (count == 1) ? singular : plural;
    } else {
      return value[django.pluralidx(count)];
    }
  };

  django.gettext_noop = function (msgid) { return msgid; };

  django.pgettext = function (context, msgid) {
    var value = django.gettext(context + '\x04' + msgid);
    if (value.indexOf('\x04') != -1) {
      value = msgid;
    }
    return value;
  };

  django.npgettext = function (context, singular, plural, count) {
    var value = django.ngettext(context + '\x04' + singular, context + '\x04' + plural, count);
    if (value.indexOf('\x04') != -1) {
      value = django.ngettext(singular, plural, count);
    }
    return value;
  };
  

  django.interpolate = function (fmt, obj, named) {
    if (named) {
      return fmt.replace(/%\(\w+\)s/g, function(match){return String(obj[match.slice(2,-2)])});
    } else {
      return fmt.replace(/%s/g, function(match){return String(obj.shift())});
    }
  };


  /* formatting library */

  django.formats = {
    "DATETIME_FORMAT": "Y\ub144 n\uc6d4 j\uc77c g:i:s A", 
    "DATETIME_INPUT_FORMATS": [
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d", 
      "%m/%d/%Y %H:%M:%S", 
      "%m/%d/%Y %H:%M", 
      "%m/%d/%Y", 
      "%m/%d/%y %H:%M:%S", 
      "%m/%d/%y %H:%M", 
      "%m/%d/%y", 
      "%Y\ub144 %m\uc6d4 %d\uc77c %H\uc2dc %M\ubd84 %S\ucd08", 
      "%Y\ub144 %m\uc6d4 %d\uc77c %H\uc2dc %M\ubd84", 
      "%Y-%m-%d %H:%M:%S.%f"
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
    "MONTH_DAY_FORMAT": "F\uc6d4 j\uc77c", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "Y-n-j H:i", 
    "SHORT_DATE_FORMAT": "Y-n-j.", 
    "THOUSAND_SEPARATOR": ",", 
    "TIME_FORMAT": "A g:i:s", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H:%M", 
      "%H\uc2dc %M\ubd84 %S\ucd08", 
      "%H\uc2dc %M\ubd84"
    ], 
    "YEAR_MONTH_FORMAT": "Y\ub144 F\uc6d4"
  };

  django.get_format = function (format_type) {
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

}(this));

