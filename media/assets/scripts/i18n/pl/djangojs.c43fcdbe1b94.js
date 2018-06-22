

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=(n==1 ? 0 : (n%10>=2 && n%10<=4) && (n%100<12 || n%100>14) ? 1 : n!=1 && (n%10>=0 && n%10<=1) || (n%10>=5 && n%10<=9) || (n%100>=12 && n%100<=14) ? 2 : 3);
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
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">Obraz</a> nie mo\u017ce by\u0107 wczytany.", 
    "Add User": "Dodaj u\u017cytkownika", 
    "Added user {user}": "Dodano u\u017cytkownika {user}", 
    "Are you sure you want to clear trash?": "Czy na pewno chcesz opr\u00f3\u017cni\u0107 kosz?", 
    "Are you sure you want to delete %s ?": "Czy na pewno chcesz usun\u0105\u0107 %s ?", 
    "Are you sure you want to delete %s completely?": "Czy na pewno chcesz trwale usun\u0105\u0107 %s?", 
    "Are you sure you want to delete all %s's libraries?": "Czy na pewno chcesz usun\u0105\u0107 wszystkie biblioteki %s?", 
    "Are you sure you want to delete these selected items?": "Czy na pewno chcesz trwale usun\u0105\u0107 wybrane elementy?", 
    "Are you sure you want to quit this group?": "Czy na pewno chcesz opu\u015bci\u0107 t\u0119 grup\u0119?", 
    "Are you sure you want to restore %s?": "Czy na pewno chcesz przywr\u00f3ci\u0107\u00a0%s?", 
    "Are you sure you want to unlink this device?": "Czy na pewno chcesz od\u0142\u0105czy\u0107 to urz\u0105dzenie?", 
    "Are you sure you want to unshare %s ?": "Czy na pewno chcesz wy\u0142\u0105czy\u0107 udost\u0119pnianie %s ?", 
    "Cancel": "Anuluj", 
    "Canceled.": "Anulowano.", 
    "Change Password of Library {placeholder}": "Zmie\u0144 has\u0142o biblioteki {placeholder}", 
    "Clear Trash": "Opr\u00f3\u017cnij kosz", 
    "Close (Esc)": "Zamknij (Esc)", 
    "Copy selected item(s) to:": "Kopiuj wybrane elementy do:", 
    "Copy {placeholder} to:": "Skopiuj {placeholder} do:", 
    "Copying %(name)s": "Kopiowanie %(name)s", 
    "Copying file %(index)s of %(total)s": "Kopiowanie pliku %(index)s z %(total)s", 
    "Create Group": "Utw\u00f3rz grup\u0119", 
    "Create Library": "Stw\u00f3rz bibliotek\u0119", 
    "Created group {group_name}": "Utworzono grup\u0119 {group_name}", 
    "Created library {library_name} with {owner} as its owner": "Utworzono bibliotek\u0119 {library_name} z {owner} jako w\u0142a\u015bcicielem", 
    "Delete": "Usu\u0144", 
    "Delete Group": "Usu\u0144 grup\u0119", 
    "Delete Items": "Usu\u0144 elementy", 
    "Delete Library": "Usu\u0144 bibliotek\u0119", 
    "Delete Library By Owner": "Usu\u0144 biblioteki wg w\u0142a\u015bciciela", 
    "Delete Member": "Usu\u0144 cz\u0142onka", 
    "Delete User": "Usu\u0144 u\u017cytkownika", 
    "Delete failed": "Niepowodzenie usuwania", 
    "Delete files from this device the next time it comes online.": "Usu\u0144 pliki z tego urz\u0105dzenia jak tylko b\u0119dzie ono dost\u0119pne.", 
    "Deleted directories": "Usuni\u0119te katalogi", 
    "Deleted files": "Usuni\u0119te pliki", 
    "Deleted group {group_name}": "Usuni\u0119to grup\u0119 {group_name}", 
    "Deleted library {library_name}": "Usuni\u0119ta biblioteka {library_name}", 
    "Deleted user {user}": "Usuni\u0119to u\u017cytkownika {user}", 
    "Dismiss Group": "Odwo\u0142aj grup\u0119", 
    "Edit failed": "Niepowodzenie edycji", 
    "Empty file upload result": "Wynik przesy\u0142ania pustego pliku", 
    "Encrypted library": "Biblioteka zaszyfrowana", 
    "Error": "B\u0142\u0105d", 
    "Expired": "Wygas\u0142o", 
    "Failed to copy %(name)s": "Nie mo\u017cna skopiowa\u0107 %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Nie uda\u0142o si\u0119 usun\u0105\u0107 %(name)s i %(amount)s innych element\u00f3w.", 
    "Failed to delete %(name)s and 1 other item.": "Nie uda\u0142o si\u0119 usun\u0105\u0107 %(name)s i 1 innego elementu.", 
    "Failed to delete %(name)s.": "Nie uda\u0142o si\u0119 usun\u0105\u0107\u00a0%(name)s.", 
    "Failed to move %(name)s": "Nie mo\u017cna przenie\u015b\u0107\u00a0%(name)s", 
    "Failed to send to {placeholder}": "Nie uda\u0142o si\u0119\u00a0wys\u0142a\u0107 do {placeholder}", 
    "Failed.": "Niepowodzenie.", 
    "Failed. Please check the network.": "Niepowodzenie. Prosz\u0119 sprawdzi\u0107 sie\u0107.", 
    "File Upload canceled": "Anulowano wysy\u0142anie pliku", 
    "File Upload complete": "Zako\u0144czono wysy\u0142anie pliku", 
    "File Upload failed": "B\u0142\u0105d w trakcie wysy\u0142ania pliku", 
    "File Uploading...": "Wysy\u0142anie pliku...", 
    "File is locked": "Plik jest zablokowany", 
    "File is too big": "Plik jest zbyt du\u017cy", 
    "File is too small": "Plik jest zbyt ma\u0142y", 
    "Filetype not allowed": "Niedozwolony typ pliku", 
    "Hide": "Ukryj", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "B\u0142\u0105d wewn\u0119trzny. Nie mo\u017cna skopiowa\u0107 %(name)s i %(amount)s innych element\u00f3w.", 
    "Internal error. Failed to copy %(name)s.": "B\u0142\u0105d wewn\u0119trzny. Nie mo\u017cna skopiowa\u0107 %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "B\u0142\u0105d wewn\u0119trzny. Nie mo\u017cna przenie\u015b\u0107 %(name)s i %(amount)s innych element\u00f3w.", 
    "Internal error. Failed to move %(name)s.": "B\u0142\u0105d wewn\u0119trzny. Nie mo\u017cna przenie\u015b\u0107\u00a0%(name)s.", 
    "Invalid destination path": "Nieprawid\u0142owa \u015bcie\u017cka docelowa", 
    "It is required.": "Wymagane.", 
    "Just now": "Przed chwil\u0105", 
    "Loading failed": "Niepowodzenie wczytywania", 
    "Loading...": "Wczytywanie...", 
    "Log in": "Zaloguj", 
    "Maximum number of files exceeded": "Przekroczono maksymaln\u0105 ilo\u015b\u0107 plik\u00f3w", 
    "Modified files": "Zmodyfikowane pliki", 
    "Move selected item(s) to:": "Przenie\u015b wybrane elementy do:", 
    "Move {placeholder} to:": "Przenie\u015b {placeholder} do:", 
    "Moving %(name)s": "Przenoszenie %(name)s", 
    "Moving file %(index)s of %(total)s": "Przenoszenie pliku %(index)s z %(total)s", 
    "Name is required": "Nazwa jest wymagana", 
    "Name is required.": "Nazwa jest wymagana.", 
    "Name should not include '/'.": "Nazwa nie powinna zawiera\u0107 '/'.", 
    "New Excel File": "Nowy plik Excel", 
    "New File": "Nowy plik", 
    "New Markdown File": "Nowy plik Markdown", 
    "New PowerPoint File": "Nowy plik PowerPoint", 
    "New Word File": "Nowy plik Word", 
    "New directories": "Nowe katalogi", 
    "New files": "Nowe pliki", 
    "New password is too short": "Nowe has\u0142o jest za kr\u00f3tkie", 
    "New passwords don't match": "Has\u0142a nie s\u0105 identyczne", 
    "Next (Right arrow key)": "Nast\u0119pny (strza\u0142ka w prawo)", 
    "No matches": "Brak wynik\u00f3w", 
    "Only an extension there, please input a name.": "Tylko rozszerzenie, prosz\u0119 poda\u0107 nazw\u0119.", 
    "Open in New Tab": "Otw\u00f3rz w nowej karcie", 
    "Packaging...": "Pakowanie...", 
    "Password is required.": "Has\u0142o jest wymagane.", 
    "Password is too short": "Has\u0142o jest zbyt kr\u00f3tkie", 
    "Passwords don't match": "Has\u0142a nie s\u0105 identyczne", 
    "Permission error": "B\u0142\u0105d uprawnie\u0144", 
    "Please check the network.": "Prosz\u0119 sprawdzi\u0107 sie\u0107.", 
    "Please choose a CSV file": "Prosz\u0119 wybra\u0107 plik CSV", 
    "Please click and choose a directory.": "Prosz\u0119 klikn\u0105\u0107 i wybra\u0107 katalog.", 
    "Please enter 1 or more character": "Prosz\u0119 poda\u0107 1 lub wi\u0119cej znak\u00f3w", 
    "Please enter a new password": "Prosz\u0119 poda\u0107 nowe has\u0142o", 
    "Please enter days.": "Prosz\u0119 poda\u0107 dni.", 
    "Please enter password": "Prosz\u0119 poda\u0107 has\u0142o", 
    "Please enter the new password again": "Prosz\u0119 ponownie wpisa\u0107 nowe has\u0142o", 
    "Please enter the old password": "Prosz\u0119 poda\u0107 stare has\u0142o", 
    "Please enter the password again": "Prosz\u0119 ponownie poda\u0107 has\u0142o", 
    "Please enter valid days": "Podaj prawid\u0142ow\u0105 liczb\u0119 dni", 
    "Please input at least an email.": "Prosz\u0119 poda\u0107 przynajmniej e-mail.", 
    "Previous (Left arrow key)": "Poprzedni (strza\u0142ka w lewo)", 
    "Processing...": "Przetwarzanie...", 
    "Quit Group": "Opu\u015b\u0107 grup\u0119", 
    "Read-Only": "Tylko odczyt", 
    "Read-Only library": "Biblioteka tylko do odczytu", 
    "Read-Write": "Odczyt i zapis", 
    "Read-Write library": "Biblioteka do odczytu i zapisu", 
    "Really want to dismiss this group?": "Czy na pewno chcesz odwo\u0142a\u0107 t\u0119 grup\u0119?", 
    "Refresh": "Od\u015bwie\u017c", 
    "Removed all items from trash.": "Usuni\u0119to z kosza wszystkie elementy.", 
    "Removed items older than {n} days from trash.": "Usuni\u0119to z kosza elementy starsze ni\u017c {n} dni.", 
    "Rename File": "Zmie\u0144 nazw\u0119 pliku", 
    "Rename Folder": "Zmie\u0144 nazw\u0119 folderu", 
    "Renamed or Moved files": "Pliki przeniesione lub o zmienionej nazwie", 
    "Replace file {filename}?": "Zamieni\u0107 plik {filename}?", 
    "Restore Library": "Przywr\u00f3\u0107 bibliotek\u0119", 
    "Saving...": "Zapisywanie...", 
    "Search groups": "Szukaj grup", 
    "Search user or enter email and press Enter": "Wyszukaj u\u017cytkownika lub podaj adres email i naci\u015bnij Enter.", 
    "Search users or enter emails and press Enter": "Wyszukaj u\u017cytkownik\u00f3w lub podaj adresy email i naci\u015bnij Enter.", 
    "Searching...": "Wyszukiwanie...", 
    "Select a group": "Wybierz grup\u0119", 
    "Select groups": "Wybierz grupy", 
    "Set {placeholder}'s permission": "Ustaw uprawnienia {placeholder}", 
    "Share {placeholder}": "Udost\u0119pnij {placeholder}", 
    "Show": "Poka\u017c", 
    "Start": "Start", 
    "Success": "Sukces", 
    "Successfully added label(s) for library {placeholder}": "Pomy\u015blnie dodano etykiety do biblioteki {placeholder}", 
    "Successfully changed library password.": "Pomy\u015blnie zmieniono has\u0142o biblioteki", 
    "Successfully clean all errors.": "Pomy\u015blnie wyczyszczono wszystkie b\u0142\u0119dy.", 
    "Successfully copied %(name)s": "Pomy\u015blnie skopiowano %(name)s", 
    "Successfully copied %(name)s and %(amount)s other items.": "Pomy\u015blnie skopiowano %(name)s i %(amount)s innych element\u00f3w.", 
    "Successfully copied %(name)s and 1 other item.": "Pomy\u015blnie skopiowano %(name)s i 1 inny element.", 
    "Successfully copied %(name)s.": "Pomy\u015blnie skopiowano %(name)s.", 
    "Successfully deleted %(name)s": "Pomy\u015blnie usuni\u0119to %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "Pomy\u015blnie usuni\u0119to %(name)s i %(amount)s innych element\u00f3w.", 
    "Successfully deleted %(name)s and 1 other item.": "Pomy\u015blnie usuni\u0119to %(name)s i 1 inny element.", 
    "Successfully deleted %(name)s.": "Pomy\u015blnie usuni\u0119to %(name)s.", 
    "Successfully deleted 1 item": "Pomy\u015blnie usuni\u0119to 1 element", 
    "Successfully deleted 1 item.": "Pomy\u015blnie usuni\u0119to 1 element.", 
    "Successfully deleted member {placeholder}": "Pomy\u015blnie usuni\u0119to cz\u0142onka {placeholder}", 
    "Successfully deleted.": "Pomy\u015blnie usuni\u0119to.", 
    "Successfully imported.": "Zaimportowano pomy\u015blnie.", 
    "Successfully invited %(email) and %(num) other people.": "Pomy\u015blnie zaproszono %(email) i %(num) innych os\u00f3b.", 
    "Successfully invited %(email).": "Pomy\u015blnie zaproszono %(email).", 
    "Successfully modified permission": "Pomy\u015blnie zmieniono uprawnienia", 
    "Successfully moved %(name)s": "Pomy\u015blnie przeniesiono %(name)s", 
    "Successfully moved %(name)s and %(amount)s other items.": "Pomy\u015blnie przeniesiono %(name)s i %(amount)s innych element\u00f3w.", 
    "Successfully moved %(name)s and 1 other item.": "Pomy\u015blnie przeniesiono %(name)s i 1 inny element.", 
    "Successfully moved %(name)s.": "Pomy\u015blnie przeniesiono %(name)s.", 
    "Successfully restored library {placeholder}": "Pomy\u015blnie przywr\u00f3cono bibliotek\u0119 {placeholder}", 
    "Successfully sent to {placeholder}": "Pomy\u015blnie wys\u0142ano do {placeholder}", 
    "Successfully set library history.": "Pomy\u015blnie ustawiono histori\u0119 biblioteki.", 
    "Successfully transferred the group.": "Pomy\u015blnie przeniesiono grup\u0119.", 
    "Successfully transferred the group. You are now a normal member of the group.": "Pomy\u015blnie przeniesiono grup\u0119. Jeste\u015b teraz zwyk\u0142ym u\u017cytkownikiem grupy.", 
    "Successfully transferred the library.": "Pomy\u015blnie przeniesiono bibliotek\u0119.", 
    "Successfully unlink %(name)s.": "Pomy\u015blnie od\u0142\u0105czono %(name)s", 
    "Successfully unshared 1 item.": "Pomy\u015blnie wy\u0142\u0105czono udost\u0119pnianie 1 elementu.", 
    "Successfully unshared library {placeholder}": "Pomy\u015blnie wy\u0142\u0105czono udost\u0119pnianie biblioteki {placeholder}", 
    "Successfully unstared {placeholder}": "Pomy\u015blnie usuni\u0119to {placeholder} z ulubionych", 
    "Tag should not include ','.": "Tagi nie powinny zawiera\u0107 ','.", 
    "Transfer Group": "Prze\u015blij grup\u0119", 
    "Transfer Group {group_name} To": "Przenie\u015b grup\u0119 {group_name} do", 
    "Transfer Library": "Prze\u015blij bibliotek\u0119", 
    "Transfer Library {library_name} To": "Przenie\u015b bibliotek\u0119 {library_name} do", 
    "Transferred group {group_name} from {user_from} to {user_to}": "Przes\u0142ano grup\u0119 {group_name} od {user_from} do {user_to}", 
    "Transferred library {library_name} from {user_from} to {user_to}": "Przes\u0142ano bibliotek\u0119 {library_name} od {user_from} do {user_to}", 
    "Unlink device": "Od\u0142\u0105cz urz\u0105dzenie", 
    "Unshare Library": "Przesta\u0144 udost\u0119pnia\u0107 bibliotek\u0119", 
    "Uploaded bytes exceed file size": "Przes\u0142ane dane przekraczaj\u0105 rozmiar pliku", 
    "You can only select 1 item": "Mo\u017cesz wybra\u0107 tylko 1 element", 
    "You cannot select any more choices": "Nie mo\u017cesz wybra\u0107 wi\u0119cej pozycji", 
    "You have logged out.": "Zosta\u0142e\u015b wylogowany", 
    "canceled": "anulowany", 
    "locked by {placeholder}": "zablokowany przez {placeholder}", 
    "uploaded": "przes\u0142any", 
    "{placeholder} Folder Permission": "Uprawnienia folderu {placeholder}", 
    "{placeholder} History Setting": "Ustawienia historii {placeholder}", 
    "{placeholder} Members": "Cz\u0142onkowie {placeholder}", 
    "{placeholder} Share Links": "\u0141\u0105cza {placeholder}"
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
    "DATETIME_FORMAT": "j E Y H:i", 
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
    "SHORT_DATETIME_FORMAT": "d-m-Y  H:i", 
    "SHORT_DATE_FORMAT": "d-m-Y", 
    "THOUSAND_SEPARATOR": "\u00a0", 
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

