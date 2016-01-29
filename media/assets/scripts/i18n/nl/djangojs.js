

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
    "%curr% of %total%": "%curr% van %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">De afbeelding</a> kon niet worden geladen.", 
    "Cancel": "Annuleren", 
    "Canceled.": "Geannuleerd.", 
    "Close (Esc)": "Sluiten (Esc)", 
    "Delete": "Verwijderen", 
    "Delete failed": "Verwijderen mislukt", 
    "Deleted directories": "Verwijderde mappen", 
    "Deleted files": "Verwijderde bestanden", 
    "Edit failed": "Bewerken mislukt", 
    "Error": "Fout", 
    "Expired": "Verlopen", 
    "Failed.": "Mislukt.", 
    "Failed. Please check the network.": "Mislukt. Controleer de netwerkverbinding.", 
    "File Upload canceled": "Bestandsupload geannuleerd", 
    "File Upload complete": "Bestandsupload voltooid", 
    "File Upload failed": "Bestandsupload mislukt", 
    "File Uploading...": "Bestand uploaden...", 
    "File is locked": "Bestand is vergrendeld", 
    "File is too big": "Bestand is te groot", 
    "File is too small": "Bestand is te klein", 
    "Filetype not allowed": "Bestandstype niet toegestaan", 
    "Hide": "Verbergen", 
    "It is required.": "Het is verplicht.", 
    "Just now": "Zojuist", 
    "Loading failed": "Ophalen mislukt", 
    "Loading...": "Laden...", 
    "Max number of files exceeded": "Maximaal aantal bestanden overschreden", 
    "Modified files": "Aangepaste bestanden", 
    "Name is required": "Naam is verplicht", 
    "New directories": "Nieuwe mappen", 
    "New files": "Nieuwe bestanden", 
    "Next (Right arrow key)": "Volgende (rechter pijltjestoets)", 
    "No matches": "Niet gevonden", 
    "Only an extension there, please input a name.": "Alleen een extensie, voer een naam in.", 
    "Open in New Tab": "Open in nieuw tabblad", 
    "Password is required.": "Wachtwoord is verplicht.", 
    "Password is too short": "Wachtwoord is te kort", 
    "Passwords don't match": "De wachtwoorden komen niet overeen", 
    "Please check the network.": "Controleer de netwerkverbinding.", 
    "Please enter 1 or more character": "Voer 1 of meer tekens in.", 
    "Please enter password": "Voer het wachtwoord in", 
    "Please enter the password again": "Gelieve het wachtwoord opnieuw in te voeren", 
    "Previous (Left arrow key)": "Vorige (linker pijltjestoets)", 
    "Processing...": "In behandeling...", 
    "Renamed or Moved files": "Hernoemde of Verplaatste bestanden", 
    "Saving...": "Opslaan...", 
    "Search users or enter emails": "Zoek gebruikers of voer emails in", 
    "Searching...": "Aan het zoeken...", 
    "Show": "Toon", 
    "Start": "Start", 
    "Success": "Gelukt", 
    "Uploaded bytes exceed file size": "Ge\u00fcploadde bytes overtreft bestandsgrootte", 
    "canceled": "geannuleerd", 
    "uploaded": "ge\u00fcpload"
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
      "%d-%m-%Y %H:%M:%S", 
      "%d-%m-%y %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S", 
      "%d-%m-%Y %H.%M:%S", 
      "%d-%m-%y %H.%M:%S", 
      "%d-%m-%Y %H:%M", 
      "%d-%m-%y %H:%M", 
      "%Y-%m-%d %H:%M", 
      "%d-%m-%Y %H.%M", 
      "%d-%m-%y %H.%M", 
      "%d-%m-%Y", 
      "%d-%m-%y", 
      "%Y-%m-%d", 
      "%Y-%m-%d %H:%M:%S.%f"
    ], 
    "DATE_FORMAT": "j F Y", 
    "DATE_INPUT_FORMATS": [
      "%d-%m-%Y", 
      "%d-%m-%y", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "j F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "j-n-Y H:i", 
    "SHORT_DATE_FORMAT": "j-n-Y", 
    "THOUSAND_SEPARATOR": ".", 
    "TIME_FORMAT": "H:i", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H.%M:%S", 
      "%H.%M", 
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

