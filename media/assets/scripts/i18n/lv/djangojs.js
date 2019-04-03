

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=(n%10==1 && n%100!=11 ? 0 : n != 0 ? 1 : 2);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "Are you sure you want to delete %s ?": "Tie\u0161\u0101m dz\u0113st %s ?", 
    "Are you sure you want to quit this group?": "Tie\u0161\u0101m p\u0101rtraukt", 
    "Are you sure you want to unshare %s ?": "Tie\u0161\u0101m atcelt pieejas %s ?", 
    "Cancel": "Atcelt", 
    "Clients": "Klienti", 
    "Confirm Password": "Apstiprin\u0101t paroli", 
    "Copy": "Kop\u0113t", 
    "Created library": "Kr\u0101tuve izveidota", 
    "Delete": "Dz\u0113st", 
    "Delete Member": "Dz\u0113st biedru", 
    "Deleted directories": "Dz\u0113st\u0101s mapes", 
    "Details": "Deta\u013cas", 
    "Dismiss": "Aizmirst", 
    "Dismiss Group": "Aizmirst grupu", 
    "Download": "Lejupl\u0101d\u0113t", 
    "Edit": "Main\u012bt", 
    "Email": "E-pasts", 
    "Encrypt": "\u0160ifr\u0113t", 
    "Failed.": "Neizdev\u0101s", 
    "Failed. Please check the network.": "Neizdev\u0101s. L\u016bdzu p\u0101rbaudiet t\u012bkla piesl\u0113gumu.", 
    "File": "Datne", 
    "Files": "Datnes", 
    "Group": "Grupa", 
    "Groups": "Grupas", 
    "Help": "Pal\u012bdz\u012bba", 
    "History": "V\u0113sture", 
    "IP": "IP adrese", 
    "Just now": "Tikko", 
    "Last Update": "Atjaunots", 
    "Libraries": "Kr\u0101tuves", 
    "Library": "Kr\u0101tuve", 
    "Links": "Saites", 
    "Loading...": "Iel\u0101de... ", 
    "Log out": "Iziet", 
    "Members": "Biedri", 
    "Modified files": "Main\u012bt\u0101s datnes", 
    "More": "Vair\u0101k", 
    "Move": "P\u0101rvietot", 
    "My Groups": "Manas grupas", 
    "Name": "Nosaukums", 
    "Name(optional)": "V\u0101rds (nav oblig\u0101ti)", 
    "New File": "Jauna datne", 
    "New Group": "Jauna grupa", 
    "New Library": "Jauna kr\u0101tuve", 
    "New directories": "Jaunas mapes", 
    "Next": "N\u0101kamais", 
    "No members": "Nav biedru", 
    "Operations": "Darb\u012bbas", 
    "Password": "Parole", 
    "Password again": "Atk\u0101rtot paroli", 
    "Passwords don't match": "Paroles nesakr\u012bt", 
    "Permission": "Ties\u012bbas", 
    "Permission denied": "Pieeja liegta", 
    "Please check the network.": "L\u016bdzu p\u0101rbaudiet t\u012bkla piesl\u0113gumu", 
    "Please enter the password again": "L\u016bdzu ievad\u012bt paroli v\u0113lreiz", 
    "Previous": "Iepriek\u0161\u0113jais", 
    "Quit Group": "Pamest grupu", 
    "Read-Only": "Tikai las\u012bt", 
    "Read-Write": "Las\u012bt-Rakst\u012bt", 
    "Really want to dismiss this group?": "Tie\u0161\u0101m aizmirst grupu", 
    "Server Version: ": "Servera versija: ", 
    "Settings": "Iestat\u012bjumi", 
    "Share": "Dal\u012bties", 
    "Share To": "Dal\u012bts ar", 
    "Submit": "Pielietot", 
    "Time": "Laiks", 
    "Trash": "Miskaste", 
    "Unshare": "Liegt pieeju", 
    "Unshare Library": "Atcelt pieejas kr\u0101tuvei", 
    "Update": "Atjaunot", 
    "Upload": "Aug\u0161upl\u0101d\u0113t", 
    "Upload Files": "Aug\u0161upl\u0101d\u0113t datnes", 
    "Visits": "Apmekl\u0113jumi", 
    "Wrong password": "K\u013c\u016bdaina parole", 
    "You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.": "Lai organiz\u0113tu savas datnes, veidojiet dat\u0146u kr\u0101tuves, pa vienai katram projektam. Katru kr\u0101tuvi var sinhroniz\u0113t atsevi\u0161\u0137i un katrai var veidot atsevi\u0161\u0137as pieejas", 
    "You can share libraries by clicking the \"New Library\" button above or the \"Share\" icon on your libraries list.": "J\u016bs varat sniegt pieeju kr\u0101tuv\u0113m klik\u0161\u0137inot uz \"Jauna kr\u0101tuve\" pogas vai\"Sniegt pieeju\" pogas kr\u0101tuvju sarakst\u0101", 
    "You have not created any libraries": "Jums nav nevienas kr\u0101tuves", 
    "you can also press \u2190 ": "var spiest ar\u012b  \u2190 "
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
    "DATETIME_FORMAT": "Y. \\g\\a\\d\\a j. F, H:i", 
    "DATETIME_INPUT_FORMATS": [
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%d.%m.%Y %H:%M:%S", 
      "%d.%m.%Y %H:%M:%S.%f", 
      "%d.%m.%Y %H:%M", 
      "%d.%m.%Y", 
      "%d.%m.%y %H:%M:%S", 
      "%d.%m.%y %H:%M:%S.%f", 
      "%d.%m.%y %H:%M", 
      "%d.%m.%y %H.%M.%S", 
      "%d.%m.%y %H.%M.%S.%f", 
      "%d.%m.%y %H.%M", 
      "%d.%m.%y", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "Y. \\g\\a\\d\\a j. F", 
    "DATE_INPUT_FORMATS": [
      "%Y-%m-%d", 
      "%d.%m.%Y", 
      "%d.%m.%y"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "j. F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "j.m.Y H:i", 
    "SHORT_DATE_FORMAT": "j.m.Y", 
    "THOUSAND_SEPARATOR": "\u00a0", 
    "TIME_FORMAT": "H:i", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H:%M:%S.%f", 
      "%H:%M", 
      "%H.%M.%S", 
      "%H.%M.%S.%f", 
      "%H.%M"
    ], 
    "YEAR_MONTH_FORMAT": "Y. \\g. F"
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

