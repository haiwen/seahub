

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
    "Are you sure you want to clear trash?": "Ali ste prepri\u010dani, da \u017eelite sprazniti smeti?", 
    "Are you sure you want to delete %s ?": "Ali si prepri\u010dan/a, da \u017eeli\u0161 odstraniti %s ?", 
    "Are you sure you want to delete %s completely?": "Ali ste prepri\u010dani, da \u017eelite povsem izbrisati %s?", 
    "Are you sure you want to delete all %s's libraries?": "Ali ste prepri\u010dani, da \u017eelite izbrisati vse knji\u017enice uporabnika %s?", 
    "Are you sure you want to delete these selected items?": "Ali ste prepri\u010dani da \u017eelite izbrisati izbrano?", 
    "Are you sure you want to quit this group?": "Ali si prepri\u010dan/a, da \u017eeli\u0161 ukiniti to skupino?", 
    "Are you sure you want to restore %s?": "Ali ste prepri\u010dani, da \u017eelite obnoviti %s?", 
    "Are you sure you want to unshare %s ?": "Ali ste prepri\u010dani da \u017eelite odstraniti deljenje za %s ?", 
    "Cancel": "Prekli\u010di", 
    "Canceled.": "Preklicano.", 
    "Clear Trash": "Sprazni ko\u0161", 
    "Close (Esc)": "Zapri (Esc)", 
    "Copying %(name)s": "Kopiranje %(name)s", 
    "Copying file %(index)s of %(total)s": "Kopiranje datoteke %(index)s od %(total)s", 
    "Delete": "Izbri\u0161i", 
    "Delete Group": "Odstranitev skupine", 
    "Delete Items": "Izbri\u0161i predmete", 
    "Delete Library": "Izbri\u0161i knji\u017enico", 
    "Delete Member": "Izbri\u0161i \u010dlana", 
    "Delete User": "Izbri\u0161i uporabnika", 
    "Deleted directories": "Izbrisane mape", 
    "Deleted files": "Izbrisane datoteke", 
    "Dismiss Group": "Prekli\u010di skupino", 
    "Edit Page": "Uredi stran", 
    "Empty file upload result": "Rezultat nalaganja prazne datoteke", 
    "Error": "Napaka", 
    "Failed to send to {placeholder}": "Neuspe\u0161no poslano {placeholder}", 
    "Failed.": "Neuspe\u0161no.", 
    "Failed. Please check the network.": "Neuspe\u0161no. Prosimo, preverite povezavo.", 
    "File Upload canceled": "Nalaganje datoteke preklicano", 
    "File Upload complete": "Nalaganje datoteke kon\u010dano", 
    "File Upload failed": "Nalaganje datoteke ni uspelo", 
    "File Uploading...": "Nalaganje datoteke...", 
    "File is locked": "Datoteka je zaklenjena", 
    "File is too big": "Datoteka je prevelika", 
    "File is too small": "Datoteka je premajhna", 
    "Filetype not allowed": "Vrsta datoteke ni dovoljena", 
    "Hide": "Skrij", 
    "Internal error. Failed to copy %(name)s.": "Notranja napaka. Spodletelo kopiranje %(name)s.", 
    "Internal error. Failed to move %(name)s.": "Notranja napaka. Spodletelo premikanje %(name)s.", 
    "Invalid destination path": "Neveljavna kon\u010dna pot", 
    "It is required.": "Je zahtevano.", 
    "Just now": "Ravnokar", 
    "Last Update": "Posodobljeno", 
    "Loading failed": "Neuspe\u0161no nalaganje", 
    "Loading...": "Nalagam...", 
    "Log out": "Odjava", 
    "Modified files": "Spremenjene datoteke", 
    "Moving %(name)s": "Premikanje %(name)s", 
    "Moving file %(index)s of %(total)s": "Premik datoteke %(index)s od %(total)s", 
    "Name": "Ime", 
    "Name is required": "Naziv je zahtevan", 
    "Name is required.": "Ime je zahtevano.", 
    "New File": "Nova datoteka", 
    "New Folder": "Nova mapa", 
    "New directories": "Nove mape", 
    "New files": "Nove datoteke", 
    "New password is too short": "Novo geslo je prekratko", 
    "New passwords don't match": "Novi gesli se ne ujemata", 
    "Next (Right arrow key)": "Naprej (Desna pu\u0161\u010dica)", 
    "No matches": "Ni zadetkov", 
    "Only an extension there, please input a name.": "Je samo kon\u010dnica, prosimo vnesite \u0161e naziv.", 
    "Open in New Tab": "Odpri v novem zavihku", 
    "Pages": "Strani", 
    "Password is required.": "Geslo je zahtevano", 
    "Password is too short": "Geslo je prekratko", 
    "Passwords don't match": "Gesli se ne ujemata", 
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
    "Previous (Left arrow key)": "Prej\u0161nji (Leva pu\u0161\u010dica)", 
    "Processing...": "Obdelujem\u2026.", 
    "Quit Group": "Zaklju\u010di skupino", 
    "Read-Only": "Samo branje", 
    "Read-Write": "Branje-pisanje", 
    "Really want to dismiss this group?": "Ali res \u017eeli\u0161 preklicati skupino?", 
    "Rename": "Preimenuj", 
    "Rename File": "Preimenuj datoteko", 
    "Renamed or Moved files": "Preimenovane ali premaknjene datoteke", 
    "Restore Library": "Obnovi knji\u017enico", 
    "Saving...": "Shranjujem\u2026.", 
    "Search files in this wiki": "Iskanje datotek v tem Wiki", 
    "Searching...": "Iskanje...", 
    "Select groups": "Izberi skupine", 
    "Settings": "Nastavitve", 
    "Show": "Prika\u017ei", 
    "Size": "Velikost", 
    "Start": "Za\u010detek", 
    "Submit": "Potrdi", 
    "Success": "Uspeh", 
    "Successfully copied %(name)s": "Uspe\u0161no kopiranje %(name)s", 
    "Successfully copied %(name)s and %(amount)s other items.": "Uspe\u0161no kopirana %(name)s in %(amount)s ostalih datotek.", 
    "Successfully copied %(name)s and 1 other item.": "Uspe\u0161no kopirana %(name)s in 1 dodatna datoteka.", 
    "Successfully copied %(name)s.": "Uspe\u0161no kopirano %(name)s.", 
    "Successfully deleted %(name)s": "Uspe\u0161no odstranjena %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "Uspe\u0161no odstranjeno %(name)s in %(amount)s ostalih datotek.", 
    "Successfully deleted %(name)s.": "Uspe\u0161no ostranjena %(name)s.", 
    "Successfully deleted.": "Uspe\u0161en izbris.", 
    "Successfully moved %(name)s": "Uspe\u0161en premik %(name)s", 
    "Successfully moved %(name)s and %(amount)s other items.": "Supe\u0161no prestavljeno %(name)s in %(amount)s ostalih datotek.", 
    "Successfully moved %(name)s and 1 other item.": "Uspe\u0161no prestavljeno %(name)s in 1 druga datoteka.", 
    "Successfully moved %(name)s.": "Uspe\u0161no prestavljeno %(name)s.", 
    "Successfully sent to {placeholder}": "Uspe\u0161no poslano {placeholder}", 
    "System Admin": "Sistemski admin", 
    "Transfer Library": "Prenos knji\u017enice", 
    "Unshare Library": "Odstrani knji\u017enico iz deljenja", 
    "Uploaded bytes exceed file size": "Prekora\u010dena velikost nalo\u017eenih bitov.", 
    "Used": "Porabljeno", 
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

