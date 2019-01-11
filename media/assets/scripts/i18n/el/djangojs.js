

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=(n != 1);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "Are you sure you want to delete %s ?": "\u0395\u03af\u03c3\u03c4\u03b5 \u03c3\u03af\u03b3\u03bf\u03c5\u03c1\u03bf\u03b9 \u03c0\u03c9\u03c2 \u03b8\u03ad\u03bb\u03b5\u03c4\u03b5 \u03bd\u03b1 \u03b4\u03b9\u03b1\u03b3\u03c1\u03ac\u03c8\u03b5\u03c4\u03b5 \u03c4\u03bf\u03bd/\u03c4\u03b7\u03bd %s ?", 
    "Are you sure you want to quit this group?": "\u0395\u03af\u03c3\u03c4\u03b5 \u03c3\u03af\u03b3\u03bf\u03c5\u03c1\u03bf\u03b9 \u03c0\u03c9\u03c2 \u03b8\u03ad\u03bb\u03b5\u03c4\u03b5 \u03bd\u03b1 \u03b1\u03c0\u03bf\u03c7\u03c9\u03c1\u03ae\u03c3\u03b5\u03c4\u03b5 \u03b1\u03c0\u03cc \u03b1\u03c5\u03c4\u03ae \u03c4\u03b7\u03bd \u03bf\u03bc\u03ac\u03b4\u03b1;", 
    "Cancel": "\u0391\u03ba\u03cd\u03c1\u03c9\u03c3\u03b7", 
    "Delete": "\u0394\u03b9\u03b1\u03b3\u03c1\u03b1\u03c6\u03ae", 
    "Delete Member": "\u0394\u03b9\u03b1\u03b3\u03c1\u03b1\u03c6\u03ae \u03bc\u03ad\u03bb\u03bf\u03c5\u03c2", 
    "Dismiss Group": "\u0391\u03c0\u03cc\u03c1\u03c1\u03b9\u03c8\u03b7 \u03bf\u03bc\u03ac\u03b4\u03b1\u03c2", 
    "Edit Page": "\u03a4\u03c1\u03bf\u03c0\u03bf\u03c0\u03bf\u03af\u03b7\u03c3\u03b7 \u03c3\u03b5\u03bb\u03af\u03b4\u03b1\u03c2", 
    "Failed.": "\u0391\u03c0\u03ad\u03c4\u03c5\u03c7\u03b5.", 
    "Failed. Please check the network.": "\u0391\u03c0\u03ad\u03c4\u03c5\u03c7\u03b5. \u03a0\u03b1\u03c1\u03b1\u03ba\u03b1\u03bb\u03ce \u03b5\u03bb\u03ad\u03b3\u03be\u03c4\u03b5 \u03c4\u03b7 \u03c3\u03cd\u03bd\u03b4\u03b5\u03c3\u03ae \u03c3\u03b1\u03c2 \u03c3\u03c4\u03bf \u03b4\u03af\u03ba\u03c4\u03c5\u03bf.", 
    "Just now": "\u039c\u03cc\u03bb\u03b9\u03c2 \u03c4\u03ce\u03c1\u03b1", 
    "Last Update": "\u03a4\u03b5\u03bb\u03b5\u03c5\u03c4\u03b1\u03af\u03b1 \u03c4\u03c1\u03bf\u03c0\u03bf\u03c0\u03bf\u03af\u03b7\u03c3\u03b7", 
    "Loading...": "\u03a6\u03bf\u03c1\u03c4\u03ce\u03bd\u03b5\u03b9", 
    "Name": "\u038c\u03bd\u03bf\u03bc\u03b1", 
    "Name is required.": "\u03a4\u03bf \u03cc\u03bd\u03bf\u03bc\u03b1 \u03b5\u03af\u03bd\u03b1\u03b9 \u03b1\u03c0\u03b1\u03c1\u03b1\u03af\u03c4\u03b7\u03c4\u03bf.", 
    "Pages": "\u03a3\u03b5\u03bb\u03af\u03b4\u03b5\u03c2", 
    "Please check the network.": "\u03a0\u03b1\u03c1\u03b1\u03ba\u03b1\u03bb\u03ce \u03b5\u03bb\u03ad\u03b3\u03be\u03c4\u03b5 \u03c4\u03b7 \u03c3\u03cd\u03bd\u03b4\u03b5\u03c3\u03b7 \u03bc\u03b5 \u03c4\u03bf \u03b4\u03af\u03ba\u03c4\u03c5\u03bf.", 
    "Quit Group": "\u0391\u03c0\u03bf\u03c7\u03ce\u03c1\u03b7\u03c3\u03b7 \u03b1\u03c0\u03cc \u03bf\u03bc\u03ac\u03b4\u03b1", 
    "Read-Only": "\u039c\u03cc\u03bd\u03bf \u0391\u03bd\u03ac\u03b3\u03bd\u03c9\u03c3\u03b7", 
    "Read-Write": "\u0391\u03bd\u03ac\u03b3\u03bd\u03c9\u03c3\u03b7-\u0393\u03c1\u03b1\u03c6\u03ae", 
    "Really want to dismiss this group?": "\u03a0\u03c1\u03b1\u03b3\u03bc\u03b1\u03c4\u03b9\u03ba\u03ac \u03b8\u03ad\u03bb\u03b5\u03c4\u03b5 \u03bd\u03b1 \u03b1\u03c0\u03bf\u03c1\u03c1\u03af\u03c8\u03b5\u03c4\u03b5 \u03b1\u03c5\u03c4\u03ae \u03c4\u03b7\u03bd \u03bf\u03bc\u03ac\u03b4\u03b1;", 
    "Rename": "\u039c\u03b5\u03c4\u03bf\u03bd\u03bf\u03bc\u03b1\u03c3\u03af\u03b1", 
    "Settings": "\u03a1\u03c5\u03b8\u03bc\u03af\u03c3\u03b5\u03b9\u03c2", 
    "Size": "\u039c\u03ad\u03b3\u03b5\u03b8\u03bf\u03c2", 
    "Submit": "\u03a5\u03c0\u03bf\u03b2\u03bf\u03bb\u03ae"
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
    "DATETIME_FORMAT": "d/m/Y P", 
    "DATETIME_INPUT_FORMATS": [
      "%d/%m/%Y %H:%M:%S", 
      "%d/%m/%Y %H:%M:%S.%f", 
      "%d/%m/%Y %H:%M", 
      "%d/%m/%Y", 
      "%d/%m/%y %H:%M:%S", 
      "%d/%m/%y %H:%M:%S.%f", 
      "%d/%m/%y %H:%M", 
      "%d/%m/%y", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "d/m/Y", 
    "DATE_INPUT_FORMATS": [
      "%d/%m/%Y", 
      "%d/%m/%y", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "0", 
    "MONTH_DAY_FORMAT": "j F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d/m/Y P", 
    "SHORT_DATE_FORMAT": "d/m/Y", 
    "THOUSAND_SEPARATOR": ".", 
    "TIME_FORMAT": "P", 
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

