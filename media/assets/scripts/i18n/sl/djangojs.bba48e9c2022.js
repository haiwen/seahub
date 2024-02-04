

'use strict';
{
  const globals = this;
  const django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    const v = (n%100==1 ? 0 : n%100==2 ? 1 : n%100==3 || n%100==4 ? 2 : 3);
    if (typeof v === 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  const newcatalog = {
    "(current notification)": "(current notification)",
    "(current version)": "(trenutna razli\u010dica)",
    "1 month ago": "pred 1 mesecem",
    "1 week ago": "pred 1 tednom",
    "3 days ago": "pred 3 dnevi",
    "A file with the same name already exists in this folder.": "Datoteka s tem imenom \u017ee obstaja v tej mapi.",
    "About Us": "O nas",
    "Access Log": "Dnevnik dostopov",
    "Active": "Aktiven",
    "Active Users": "Aktivni uporabniki",
    "Activities": "Aktivnosti",
    "Add": "Dodaj",
    "Add Admins": "Dodaj administratorje",
    "Add Library": "Dodaj knji\u017enico",
    "Add admin": "Dodaj admina",
    "Add auto expiration": "Dodaj avtomatski \u010das veljavnosti",
    "Add new notification": "Dodaj novo obvestilo",
    "Add password protection": "Dodaj za\u0161\u010dito z geslom",
    "Added": "Dodan",
    "Admin": "Admin",
    "Admins": "Administratorji",
    "All": "Vse",
    "All Groups": "Vse skupine",
    "All Notifications": "Vsa obvestila",
    "All Public Links": "Vse javne povezave",
    "All file types": "Vse tipe ",
    "Anonymous User": "Anonimni uporabnik",
    "Are you sure you want to clear trash?": "Ali ste prepri\u010dani, da \u017eelite sprazniti smeti?",
    "Are you sure you want to delete %s ?": "Ali si prepri\u010dan/a, da \u017eeli\u0161 odstraniti %s ?",
    "Are you sure you want to restore this library?": "Ali ste prepri\u010dani da \u017eelite obnoviti to knji\u017enico?",
    "Audio": "Audio",
    "Avatar": "Prikazna slika",
    "Avatar:": "Slika:",
    "Can not copy directory %(src)s to its subdirectory %(des)s": "Mape  %(src)s ni mogo\u010de kopirati v njeno podmapo %(des)s",
    "Can not move directory %(src)s to its subdirectory %(des)s": "Mape  %(src)s  ni mogo\u010de premakniti  v njeno podmapo %(des)s",
    "Cancel": "Prekli\u010di",
    "Cancel All": "Prekli\u010di vse",
    "Change": "Spremeni",
    "Change Password": "Spremeni geslo",
    "Clean": "Po\u010disti",
    "Clear": "Po\u010disti",
    "Clear Trash": "Sprazni ko\u0161",
    "Clear files in trash and history\uff1a": "Po\u010disti datoteke v ko\u0161u in zgodovino:",
    "Clients": "Klient",
    "Close": "Zapri",
    "Community Edition": "Community Edition",
    "Confirm Password": "Potrdite geslo",
    "Contact Email:": "Kontaknti email naslov:",
    "Copy": "Kopiraj",
    "Count": "\u0160tetje",
    "Create": "Ustvari",
    "Created At": "Ustvarjeno ob",
    "Created library": "Ustvarjena knji\u017enica",
    "Creator": "Ustvaril",
    "Current Library": "Trenutna knji\u017enica",
    "Current Path: ": "Trenutna pot:",
    "Current Version": "Trenutna razli\u010dica",
    "Current path: ": "Trenutna pot:",
    "Custom file types": "Izbrane tipe datotek",
    "Database": "Vsi uporabniki",
    "Date": "Datum",
    "Default": "Prednastavljeno",
    "Delete": "Izbri\u0161i",
    "Delete Account": "Izbri\u0161i ra\u010dun",
    "Delete Group": "Odstranitev skupine",
    "Delete Library": "Izbri\u0161i knji\u017enico",
    "Delete Member": "Izbri\u0161i \u010dlana",
    "Delete Notification": "Izbri\u0161i obvestilo",
    "Delete Organization": "Odstranitev organizacije",
    "Delete Time": "\u010cas izbrisa",
    "Delete User": "Izbri\u0161i uporabnika",
    "Deleted": "Izbrisan",
    "Deleted Time": "\u010cas izbrisa",
    "Deleted directories": "Izbrisane mape",
    "Deleted files": "Izbrisane datoteke",
    "Deleted library": "Izbrisana knji\u017enica",
    "Description": "Opis",
    "Description is required": "Opis je zahtevan",
    "Detail": "Podrobnosti",
    "Details": "Podrobnosti",
    "Device Name": "Naziv naprave",
    "Devices": "Naprave",
    "Directory": "Mapa",
    "Document convertion failed.": "Sprememba dokumenta, spodletela.",
    "Documents": "Dokumenti",
    "Don't keep history": "Ne obdr\u017ei zgodovine",
    "Download": "Prenos",
    "Edit": "Uredi",
    "Edit succeeded": "Urejanje uspe\u0161no",
    "Email": "Email",
    "Encrypt": "Zakriptiraj",
    "Error": "Napaka",
    "Exit System Admin": "Izhod iz sistemske admin",
    "Expiration": "\u010cas veljavnosti",
    "Export Excel": "Izvozi v Excel",
    "Failed": "Neuspe\u0161no",
    "Failed. Please check the network.": "Neuspe\u0161no. Prosimo, preverite povezavo.",
    "File": "Datoteka",
    "File Upload": "Nalo\u017ei datoteko",
    "File Uploading...": "Nalaganje datoteke...",
    "File download is disabled: the share link traffic of owner is used up.": "Prenos datotek je onemogo\u010deno: dovoljena koli\u010dina prenosa datotek uporabnika je prese\u017eena",
    "Files": "Datoteke",
    "Folder": "Mapa",
    "Folder Permission": "Pravice mape",
    "Folders": "Mape",
    "Generate": "Ustvari",
    "Grid": "Mre\u017ea",
    "Group": "Skupine",
    "Group Permission": "Pravice skupine",
    "Groups": "Skupine",
    "Guest": "Gost",
    "Help": "Pomo\u010d",
    "Hide": "Skrij",
    "History": "Zgodovina",
    "IP": "IP",
    "Image": "Slika",
    "Images": "Slike",
    "Import Members": "Uvozi uporabnike",
    "In all libraries": "v vseh knji\u017enicah",
    "Inactive": "Neaktiven",
    "Info": "Info",
    "Input file extensions here, separate with ','": "Vnesite kon\u010dnice datotek tukaj, razdelite jih z ','",
    "Internal Server Error": "Notranja napaka stre\u017enika",
    "Invalid destination path": "Neveljavna kon\u010dna pot",
    "It is required.": "Je zahtevano.",
    "Keep full history": "Obdr\u017ei vso zgodovino",
    "LDAP": "LDAP",
    "Language": "Jezik",
    "Language Setting": "Nastavitev jezika",
    "Last Access": "Zadnji\u010d dostopano",
    "Last Login": "Zadnja prijava",
    "Last Update": "Posodobljeno",
    "Leave Share": "Zapusti deljeno",
    "Libraries": "Knji\u017enice",
    "Library": "Knji\u017enica",
    "Limits": "Omejitve",
    "Link": "Povezava",
    "Links": "Povezave",
    "List": "Seznam",
    "Lock": "Zakleni",
    "Log out": "Odjava",
    "Logs": "Dnevniki",
    "Mark all read": "Ozna\u010di kot prebrano",
    "Member": "\u010clan",
    "Members": "\u010clani",
    "Message": "Sporo\u010dilo",
    "Message (optional):": "Sporo\u010dilo (opcijsko):",
    "Modification Details": "Podrobnosti sprememb",
    "Modified": "Spremenjen",
    "Modified files": "Spremenjene datoteke",
    "Modifier": "Urejal",
    "Month:": "Mesec:",
    "More": "Ve\u010d",
    "More Operations": "Ve\u010d operacij",
    "Move": "Premakni",
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
    "No result": "Brez zadetka",
    "None": "Brez",
    "Notification Detail": "Podrobnosti obvestila",
    "Notifications": "Obvestila",
    "Number of groups": "\u0160tevilo skupin",
    "Old Password": "Staro geslo",
    "Only keep a period of history:": "Obdr\u017ei zgodovino samo dolo\u010deno obdobje:",
    "Open via Client": "Odpri s klientom",
    "Operation": "Mo\u017enosti",
    "Operation succeeded.": "Operacija uspe\u0161no izvedena.",
    "Operations": "Operacije",
    "Organization": "Organizacija",
    "Organizations": "Organizacija",
    "Other Libraries": "Ostale knji\u017enice",
    "Owner": "Lastnik",
    "Owner can use admin panel in an organization, must be a new account.": "Lastnik lahko uporabi nadzorno plo\u0161\u010do v organizaciji, mora biti nov ra\u010dun.",
    "Password": "Geslo",
    "Password again": "Ponovno geslo",
    "Password is too short": "Geslo je prekratko",
    "Password:": "Geslo:",
    "Passwords don't match": "Gesli se ne ujemata",
    "Permission": "Dovoljenja",
    "Permission denied": "Dostop zavrnjen",
    "Permission:": "Pravice:",
    "Platform": "Os",
    "Please check the network.": "Prosimo, preverite povezavo.",
    "Please enter 1 or more character": "Prosimo, vpi\u0161i 1 ali ve\u010d znakov",
    "Please enter days": "Prosimo, vnesite \u0161tevilo dni",
    "Please enter password": "Prosimo vnesite geslo",
    "Please enter the new password again": "Prosimo vnesite ponovno novo geslo",
    "Please enter the old password": "Prosimo vnesite novo geslo",
    "Please enter the password again": "Prosimo ponovno vnesite geslo",
    "Please input at least an email.": "Prismo vnesite najmanj en email.",
    "Previous": "Prej\u0161nja",
    "Professional Edition": "Professional Edition",
    "Profile": "Profil",
    "Profile Setting": "Nastavitve profila",
    "Read-Only": "Samo branje",
    "Read-Write": "Branje-pisanje",
    "Really want to delete your account?": "Ali res \u017eelite odstraniti svoj ra\u010dun?",
    "Remove": "Odstrani",
    "Rename": "Preimenuj",
    "Rename File": "Preimenuj datoteko",
    "Renamed or Moved files": "Preimenovane ali premaknjene datoteke",
    "Reset Password": "Ponastavitev gesla",
    "ResetPwd": "Spremen.Geslo",
    "Restore": "Obnovi",
    "Restore Library": "Obnovi knji\u017enico",
    "Result": "Rezultat",
    "Revoke Admin": "Odstrani iz admin",
    "Role": "Vloga",
    "Saving...": "Shranjujem\u2026.",
    "Seafile": "Seafile",
    "Search Files": "Iskanje datotek",
    "Search files in this library": "Iskanje datotek v tej knji\u017enici",
    "Search users...": "Iskanje uporabnikov...",
    "See All Notifications": "Ogled vse obvestil",
    "Select libraries to share": "Izberi knji\u017enice za skupno rabo",
    "Send": "Po\u0161lji",
    "Send to:": "Po\u0161lji za:",
    "Sending...": "Po\u0161iljam...",
    "Server Version: ": "Verzija stre\u017enika:",
    "Set Admin": "Nastavi za admin",
    "Set Quota": "Nastavi kvoto",
    "Set to current": "Nastavi na trenutno",
    "Settings": "Nastavitve",
    "Share": "Delji",
    "Share Admin": "Deljeno/Javno",
    "Share From": "Delij od",
    "Share To": "Deljeno z",
    "Share existing libraries": "Deli obstoje\u010de knji\u017enice",
    "Share to group": "Deli s skupino",
    "Share to user": "Deli z uporabnikom",
    "Shared By": "V skupni rabi z",
    "Shared Links": "Skupne povezave",
    "Shared by: ": "Deljil:",
    "Show": "Prika\u017ei",
    "Size": "Velikost",
    "Space Used": "Poraba prostora",
    "Star": "Pomembno",
    "Status": "Stanje",
    "Submit": "Potrdi",
    "Success": "Uspeh",
    "Successfully copied %(name)s and %(amount)s other items.": "Uspe\u0161no kopirana %(name)s in %(amount)s ostalih datotek.",
    "Successfully copied %(name)s and 1 other item.": "Uspe\u0161no kopirana %(name)s in 1 dodatna datoteka.",
    "Successfully copied %(name)s.": "Uspe\u0161no kopirano %(name)s.",
    "Successfully deleted %s": "Uspe\u0161no odstranjeno %s",
    "Successfully moved %(name)s and %(amount)s other items.": "Supe\u0161no prestavljeno %(name)s in %(amount)s ostalih datotek.",
    "Successfully moved %(name)s and 1 other item.": "Uspe\u0161no prestavljeno %(name)s in 1 druga datoteka.",
    "Successfully moved %(name)s.": "Uspe\u0161no prestavljeno %(name)s.",
    "Successfully reset password to %(passwd)s for user %(user)s.": "Uspe\u0161no ponastavljeno geslo na %(passwd)s za uporabnika %(user)s.",
    "Successfully revoke the admin permission of %s": "Uspe\u0161no preklicane pravice administratorja za %s",
    "Successfully sent to {placeholder}": "Uspe\u0161no poslano {placeholder}",
    "Successfully set %s as admin.": "Uspe\u0161no nastavljen %s kot admin.",
    "System": "Sistem",
    "System Admin": "Sistemski admin",
    "System Info": "Informacije o sistemu",
    "Text files": "Textovne datoteke",
    "The owner of this library has run out of space.": "Lastnik te knji\u017enice nima ve\u010d prostora.",
    "The password will be kept in the server for only 1 hour.": "Geslo bo hranjeno na stre\u017eniku za samo 1 uro.",
    "This library is password protected": "Knji\u017enica je varovana z geslom",
    "This operation will not be reverted. Please think twice!": "Te operacije ni mogo\u010de povrniti. Prosimo premislite dvakrat!",
    "Time": "\u010cas",
    "Tip: 0 means default limit": "Namig: 0 pomeni prednastavljeno kvoto",
    "Tip: a snapshot will be generated after modification, which records the library state after the modification.": "Nasvet: po spremembah bo ustvarjen trenutni posnetek, ki zabele\u017ei stanje knji\u017enice po spremembah.",
    "Total Users": "Vsi uporabniki",
    "Traffic": "Promet",
    "Transfer": "Prenesi",
    "Transfer Library": "Prenos knji\u017enice",
    "Trash": "Ko\u0161",
    "Type": "Tip",
    "Unknown": "Neznan",
    "Unlink": "Odstrani",
    "Unlock": "Odkleni",
    "Unshare": "Odstrani deljenje",
    "Unshare Library": "Odstrani knji\u017enico iz deljenja",
    "Unstar": "Odstrani pomembno",
    "Update": "Posodobi",
    "Upgrade to Pro Edition": "Nadgradite na Pro verzijo",
    "Upload": "Nalo\u017ei",
    "Upload Files": "Nalo\u017ei datoteke",
    "Upload Folder": "Mapa za nalaganje",
    "Upload Link": "URL nalaganje",
    "Upload Links": "Povezave za nalaganje",
    "Upload file": "Nalo\u017ei datoteko",
    "Used:": "Poraba:",
    "User": "Uporabnik",
    "User Permission": "Pravice uporabnika",
    "Username:": "Uporabni\u0161ko ime:",
    "Users": "Uporabniki",
    "Video": "Video",
    "View": "Ogled",
    "View Snapshot": "Ogled postneka",
    "Virus Scan": "Protivirusni pregled",
    "Visits": "Obiski",
    "Wrong password": "Napa\u010dno geslo",
    "You can also add a user as a guest, who will not be allowed to create libraries and groups.": "Uporabnike lahko dodate tudi kot goste, ne bo jim dovoljeno ustvariti knji\u017enice in skupine.",
    "You can use this field at login.": "To polje lahko uporabi\u0161 pri prijavi.",
    "Your notifications will be sent to this email.": "Tvoja obvestila bodo poslana na ta email naslov.",
    "ZIP": "ZIP",
    "all": "skupaj",
    "all members": "vsi \u010dlani",
    "days": "dni",
    "icon": "ikona",
    "locked": "zaklenjeno",
    "name": "ime",
    "shared by:": "deljeno z:",
    "starred": "pomembno",
    "to": "k",
    "unstarred": "odstrani pomembno",
    "you can also press \u2190 ": "lahko tudi kliknete na \u2190 "
  };
  for (const key in newcatalog) {
    django.catalog[key] = newcatalog[key];
  }
  

  if (!django.jsi18n_initialized) {
    django.gettext = function(msgid) {
      const value = django.catalog[msgid];
      if (typeof value === 'undefined') {
        return msgid;
      } else {
        return (typeof value === 'string') ? value : value[0];
      }
    };

    django.ngettext = function(singular, plural, count) {
      const value = django.catalog[singular];
      if (typeof value === 'undefined') {
        return (count == 1) ? singular : plural;
      } else {
        return value.constructor === Array ? value[django.pluralidx(count)] : value;
      }
    };

    django.gettext_noop = function(msgid) { return msgid; };

    django.pgettext = function(context, msgid) {
      let value = django.gettext(context + '\x04' + msgid);
      if (value.includes('\x04')) {
        value = msgid;
      }
      return value;
    };

    django.npgettext = function(context, singular, plural, count) {
      let value = django.ngettext(context + '\x04' + singular, context + '\x04' + plural, count);
      if (value.includes('\x04')) {
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
      "%d.%m.%y %H:%M:%S",
      "%d.%m.%y %H:%M:%S.%f",
      "%d.%m.%y %H:%M",
      "%d-%m-%Y %H:%M:%S",
      "%d-%m-%Y %H:%M:%S.%f",
      "%d-%m-%Y %H:%M",
      "%d. %m. %Y %H:%M:%S",
      "%d. %m. %Y %H:%M:%S.%f",
      "%d. %m. %Y %H:%M",
      "%d. %m. %y %H:%M:%S",
      "%d. %m. %y %H:%M:%S.%f",
      "%d. %m. %y %H:%M",
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
    "FIRST_DAY_OF_WEEK": 0,
    "MONTH_DAY_FORMAT": "j. F",
    "NUMBER_GROUPING": 3,
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
      const value = django.formats[format_type];
      if (typeof value === 'undefined') {
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
};

