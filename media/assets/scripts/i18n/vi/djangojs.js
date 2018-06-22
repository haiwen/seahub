

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
    "Are you sure you want to delete these selected items?": "B\u1ea1n c\u00f3 ch\u1eafc b\u1ea1n mu\u1ed1n x\u00f3a nh\u1eefng item \u0111\u00e3 ch\u1ecdn", 
    "Cancel": "H\u1ee7y", 
    "Canceled.": "H\u1ee7y b\u1ecf", 
    "Copying %(name)s": "\u0110ang sao ch\u00e9p %(name)s", 
    "Copying file %(index)s of %(total)s": "Copying file %(index)s of %(total)s", 
    "Delete": "X\u00f3a", 
    "Delete Items": "X\u00f3a item", 
    "Deleted directories": "X\u00f3a th\u01b0 m\u1ee5c", 
    "Deleted files": "X\u00f3a t\u1eadp tin", 
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
    "Loading failed": "L\u1ed7i loading", 
    "Loading...": "\u0110ang t\u1ea3i...", 
    "Modified files": "S\u1eeda \u0111\u1ed5i t\u1eadp tin", 
    "Moving %(name)s": "\u0110ang di chuy\u1ec3n %(name)s", 
    "Moving file %(index)s of %(total)s": "Moving file %(index)s of %(total)s", 
    "Name is required": "Y\u00eau c\u1ea7u t\u00ean", 
    "New directories": "Th\u01b0 m\u1ee5c m\u1edbi", 
    "New files": "T\u1eadp tin m\u1edbi", 
    "No matches": "Kh\u00f4ng t\u00ecm th\u1ea5y", 
    "Only an extension there, please input a name.": "Ch\u1ec9 c\u00f3 m\u1ed9t ph\u1ea7n m\u1edf r\u1ed9ng n\u00e0y, vui l\u00f2ng nh\u1eadp t\u00ean", 
    "Open in New Tab": "M\u1edf \u1edf Tab m\u1edbi", 
    "Password is required.": "Y\u00eau c\u1ea7u m\u1eadt kh\u1ea9u.", 
    "Password is too short": "M\u1eadt kh\u1ea9u qu\u00e1 ng\u1eafn", 
    "Passwords don't match": "M\u1eadt kh\u1ea9u kh\u00f4ng tr\u00f9ng kh\u1edbp", 
    "Please check the network.": "Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i network.", 
    "Please enter 1 or more character": "Vui l\u00f2ng th\u00eam k\u00fd t\u1ef1", 
    "Please enter password": "Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u", 
    "Please enter the password again": "Vui l\u00f2ng nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u", 
    "Please enter valid days": "Vui l\u00f2ng nh\u1eadp s\u1ed1 \u0111\u00fang", 
    "Please input at least an email.": "Vui l\u00f2ng ch\u1ecdn \u00edt nh\u1ea5t m\u1ed9t \u0111\u1ecba ch\u1ec9 email", 
    "Processing...": "\u0110ang x\u1eed l\u00fd...", 
    "Renamed or Moved files": "\u0110\u1ed5i t\u00ean ho\u1eb7c chuy\u1ec3n t\u1eadp tin", 
    "Saving...": "\u0110ang l\u01b0u...", 
    "Searching...": "\u0110ang t\u00ecm...", 
    "Start": "B\u1eaft \u0111\u1ea7u", 
    "Success": "Th\u00e0nh c\u00f4ng", 
    "Successfully copied %(name)s and %(amount)s other items.": "Sao ch\u00e9p %(name)s v\u00e0 %(amount)s item kh\u00e1c th\u00e0nh c\u00f4ng.", 
    "Successfully copied %(name)s and 1 other item.": "Sao ch\u00e9p %(name)s v\u00e0 1 item kh\u00e1c th\u00e0nh c\u00f4ng.", 
    "Successfully copied %(name)s.": "Sao ch\u00e9p %(name)s th\u00e0nh c\u00f4ng.", 
    "Successfully deleted %(name)s": "X\u00f3a %(name)s th\u00e0nh c\u00f4ng", 
    "Successfully deleted %(name)s and %(amount)s other items.": "X\u00f3a %(name)s v\u00e0 %(amount)s item kh\u00e1c th\u00e0nh c\u00f4ng", 
    "Successfully deleted %(name)s.": "X\u00f3a %(name)s th\u00e0nh c\u00f4ng", 
    "Successfully moved %(name)s and %(amount)s other items.": "Di chuy\u1ec3n %(name)s v\u00e0 %(amount)s item kh\u00e1c th\u00e0nh c\u00f4ng.", 
    "Successfully moved %(name)s and 1 other item.": "Di chuy\u1ec3n %(name)s v\u00e0 1 item kh\u00e1c th\u00e0nh c\u00f4ng.", 
    "Successfully moved %(name)s.": "Di chuy\u1ec3n %(name)s th\u00e0nh c\u00f4ng.", 
    "Successfully sent to {placeholder}": "G\u1edfi th\u00e0nh c\u00f4ng \u0111\u1ebfn {placeholder}", 
    "Uploaded bytes exceed file size": "\u0110\u00e3 t\u1ea3i l\u00ean nh\u1eefng byte v\u01b0\u1ee3t qu\u00e1 k\u00edch th\u01b0\u1edbc c\u1ee7a file", 
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

