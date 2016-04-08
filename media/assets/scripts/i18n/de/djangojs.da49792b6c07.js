

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
    "%curr% of %total%": "%curr% von %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">Das Bild</a> konnte nicht geladen werden.", 
    "Are you sure you want to delete these selected items?": "M\u00f6chten Sie die ausgew\u00e4hlten Dateien wirklich l\u00f6schen?", 
    "Are you sure you want to quit this group?": "M\u00f6chten sie die Gruppe wirklich verlassen?", 
    "Cancel": "Abbrechen", 
    "Canceled.": "Abgebrochen.", 
    "Change Password of Library {placeholder}": "Passwort der Bibliothek \u00e4ndern {placeholder}", 
    "Close (Esc)": "Schlie\u00dfen (Esc)", 
    "Copy selected item(s) to:": "Auswahl kopieren nach:", 
    "Copy {placeholder} to:": "{placeholder} kopieren nach:", 
    "Copying %(name)s": "Kopiere %(name)s", 
    "Copying file %(index)s of %(total)s": "Kopiere Datei %(index)s von %(total)s", 
    "Delete": "L\u00f6schen", 
    "Delete Items": "Eintr\u00e4ge l\u00f6schen", 
    "Delete failed": "L\u00f6schen fehlgeschlagen", 
    "Delete succeeded.": "Erfolgreich gel\u00f6scht.", 
    "Deleted directories": "Gel\u00f6schte Ordner", 
    "Deleted files": "Gel\u00f6schte Dateien", 
    "Dismiss Group": "Gruppe l\u00f6schen", 
    "Edit failed": "Bearbeiten fehlgeschlagen", 
    "Empty file upload result": "Leere Datei hochgeladen", 
    "Encrypted": "Verschl\u00fcsselt", 
    "Error": "Fehler", 
    "Expired": "Abgelaufen", 
    "Failed to copy %(name)s": "Fehler beim Kopieren von %(name)s.", 
    "Failed to delete %(name)s and %(amount)s other items.": "Fehler beim L\u00f6schen von %(name)s und %(amount)s anderen Objekten.", 
    "Failed to delete %(name)s and 1 other item.": "Fehler beim L\u00f6schen von %(name)s und einem anderen Objekt.", 
    "Failed to delete %(name)s.": "Fehler beim L\u00f6schen von: %(name)s", 
    "Failed to get update url": "Der Update-Link konnte nicht abgerufen werden", 
    "Failed to get upload url": "Der Upload-Link konnte nicht abgerufen werden", 
    "Failed to move %(name)s": "Fehler beim Verschieben von %(name)s.", 
    "Failed to send to {placeholder}": "Senden an {placeholder} fehlgeschlagen", 
    "Failed.": "Fehlgeschlagen.", 
    "Failed. Please check the network.": "Fehlgeschlagen. Bitte \u00fcberpr\u00fcfen Sie die Netzwerkverbindung.", 
    "File Upload canceled": "Datei Upload abgebrochen", 
    "File Upload complete": "Upload erfolgreich", 
    "File Upload failed": "Datei Upload fehlgeschlagen", 
    "File Uploading...": "Datei wird hochgeladen...", 
    "File is locked": "Datei ist gesperrt", 
    "File is too big": "Datei ist zu gro\u00df", 
    "File is too small": "Datei ist zu klein", 
    "Filetype not allowed": "Dateityp is nicht erlaubt", 
    "Hide": "Verbergen", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Interner Fehler. %(name)s und %(amount)s andere Objekte konnten nicht kopiert werden.", 
    "Internal error. Failed to copy %(name)s.": "Interner Fehler. %(name)s konnte nicht kopiert werden.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Interner Fehler. %(name)s und %(amount)s andere Objekte konnten nicht verschoben werden.", 
    "Internal error. Failed to move %(name)s.": "Interner Fehler. %(name)s konnte nicht verschoben werden.", 
    "Invalid destination path": "Ung\u00fcltiger Zielpfad", 
    "It is required.": "Erforderlich.", 
    "Just now": "Gerade eben", 
    "Loading failed": "Laden fehlgeschlagen", 
    "Loading...": "Wird geladen \u2026", 
    "Max number of files exceeded": "Maximale Anzahl von Dateien wurde \u00fcberschritten", 
    "Modified files": "Ge\u00e4nderte Dateien", 
    "Move selected item(s) to:": "Auswahl verschieben nach:", 
    "Move {placeholder} to:": "{placeholder} verschieben nach:", 
    "Moving %(name)s": "Verschiebe %(name)s", 
    "Moving file %(index)s of %(total)s": "Verschiebe Datei %(index)s von %(total)s", 
    "Name is required": "Name erforderlich", 
    "New directories": "Neue Ordner", 
    "New files": "Neue Dateien", 
    "New password is too short": "Das neue Passwort ist zu kurz", 
    "New passwords don't match": "Die neuen Passw\u00f6rter stimmen nicht \u00fcberein", 
    "Next (Right arrow key)": "Weiter (Rechte Pfeiltaste)", 
    "No matches": "Nichts gefunden", 
    "Only an extension there, please input a name.": "Nur eine Erweiterung vorhanden, bitte einen Namen angeben.", 
    "Open in New Tab": "In neuem Tab \u00f6ffnen", 
    "Password is required.": "Passwort erforderlich.", 
    "Password is too short": "Passwort ist zu kurz", 
    "Passwords don't match": "Passw\u00f6rter stimmen nicht \u00fcberein", 
    "Permission error": "Berechtigungsfehler", 
    "Please check the network.": "Bitte \u00fcberpr\u00fcfen Sie die Netzwerkverbindung.", 
    "Please choose a CSV file": "Bitte w\u00e4hlen Sie eine CSV-Datei", 
    "Please click and choose a directory.": "W\u00e4hlen Sie ein Verzeichnis und klicken es an", 
    "Please enter 1 or more character": "Bitte mehr als 1 Zeichen eingeben", 
    "Please enter a new password": "Bitte geben sie das neue Passwort ein", 
    "Please enter days.": "Bitte Tage eingeben", 
    "Please enter password": "Bitte geben Sie ein Passwort ein", 
    "Please enter the new password again": "Bitte geben Sie das neue Passwort noch einmal ein", 
    "Please enter the old password": "Bitte geben Sie das alte Passwort ein", 
    "Please enter the password again": "Bitte geben Sie das Passwort erneut ein", 
    "Please enter valid days": "Bitte geben Sie eine g\u00fcltige Anzahl von Tagen ein", 
    "Please input at least an email.": "Bitte geben Sie mindestens eine E-Mail-Adresse an.", 
    "Previous (Left arrow key)": "Zur\u00fcck (Linke Pfeiltaste)", 
    "Processing...": "Verarbeiten \u2026", 
    "Quit Group": "Gruppe verlassen", 
    "Read-Only": "Nur Lesen", 
    "Read-Write": "Lesen + Schreiben", 
    "Really want to delete {lib_name}?": "M\u00f6chten Sie {lib_name} wirklich l\u00f6schen?", 
    "Really want to dismiss this group?": "M\u00f6chten Sie die Gruppe wirklich l\u00f6schen?", 
    "Rename File": "Datei umbenennen", 
    "Rename Folder": "Ordner umbenennen", 
    "Renamed or Moved files": "Umbenannte oder verschobene Dateien", 
    "Replace file {filename}?": "Datei {filename} austauschen?", 
    "Saving...": "Speichere ...", 
    "Search user or enter email and press Enter": "Suchen Sie nach Namen oder E-Mail-Adresse und best\u00e4tigen Sie mit Enter", 
    "Search users or enter emails and press Enter": "Suchen Sie nach Namen oder E-Mail-Adresse und best\u00e4tigen Sie mit Enter", 
    "Searching...": "Suche \u2026", 
    "Select a group": "Gruppe ausw\u00e4hlen", 
    "Select groups": "Gruppen ausw\u00e4hlen", 
    "Set {placeholder}'s permission": "Rechte von {placeholder} festlegen", 
    "Share {placeholder}": "Teile {placeholder}", 
    "Show": "Anzeigen", 
    "Start": "Start", 
    "Success": "Erfolg", 
    "Successfully changed library password.": "Das Passwort der Bibliothek ist ge\u00e4ndert", 
    "Successfully copied %(name)s": "%(name)s ist kopiert", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s und %(amount)s weitere Objekte sind kopiert.", 
    "Successfully copied %(name)s and 1 other item.": "%(name)s und ein weiteres Objekt sind kopiert.", 
    "Successfully copied %(name)s.": "%(name)s ist kopiert.", 
    "Successfully deleted %(name)s": "%(name)s ist gel\u00f6scht.", 
    "Successfully deleted %(name)s and %(amount)s other items.": "%(name)s und %(amount)s weitere Objekte sind gel\u00f6scht.", 
    "Successfully deleted %(name)s and 1 other item.": "%(name)s und ein weiteres Objekt sind gel\u00f6scht.", 
    "Successfully deleted %(name)s.": "%(name)s ist gel\u00f6scht.", 
    "Successfully imported.": "Import erfolgreich.", 
    "Successfully moved %(name)s": "%(name)s ist verschoben", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s und %(amount)s weitere Objekte sind verschoben.", 
    "Successfully moved %(name)s and 1 other item.": "%(name)s und ein weiteres Objekt sind verschoben.", 
    "Successfully moved %(name)s.": "%(name)s ist verschoben.", 
    "Successfully sent to {placeholder}": "Erfolgreich an {placeholder} gesendet.", 
    "Successfully set library history.": "Versionen f\u00fcr die Bibliothek sind eingestellt", 
    "Successfully transferred the library.": "Bibliothek erfolgreich verschoben", 
    "Successfully unlink %(name)s.": "%(name)s ist umbenannt", 
    "Successfully unshared {placeholder}": "Freigabe von {placeholder} ist aufgehoben.", 
    "Successfully unstared {placeholder}": "{placeholder} ist nicht mehr als Favorit markiert.", 
    "Transfer Library {library_name} To": "Bibliothek {library_name} verschieben nach", 
    "Uploaded bytes exceed file size": "Hochgeladene Bytes \u00fcberschreitet tats\u00e4chliche Dateigr\u00f6\u00dfe ", 
    "You can only select 1 item": "Sie k\u00f6nnen nur 1 Objekt ausw\u00e4hlen", 
    "You cannot select any more choices": "Sie k\u00f6nnen keine weiteren Optionen ausw\u00e4hlen", 
    "canceled": "abgebrochen", 
    "locked by {placeholder}": "von {placeholder} gesperrt", 
    "uploaded": "hochgeladen", 
    "{placeholder} Folder Permission": "{placeholder} Rechte des Ordners", 
    "{placeholder} History Setting": "{placeholder} Einstellungen der Versionen", 
    "{placeholder} Members": "{placeholder} Mitglieder", 
    "{placeholder} Share Links": "{placeholder} Links freigeben"
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
    "DATETIME_FORMAT": "j. F Y H:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d.%m.%Y %H:%M:%S", 
      "%d.%m.%Y %H:%M:%S.%f", 
      "%d.%m.%Y %H:%M", 
      "%d.%m.%Y", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "j. F Y", 
    "DATE_INPUT_FORMATS": [
      "%d.%m.%Y", 
      "%d.%m.%y", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "j. F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d.m.Y H:i", 
    "SHORT_DATE_FORMAT": "d.m.Y", 
    "THOUSAND_SEPARATOR": ".", 
    "TIME_FORMAT": "H:i", 
    "TIME_INPUT_FORMATS": [
      "%H:%M:%S", 
      "%H:%M:%S.%f", 
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

