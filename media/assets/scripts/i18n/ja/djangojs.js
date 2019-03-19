

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
    "Are you sure you want to clear trash?": "\u30b4\u30df\u7bb1\u3092\u7a7a\u306b\u3057\u3066\u3088\u3044\u3067\u3057\u3087\u3046\u304b\uff1f", 
    "Are you sure you want to delete %s ?": "%s \u3092\u524a\u9664\u3057\u3066\u5b9c\u3057\u3044\u3067\u3057\u3087\u3046\u304b\uff1f", 
    "Are you sure you want to delete %s completely?": "%s \u3092\u5b8c\u5168\u306b\u524a\u9664\u3057\u3066\u672c\u5f53\u306b\u826f\u3044\u3067\u3059\u304b\uff1f", 
    "Are you sure you want to delete all %s's libraries?": "\u3059\u3079\u3066\u306e %s \u30e9\u30a4\u30d6\u30e9\u30ea\u3092\u524a\u9664\u3057\u3066\u3001\u672c\u5f53\u306b\u3088\u308d\u3057\u3044\u3067\u3059\u304b\uff1f", 
    "Are you sure you want to quit this group?": "\u3053\u306e\u30b0\u30eb\u30fc\u30d7\u304b\u3089\u8131\u9000\u3057\u3066\u3088\u3044\u3067\u3059\u304b\uff1f", 
    "Are you sure you want to restore %s?": "%s \u3092\u5fa9\u5143\u3057\u3066\u3088\u308d\u3057\u3044\u3067\u3057\u3087\u3046\u304b\uff1f", 
    "Are you sure you want to unshare %s ?": "%s \u306e\u5171\u6709\u3092\u672c\u5f53\u306b\u5916\u3057\u307e\u3059\u304b\uff1f", 
    "Cancel": "\u30ad\u30e3\u30f3\u30bb\u30eb", 
    "Canceled.": "\u30ad\u30e3\u30f3\u30bb\u30eb\u3057\u307e\u3057\u305f", 
    "Clear Trash": "\u30b4\u30df\u7bb1\u3092\u7a7a\u306b\u3059\u308b", 
    "Copying %(name)s": "\u300c%(name)s\u300d\u3092\u30b3\u30d4\u30fc\u4e2d", 
    "Copying file %(index)s of %(total)s": "\u30d5\u30a1\u30a4\u30eb %(index)s / %(total)s\u30b3\u30d4\u30fc\u4e2d", 
    "Delete": "\u524a\u9664", 
    "Delete Group": "\u30b0\u30eb\u30fc\u30d7\u524a\u9664", 
    "Delete Items": "\u524a\u9664\u3057\u305f\u30a2\u30a4\u30c6\u30e0", 
    "Delete Library": "\u30e9\u30a4\u30d6\u30e9\u30ea\u524a\u9664", 
    "Delete Member": "\u30e1\u30f3\u30d0\u30fc\u524a\u9664", 
    "Delete User": "\u30e6\u30fc\u30b6\u524a\u9664", 
    "Deleted directories": "\u524a\u9664\u3055\u308c\u305f\u30c7\u30a3\u30ec\u30af\u30c8\u30ea\u30fc", 
    "Deleted files": "\u524a\u9664\u3055\u308c\u305f\u30d5\u30a1\u30a4\u30eb", 
    "Dismiss Group": "\u30b0\u30eb\u30fc\u30d7\u524a\u9664", 
    "Edit Page": "\u30da\u30fc\u30b8\u3092\u7de8\u96c6\u3059\u308b", 
    "Error": "\u30a8\u30e9\u30fc", 
    "Failed.": "\u5931\u6557\u3002", 
    "Failed. Please check the network.": "\u64cd\u4f5c\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u3092\u3054\u78ba\u8a8d\u304f\u3060\u3055\u3044\u3002", 
    "File Upload canceled": "\u30d5\u30a1\u30a4\u30eb\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u304c\u30ad\u30e3\u30f3\u30bb\u30eb\u3055\u308c\u307e\u3057\u305f", 
    "File Upload complete": "\u30d5\u30a1\u30a4\u30eb\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f", 
    "File Upload failed": "\u30d5\u30a1\u30a4\u30eb\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u304c\u5931\u6557\u3057\u307e\u3057\u305f", 
    "File Uploading...": "\u30d5\u30a1\u30a4\u30eb\u306e\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u4e2d", 
    "File is too big": "\u30d5\u30a1\u30a4\u30eb\u304c\u5927\u304d\u3059\u304e\u307e\u3059", 
    "File is too small": "\u30d5\u30a1\u30a4\u30eb\u304c\u5c0f\u3055\u3059\u304e\u307e\u3059", 
    "Filetype not allowed": "\u30d5\u30a1\u30a4\u30eb\u30bf\u30a4\u30d7\u304c\u8a31\u53ef\u3055\u308c\u3066\u3044\u307e\u305b\u3093", 
    "Internal error. Failed to copy %(name)s.": "\u5185\u90e8\u30a8\u30e9\u30fc\u3002\u300c%(name)s\u300d\u306e\u30b3\u30d4\u30fc\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002", 
    "Internal error. Failed to move %(name)s.": "\u5185\u90e8\u30a8\u30e9\u30fc\u3002\u300c%(name)s\u300d\u306e\u79fb\u52d5\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002", 
    "Invalid destination path": "\u884c\u304d\u5148\u30d1\u30b9\u540d\u304c\u4e0d\u6b63\u3067\u3059\u3002", 
    "It is required.": "\u5165\u529b\u5fc5\u9808\u3067\u3059", 
    "Just now": "\u305f\u3060\u4eca", 
    "Last Update": "\u524d\u56de\u306e\u66f4\u65b0", 
    "Loading...": "\u8aad\u307f\u8fbc\u307f\u4e2d...", 
    "Log out": "\u30ed\u30b0\u30a2\u30a6\u30c8", 
    "Modified files": "\u5909\u66f4\u3055\u308c\u305f\u30d5\u30a1\u30a4\u30eb", 
    "Moving %(name)s": "\u300c%(name)s\u300d\u3092\u79fb\u52d5\u4e2d", 
    "Moving file %(index)s of %(total)s": "\u30d5\u30a1\u30a4\u30eb %(index)s / %(total)s\u79fb\u52d5\u4e2d", 
    "Name": "\u6c0f\u540d", 
    "Name is required": "\u540d\u524d\u306f\u5fc5\u9808\u9805\u76ee\u3067\u3059\u3002", 
    "Name is required.": "\u6c0f\u540d\u306f\u5fc5\u9808\u9805\u76ee\u3067\u3059\u3002", 
    "New File": "\u65b0\u898f\u30d5\u30a1\u30a4\u30eb", 
    "New directories": "\u65b0\u898f\u30c7\u30a3\u30ec\u30af\u30c8\u30ea\u30fc", 
    "New files": "\u65b0\u898f\u30d5\u30a1\u30a4\u30eb", 
    "New password is too short": "\u65b0\u3057\u3044\u30d1\u30b9\u30ef\u30fc\u30c9\u306f\u77ed\u3059\u304e\u307e\u3059", 
    "New passwords don't match": "\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u4e00\u81f4\u3057\u307e\u305b\u3093\u3002", 
    "Only an extension there, please input a name.": "\u62e1\u5f35\u5b50\u3057\u304b\u6709\u308a\u307e\u305b\u3093\u3002\u540d\u524d\u3092\u5165\u308c\u3066\u304f\u3060\u3055\u3044\u3002", 
    "Pages": "\u30da\u30fc\u30b8", 
    "Password is required.": "\u30d1\u30b9\u30ef\u30fc\u30c9\u306f\u5165\u529b\u5fc5\u9808\u3067\u3059", 
    "Password is too short": "\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u77ed\u3059\u304e\u307e\u3059\u3002", 
    "Passwords don't match": "\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u4e00\u81f4\u3057\u307e\u305b\u3093\u3002", 
    "Please check the network.": "\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u3092\u3054\u78ba\u8a8d\u304f\u3060\u3055\u3044\u3002", 
    "Please choose a CSV file": "CSV\u30d5\u30a1\u30a4\u30eb\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044", 
    "Please click and choose a directory.": "\u30af\u30ea\u30c3\u30af\u3057\u3066\u30c7\u30a3\u30ec\u30af\u30c8\u30ea\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002", 
    "Please enter password": "\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044", 
    "Please enter the new password again": "\u65b0\u3057\u3044\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u518d\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044", 
    "Please enter the old password": "\u65e7\u3044\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044", 
    "Please enter the password again": "\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u518d\u5ea6\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044", 
    "Please enter valid days": "\u6709\u52b9\u306a\u65e5\u6570\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002", 
    "Please input at least an email.": "1\u3064\u306e\u4ee5\u4e0a\u306e\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044", 
    "Processing...": "\u51e6\u7406\u4e2d", 
    "Quit Group": "\u30b0\u30eb\u30fc\u30d7\u3092\u629c\u3051\u308b", 
    "Read-Only": "\u8aad\u307f\u306e\u307f", 
    "Read-Write": "\u8aad\u307f/\u66f8\u304d", 
    "Really want to dismiss this group?": "\u3053\u306e\u30b0\u30eb\u30fc\u30d7\u3092\u672c\u5f53\u306b\u524a\u9664\u3057\u307e\u3059\u304b\uff1f", 
    "Rename": "\u540d\u524d\u306e\u5909\u66f4", 
    "Rename File": "\u30d5\u30a1\u30a4\u30eb\u3092\u6539\u540d", 
    "Renamed or Moved files": "\u30d5\u30a1\u30a4\u30eb\u306f\u3001\u6539\u540d\u3055\u308c\u305f\u304b\u79fb\u52d5\u3055\u308c\u305f", 
    "Restore Library": "\u30e9\u30a4\u30d6\u30e9\u30ea\u306e\u5fa9\u5143", 
    "Saving...": "\u4fdd\u5b58\u4e2d...", 
    "Search files in this wiki": "Wiki\u306e\u30d5\u30a1\u30a4\u30eb\u306e\u691c\u7d22", 
    "Settings": "\u8a2d\u5b9a", 
    "Size": "\u30b5\u30a4\u30ba", 
    "Start": "\u958b\u59cb", 
    "Submit": "\u767b\u9332", 
    "Success": "\u6210\u529f", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s \u306e\u307b\u304b%(amount)s\u9805\u76ee\u3092\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f\u3002", 
    "Successfully copied %(name)s and 1 other item.": " %(name)s \u307b\u304b\uff11\u9805\u76ee\u3092\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f\u3002", 
    "Successfully copied %(name)s.": "\u300c%(name)s\u300d\u3092\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f\u3002", 
    "Successfully deleted %(name)s": " %(name)s \u304c\u524a\u9664\u3055\u308c\u307e\u3057\u305f\u3002", 
    "Successfully deleted %(name)s.": "%(name)s\u3092\u524a\u9664\u3057\u307e\u3057\u305f\u3002", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s \u306e\u307b\u304b%(amount)s\u9805\u76ee\u3092\u79fb\u52d5\u3057\u307e\u3057\u305f\u3002", 
    "Successfully moved %(name)s and 1 other item.": " %(name)s \u307b\u304b\uff11\u9805\u76ee\u3092\u79fb\u52d5\u3057\u307e\u3057\u305f\u3002", 
    "Successfully moved %(name)s.": "\u300c%(name)s\u300d\u3092\u79fb\u52d5\u3057\u307e\u3057\u305f\u3002", 
    "System Admin": "\u30b7\u30b9\u30c6\u30e0\u7ba1\u7406", 
    "Transfer Library": "\u30e9\u30a4\u30d6\u30e9\u30ea\u306e\u79fb\u8ee2", 
    "Unshare Library": "\u30e9\u30a4\u30d6\u30e9\u30ea\u5171\u6709\u3092\u5916\u3059", 
    "Uploaded bytes exceed file size": "\u30d5\u30a1\u30a4\u30eb\u306e\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u6700\u5927\u30b5\u30a4\u30ba\u3092\u8d85\u3048\u307e\u3057\u305f", 
    "Used": "\u5229\u7528\u4e2d", 
    "canceled": "\u30ad\u30e3\u30f3\u30bb\u30eb\u3057\u307e\u3057\u305f", 
    "uploaded": "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u3055\u308c\u307e\u3057\u305f"
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
    "FIRST_DAY_OF_WEEK": "0", 
    "MONTH_DAY_FORMAT": "n\u6708j\u65e5", 
    "NUMBER_GROUPING": "0", 
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

