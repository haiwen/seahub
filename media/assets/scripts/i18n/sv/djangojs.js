

(function (globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function (n) {
    var v=(n != 1);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  
  /* gettext library */

  django.catalog = {
    "Canceled.": "Avbruten.", 
    "Close (Esc)": "St\u00e4ng (Esc)", 
    "Copying %(name)s": "Kopierar %(name)s", 
    "Copying file %(index)s of %(total)s": "Kopierar fil %(index)s av %(total)s", 
    "Failed to get upload url": "Misslyckades att h\u00e4mta uppladdningsurl", 
    "Failed to send to {placeholder}": "Misslyckades att skicka till {placeholder}", 
    "File Upload canceled": "Filuppladdning avbruten", 
    "File Upload complete": "Filuppladdning klar", 
    "File Upload failed": "Filuppladdning misslyckades", 
    "File Uploading...": "Filen laddas upp...", 
    "Hide": "D\u00f6lj", 
    "Internal error. Failed to copy %(name)s.": "Internt fel. Misslyckades att kopiera %(name)s.", 
    "Internal error. Failed to move %(name)s.": "Internt fel. Misslyckades att flytta %(name)s.", 
    "Loading failed": "Laddning misslyckades", 
    "Moving %(name)s": "Flyttar %(name)s", 
    "Moving file %(index)s of %(total)s": "Flyttar fil %(index)s av %(total)s", 
    "Next (Right arrow key)": "N\u00e4sta (H\u00f6ger piltangent)", 
    "No matches": "Inga matchningar", 
    "Open in New Tab": "\u00d6ppna i ny tabb", 
    "Please enter 1 or more character": "V\u00e4nligen ange 1 eller fler tecken", 
    "Please enter valid days": "V\u00e4nligen ange giltiga dagar", 
    "Previous (Left arrow key)": "F\u00f6reg\u00e5ende (V\u00e4nster piltangent)", 
    "Search users or enter emails": "S\u00f6k anv\u00e4ndare eller ange mejladresser", 
    "Searching...": "S\u00f6ker...", 
    "Select groups": "V\u00e4lj grupper", 
    "Show": "Visa", 
    "Success": "Lyckades", 
    "Successfully copied %(name)s and %(amount)s other items.": "Lyckades kopiera %(name)s och %(amount)s andra filer.", 
    "Successfully copied %(name)s and 1 other item.": "Lyckades kopiera %(name)s och 1 annan fil.", 
    "Successfully copied %(name)s.": "Lyckades kopiera %(name)s.", 
    "Successfully deleted %(name)s": "Lyckades ta bort %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "Lyckades ta bort %(name)s och %(amount)s andra filer.", 
    "Successfully deleted %(name)s.": "Lyckades ta bort %(name)s.", 
    "Successfully moved %(name)s and %(amount)s other items.": "Lyckades flytta %(name)s och %(amount)s andra filer.", 
    "Successfully moved %(name)s and 1 other item.": "Lyckades flytta %(name)s och 1 annan fil.", 
    "Successfully moved %(name)s.": "Lyckades flytta %(name)s.", 
    "Successfully sent to {placeholder}": "Lyckades skicka till {placeholder}", 
    "canceled": "avbruten", 
    "uploaded": "uppladdad"
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
    "DATETIME_FORMAT": "j F Y H:i", 
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
      "%Y-%m-%d %H:%M:%S.%f"
    ], 
    "DATE_FORMAT": "j F Y", 
    "DATE_INPUT_FORMATS": [
      "%Y-%m-%d", 
      "%m/%d/%Y", 
      "%m/%d/%y"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "j F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "Y-m-d H:i", 
    "SHORT_DATE_FORMAT": "Y-m-d", 
    "THOUSAND_SEPARATOR": "\u00a0", 
    "TIME_FORMAT": "H:i", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H:%M"
    ], 
    "YEAR_MONTH_FORMAT": "F Y"
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

