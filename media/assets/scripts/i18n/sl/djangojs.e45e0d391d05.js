

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=(n%100==1 ? 0 : n%100==2 ? 1 : n%100==3 || n%100==4 ? 2 : 3);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "Close (Esc)": "Zapri (Esc)", 
    "Failed to send to {placeholder}": "Neuspe\u0161no poslano {placeholder}", 
    "Failed.": "Neuspe\u0161no.", 
    "Failed. Please check the network.": "Neuspe\u0161no. Prosimo, preverite povezavo.", 
    "File Upload canceled": "Nalaganje datoteke preklicano", 
    "File Upload complete": "Nalaganje datoteke kon\u010dano", 
    "File Upload failed": "Nalaganje datoteke ni uspelo", 
    "File Uploading...": "Nalaganje datoteke...", 
    "File is locked": "Datoteka je zaklenjena", 
    "Hide": "Skrij", 
    "Just now": "Ravnokar", 
    "Loading failed": "Neuspe\u0161no nalaganje", 
    "Next (Right arrow key)": "Naprej (Desna pu\u0161\u010dica)", 
    "No matches": "Ni zadetkov", 
    "Open in New Tab": "Odpri v novem zavihku", 
    "Please check the network.": "Prosimo, preverite povezavo.", 
    "Please enter 1 or more character": "Prosimo, vpi\u0161i 1 ali ve\u010d znakov", 
    "Please enter valid days": "Prosimo, vnesite veljavno \u0161tevilo dni", 
    "Previous (Left arrow key)": "Prej\u0161nji (Leva pu\u0161\u010dica)", 
    "Searching...": "Iskanje...", 
    "Select groups": "Izberi skupine", 
    "Show": "Prika\u017ei", 
    "Success": "Uspeh", 
    "Successfully sent to {placeholder}": "Uspe\u0161no poslano {placeholder}", 
    "canceled": "preklicano", 
    "uploaded": "nalo\u017eeno"
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
    "DATETIME_FORMAT": "j. F Y. H:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d.%m.%Y %H:%M:%S", 
      "%d.%m.%Y %H:%M:%S.%f", 
      "%d.%m.%Y %H:%M", 
      "%d.%m.%Y", 
      "%d.%m.%y %H:%M:%S", 
      "%d.%m.%y %H:%M:%S.%f", 
      "%d.%m.%y %H:%M", 
      "%d.%m.%y", 
      "%d-%m-%Y %H:%M:%S", 
      "%d-%m-%Y %H:%M:%S.%f", 
      "%d-%m-%Y %H:%M", 
      "%d-%m-%Y", 
      "%d. %m. %Y %H:%M:%S", 
      "%d. %m. %Y %H:%M:%S.%f", 
      "%d. %m. %Y %H:%M", 
      "%d. %m. %Y", 
      "%d. %m. %y %H:%M:%S", 
      "%d. %m. %y %H:%M:%S.%f", 
      "%d. %m. %y %H:%M", 
      "%d. %m. %y", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "d. F Y", 
    "DATE_INPUT_FORMATS": [
      "%d.%m.%Y", 
      "%d.%m.%y", 
      "%d-%m-%Y", 
      "%d. %m. %Y", 
      "%d. %m. %y", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "0", 
    "MONTH_DAY_FORMAT": "j. F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "j.n.Y. H:i", 
    "SHORT_DATE_FORMAT": "j. M. Y", 
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

