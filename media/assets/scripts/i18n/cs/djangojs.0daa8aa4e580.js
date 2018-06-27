

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=(n==1) ? 0 : (n>=2 && n<=4) ? 1 : 2;
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "%curr% of %total%": "%curr% z %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">Obr\u00e1zek</a> nejde na\u010d\u00edst.", 
    "Are you sure you want to delete these selected items?": "Opravdu chcete smazat tyto polo\u017eky?", 
    "Cancel": "Zru\u0161it", 
    "Canceled.": "Zru\u0161eno.", 
    "Close (Esc)": "Zav\u0159\u00edt (Esc)", 
    "Copy selected item(s) to:": "Zkop\u00edrovat ozna\u010denou polo\u017eku(ky) do:", 
    "Copy {placeholder} to:": "Kop\u00edrovat {placeholder} do:", 
    "Copying %(name)s": "Kop\u00edrov\u00e1n\u00ed %(name)s", 
    "Copying file %(index)s of %(total)s": "Kop\u00edrov\u00e1n\u00ed souboru %(index)s ze %(total)s", 
    "Delete": "Smazat", 
    "Delete Items": "Vymazat polo\u017eky", 
    "Delete failed": "Smaz\u00e1n\u00ed selhalo", 
    "Deleted directories": "Smazan\u00e9 adres\u00e1\u0159e", 
    "Deleted files": "Smazan\u00e9 soubory", 
    "Edit failed": "Editace selhala.", 
    "Empty file upload result": "Pr\u00e1zdn\u00fd v\u00fdsledek nahr\u00e1v\u00e1n\u00ed souboru", 
    "Error": "Chyba", 
    "Expired": "Vypr\u0161en\u00fd", 
    "Failed to copy %(name)s": "Chyba p\u0159i kop\u00edrov\u00e1n\u00ed %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Smaz\u00e1n\u00ed selhalo %(name)s a %(amount)s dal\u0161\u00edch polo\u017eek.", 
    "Failed to delete %(name)s and 1 other item.": "Smaz\u00e1n\u00ed selhalo: %(name)s a 1 dal\u0161\u00edch polo\u017eek.", 
    "Failed to delete %(name)s.": "Smaz\u00e1n\u00ed selhalo: %(name).", 
    "Failed to get update url": "Chyba p\u0159i z\u00edsk\u00e1v\u00e1n\u00ed url aktualizace", 
    "Failed to get upload url": "Chyba p\u0159i z\u00edsk\u00e1v\u00e1n\u00ed url nahr\u00e1v\u00e1n\u00ed", 
    "Failed to move %(name)s": "Chyba p\u0159i p\u0159esunu %(name)s", 
    "Failed to send to {placeholder}": "Chyba p\u0159i odes\u00edl\u00e1n\u00ed do {placeholder}", 
    "Failed.": "Chyba.", 
    "Failed. Please check the network.": "Chyba. Pros\u00edm zkontrolujte s\u00ed\u0165.", 
    "File Upload canceled": "Nahr\u00e1v\u00e1n\u00ed souboru zru\u0161eno", 
    "File Upload complete": "Nahr\u00e1v\u00e1n\u00ed souboru dokon\u010deno", 
    "File Upload failed": "Nahr\u00e1v\u00e1n\u00ed souboru selhalo", 
    "File Uploading...": "Nahr\u00e1v\u00e1n\u00ed souboru...", 
    "File is locked": "Soubor je uzam\u010den", 
    "File is too big": "Soubor je p\u0159\u00edli\u017e velk\u00fd", 
    "File is too small": "Soubor je p\u0159\u00edli\u017e mal\u00fd", 
    "Filetype not allowed": "Typ souboru nen\u00ed povolen", 
    "Hide": "Skr\u00fdt", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Intern\u00ed chyba. Chyba p\u0159i kop\u00edrov\u00e1n\u00ed %(name)s a %(amount)s dal\u0161\u00ed polo\u017eka(y).", 
    "Internal error. Failed to copy %(name)s.": "Intern\u00ed chyba. Chyba p\u0159i kop\u00edrov\u00e1n\u00ed %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Intern\u00ed chyba. Chyba p\u0159i p\u0159esunu %(name)s a %(amount)s dal\u0161\u00ed polo\u017eka(y).", 
    "Internal error. Failed to move %(name)s.": "Intern\u00ed chyba. Chyba p\u0159i p\u0159esunu %(name)s.", 
    "Invalid destination path": "Neplatn\u00e1 c\u00edlov\u00e1 cesta", 
    "It is required.": "Vy\u017eadov\u00e1no.", 
    "Just now": "Pr\u00e1v\u011b te\u010f", 
    "Loading failed": "Nahr\u00e1v\u00e1n\u00ed selhalo", 
    "Loading...": "Nahr\u00e1v\u00e1m...", 
    "Max number of files exceeded": "Maxim\u00e1ln\u00ed po\u010det soubor\u016f p\u0159ekro\u010den", 
    "Modified files": "Upraven\u00e9 soubory", 
    "Move selected item(s) to:": "P\u0159esunout ozna\u010denou polo\u017eku(ky) do:", 
    "Move {placeholder} to:": "P\u0159esun {placeholder} do:", 
    "Moving %(name)s": "P\u0159esunov\u00e1n\u00ed %(name)s", 
    "Moving file %(index)s of %(total)s": "P\u0159esun souboru %(index)s z %(total)s", 
    "Name is required": "Vy\u017eadov\u00e1no jm\u00e9no", 
    "New directories": "Nov\u00e9 adres\u00e1\u0159e", 
    "New files": "Nov\u00e9 soubory", 
    "Next (Right arrow key)": "N\u00e1sleduj\u00edc\u00ed (\u0161ipkou vpravo)", 
    "No matches": "\u017d\u00e1dn\u00e9 shody", 
    "Only an extension there, please input a name.": "Pouze roz\u0161\u00ed\u0159en\u00ed, pros\u00edm zadejte jm\u00e9no.", 
    "Open in New Tab": "Oteb\u0159\u00edt na nov\u00e9 kart\u011b", 
    "Password is required.": "Heslo je vy\u017eadov\u00e1no.", 
    "Password is too short": "Heslo je p\u0159\u00edli\u017e kr\u00e1tk\u00e9", 
    "Passwords don't match": "Hesla se neshoduj\u00ed", 
    "Permission error": "Chyba opr\u00e1vn\u011bn\u00ed", 
    "Please check the network.": "Pros\u00edm, zkontrolujte s\u00ed\u0165.", 
    "Please enter 1 or more character": "Zadejte pros\u00edm 1 a v\u00edce znak\u016f", 
    "Please enter days.": "Pros\u00edm zadejte dn\u016f.", 
    "Please enter password": "Zadejte pros\u00edm heslo", 
    "Please enter the password again": "Zadejte pros\u00edm heslo znovu", 
    "Please enter valid days": "Pros\u00edm zadejte platn\u00e9 dny", 
    "Please input at least an email.": "Pros\u00edm zadejte nejm\u00e9n\u011b email.", 
    "Previous (Left arrow key)": "P\u0159edchoz\u00ed (\u0161ipkou vlevo)", 
    "Processing...": "Zpracov\u00e1v\u00e1m...", 
    "Renamed or Moved files": "P\u0159ejmenovan\u00e9 nebo p\u0159esunut\u00e9 soubory", 
    "Replace file {filename}?": "P\u0159epsat soubor {filename}?", 
    "Saving...": "Ukl\u00e1d\u00e1m...", 
    "Searching...": "Vyhled\u00e1v\u00e1m...", 
    "Select groups": "Vyberte skupiny", 
    "Set {placeholder}'s permission": "Nastaven\u00ed {placeholder}'s opr\u00e1vn\u011bn\u00ed", 
    "Share {placeholder}": "Sd\u00edlen\u00ed {placeholder}", 
    "Show": "Zobraz", 
    "Start": "Za\u010d\u00e1tek", 
    "Success": "Dokon\u010deno", 
    "Successfully copied %(name)s and %(amount)s other items.": "\u00dasp\u011b\u0161n\u011b zkop\u00edrov\u00e1n %(name)s a %(amount)s dal\u0161\u00edch polo\u017eek.", 
    "Successfully copied %(name)s and 1 other item.": "\u00dasp\u011b\u0161n\u011b zkop\u00edrov\u00e1n %(name)s a 1 dal\u0161\u00ed polo\u017eka.", 
    "Successfully copied %(name)s.": "\u00dasp\u011b\u0161n\u011b zkop\u00edrov\u00e1n %(name)s.", 
    "Successfully deleted %(name)s": "\u00dasp\u011b\u0161n\u011b smaz\u00e1n %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "\u00dasp\u011b\u0161n\u011b smaz\u00e1no %(name)s a %(amount)s dal\u0161\u00edch polo\u017eek.", 
    "Successfully deleted %(name)s and 1 other item.": "\u00dasp\u011b\u0161n\u011b smaz\u00e1no %(name)s a 1 dal\u0161\u00ed polo\u017eka.", 
    "Successfully deleted %(name)s.": "\u00dasp\u011b\u0161n\u011b smaz\u00e1n %(name)s.", 
    "Successfully moved %(name)s and %(amount)s other items.": "\u00dasp\u011b\u0161n\u011b p\u0159esunut %(name)s a %(amount)s dal\u0161\u00edch polo\u017eek.", 
    "Successfully moved %(name)s and 1 other item.": "\u00dasp\u011b\u0161n\u011b p\u0159esunut %(name)s a 1 dal\u0161\u00ed polo\u017eka.", 
    "Successfully moved %(name)s.": "\u00dasp\u011b\u0161n\u011b p\u0159esunut %(name)s.", 
    "Successfully sent to {placeholder}": "\u00dasp\u011b\u0161n\u011b nahr\u00e1no do {placeholder}", 
    "Successfully unstared {placeholder}": "\u00dasp\u011b\u0161n\u011b zru\u0161en p\u0159\u00edznak {placeholder}", 
    "Uploaded bytes exceed file size": "Nahr\u00e1van\u00fd soubor p\u0159ekro\u010dil dovolenou velikost", 
    "canceled": "zru\u0161eno", 
    "locked by {placeholder}": "uzam\u010deno {placeholder}", 
    "uploaded": "nahr\u00e1no"
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
    "DATETIME_FORMAT": "j. E Y G:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d.%m.%Y %H:%M:%S", 
      "%d.%m.%Y %H:%M:%S.%f", 
      "%d.%m.%Y %H.%M", 
      "%d.%m.%Y %H:%M", 
      "%d.%m.%Y", 
      "%d. %m. %Y %H:%M:%S", 
      "%d. %m. %Y %H:%M:%S.%f", 
      "%d. %m. %Y %H.%M", 
      "%d. %m. %Y %H:%M", 
      "%d. %m. %Y", 
      "%Y-%m-%d %H.%M", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "j. E Y", 
    "DATE_INPUT_FORMATS": [
      "%d.%m.%Y", 
      "%d.%m.%y", 
      "%d. %m. %Y", 
      "%d. %m. %y", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "j. F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d.m.Y G:i", 
    "SHORT_DATE_FORMAT": "d.m.Y", 
    "THOUSAND_SEPARATOR": "\u00a0", 
    "TIME_FORMAT": "G:i", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H.%M", 
      "%H:%M", 
      "%H:%M:%S.%f"
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

