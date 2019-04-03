

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
    "A file with the same name already exists in this folder.": "Datoteka s tem imenom \u017ee obstaja v tej mapi.", 
    "About Us": "O nas", 
    "Access Log": "Dnevnik dostopov", 
    "Active": "Aktiven", 
    "Active Users": "Aktivni uporabniki", 
    "Activities": "Aktivnosti", 
    "Add Admins": "Dodaj administratorje", 
    "Add Library": "Dodaj knji\u017enico", 
    "Add admin": "Dodaj admina", 
    "Add auto expiration": "Dodaj avtomatski \u010das veljavnosti", 
    "Add password protection": "Dodaj za\u0161\u010dito z geslom", 
    "Add user": "Dodaj uporabnika", 
    "Admin": "Admin", 
    "All": "Vse", 
    "All Groups": "Vse skupine", 
    "All Public Links": "Vse javne povezave", 
    "Anonymous User": "Anonimni uporabnik", 
    "Are you sure you want to clear trash?": "Ali ste prepri\u010dani, da \u017eelite sprazniti smeti?", 
    "Are you sure you want to delete %s ?": "Ali si prepri\u010dan/a, da \u017eeli\u0161 odstraniti %s ?", 
    "Are you sure you want to delete %s completely?": "Ali ste prepri\u010dani, da \u017eelite povsem izbrisati %s?", 
    "Are you sure you want to delete all %s's libraries?": "Ali ste prepri\u010dani, da \u017eelite izbrisati vse knji\u017enice uporabnika %s?", 
    "Are you sure you want to delete these selected items?": "Ali ste prepri\u010dani da \u017eelite izbrisati izbrano?", 
    "Are you sure you want to quit this group?": "Ali si prepri\u010dan/a, da \u017eeli\u0161 ukiniti to skupino?", 
    "Are you sure you want to restore %s?": "Ali ste prepri\u010dani, da \u017eelite obnoviti %s?", 
    "Are you sure you want to unshare %s ?": "Ali ste prepri\u010dani da \u017eelite odstraniti deljenje za %s ?", 
    "Avatar": "Prikazna slika", 
    "Can not copy directory %(src)s to its subdirectory %(des)s": "Mape  %(src)s ni mogo\u010de kopirati v njeno podmapo %(des)s", 
    "Can not move directory %(src)s to its subdirectory %(des)s": "Mape  %(src)s  ni mogo\u010de premakniti  v njeno podmapo %(des)s", 
    "Cancel": "Prekli\u010di", 
    "Cancel All": "Prekli\u010di vse", 
    "Canceled.": "Preklicano.", 
    "Change Password": "Spremeni geslo", 
    "Clear Trash": "Sprazni ko\u0161", 
    "Clients": "Klient", 
    "Close": "Zapri", 
    "Close (Esc)": "Zapri (Esc)", 
    "Confirm Password": "Potrdite geslo", 
    "Copy": "Kopiraj", 
    "Copying %(name)s": "Kopiranje %(name)s", 
    "Copying file %(index)s of %(total)s": "Kopiranje datoteke %(index)s od %(total)s", 
    "Count": "\u0160tetje", 
    "Create At / Last Login": "Kreiran / Zadnji\u010d prijavil", 
    "Created At": "Ustvarjeno ob", 
    "Created library": "Ustvarjena knji\u017enica", 
    "Creator": "Ustvaril", 
    "Current Library": "Trenutna knji\u017enica", 
    "Date": "Datum", 
    "Delete": "Izbri\u0161i", 
    "Delete Group": "Odstranitev skupine", 
    "Delete Items": "Izbri\u0161i predmete", 
    "Delete Library": "Izbri\u0161i knji\u017enico", 
    "Delete Member": "Izbri\u0161i \u010dlana", 
    "Delete User": "Izbri\u0161i uporabnika", 
    "Deleted Time": "\u010cas izbrisa", 
    "Deleted directories": "Izbrisane mape", 
    "Deleted files": "Izbrisane datoteke", 
    "Deleted library": "Izbrisana knji\u017enica", 
    "Details": "Podrobnosti", 
    "Device Name": "Naziv naprave", 
    "Devices": "Naprave", 
    "Dismiss": "Pozabi", 
    "Dismiss Group": "Prekli\u010di skupino", 
    "Document convertion failed.": "Sprememba dokumenta, spodletela.", 
    "Don't keep history": "Ne obdr\u017ei zgodovine", 
    "Download": "Prenos", 
    "Edit": "Uredi", 
    "Edit Page": "Uredi stran", 
    "Edit failed.": "Urejanje spodletelo", 
    "Email": "Email", 
    "Empty file upload result": "Rezultat nalaganja prazne datoteke", 
    "Encrypt": "Zakriptiraj", 
    "Error": "Napaka", 
    "Expiration": "\u010cas veljavnosti", 
    "Failed to send to {placeholder}": "Neuspe\u0161no poslano {placeholder}", 
    "Failed.": "Neuspe\u0161no.", 
    "Failed. Please check the network.": "Neuspe\u0161no. Prosimo, preverite povezavo.", 
    "File": "Datoteka", 
    "File Name": "Naziv datoteke", 
    "File Upload": "Nalo\u017ei datoteko", 
    "File Upload canceled": "Nalaganje datoteke preklicano", 
    "File Upload complete": "Nalaganje datoteke kon\u010dano", 
    "File Upload failed": "Nalaganje datoteke ni uspelo", 
    "File Uploading...": "Nalaganje datoteke...", 
    "File download is disabled: the share link traffic of owner is used up.": "Prenos datotek je onemogo\u010deno: dovoljena koli\u010dina prenosa datotek uporabnika je prese\u017eena", 
    "File is locked": "Datoteka je zaklenjena", 
    "File is too big": "Datoteka je prevelika", 
    "File is too small": "Datoteka je premajhna", 
    "Files": "Datoteke", 
    "Filetype not allowed": "Vrsta datoteke ni dovoljena", 
    "Folder": "Mapa", 
    "Folder Permission": "Pravice mape", 
    "Folders": "Mape", 
    "Generate": "Ustvari", 
    "Group": "Skupine", 
    "Groups": "Skupine", 
    "Help": "Pomo\u010d", 
    "Hide": "Skrij", 
    "History": "Zgodovina", 
    "IP": "IP", 
    "Inactive": "Neaktiven", 
    "Info": "Info", 
    "Internal error. Failed to copy %(name)s.": "Notranja napaka. Spodletelo kopiranje %(name)s.", 
    "Internal error. Failed to move %(name)s.": "Notranja napaka. Spodletelo premikanje %(name)s.", 
    "Invalid destination path": "Neveljavna kon\u010dna pot", 
    "It is required.": "Je zahtevano.", 
    "Just now": "Ravnokar", 
    "Keep full history": "Obdr\u017ei vso zgodovino", 
    "Last Access": "Zadnji\u010d dostopano", 
    "Last Update": "Posodobljeno", 
    "Leave Share": "Zapusti deljeno", 
    "Libraries": "Knji\u017enice", 
    "Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.": "Knji\u017enice z dovoljenjem za zapisovanje so lahko prene\u0161ene in sinhronizirane s strani ostalih \u010dlanov skupine. Knji\u017enice z dovoljenjem samo za branje so lahko le prene\u0161ene spremembe v datotekah s strani ostalih \u010dlanov pa ne bodo uveljavljene.", 
    "Library": "Knji\u017enica", 
    "Limits": "Omejitve", 
    "Link": "Povezava", 
    "Links": "Povezave", 
    "List": "Seznam", 
    "Loading failed": "Neuspe\u0161no nalaganje", 
    "Loading...": "Nalagam...", 
    "Lock": "Zakleni", 
    "Log out": "Odjava", 
    "Logs": "Dnevniki", 
    "Member": "\u010clan", 
    "Members": "\u010clani", 
    "Modification Details": "Podrobnosti sprememb", 
    "Modified files": "Spremenjene datoteke", 
    "More": "Ve\u010d", 
    "More Operations": "Ve\u010d operacij", 
    "Move": "Premakni", 
    "Moving %(name)s": "Premikanje %(name)s", 
    "Moving file %(index)s of %(total)s": "Premik datoteke %(index)s od %(total)s", 
    "My Groups": "Moje skupine", 
    "Name": "Ime", 
    "Name is required": "Naziv je zahtevan", 
    "Name is required.": "Ime je zahtevano.", 
    "Name(optional)": "Ime (opcija)", 
    "New File": "Nova datoteka", 
    "New Folder": "Nova mapa", 
    "New Group": "Nova skupina", 
    "New Library": "Nova knji\u017enica", 
    "New Password": "Novo geslo", 
    "New Password Again": "Ponovitev novega gesla", 
    "New directories": "Nove mape", 
    "New files": "Nove datoteke", 
    "New password is too short": "Novo geslo je prekratko", 
    "New passwords don't match": "Novi gesli se ne ujemata", 
    "Next": "Naslednja", 
    "Next (Right arrow key)": "Naprej (Desna pu\u0161\u010dica)", 
    "No library is shared to this group": "Nobena knji\u017enica ni v skupni rabi s to skupino", 
    "No matches": "Ni zadetkov", 
    "Notifications": "Obvestila", 
    "Old Password": "Staro geslo", 
    "Only an extension there, please input a name.": "Je samo kon\u010dnica, prosimo vnesite \u0161e naziv.", 
    "Only keep a period of history:": "Obdr\u017ei zgodovino samo dolo\u010deno obdobje:", 
    "Open in New Tab": "Odpri v novem zavihku", 
    "Open via Client": "Odpri s klientom", 
    "Operations": "Operacije", 
    "Organization": "Organizacija", 
    "Organizations": "Organizacija", 
    "Other Libraries": "Ostale knji\u017enice", 
    "Owner": "Lastnik", 
    "Pages": "Strani", 
    "Password": "Geslo", 
    "Password again": "Ponovno geslo", 
    "Password is required.": "Geslo je zahtevano", 
    "Password is too short": "Geslo je prekratko", 
    "Passwords don't match": "Gesli se ne ujemata", 
    "Permission": "Dovoljenja", 
    "Permission denied": "Dostop zavrnjen", 
    "Platform": "Os", 
    "Please check the network.": "Prosimo, preverite povezavo.", 
    "Please choose a CSV file": "Prosim, izberi CSV datoteko", 
    "Please click and choose a directory.": "Prosimo kliknite in izberite mapo.", 
    "Please enter 1 or more character": "Prosimo, vpi\u0161i 1 ali ve\u010d znakov", 
    "Please enter password": "Prosimo vnesite geslo", 
    "Please enter the new password again": "Prosimo vnesite ponovno novo geslo", 
    "Please enter the old password": "Prosimo vnesite novo geslo", 
    "Please enter the password again": "Prosimo ponovno vnesite geslo", 
    "Please enter valid days": "Prosimo, vnesite veljavno \u0161tevilo dni", 
    "Please input at least an email.": "Prismo vnesite najmanj en email.", 
    "Previous": "Prej\u0161nja", 
    "Previous (Left arrow key)": "Prej\u0161nji (Leva pu\u0161\u010dica)", 
    "Processing...": "Obdelujem\u2026.", 
    "Quit Group": "Zaklju\u010di skupino", 
    "Read-Only": "Samo branje", 
    "Read-Write": "Branje-pisanje", 
    "Really want to dismiss this group?": "Ali res \u017eeli\u0161 preklicati skupino?", 
    "Remove": "Odstrani", 
    "Rename": "Preimenuj", 
    "Rename File": "Preimenuj datoteko", 
    "Renamed or Moved files": "Preimenovane ali premaknjene datoteke", 
    "Reset Password": "Ponastavitev gesla", 
    "ResetPwd": "Spremen.Geslo", 
    "Restore": "Obnovi", 
    "Restore Library": "Obnovi knji\u017enico", 
    "Revoke Admin": "Odstrani iz admin", 
    "Role": "Vloga", 
    "Saving...": "Shranjujem\u2026.", 
    "Seafile": "Seafile", 
    "Seafile Wiki enables you to organize your knowledge in a simple way. The contents of wiki is stored in a normal library with pre-defined file/folder structure. This enables you to edit your wiki in your desktop and then sync back to the server.": "Seafile Wiki omogo\u010da, da organizira\u0161 svojo bazo znanja na preprost na\u010din. Wiki vsebina bo shranjena v normalni knji\u017enici s predpripravljeno strukturo datotek/map. To ti omogo\u010da, da uredi\u0161 wiki na svojem ra\u010dunalniku in ga nato sinhronizira\u0161 s stre\u017enikom.", 
    "Search Files": "Iskanje datotek", 
    "Search files in this library": "Iskanje datotek v tej knji\u017enici", 
    "Searching...": "Iskanje...", 
    "See All Notifications": "Ogled vse obvestil", 
    "Select groups": "Izberi skupine", 
    "Select libraries to share": "Izberi knji\u017enice za skupno rabo", 
    "Server Version: ": "Verzija stre\u017enika:", 
    "Set Quota": "Nastavi kvoto", 
    "Settings": "Nastavitve", 
    "Share": "Delji", 
    "Share Admin": "Deljeno/Javno", 
    "Share From": "Delij od", 
    "Share To": "Deljeno z", 
    "Share existing libraries": "Deli obstoje\u010de knji\u017enice", 
    "Share to group": "Deli s skupino", 
    "Share to user": "Deli z uporabnikom", 
    "Show": "Prika\u017ei", 
    "Size": "Velikost", 
    "Space Used": "Poraba prostora", 
    "Start": "Za\u010detek", 
    "Status": "Stanje", 
    "Submit": "Potrdi", 
    "Success": "Uspeh", 
    "Successfully copied %(name)s": "Uspe\u0161no kopiranje %(name)s", 
    "Successfully copied %(name)s and %(amount)s other items.": "Uspe\u0161no kopirana %(name)s in %(amount)s ostalih datotek.", 
    "Successfully copied %(name)s and 1 other item.": "Uspe\u0161no kopirana %(name)s in 1 dodatna datoteka.", 
    "Successfully copied %(name)s.": "Uspe\u0161no kopirano %(name)s.", 
    "Successfully deleted %(name)s": "Uspe\u0161no odstranjena %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "Uspe\u0161no odstranjeno %(name)s in %(amount)s ostalih datotek.", 
    "Successfully deleted %(name)s.": "Uspe\u0161no ostranjena %(name)s.", 
    "Successfully deleted %s": "Uspe\u0161no odstranjeno %s", 
    "Successfully deleted.": "Uspe\u0161en izbris.", 
    "Successfully moved %(name)s": "Uspe\u0161en premik %(name)s", 
    "Successfully moved %(name)s and %(amount)s other items.": "Supe\u0161no prestavljeno %(name)s in %(amount)s ostalih datotek.", 
    "Successfully moved %(name)s and 1 other item.": "Uspe\u0161no prestavljeno %(name)s in 1 druga datoteka.", 
    "Successfully moved %(name)s.": "Uspe\u0161no prestavljeno %(name)s.", 
    "Successfully reset password to %(passwd)s for user %(user)s.": "Uspe\u0161no ponastavljeno geslo na %(passwd)s za uporabnika %(user)s.", 
    "Successfully revoke the admin permission of %s": "Uspe\u0161no preklicane pravice administratorja za %s", 
    "Successfully sent to {placeholder}": "Uspe\u0161no poslano {placeholder}", 
    "Successfully set %s as admin.": "Uspe\u0161no nastavljen %s kot admin.", 
    "System Admin": "Sistemski admin", 
    "The password will be kept in the server for only 1 hour.": "Geslo bo hranjeno na stre\u017eniku za samo 1 uro.", 
    "This library is password protected": "Knji\u017enica je varovana z geslom", 
    "Time": "\u010cas", 
    "Tip: libraries deleted 30 days ago will be cleaned automatically.": "Nasvet: knji\u017enice, izbrisane pred 30 dnevi, bodo avtomatsko po\u010di\u0161\u010dene.", 
    "Total Users": "Vsi uporabniki", 
    "Transfer": "Prenesi", 
    "Transfer Library": "Prenos knji\u017enice", 
    "Trash": "Ko\u0161", 
    "Type": "Tip", 
    "Unlink": "Odstrani", 
    "Unlock": "Odkleni", 
    "Unshare": "Odstrani deljenje", 
    "Unshare Library": "Odstrani knji\u017enico iz deljenja", 
    "Unstar": "Odstrani pomembno", 
    "Update": "Posodobi", 
    "Upload": "Nalo\u017ei", 
    "Upload Files": "Nalo\u017ei datoteke", 
    "Upload Folder": "Mapa za nalaganje", 
    "Upload Link": "URL nalaganje", 
    "Upload Links": "Povezave za nalaganje", 
    "Uploaded bytes exceed file size": "Prekora\u010dena velikost nalo\u017eenih bitov.", 
    "Used:": "Poraba:", 
    "User": "Uporabnik", 
    "Users": "Uporabniki", 
    "View": "Ogled", 
    "Virus Scan": "Protivirusni pregled", 
    "Visits": "Obiski", 
    "Wrong password": "Napa\u010dno geslo", 
    "You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.": "Lahko ustvarite knji\u017enice za organizacijo va\u0161ih datotek. Primer, lahko ustvarite knji\u017enico za vsak va\u0161 projekt. Vsaka knji\u017enica je sinhronizirana in deljena lo\u010deno.", 
    "You can share a single folder with a registered user if you don't want to share a whole library.": "Z registriranim uporabnikom lahko deljite samo eno mapo \u010de ne \u017eelite deljiti z njim celotne knji\u017enice.", 
    "You can share libraries by clicking the \"New Library\" button above or the \"Share\" icon on your libraries list.": "Svoje knji\u017enice lahko deli\u0161 z ostalimi s klikom na gumb \"Nova knji\u017enica\" ali  \"Deli\" ikono na svojem seznamu knji\u017enic.", 
    "You can share the generated link to others and then they can upload files to this directory via the link.": "Ustvarjeno povezavo lahko po\u0161ljete ostalim in lahko bodo nalagali datoteke v mapo preko te povezave.", 
    "You have not created any libraries": "Niste \u0161e ustvarili knji\u017enic", 
    "all members": "vsi \u010dlani", 
    "canceled": "preklicano", 
    "days": "dni", 
    "icon": "ikona", 
    "locked": "zaklenjeno", 
    "name": "ime", 
    "starred": "pomembno", 
    "unstarred": "odstrani pomembno", 
    "uploaded": "nalo\u017eeno", 
    "you can also press \u2190 ": "lahko tudi kliknete na \u2190 "
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

