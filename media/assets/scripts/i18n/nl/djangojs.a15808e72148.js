

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
    "%curr% of %total%": "%curr% van %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">De afbeelding</a> kon niet worden geladen.", 
    "Add User": "Gebruiker toevoegen", 
    "Added user {user}": "Gebruiker {user} toegevoegd", 
    "Are you sure you want to clear trash?": "Weet je zeker dat je de prullenbak wilt legen?", 
    "Are you sure you want to delete %s ?": "Weet je zeker dat je %s wilt verwijderen?", 
    "Are you sure you want to delete %s completely?": "Weet je zeker dat je %s volledig wilt verwijderen?", 
    "Are you sure you want to delete all %s's libraries?": "Weet je zeker dat al %s's bibliotheken wilt verwijderen?", 
    "Are you sure you want to delete these selected items?": "Weet je zeker dat je deze items wilt verwijderen?", 
    "Are you sure you want to quit this group?": "Weet je zeker dat je deze groep wil verlaten?", 
    "Are you sure you want to restore %s?": "Weet je zeker dat je %s wilt herstellen?", 
    "Are you sure you want to unlink this device?": "Weet je zeker dat je dit apparaat wilt ontkoppelen?", 
    "Cancel": "Annuleren", 
    "Canceled.": "Geannuleerd.", 
    "Change Password of Library {placeholder}": "Wijzig wachtwoord van bibliotheek {placeholder}", 
    "Clear Trash": "Prullenbak legen", 
    "Close (Esc)": "Sluiten (Esc)", 
    "Copy selected item(s) to:": "Geselecteerde item(s) kopi\u00ebren naar:", 
    "Copy {placeholder} to:": "Kopieer {placeholder} naar:", 
    "Copying %(name)s": "Kopieren van %(name)s", 
    "Copying file %(index)s of %(total)s": "Kopieren van bestand %(index)s van %(total)s", 
    "Create Group": "Groep aanmaken", 
    "Create Library": "Bibliotheek aanmaken", 
    "Delete": "Verwijderen", 
    "Delete Group": "Groep verwijderen", 
    "Delete Items": "Items verwijderen", 
    "Delete Library": "Bibliotheek verwijderen", 
    "Delete Library By Owner": "Verwijder Bibliotheek Per Eigenaar", 
    "Delete Member": "Lid verwijderen", 
    "Delete User": "Gebruiker verwijderen", 
    "Delete failed": "Verwijderen mislukt", 
    "Delete files from this device the next time it comes online.": "Verwijder bestanden van dit apparaat op het moment dat deze weer online komt.", 
    "Deleted directories": "Verwijderde mappen", 
    "Deleted files": "Verwijderde bestanden", 
    "Deleted group {group_name}": "Groep {group_name} verwijderd", 
    "Deleted library {library_name}": "Bibliotheek {library_name} verwijderd", 
    "Deleted user {user}": "Gebruiker {user} verwijderd", 
    "Dismiss Group": "Sluit groep", 
    "Edit failed": "Bewerken mislukt", 
    "Empty file upload result": "Leeg bestand getracht te uploaden", 
    "Encrypted library": "Versleutelde bibliotheek", 
    "Error": "Fout", 
    "Expired": "Verlopen", 
    "Failed to copy %(name)s": "Kon %(name)s niet kopi\u00ebren", 
    "Failed to delete %(name)s and %(amount)s other items.": "Kon %(name)s en %(amount)s andere items niet verwijderen.", 
    "Failed to delete %(name)s and 1 other item.": "Kon %(name)s en 1 ander item niet verwijderen.", 
    "Failed to delete %(name)s.": "Kon %(name)s niet verwijderen.", 
    "Failed to move %(name)s": "Kon %(name)s niet verplaatsen", 
    "Failed to send to {placeholder}": "Kon niet naar {placeholder} versturen", 
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
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Interne fout. Kon %(name)s en %(amount)s andere item(s) niet kopi\u00ebren.", 
    "Internal error. Failed to copy %(name)s.": "Interne fout. Kon %(name)s niet kopi\u00ebren.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Interne fout. Kon %(name)s en %(amount)s andere item(s) niet verplaatsen.", 
    "Internal error. Failed to move %(name)s.": "Interne fout. Kon %(name)s niet verplaatsen.", 
    "Invalid destination path": "Ongeldig bestandspad bestemming", 
    "It is required.": "Het is verplicht.", 
    "Just now": "Zojuist", 
    "Loading failed": "Ophalen mislukt", 
    "Loading...": "Laden...", 
    "Log in": "Aanmelden", 
    "Modified files": "Gewijzigde bestanden", 
    "Move selected item(s) to:": "Geselecteerde item(s) verplaatsen naar:", 
    "Move {placeholder} to:": "Verplaats {placeholder} naar:", 
    "Moving %(name)s": "Verplaatsen van %(name)s", 
    "Moving file %(index)s of %(total)s": "Verplaatsen van bestand %(index)s van %(total)s", 
    "Name is required": "Naam is verplicht", 
    "Name is required.": "Naam is vereist.", 
    "Name should not include '/'.": "Naam mag geen '/' bevatten.", 
    "New Excel File": "Nieuw Excelbestand", 
    "New File": "Nieuw bestand", 
    "New PowerPoint File": "Nieuw PowerPoint-bestand", 
    "New Word File": "Nieuw Word-bestand", 
    "New directories": "Nieuwe mappen", 
    "New files": "Nieuwe bestanden", 
    "New password is too short": "Nieuwe wachtwoord is te kort", 
    "New passwords don't match": "Nieuwe wachtwoorden komen niet overeen", 
    "Next (Right arrow key)": "Volgende (rechter pijltjestoets)", 
    "No matches": "Niet gevonden", 
    "Only an extension there, please input a name.": "Alleen een extensie, voer een naam in.", 
    "Open in New Tab": "Open in nieuw tabblad", 
    "Packaging...": "Aan het inpakken...", 
    "Password is required.": "Wachtwoord is verplicht.", 
    "Password is too short": "Wachtwoord is te kort", 
    "Passwords don't match": "Wachtwoorden komen niet overeen", 
    "Permission error": "Rechtenprobleem", 
    "Please check the network.": "Controleer de netwerkverbinding.", 
    "Please choose a CSV file": "Kies aub eerst een CSV bestand", 
    "Please click and choose a directory.": "Klik en selecteer een map.", 
    "Please enter 1 or more character": "Voer 1 of meer tekens in.", 
    "Please enter a new password": "Geef het nieuwe wachtwoord op", 
    "Please enter days.": "Geef dagen op.", 
    "Please enter password": "Voer wachtwoord in", 
    "Please enter the new password again": "Gelieve het wachtwoord opnieuw in te voeren", 
    "Please enter the old password": "Geeft het oude wachtwoord op", 
    "Please enter the password again": "Gelieve het wachtwoord opnieuw in te voeren", 
    "Please enter valid days": "Geef geldige dagen op", 
    "Please input at least an email.": "Voer minimaal een e-mailadres in.", 
    "Previous (Left arrow key)": "Vorige (linker pijltjestoets)", 
    "Processing...": "In behandeling...", 
    "Quit Group": "Verlaat Groep", 
    "Read-Only": "Alleen lezen", 
    "Read-Only library": "Alleen-lezen bibliotheek", 
    "Read-Write": "Lezen/schrijven", 
    "Read-Write library": "Lees-Schrijf bibliotheek", 
    "Really want to dismiss this group?": "Groep echt sluiten?", 
    "Refresh": "Vernieuwen", 
    "Rename File": "Bestand hernoemen", 
    "Rename Folder": "Map hernoemen", 
    "Renamed or Moved files": "Hernoemde of verplaatste bestanden", 
    "Replace file {filename}?": "Bestand {filename} vervangen?", 
    "Restore Library": "Bibliotheek herstellen", 
    "Saving...": "Opslaan...", 
    "Search groups": "Zoek groepen", 
    "Search user or enter email and press Enter": "Zoek gebruiker of voer email in en druk op Enter", 
    "Search users or enter emails and press Enter": "Zoek gebruikers of voer emailadressen in en druk op Enter", 
    "Searching...": "Zoeken...", 
    "Select a group": "Selecteer een groep", 
    "Select groups": "Selecteer groepen", 
    "Set {placeholder}'s permission": "Stel rechten van {placeholder} in", 
    "Share {placeholder}": "{placeholder} delen", 
    "Show": "Toon", 
    "Start": "Start", 
    "Success": "Gelukt", 
    "Successfully changed library password.": "Succesvolle wijziging van wachtwoord bibliotheek", 
    "Successfully clean all errors.": "Verwijderen van foutmeldingen gelukt.", 
    "Successfully copied %(name)s": "Succesvolle kopie van %(name)s", 
    "Successfully copied %(name)s and %(amount)s other items.": "Kopi\u00ebren van %(name)s en %(amount)s andere items gelukt.", 
    "Successfully copied %(name)s and 1 other item.": "Kopi\u00ebren van %(name)s en 1 ander item gelukt.", 
    "Successfully copied %(name)s.": "Kopi\u00ebren van %(name)s gelukt.", 
    "Successfully deleted %(name)s": "Verwijderen van %(name)s gelukt", 
    "Successfully deleted %(name)s and %(amount)s other items.": "Verwijderen %(name)s en %(amount)s andere items gelukt", 
    "Successfully deleted %(name)s and 1 other item.": "Verwijderen %(name)s en 1 ander item gelukt.", 
    "Successfully deleted %(name)s.": "Verwijderen %(name)s gelukt.", 
    "Successfully deleted 1 item": "Succesvol 1 item verwijderd.", 
    "Successfully deleted 1 item.": "Succesvol 1 item verwijderd.", 
    "Successfully deleted.": "Succesvol verwijderd.", 
    "Successfully imported.": "Succesvol ge\u00efmporteerd", 
    "Successfully modified permission": "Rechten succesvol gewijzigd", 
    "Successfully moved %(name)s": "Succesvolle verplaatsing van %(name)s.", 
    "Successfully moved %(name)s and %(amount)s other items.": "Verplaatsen van %(name)s en %(amount)s andere items gelukt.", 
    "Successfully moved %(name)s and 1 other item.": "Verplaatsen van %(name)s en 1 ander item gelukt.", 
    "Successfully moved %(name)s.": "Verplaatsen van %(name)s gelukt.", 
    "Successfully sent to {placeholder}": "Versturen naar {placeholder} gelukt", 
    "Successfully set library history.": "Bibliotheekgeschiedenis instellen gelukt.", 
    "Successfully transferred the group.": "Groep succesvol overgedragen", 
    "Successfully transferred the group. You are now a normal member of the group.": "Groep succesvol overgedragen. Je bent nu slechts gewoon lid van de groep.", 
    "Successfully transferred the library.": "Verplaatsen van de bibliotheek is gelukt.", 
    "Successfully unlink %(name)s.": "Succesvol ontkoppeld %(name)s.", 
    "Successfully unshared 1 item.": "Delen succesvol ongedaan gemaakt voor 1 item.", 
    "Successfully unstared {placeholder}": "Ster van {placeholder} verwijderd", 
    "Transfer Group": "Groep overzetten", 
    "Transfer Group {group_name} To": "Draag groep {group_name} over naar", 
    "Transfer Library": "Bibliotheek overzetten", 
    "Transfer Library {library_name} To": "Verplaats bibliotheek {library_name} naar", 
    "Transferred group {group_name} from {user_from} to {user_to}": "Groep {group_name} van {user_from} naar {user_to} overgezet", 
    "Transferred library {library_name} from {user_from} to {user_to}": "Bibliotheek {library_name} van {user_from} naar {user_to} overgezet", 
    "Unlink device": "Apparaat ontkoppelen", 
    "Uploaded bytes exceed file size": "Ge\u00fcploadde bytes overtreft bestandsgrootte", 
    "You can only select 1 item": "Je kunt maar 1 onderdeel selecteren", 
    "You cannot select any more choices": "Je kunt niet meer opties selecteren", 
    "You have logged out.": "Je bent afgemeld.", 
    "canceled": "geannuleerd", 
    "locked by {placeholder}": "vergrendeld door {placeholder}", 
    "uploaded": "ge\u00fcpload", 
    "{placeholder} Folder Permission": "{placeholder} Map toegangsrechten", 
    "{placeholder} History Setting": "{placeholder} Geschiedenis instellingen", 
    "{placeholder} Members": "{placeholder} leden", 
    "{placeholder} Share Links": "{placeholder} Gedeelde links"
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
    "DATETIME_FORMAT": "j F Y H:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d-%m-%Y %H:%M:%S", 
      "%d-%m-%y %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S", 
      "%d/%m/%Y %H:%M:%S", 
      "%d/%m/%y %H:%M:%S", 
      "%Y/%m/%d %H:%M:%S", 
      "%d-%m-%Y %H:%M:%S.%f", 
      "%d-%m-%y %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%d/%m/%Y %H:%M:%S.%f", 
      "%d/%m/%y %H:%M:%S.%f", 
      "%Y/%m/%d %H:%M:%S.%f", 
      "%d-%m-%Y %H.%M:%S", 
      "%d-%m-%y %H.%M:%S", 
      "%d/%m/%Y %H.%M:%S", 
      "%d/%m/%y %H.%M:%S", 
      "%d-%m-%Y %H.%M:%S.%f", 
      "%d-%m-%y %H.%M:%S.%f", 
      "%d/%m/%Y %H.%M:%S.%f", 
      "%d/%m/%y %H.%M:%S.%f", 
      "%d-%m-%Y %H:%M", 
      "%d-%m-%y %H:%M", 
      "%Y-%m-%d %H:%M", 
      "%d/%m/%Y %H:%M", 
      "%d/%m/%y %H:%M", 
      "%Y/%m/%d %H:%M", 
      "%d-%m-%Y %H.%M", 
      "%d-%m-%y %H.%M", 
      "%d/%m/%Y %H.%M", 
      "%d/%m/%y %H.%M", 
      "%d-%m-%Y", 
      "%d-%m-%y", 
      "%Y-%m-%d", 
      "%d/%m/%Y", 
      "%d/%m/%y", 
      "%Y/%m/%d"
    ], 
    "DATE_FORMAT": "j F Y", 
    "DATE_INPUT_FORMATS": [
      "%d-%m-%Y", 
      "%d-%m-%y", 
      "%d/%m/%Y", 
      "%d/%m/%y", 
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
      "%H:%M:%S.%f", 
      "%H.%M:%S", 
      "%H.%M:%S.%f", 
      "%H.%M", 
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

