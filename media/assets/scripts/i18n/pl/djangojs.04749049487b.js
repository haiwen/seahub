

(function (globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function (n) {
    var v=(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  
  /* gettext library */

  django.catalog = {
    "%curr% of %total%": "%curr% z %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">Obraz</a> nie mo\u017ce by\u0107 wczytany.", 
    "Are you sure you want to delete these selected items?": "Czy na pewno chcesz trwale usun\u0105\u0107 wybrane elementy?", 
    "Cancel": "Anuluj", 
    "Canceled.": "Anulowano.", 
    "Close (Esc)": "Zamknij (Esc)", 
    "Copy {placeholder} to:": "Skopiuj {placeholder} do:", 
    "Copying %(name)s": "Kopiowanie %(name)s", 
    "Copying file %(index)s of %(total)s": "Kopiowanie pliku %(index)s z %(total)s", 
    "Delete": "Usu\u0144", 
    "Delete Items": "Usu\u0144 elementy", 
    "Delete succeeded.": "Usuni\u0119to pomy\u015blnie.", 
    "Empty file upload result": "Wynik przesy\u0142ania pustego pliku", 
    "Error": "B\u0142\u0105d", 
    "Failed to copy %(name)s": "Nie mo\u017cna skopiowa\u0107 %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Nie uda\u0142o si\u0119 usun\u0105\u0107 %(name)s i %(amount)s innych element\u00f3w.", 
    "Failed to delete %(name)s and 1 other item.": "Nie uda\u0142o si\u0119 usun\u0105\u0107 %(name)s i 1 innego elementu.", 
    "Failed to delete %(name)s.": "Nie uda\u0142o si\u0119 usun\u0105\u0107\u00a0%(name)s.", 
    "Failed to get update url": "Nie uda\u0142o si\u0119 uzyska\u0107 adresu aktualizacji", 
    "Failed to get upload url": "Nie uda\u0142o si\u0119 uzyska\u0107 adresu wysy\u0142ania", 
    "Failed to move %(name)s": "Nie mo\u017cna przenie\u015b\u0107\u00a0%(name)s", 
    "Failed to send to {placeholder}": "Nie uda\u0142o si\u0119\u00a0wys\u0142a\u0107 do {placeholder}", 
    "Failed to share to {placeholder}": "Nie uda\u0142o si\u0119 udost\u0119pni\u0107 {placeholder}", 
    "Failed.": "Niepowodzenie.", 
    "Failed. Please check the network.": "Niepowodzenie. Prosz\u0119 sprawdzi\u0107 sie\u0107.", 
    "File Upload canceled": "Anulowano wysy\u0142anie pliku", 
    "File Upload complete": "Zako\u0144czono wysy\u0142anie pliku", 
    "File Upload failed": "B\u0142\u0105d w trakcie wysy\u0142ania pliku", 
    "File Uploading...": "Wysy\u0142anie pliku...", 
    "File is too big": "Plik jest zbyt du\u017cy", 
    "File is too small": "Plik jest zbyt ma\u0142y", 
    "Filetype not allowed": "Niedozwolony typ pliku", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "B\u0142\u0105d wewn\u0119trzny. Nie mo\u017cna skopiowa\u0107 %(name)s i %(amount)s innych element\u00f3w.", 
    "Internal error. Failed to copy %(name)s.": "B\u0142\u0105d wewn\u0119trzny. Nie mo\u017cna skopiowa\u0107 %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "B\u0142\u0105d wewn\u0119trzny. Nie mo\u017cna przenie\u015b\u0107 %(name)s i %(amount)s innych element\u00f3w.", 
    "Internal error. Failed to move %(name)s.": "B\u0142\u0105d wewn\u0119trzny. Nie mo\u017cna przenie\u015b\u0107\u00a0%(name)s.", 
    "Invalid destination path": "Nieprawid\u0142owa \u015bcie\u017cka docelowa", 
    "It is required.": "Wymagane.", 
    "Just now": "Przed chwil\u0105", 
    "Loading...": "Wczytywanie...", 
    "Max number of files exceeded": "Osi\u0105gni\u0119to maksymaln\u0105 liczb\u0119 plik\u00f3w", 
    "Move {placeholder} to:": "Przenie\u015b {placeholder} do:", 
    "Moving %(name)s": "Przenoszenie %(name)s", 
    "Moving file %(index)s of %(total)s": "Przenoszenie pliku %(index)s z %(total)s", 
    "Name is required": "Nazwa jest wymagana", 
    "Next (Right arrow key)": "Nast\u0119pny (strza\u0142ka w prawo)", 
    "Only an extension there, please input a name.": "Tylko rozszerzenie, prosz\u0119 poda\u0107 nazw\u0119.", 
    "Open in New Tab": "Otw\u00f3rz w nowej karcie", 
    "Password is required.": "Has\u0142o jest wymagane.", 
    "Password is too short": "Has\u0142o jest zbyt kr\u00f3tkie", 
    "Passwords don't match": "Has\u0142a nie s\u0105 identyczne", 
    "Permission error": "B\u0142\u0105d uprawnie\u0144", 
    "Please check the network.": "Prosz\u0119 sprawdzi\u0107 sie\u0107.", 
    "Please choose a directory": "Prosz\u0119 wybra\u0107 folder", 
    "Please enter days.": "Prosz\u0119 poda\u0107 dni.", 
    "Please enter password": "Prosz\u0119 poda\u0107 has\u0142o", 
    "Please enter the password again": "Prosz\u0119 ponownie poda\u0107 has\u0142o", 
    "Please enter valid days": "Podaj prawid\u0142ow\u0105 liczb\u0119 dni", 
    "Please input at least an email.": "Prosz\u0119 poda\u0107 przynajmniej e-mail.", 
    "Please select a contact or a group.": "Prosz\u0119 wybra\u0107 kontakt lub grup\u0119.", 
    "Previous (Left arrow key)": "Poprzedni (strza\u0142ka w lewo)", 
    "Processing...": "Przetwarzanie...", 
    "Really want to delete {lib_name}?": "Naprawd\u0119 chcesz usun\u0105\u0107 {lib_name}?", 
    "Rename Directory": "Zmie\u0144 nazw\u0119 folderu", 
    "Rename File": "Zmie\u0144 nazw\u0119 pliku", 
    "Replace file {filename}?": "Zamieni\u0107 plik {filename}?", 
    "Saving...": "Zapisywanie...", 
    "Select groups": "Wybierz grupy", 
    "Set {placeholder}'s permission": "Ustaw uprawnienia {placeholder}", 
    "Share {placeholder}": "Udost\u0119pnij {placeholder}", 
    "Start": "Start", 
    "Success": "Sukces", 
    "Successfully copied %(name)s and %(amount)s other items.": "Pomy\u015blnie skopiowano %(name)s i %(amount)s innych element\u00f3w.", 
    "Successfully copied %(name)s and 1 other item.": "Pomy\u015blnie skopiowano %(name)s i 1 inny element.", 
    "Successfully copied %(name)s.": "Pomy\u015blnie skopiowano %(name)s.", 
    "Successfully deleted %(name)s": "Pomy\u015blnie usuni\u0119to %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "Pomy\u015blnie usuni\u0119to %(name)s i %(amount)s innych element\u00f3w.", 
    "Successfully deleted %(name)s and 1 other item.": "Pomy\u015blnie usuni\u0119to %(name)s i 1 inny element.", 
    "Successfully deleted %(name)s.": "Pomy\u015blnie usuni\u0119to %(name)s.", 
    "Successfully moved %(name)s and %(amount)s other items.": "Pomy\u015blnie przeniesiono %(name)s i %(amount)s innych element\u00f3w.", 
    "Successfully moved %(name)s and 1 other item.": "Pomy\u015blnie przeniesiono %(name)s i 1 inny element.", 
    "Successfully moved %(name)s.": "Pomy\u015blnie przeniesiono %(name)s.", 
    "Successfully sent to {placeholder}": "Pomy\u015blnie wys\u0142ano do {placeholder}", 
    "Successfully shared to {placeholder}": "Pomy\u015blnie udost\u0119pniono {placeholder}", 
    "Successfully unshared {placeholder}": "Pomy\u015blnie zako\u0144czono udost\u0119pnianie {placeholder}", 
    "Successfully unstared {placeholder}": "Pomy\u015blnie usuni\u0119to {placeholder} z ulubionych", 
    "Uploaded bytes exceed file size": "Przes\u0142ane dane przekraczaj\u0105 rozmiar pliku", 
    "You don't have any library at present.": "Aktualnie nie masz \u017cadnej biblioteki.", 
    "You have not renamed it.": "Nazwa nie zosta\u0142a zmieniona.", 
    "canceled": "anulowany", 
    "uploaded": "przes\u0142any"
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
    "DATETIME_FORMAT": "j E Y H:i:s", 
    "DATETIME_INPUT_FORMATS": [
      "%d.%m.%Y %H:%M:%S", 
      "%d.%m.%Y %H:%M", 
      "%d.%m.%Y", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d"
    ], 
    "DATE_FORMAT": "j E Y", 
    "DATE_INPUT_FORMATS": [
      "%d.%m.%Y", 
      "%d.%m.%y", 
      "%y-%m-%d", 
      "%Y-%m-%d"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "j F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d-m-Y  H:i:s", 
    "SHORT_DATE_FORMAT": "d-m-Y", 
    "THOUSAND_SEPARATOR": "\u00a0", 
    "TIME_FORMAT": "H:i:s", 
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

