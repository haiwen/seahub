

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
    "A file with the same name already exists in this folder.": "Plik o takiej samej nazwie ju\u017c istnieje w tym folderze.", 
    "About": "O...", 
    "About Us": "O nas", 
    "Access Log": "Log dost\u0119pu", 
    "Actions": "Akcje", 
    "Active": "Aktywny", 
    "Active Users": "Aktywni u\u017cytkownicy", 
    "Activities": "Aktywno\u015bci", 
    "Add Admins": "Dodaj administrator\u00f3w", 
    "Add Library": "Dodaj bibliotek\u0119", 
    "Add Member": "Dodaj cz\u0142onka", 
    "Add User": "Dodaj u\u017cytkownika", 
    "Add Wiki": "Dodaj Wiki", 
    "Add admin": "Dodaj admina", 
    "Add auto expiration": "Dodaj termin wa\u017cno\u015bci", 
    "Add password protection": "Dodaj ochron\u0119 has\u0142a", 
    "Add user": "Dodaj u\u017cytkownika", 
    "Added user {user}": "Dodano u\u017cytkownika {user}", 
    "Admin": "Admin", 
    "Admin Logs": "Logi administracyjne", 
    "All": "Wszystkie", 
    "All Groups": "Wszystkie grupy", 
    "All Public Links": "Wszystkie publiczne \u0142\u0105cza", 
    "Anonymous User": "U\u017cytkownik anonimowy", 
    "Are you sure you want to clear trash?": "Czy na pewno chcesz opr\u00f3\u017cni\u0107 kosz?", 
    "Are you sure you want to delete %s ?": "Czy na pewno chcesz usun\u0105\u0107 %s ?", 
    "Are you sure you want to delete %s completely?": "Czy na pewno chcesz trwale usun\u0105\u0107 %s?", 
    "Are you sure you want to delete all %s's libraries?": "Czy na pewno chcesz usun\u0105\u0107 wszystkie biblioteki %s?", 
    "Are you sure you want to delete these selected items?": "Czy na pewno chcesz trwale usun\u0105\u0107 wybrane elementy?", 
    "Are you sure you want to quit this group?": "Czy na pewno chcesz opu\u015bci\u0107 t\u0119 grup\u0119?", 
    "Are you sure you want to restore %s?": "Czy na pewno chcesz przywr\u00f3ci\u0107\u00a0%s?", 
    "Are you sure you want to unlink this device?": "Czy na pewno chcesz od\u0142\u0105czy\u0107 to urz\u0105dzenie?", 
    "Are you sure you want to unshare %s ?": "Czy na pewno chcesz wy\u0142\u0105czy\u0107 udost\u0119pnianie %s ?", 
    "Avatar": "Awatar", 
    "Back": "Wstecz", 
    "Broken (please contact your administrator to fix this library)": "Uszkodzona (prosz\u0119 si\u0119\u00a0skontaktowa\u0107 z administratorem w celu naprawy)", 
    "Can not copy directory %(src)s to its subdirectory %(des)s": "Nie mo\u017cna skopiowa\u0107 katalogu %(src)s do jego podkatalogu %(des)s", 
    "Can not move directory %(src)s to its subdirectory %(des)s": "Nie mo\u017cna przenie\u015b\u0107 katalogu %(src)s do jego podkatalogu %(des)s", 
    "Cancel": "Anuluj", 
    "Cancel All": "Anuluj wszystko", 
    "Canceled.": "Anulowano.", 
    "Change Password": "Zmie\u0144 has\u0142o", 
    "Change Password of Library {placeholder}": "Zmie\u0144 has\u0142o biblioteki {placeholder}", 
    "Clear Trash": "Opr\u00f3\u017cnij kosz", 
    "Clients": "Klienci", 
    "Close": "Zamknij", 
    "Close (Esc)": "Zamknij (Esc)", 
    "Comment": "Komentarz", 
    "Comments": "Komentarze", 
    "Confirm Password": "Potwierd\u017a has\u0142o", 
    "Copy": "Kopiuj", 
    "Copy selected item(s) to:": "Kopiuj wybrane elementy do:", 
    "Copy {placeholder} to:": "Skopiuj {placeholder} do:", 
    "Copying %(name)s": "Kopiowanie %(name)s", 
    "Copying file %(index)s of %(total)s": "Kopiowanie pliku %(index)s z %(total)s", 
    "Count": "Ilo\u015b\u0107", 
    "Create At / Last Login": "Utworzono / Ostatnie logowanie", 
    "Create Group": "Utw\u00f3rz grup\u0119", 
    "Create Library": "Stw\u00f3rz bibliotek\u0119", 
    "Created At": "Utworzono", 
    "Created group {group_name}": "Utworzono grup\u0119 {group_name}", 
    "Created library": "Utworzona biblioteka", 
    "Created library {library_name} with {owner} as its owner": "Utworzono bibliotek\u0119 {library_name} z {owner} jako w\u0142a\u015bcicielem", 
    "Creator": "Tw\u00f3rca", 
    "Current Library": "Aktualna biblioteka", 
    "Date": "Data", 
    "Delete": "Usu\u0144", 
    "Delete Group": "Usu\u0144 grup\u0119", 
    "Delete Items": "Usu\u0144 elementy", 
    "Delete Library": "Usu\u0144 bibliotek\u0119", 
    "Delete Library By Owner": "Usu\u0144 biblioteki wg w\u0142a\u015bciciela", 
    "Delete Member": "Usu\u0144 cz\u0142onka", 
    "Delete User": "Usu\u0144 u\u017cytkownika", 
    "Delete failed": "Niepowodzenie usuwania", 
    "Delete files from this device the next time it comes online.": "Usu\u0144 pliki z tego urz\u0105dzenia jak tylko b\u0119dzie ono dost\u0119pne.", 
    "Deleted Libraries": "Usuni\u0119te biblioteki", 
    "Deleted Time": "Czas usuni\u0119cia", 
    "Deleted directories": "Usuni\u0119te katalogi", 
    "Deleted files": "Usuni\u0119te pliki", 
    "Deleted group {group_name}": "Usuni\u0119to grup\u0119 {group_name}", 
    "Deleted library": "Usuni\u0119ta biblioteka", 
    "Deleted library {library_name}": "Usuni\u0119ta biblioteka {library_name}", 
    "Deleted user {user}": "Usuni\u0119to u\u017cytkownika {user}", 
    "Details": "Szczeg\u00f3\u0142y", 
    "Device Name": "Nazwa urz\u0105dzenia", 
    "Devices": "Urz\u0105dzenia", 
    "Dismiss": "Odwo\u0142aj", 
    "Dismiss Group": "Odwo\u0142aj grup\u0119", 
    "Document convertion failed.": "Niepowodzenie konwersji dokumentu", 
    "Don't keep history": "Nie przechowuj historii", 
    "Don't replace": "Nie zast\u0119puj", 
    "Download": "Pobierz", 
    "Edit": "Edytuj", 
    "Edit Page": "Edytuj stron\u0119", 
    "Edit failed": "Niepowodzenie edycji", 
    "Edit failed.": "Niepowodzenie edycji.", 
    "Email": "E-mail", 
    "Empty file upload result": "Wynik przesy\u0142ania pustego pliku", 
    "Encrypt": "Zaszyfruj", 
    "Encrypted library": "Biblioteka zaszyfrowana", 
    "Error": "B\u0142\u0105d", 
    "Expiration": "Wyga\u015bni\u0119cie", 
    "Expired": "Wygas\u0142o", 
    "Failed to copy %(name)s": "Nie mo\u017cna skopiowa\u0107 %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Nie uda\u0142o si\u0119 usun\u0105\u0107 %(name)s i %(amount)s innych element\u00f3w.", 
    "Failed to delete %(name)s and 1 other item.": "Nie uda\u0142o si\u0119 usun\u0105\u0107 %(name)s i 1 innego elementu.", 
    "Failed to delete %(name)s.": "Nie uda\u0142o si\u0119 usun\u0105\u0107\u00a0%(name)s.", 
    "Failed to move %(name)s": "Nie mo\u017cna przenie\u015b\u0107\u00a0%(name)s", 
    "Failed to send to {placeholder}": "Nie uda\u0142o si\u0119\u00a0wys\u0142a\u0107 do {placeholder}", 
    "Failed.": "Niepowodzenie.", 
    "Failed. Please check the network.": "Niepowodzenie. Prosz\u0119 sprawdzi\u0107 sie\u0107.", 
    "Favorites": "Ulubione", 
    "File": "Plik", 
    "File Name": "Nazwa pliku", 
    "File Upload": "Wy\u015blij plik", 
    "File Upload canceled": "Anulowano wysy\u0142anie pliku", 
    "File Upload complete": "Zako\u0144czono wysy\u0142anie pliku", 
    "File Upload failed": "B\u0142\u0105d w trakcie wysy\u0142ania pliku", 
    "File Uploading...": "Wysy\u0142anie pliku...", 
    "File download is disabled: the share link traffic of owner is used up.": "Pobieranie plik\u00f3w jest wy\u0142\u0105czone: transfer w\u0142a\u015bciciela \u0142\u0105cza zosta\u0142 wykorzystany.", 
    "File is locked": "Plik jest zablokowany", 
    "File is too big": "Plik jest zbyt du\u017cy", 
    "File is too small": "Plik jest zbyt ma\u0142y", 
    "Files": "Pliki", 
    "Filetype not allowed": "Niedozwolony typ pliku", 
    "Folder": "Folder", 
    "Folder Permission": "Uprawnienia folderu", 
    "Folders": "Foldery", 
    "Generate": "Wygeneruj", 
    "Group": "Grupa", 
    "Groups": "Grupy", 
    "Help": "Pomoc", 
    "Hide": "Ukryj", 
    "History": "Historia", 
    "History Setting": "Ustawienia historii", 
    "IP": "IP", 
    "Inactive": "Nieaktywny", 
    "Info": "Informacje", 
    "Institutions": "Instytucje", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "B\u0142\u0105d wewn\u0119trzny. Nie mo\u017cna skopiowa\u0107 %(name)s i %(amount)s innych element\u00f3w.", 
    "Internal error. Failed to copy %(name)s.": "B\u0142\u0105d wewn\u0119trzny. Nie mo\u017cna skopiowa\u0107 %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "B\u0142\u0105d wewn\u0119trzny. Nie mo\u017cna przenie\u015b\u0107 %(name)s i %(amount)s innych element\u00f3w.", 
    "Internal error. Failed to move %(name)s.": "B\u0142\u0105d wewn\u0119trzny. Nie mo\u017cna przenie\u015b\u0107\u00a0%(name)s.", 
    "Invalid destination path": "Nieprawid\u0142owa \u015bcie\u017cka docelowa", 
    "Invitations": "Zaproszenia", 
    "It is required.": "Wymagane.", 
    "Just now": "Przed chwil\u0105", 
    "Keep full history": "Przechowuj pe\u0142n\u0105 histori\u0119", 
    "Last Access": "Ostatni dost\u0119p", 
    "Last Update": "Ostatnia aktualizacja", 
    "Leave Share": "Opu\u015b\u0107 udzia\u0142", 
    "Libraries": "Biblioteki", 
    "Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.": "Biblioteki udost\u0119pnione do zapisu mog\u0105 by\u0107 pobierane i synchronizowane przez cz\u0142onk\u00f3w innej grupy. Biblioteki tylko do odczytu mog\u0105 by\u0107 wy\u0142\u0105cznie pobierane, aktualizacje przez innych u\u017cytkownik\u00f3w nie b\u0119d\u0105 uwzgl\u0119dniane.", 
    "Library": "Biblioteka", 
    "Library Type": "Typ biblioteki", 
    "Limits": "Limity", 
    "Link": "Odsy\u0142acz", 
    "Linked Devices": "Do\u0142\u0105czone urz\u0105dzenia", 
    "Links": "\u0141\u0105cza", 
    "List": "Lista", 
    "Loading failed": "Niepowodzenie wczytywania", 
    "Loading...": "Wczytywanie...", 
    "Location": "Po\u0142o\u017cenie", 
    "Lock": "Zablokuj", 
    "Log in": "Zaloguj", 
    "Log out": "Wyloguj si\u0119", 
    "Logs": "Logi", 
    "Manage Members": "Zarz\u0105dzaj cz\u0142onkami", 
    "Maximum number of files exceeded": "Przekroczono maksymaln\u0105 ilo\u015b\u0107 plik\u00f3w", 
    "Member": "Cz\u0142onek", 
    "Members": "Cz\u0142onkowie", 
    "Modification Details": "Szczeg\u00f3\u0142y modyfikacji", 
    "Modified files": "Zmodyfikowane pliki", 
    "More": "Wi\u0119cej", 
    "More Operations": "Wi\u0119cej operacji", 
    "Move": "Przenie\u015b", 
    "Move selected item(s) to:": "Przenie\u015b wybrane elementy do:", 
    "Move {placeholder} to:": "Przenie\u015b {placeholder} do:", 
    "Moving %(name)s": "Przenoszenie %(name)s", 
    "Moving file %(index)s of %(total)s": "Przenoszenie pliku %(index)s z %(total)s", 
    "My Groups": "Moje grupy", 
    "My Libraries": "Moje biblioteki", 
    "Name": "Nazwa", 
    "Name is required": "Nazwa jest wymagana", 
    "Name is required.": "Nazwa jest wymagana.", 
    "Name should not include '/'.": "Nazwa nie powinna zawiera\u0107 '/'.", 
    "Name(optional)": "Nazwa (opcjonalna)", 
    "New": "Nowy", 
    "New Excel File": "Nowy plik Excel", 
    "New File": "Nowy plik", 
    "New Folder": "Nowy folder", 
    "New Group": "Nowa grupa", 
    "New Library": "Nowa biblioteka", 
    "New Markdown File": "Nowy plik Markdown", 
    "New Password": "Nowe has\u0142o", 
    "New Password Again": "Powt\u00f3rz nowe has\u0142o", 
    "New PowerPoint File": "Nowy plik PowerPoint", 
    "New Word File": "Nowy plik Word", 
    "New directories": "Nowe katalogi", 
    "New files": "Nowe pliki", 
    "New password is too short": "Nowe has\u0142o jest za kr\u00f3tkie", 
    "New passwords don't match": "Has\u0142a nie s\u0105 identyczne", 
    "Next": "Nast\u0119pny", 
    "Next (Right arrow key)": "Nast\u0119pny (strza\u0142ka w prawo)", 
    "No comment yet.": "Brak komentarzy.", 
    "No deleted libraries.": "Brak usuni\u0119tych bibliotek.", 
    "No libraries": "Brak bibliotek", 
    "No libraries have been shared with you": "\u017badna biblioteka nie zosta\u0142a Ci udost\u0119pniona", 
    "No library is shared to this group": "\u017badna biblioteka nie jest wsp\u00f3\u0142dzielona w tej grupie", 
    "No matches": "Brak wynik\u00f3w", 
    "No members": "Brak cz\u0142onk\u00f3w", 
    "No public libraries": "Brak bibliotek publicznych", 
    "Notifications": "Powiadomienia", 
    "Old Password": "Stare has\u0142o", 
    "Only an extension there, please input a name.": "Tylko rozszerzenie, prosz\u0119 poda\u0107 nazw\u0119.", 
    "Only keep a period of history:": "Przechowuj histori\u0119 z ostatnich:", 
    "Open in New Tab": "Otw\u00f3rz w nowej karcie", 
    "Open parent folder": "Otw\u00f3rz folder nadrz\u0119dny", 
    "Open via Client": "Otw\u00f3rz w kliencie", 
    "Operations": "Akcje", 
    "Organization": "Organizacja", 
    "Organization Admin": "Administrator organizacji", 
    "Organizations": "Organizacje", 
    "Other Libraries": "Inne biblioteki", 
    "Owner": "W\u0142a\u015bciciel", 
    "Packaging...": "Pakowanie...", 
    "Pages": "Strony", 
    "Password": "Has\u0142o", 
    "Password again": "Powt\u00f3rz has\u0142o", 
    "Password is required.": "Has\u0142o jest wymagane.", 
    "Password is too short": "Has\u0142o jest zbyt kr\u00f3tkie", 
    "Passwords don't match": "Has\u0142a nie s\u0105 identyczne", 
    "Permission": "Uprawnienie", 
    "Permission denied": "Odmowa dost\u0119pu", 
    "Permission error": "B\u0142\u0105d uprawnie\u0144", 
    "Platform": "Platforma", 
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
    "Previous": "Poprzedni", 
    "Previous (Left arrow key)": "Poprzedni (strza\u0142ka w lewo)", 
    "Processing...": "Przetwarzanie...", 
    "Quit Group": "Opu\u015b\u0107 grup\u0119", 
    "Read-Only": "Tylko odczyt", 
    "Read-Only library": "Biblioteka tylko do odczytu", 
    "Read-Write": "Odczyt i zapis", 
    "Read-Write library": "Biblioteka do odczytu i zapisu", 
    "Really want to dismiss this group?": "Czy na pewno chcesz odwo\u0142a\u0107 t\u0119 grup\u0119?", 
    "Refresh": "Od\u015bwie\u017c", 
    "Remove": "Usu\u0144", 
    "Removed all items from trash.": "Usuni\u0119to z kosza wszystkie elementy.", 
    "Removed items older than {n} days from trash.": "Usuni\u0119to z kosza elementy starsze ni\u017c {n} dni.", 
    "Rename": "Zmie\u0144 nazw\u0119", 
    "Rename File": "Zmie\u0144 nazw\u0119 pliku", 
    "Rename Folder": "Zmie\u0144 nazw\u0119 folderu", 
    "Renamed or Moved files": "Pliki przeniesione lub o zmienionej nazwie", 
    "Replace": "Zast\u0105p", 
    "Replace file {filename}?": "Zamieni\u0107 plik {filename}?", 
    "Replacing it will overwrite its content.": "Zast\u0105pienie go spowoduje nadpisanie jego zawarto\u015bci.", 
    "Reset Password": "Zresetuj has\u0142o", 
    "ResetPwd": "Resetuj has\u0142o", 
    "Restore": "Przywr\u00f3\u0107", 
    "Restore Library": "Przywr\u00f3\u0107 bibliotek\u0119", 
    "Revoke Admin": "Odwo\u0142aj admina", 
    "Role": "Rola", 
    "Saving...": "Zapisywanie...", 
    "Seafile": "Seafile", 
    "Seafile Wiki enables you to organize your knowledge in a simple way. The contents of wiki is stored in a normal library with pre-defined file/folder structure. This enables you to edit your wiki in your desktop and then sync back to the server.": "Wiki Seafile umo\u017cliwia przekazanie wiedzy w prosty spos\u00f3b. Tre\u015bci Wiki s\u0105 przechowywane w normalnej bibliotece z predefiniowan\u0105 struktur\u0105 plik\u00f3w i folder\u00f3w. W ten spos\u00f3b mo\u017cliwa jest edycja Wiki na komputerze stacjonarnym, a nast\u0119pnie synchronizacja z serwerem.", 
    "Search Files": "Przeszukaj pliki", 
    "Search files in this library": "Przeszukaj pliki w tej bibliotece", 
    "Search groups": "Szukaj grup", 
    "Search user or enter email and press Enter": "Wyszukaj u\u017cytkownika lub podaj adres email i naci\u015bnij Enter.", 
    "Search users or enter emails and press Enter": "Wyszukaj u\u017cytkownik\u00f3w lub podaj adresy email i naci\u015bnij Enter.", 
    "Searching...": "Wyszukiwanie...", 
    "See All Notifications": "Wszystkie powiadomienia", 
    "Select a group": "Wybierz grup\u0119", 
    "Select groups": "Wybierz grupy", 
    "Select libraries to share": "Wybierz biblioteki do udost\u0119pnienia", 
    "Server Version: ": "Wersja serwera: ", 
    "Set Quota": "Ogranicz przestrze\u0144", 
    "Set {placeholder}'s permission": "Ustaw uprawnienia {placeholder}", 
    "Settings": "Ustawienia", 
    "Share": "Udost\u0119pnij", 
    "Share Admin": "Udost\u0119pnianie", 
    "Share From": "Udost\u0119pnione od", 
    "Share Links": "\u0141\u0105cza udost\u0119pniania", 
    "Share To": "Udost\u0119pnij", 
    "Share existing libraries": "Udost\u0119pnij istniej\u0105ce biblioteki", 
    "Share to group": "Udost\u0119pnij grupie", 
    "Share to user": "Udost\u0119pnij u\u017cytkownikowi", 
    "Share {placeholder}": "Udost\u0119pnij {placeholder}", 
    "Shared with all": "Udost\u0119pnione wszystkim", 
    "Shared with groups": "Udost\u0119pnione grupie", 
    "Shared with me": "Udost\u0119pnione dla mnie", 
    "Show": "Poka\u017c", 
    "Side Nav Menu": "Boczne menu nawigacyjne", 
    "Size": "Rozmiar", 
    "Sort:": "Sortuj:", 
    "Space Used": "Wykorzystana przestrze\u0144", 
    "Start": "Start", 
    "Statistic": "Statystyka", 
    "Status": "Status", 
    "Submit": "Wy\u015blij", 
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
    "Successfully deleted %s": "Pomy\u015blnie usuni\u0119to %s", 
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
    "Successfully reset password to %(passwd)s for user %(user)s.": "Pomy\u015blnie zresetowano u\u017cytkownikowi %(user)s has\u0142o na %(passwd)s.", 
    "Successfully restored library {placeholder}": "Pomy\u015blnie przywr\u00f3cono bibliotek\u0119 {placeholder}", 
    "Successfully revoke the admin permission of %s": "Pomy\u015blnie cofni\u0119to uprawnienia administracyjne u\u017cytkownikowi %s", 
    "Successfully sent to {placeholder}": "Pomy\u015blnie wys\u0142ano do {placeholder}", 
    "Successfully set %s as admin.": "Pomy\u015blnie przyznano %s uprawnienia administracyjne.", 
    "Successfully set library history.": "Pomy\u015blnie ustawiono histori\u0119 biblioteki.", 
    "Successfully transferred the group.": "Pomy\u015blnie przeniesiono grup\u0119.", 
    "Successfully transferred the group. You are now a normal member of the group.": "Pomy\u015blnie przeniesiono grup\u0119. Jeste\u015b teraz zwyk\u0142ym u\u017cytkownikiem grupy.", 
    "Successfully transferred the library.": "Pomy\u015blnie przeniesiono bibliotek\u0119.", 
    "Successfully unlink %(name)s.": "Pomy\u015blnie od\u0142\u0105czono %(name)s", 
    "Successfully unshared 1 item.": "Pomy\u015blnie wy\u0142\u0105czono udost\u0119pnianie 1 elementu.", 
    "Successfully unshared library {placeholder}": "Pomy\u015blnie wy\u0142\u0105czono udost\u0119pnianie biblioteki {placeholder}", 
    "Successfully unstared {placeholder}": "Pomy\u015blnie usuni\u0119to {placeholder} z ulubionych", 
    "System Admin": "Administrator systemu", 
    "Tag should not include ','.": "Tagi nie powinny zawiera\u0107 ','.", 
    "Tags": "Tagi", 
    "Terms and Conditions": "Regulamin", 
    "The password will be kept in the server for only 1 hour.": "Has\u0142o b\u0119dzie przechowywane na serwerze wy\u0142\u0105cznie przez 1 godzin\u0119.", 
    "This library is password protected": "Ta biblioteka jest chroniona has\u0142em", 
    "Time": "Czas", 
    "Tip: libraries deleted 30 days ago will be cleaned automatically.": "Porada: biblioteki usuni\u0119te 30 dni temu zostan\u0105 automatycznie wyczyszczone.", 
    "Tools": "Narz\u0119dzia", 
    "Total Users": "Wszyscy u\u017cytkownicy", 
    "Transfer": "Przeka\u017c", 
    "Transfer Group": "Prze\u015blij grup\u0119", 
    "Transfer Group {group_name} To": "Przenie\u015b grup\u0119 {group_name} do", 
    "Transfer Library": "Prze\u015blij bibliotek\u0119", 
    "Transfer Library {library_name} To": "Przenie\u015b bibliotek\u0119 {library_name} do", 
    "Transferred group {group_name} from {user_from} to {user_to}": "Przes\u0142ano grup\u0119 {group_name} od {user_from} do {user_to}", 
    "Transferred library {library_name} from {user_from} to {user_to}": "Przes\u0142ano bibliotek\u0119 {library_name} od {user_from} do {user_to}", 
    "Trash": "Kosz", 
    "Type": "Typ", 
    "Unlink": "Od\u0142\u0105cz", 
    "Unlink device": "Od\u0142\u0105cz urz\u0105dzenie", 
    "Unlock": "Odblokuj", 
    "Unshare": "Wy\u0142\u0105cz udost\u0119pnianie", 
    "Unshare Library": "Przesta\u0144 udost\u0119pnia\u0107 bibliotek\u0119", 
    "Unstar": "Usu\u0144 gwiazdk\u0119", 
    "Update": "Aktualizuj", 
    "Upload": "Prze\u015blij", 
    "Upload Files": "Prze\u015blij pliki", 
    "Upload Folder": "Wy\u015blij folder", 
    "Upload Link": "\u0141\u0105cze przesy\u0142ania", 
    "Upload Links": "\u0141\u0105cza przesy\u0142ania", 
    "Uploaded bytes exceed file size": "Przes\u0142ane dane przekraczaj\u0105 rozmiar pliku", 
    "Used:": "Wykorzystane:", 
    "User": "U\u017cytkownik", 
    "Users": "U\u017cytkownicy", 
    "View": "Wy\u015bwietl", 
    "Virus Scan": "Skanowanie antywirusowe", 
    "Visits": "Wizyty", 
    "Wrong password": "Nieprawid\u0142owe has\u0142o", 
    "You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.": "Mo\u017cesz tworzy\u0107 biblioteki, aby porz\u0105dkowa\u0107 swoje pliki. Przyk\u0142adowo, mo\u017cesz tworzy\u0107 biblioteki dla ka\u017cdego swojego projektu. Ka\u017cda biblioteka mo\u017ce by\u0107 synchronizowana i udost\u0119pniana oddzielnie.", 
    "You can only select 1 item": "Mo\u017cesz wybra\u0107 tylko 1 element", 
    "You can share a single folder with a registered user if you don't want to share a whole library.": "Je\u017celi nie chcesz udost\u0119pnia\u0107 innym u\u017cytkownikom ca\u0142ej biblioteki mo\u017cesz udost\u0119pnia\u0107 pojedyncze foldery.", 
    "You can share libraries by clicking the \"New Library\" button above or the \"Share\" icon on your libraries list.": "Mo\u017cesz udost\u0119pnia\u0107 biblioteki klikaj\u0105c przycisk \"Nowa biblioteka\" powy\u017cej lub ikon\u0119 \"Udost\u0119pnij\" na swojej li\u015bcie bibliotek.", 
    "You can share the generated link to others and then they can upload files to this directory via the link.": "Mo\u017cesz udost\u0119pni\u0107 utworzone \u0142\u0105cze, aby umo\u017cliwi\u0107 innym przesy\u0142anie plik\u00f3w do tego katalogu.", 
    "You cannot select any more choices": "Nie mo\u017cesz wybra\u0107 wi\u0119cej pozycji", 
    "You don't have any upload links": "Nie masz \u017cadnych \u0142\u0105cz przesy\u0142ania", 
    "You have logged out.": "Zosta\u0142e\u015b wylogowany", 
    "You have not created any libraries": "Nie stworzy\u0142e\u015b \u017cadnej biblioteki", 
    "You have not shared any folders": "Nie masz \u017cadnych udost\u0119pnionych folder\u00f3w", 
    "You have not shared any libraries": "Nie udost\u0119pni\u0142e\u015b \u017cadnej biblioteki", 
    "all members": "wszyscy cz\u0142onkowie", 
    "canceled": "anulowany", 
    "days": "dni", 
    "icon": "ikona", 
    "last update": "ostatnia aktualizacja", 
    "locked": "zablokowany", 
    "locked by {placeholder}": "zablokowany przez {placeholder}", 
    "name": "nazwa", 
    "starred": "Oznaczone gwiazdk\u0105", 
    "unstarred": "Nieoznaczone gwiazdk\u0105", 
    "uploaded": "przes\u0142any", 
    "you can also press \u2190 ": "mo\u017cesz tak\u017ce wcisn\u0105\u0107 \u2190", 
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

