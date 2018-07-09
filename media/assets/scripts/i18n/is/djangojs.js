

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=(n % 10 != 1 || n % 100 == 11);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "%curr% of %total%": "%curr% af %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">Myndina</a> var ekki h\u00e6gt a\u00f0 hla\u00f0a inn.", 
    "Are you sure you want to delete these selected items?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir ey\u00f0a \u00feessum v\u00f6ldu atri\u00f0um?", 
    "Are you sure you want to quit this group?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir h\u00e6tta \u00ed \u00feessum h\u00f3pi?", 
    "Cancel": "H\u00e6tta vi\u00f0", 
    "Canceled.": "H\u00e6tt vi\u00f0", 
    "Change Password of Library {placeholder}": "Breyta Lykilor\u00f0i Safns {placeholder}", 
    "Close (Esc)": "Loka (Esc)", 
    "Copy selected item(s) to:": "Afrita merkt atri\u00f0i \u00ed:", 
    "Copy {placeholder} to:": "Afrita {placeholder} til:", 
    "Copying %(name)s": "Afrita %(name)s", 
    "Copying file %(index)s of %(total)s": "Afrita skr\u00e1 %(index)s af %(total)s", 
    "Delete": "Ey\u00f0a", 
    "Delete Items": "Eyddum atri\u00f0um", 
    "Delete failed": "Ey\u00f0sla mist\u00f3kst", 
    "Deleted directories": "Eyddar m\u00f6ppur", 
    "Deleted files": "Eyddar skr\u00e1r", 
    "Dismiss Group": "Ey\u00f0a Gr\u00fappu", 
    "Edit failed": "Breyting mist\u00f3kst", 
    "Empty file upload result": "Upphle\u00f0slusta\u00f0a t\u00f3mra skr\u00e1a", 
    "Encrypted library": "Dulk\u00f3\u00f0a\u00f0 safn", 
    "Error": "Villa", 
    "Expired": "\u00datrunni\u00f0", 
    "Failed to copy %(name)s": "Mist\u00f3kst a\u00f0 afrita %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Mist\u00f3kst a\u00f0 ey\u00f0a %(name)s og %(amount)s \u00f6\u00f0rum atri\u00f0um.", 
    "Failed to delete %(name)s and 1 other item.": "Mist\u00f3kst a\u00f0 ey\u00f0a %(name)s og einu \u00f6\u00f0ru atri\u00f0i.", 
    "Failed to delete %(name)s.": "Mist\u00f3kst a\u00f0 ey\u00f0a %(name)s.", 
    "Failed to move %(name)s": "Mist\u00f3kst a\u00f0 f\u00e6ra %(name)s", 
    "Failed to send to {placeholder}": "Mist\u00f3kst a\u00f0 senda til {placeholder}", 
    "Failed.": "Mist\u00f3kst.", 
    "Failed. Please check the network.": "Mist\u00f3kst. Vinsamlegast veldu netkerfi.", 
    "File Upload canceled": "H\u00e6tt vi\u00f0 upphle\u00f0slu skr\u00e1ar", 
    "File Upload complete": "Upphle\u00f0slu skr\u00e1ar loki\u00f0", 
    "File Upload failed": "Upphle\u00f0sla skr\u00e1ar mist\u00f3kst", 
    "File Uploading...": "Skr\u00e1 hle\u00f0st upp...", 
    "File is locked": "Skr\u00e1 er l\u00e6st", 
    "File is too big": "Skr\u00e1 er of st\u00f3r", 
    "File is too small": "Skr\u00e1 er of sm\u00e1", 
    "Filetype not allowed": "Skr\u00e1arger\u00f0 er ekki leyf\u00f0", 
    "Hide": "Fela", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "kerfisvilla. Mist\u00f3kst a\u00f0 afrita %(name)s og %(amount)s \u00f6\u00f0ru(m) atri\u00f0i/atri\u00f0um.", 
    "Internal error. Failed to copy %(name)s.": "Kerfisvilla. Mist\u00f3kst a\u00f0 afrita %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Kerfisvilla. Mist\u00f3kst a\u00f0 f\u00e6ra %(name)s og %(amount)s \u00f6\u00f0ru(m) atri\u00f0i/atri\u00f0um.", 
    "Internal error. Failed to move %(name)s.": "Kerfisvilla. Mist\u00f3kst a\u00f0 f\u00e6ra %(name)s.", 
    "Invalid destination path": "R\u00f6ng lokasl\u00f3\u00f0", 
    "It is required.": "\u00deess er krafist.", 
    "Just now": "R\u00e9tt \u00ed \u00feessu", 
    "Loading failed": "Hle\u00f0sla mist\u00f3kst", 
    "Loading...": "Hle\u00f0...", 
    "Modified files": "Breyttar skr\u00e1r", 
    "Move selected item(s) to:": "F\u00e6r\u00f0i merkt atri\u00f0i \u00ed:", 
    "Move {placeholder} to:": "F\u00e6ara {placeholder} til:", 
    "Moving %(name)s": "F\u00e6ri %(name)s", 
    "Moving file %(index)s of %(total)s": "F\u00e6ri skr\u00e1 %(index)s af %(total)s", 
    "Name is required": "Nafn er skilyr\u00f0i", 
    "New directories": "N\u00fdjar m\u00f6ppur", 
    "New files": "N\u00fdjar skr\u00e1r", 
    "New password is too short": "N\u00fdja lykilor\u00f0i\u00f0 er of stutt", 
    "New passwords don't match": "N\u00fdju lykilor\u00f0in stemma ekki", 
    "Next (Right arrow key)": "N\u00e6sta (h\u00e6gri \u00f6rvalykill)", 
    "No matches": "Engin samsv\u00f6run", 
    "Only an extension there, please input a name.": "H\u00e9r er a\u00f0eins nafnaukinn, vinsamlegast sl\u00e1\u00f0u inn nafn.", 
    "Open in New Tab": "Opna \u00ed n\u00fdjum flipa", 
    "Password is required.": "Lykilor\u00f0s er krafist.", 
    "Password is too short": "Lykilor\u00f0i\u00f0 er of stutt", 
    "Passwords don't match": "Lykilor\u00f0in stemma ekki", 
    "Permission error": "R\u00e9ttindavilla", 
    "Please check the network.": "Vinsamlegast athuga\u00f0u netkerfi\u00f0.", 
    "Please choose a CSV file": "Vinsamlegast veldu CSV skr\u00e1", 
    "Please click and choose a directory.": "Vinsamlegast smelltu og veldu m\u00f6ppu.", 
    "Please enter 1 or more character": "Vinsamlegast sl\u00e1\u00f0u inn 1 e\u00f0a fleiri stafi", 
    "Please enter a new password": "Vinsamlegast sl\u00e1\u00f0u inn n\u00fdja lykilor\u00f0i\u00f0", 
    "Please enter days.": "Vinsamlegast sl\u00e1\u00f0u inn daga.", 
    "Please enter password": "Vinsamlegast sl\u00e1\u00f0u inn lykilor\u00f0", 
    "Please enter the new password again": "Vinsamlegast sl\u00e1\u00f0u inn n\u00fdja lykilor\u00f0i\u00f0 aftur", 
    "Please enter the old password": "Vinsamlegast sl\u00e1\u00f0u inn gamla lykilor\u00f0i\u00f0", 
    "Please enter the password again": "Vinsamlegast sl\u00e1\u00f0u inn lykilor\u00f0i\u00f0 aftur", 
    "Please enter valid days": "Vinsamlegast sl\u00e1\u00f0u inn l\u00f6glega daga", 
    "Please input at least an email.": "Vindamlegast settu inn amk eitt netfang.", 
    "Previous (Left arrow key)": "Fyrri (vinstri \u00f6rvalykill)", 
    "Processing...": "Vinnsla...", 
    "Quit Group": "H\u00e6tta \u00ed H\u00f3pi", 
    "Read-Only library": "A\u00f0eins-Lesa safn", 
    "Read-Write library": "Lesa-Skrifa safn", 
    "Really want to dismiss this group?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir ey\u00f0a \u00feessum h\u00f3pi?", 
    "Rename File": "Endurnefna Skr\u00e1", 
    "Rename Folder": "Endurnefna M\u00f6ppu", 
    "Renamed or Moved files": "Endurnefndi e\u00f0a F\u00e6r\u00f0i skr\u00e1r", 
    "Replace file {filename}?": "Skipta \u00fat skr\u00e1nni {filename}?", 
    "Saving...": "Vista...", 
    "Search user or enter email and press Enter": "Leita a\u00f0 notanda e\u00f0a sl\u00e1\u00f0u inn netfang og sl\u00e1\u00f0u \u00e1 Enter", 
    "Search users or enter emails and press Enter": "Leita a\u00f0 notendum e\u00f0a netf\u00f6ngum og sl\u00e1\u00f0u \u00e1 Enter", 
    "Searching...": "Leita...", 
    "Select a group": "Veldu gr\u00fappu", 
    "Select groups": "Veldu h\u00f3pa", 
    "Set {placeholder}'s permission": "Setja r\u00e9ttindi {placeholder}", 
    "Share {placeholder}": "Deila {placeholder}", 
    "Show": "S\u00fdna", 
    "Start": "Byrja", 
    "Success": "T\u00f3kst", 
    "Successfully changed library password.": "T\u00f3kst a\u00f0 skipta um lykilor\u00f0 safns.", 
    "Successfully copied %(name)s": "T\u00f3kst a\u00f0 afrita %(name)s", 
    "Successfully copied %(name)s and %(amount)s other items.": "T\u00f3kst a\u00f0 afrita %(name)s og %(amount)s \u00f6\u00f0rum atri\u00f0um.", 
    "Successfully copied %(name)s and 1 other item.": "T\u00f3kst a\u00f0 afrita %(name)s og 1 \u00f6\u00f0ru atri\u00f0i.", 
    "Successfully copied %(name)s.": "T\u00f3kst a\u00f0 afrita %(name)s.", 
    "Successfully deleted %(name)s": "Giftursamlega eyddi %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "T\u00f3kst a\u00f0 ey\u00f0a %(name)s og %(amount)s \u00f6\u00f0rum atri\u00f0um.", 
    "Successfully deleted %(name)s and 1 other item.": "T\u00f3kst a\u00f0 ey\u00f0a %(name)s og 1 \u00f6\u00f0ru atri\u00f0i.", 
    "Successfully deleted %(name)s.": "T\u00f3kst a\u00f0 ey\u00f0a %(name)s.", 
    "Successfully imported.": "T\u00f3kst a\u00f0 flytja inn", 
    "Successfully moved %(name)s": "T\u00f3kst a\u00f0 f\u00e6ra %(name)s", 
    "Successfully moved %(name)s and %(amount)s other items.": "T\u00f3kst a\u00f0 f\u00e6ra %(name)s og %(amount)s \u00f6\u00f0rum atri\u00f0um", 
    "Successfully moved %(name)s and 1 other item.": "T\u00f3kst a\u00f0 f\u00e6ra %(name)s og 1 \u00f6\u00f0ru atri\u00f0i.", 
    "Successfully moved %(name)s.": "T\u00f3kst a\u00f0 flytja %(name)s.", 
    "Successfully sent to {placeholder}": "T\u00f3kst a\u00f0 senda til {placeholder}", 
    "Successfully set library history.": "T\u00f3kst a\u00f0 virkja safnas\u00f6gu.", 
    "Successfully transferred the library.": "T\u00f3kst a\u00f0 f\u00e6ra safni\u00f0.", 
    "Successfully unlink %(name)s.": "T\u00f3kst a\u00f0 aftengja %(name)s.", 
    "Successfully unstared {placeholder}": "T\u00f3kst a\u00f0 taka stj\u00f6rnu af {placeholder}", 
    "Transfer Library {library_name} To": "F\u00e6ra Safn {library_name} Til", 
    "Uploaded bytes exceed file size": "Upphl\u00f6\u00f0num b\u00e6tum skr\u00e1arst\u00e6r\u00f0ar n\u00e1\u00f0", 
    "You can only select 1 item": "\u00de\u00fa getur a\u00f0eins vali\u00f0 1 atri\u00f0i", 
    "You cannot select any more choices": "\u00de\u00fa getur ekki merkt vi\u00f0 fleiri valm\u00f6guleika", 
    "canceled": "h\u00e6tt vi\u00f0", 
    "locked by {placeholder}": "l\u00e6st af {placeholder}", 
    "uploaded": "hla\u00f0i\u00f0 upp", 
    "{placeholder} Folder Permission": "{placeholder} M\u00f6ppu R\u00e9ttindi", 
    "{placeholder} History Setting": "{placeholder} S\u00f6gustilling", 
    "{placeholder} Members": "{placeholder} Me\u00f0limir", 
    "{placeholder} Share Links": "{placeholder} Deilihlekkir"
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
    "DATE_FORMAT": "j. F Y", 
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
    "MONTH_DAY_FORMAT": "j. F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "m/d/Y P", 
    "SHORT_DATE_FORMAT": "j.n.Y", 
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

