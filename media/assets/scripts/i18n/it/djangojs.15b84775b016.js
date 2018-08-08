

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
    "%curr% of %total%": "%curr% of %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">L'Immaginee</a> non pu\u00f2 essere caricata.", 
    "Add User": "Aggiungi utente", 
    "Added user {user}": "Utente {user} aggiunto", 
    "Are you sure you want to clear trash?": "Sei sicuro di voler svuotare il cestino?", 
    "Are you sure you want to delete %s ?": "Sei sicuro di voler eliminare %s ?", 
    "Are you sure you want to delete %s completely?": "Sei sicuro di voler eliminare %s completamente?", 
    "Are you sure you want to delete all %s's libraries?": "Sei sicuro di voler eliminare tutte le librerie di %s?", 
    "Are you sure you want to delete these selected items?": "Sei sicuro di voler eliminare gli elementi selezionati?", 
    "Are you sure you want to quit this group?": "Sei sicuro di voler abbandonare questo gruppo?", 
    "Are you sure you want to restore %s?": "Sei sicuro di voler ripristinare %s?", 
    "Are you sure you want to unlink this device?": "Sei sicuro di voler scollegare questo dispositivo?", 
    "Are you sure you want to unshare %s ?": "Sei sicuro di voler annullare la condivisione della libreria %s ?", 
    "Cancel": "Annulla", 
    "Canceled.": "Annullato.", 
    "Change Password of Library {placeholder}": "Modifica password della libreria {placeholder}", 
    "Clear Trash": "Svuota il Cestino", 
    "Close (Esc)": "Chiudi (Esc)", 
    "Copy selected item(s) to:": "Copia gli elementi selezionati su:", 
    "Copy {placeholder} to:": "Copia {placeholder} in:", 
    "Copying %(name)s": "Copia di %(name)s", 
    "Copying file %(index)s of %(total)s": "Copia del file %(index)s di %(total)s", 
    "Create Group": "Creare un gruppo", 
    "Create Library": "Crea libreria", 
    "Created group {group_name}": "Gruppo {group_name} creato", 
    "Created library {library_name} with {owner} as its owner": "Libreria {library_name} creata con {owner} come suo proprietario", 
    "Delete": "Elimina", 
    "Delete Department": "Dipartimento Rimosso", 
    "Delete Group": "Elimina gruppo", 
    "Delete Items": "Elimina elementi", 
    "Delete Library": "Elimina libreria", 
    "Delete Library By Owner": "Elimina libreria tramite proprietario", 
    "Delete Member": "Elimina membro", 
    "Delete User": "Elimina utente", 
    "Delete failed": "Rimozione fallita", 
    "Delete files from this device the next time it comes online.": "Elimina i file da questo dispositivo la prossima volta che torni online.", 
    "Deleted directories": "Cartelle eliminate", 
    "Deleted files": "File eliminati", 
    "Deleted group {group_name}": "Gruppo {group_name} eliminato", 
    "Deleted library {library_name}": "Libreria {library_name} rimossa", 
    "Deleted user {user}": "Utente {user} eliminato", 
    "Dismiss Group": "Elimina gruppo", 
    "Edit failed": "Modifica fallita", 
    "Empty file upload result": "Risultato del caricamento del file vuoto", 
    "Encrypted library": "Libreria crittografata", 
    "Error": "Errore", 
    "Expired": "Scaduto", 
    "Failed to copy %(name)s": "Impossibile copiare %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Impossibile eliminare %(name)s e %(amount)s altri articoli.", 
    "Failed to delete %(name)s and 1 other item.": "Impossibile eliminare %(name)se 1 altro elemento.", 
    "Failed to delete %(name)s.": "Impossibile eliminare %(name)s.", 
    "Failed to move %(name)s": "Impossibile spostare %(name)s", 
    "Failed to send to {placeholder}": "Impossibile inviare a {placeholder}", 
    "Failed.": "Fallimento.", 
    "Failed. Please check the network.": "Errore. Si prega di verificare la configurazione di rete.", 
    "File Upload canceled": "Caricamento file annullato", 
    "File Upload complete": "Caricamento file completato", 
    "File Upload failed": "Caricamento file fallito", 
    "File Uploading...": "Caricamento file...", 
    "File is locked": "Il file \u00e8 bloccato", 
    "File is too big": "Il file \u00e8 troppo grande", 
    "File is too small": "Il file \u00e8 troppo piccolo", 
    "Filetype not allowed": "Tipo di file non consentito", 
    "Hide": "Nacondi", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "Errore interno. Impossibile copiare %(name)s e %(amount)saltri articol(o/i).", 
    "Internal error. Failed to copy %(name)s.": "Errore interno. Impossibile copiare %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Errore interno. Impossibile spostare %(name)s e %(amount)s altri articol(o/i).", 
    "Internal error. Failed to move %(name)s.": "Errore interno. Impossibile spostare %(name)s.", 
    "Invalid destination path": "Percorso di destinazione non valido", 
    "Invalid quota.": "Quota non valida.", 
    "It is required.": "\u00c8 richiesto.", 
    "Just now": "Proprio adesso", 
    "Loading failed": "Caricamento fallito", 
    "Loading...": "Caricamento...", 
    "Log in": "Accesso", 
    "Maximum number of files exceeded": "Numero massimo di file superati", 
    "Modified files": "File modificati", 
    "Move selected item(s) to:": "Sposta gli oggetti selezionati su:", 
    "Move {placeholder} to:": "Sposta {placeholder} in:", 
    "Moving %(name)s": "Spostamento di %(name)s", 
    "Moving file %(index)s of %(total)s": "Spostamento del file %(index)s di %(total)s", 
    "Name is required": "Il nome \u00e8 obbligatorio", 
    "Name is required.": "Il nome \u00e8 obbligatorio.", 
    "Name should not include '/'.": "Il nome non dovrebbe contenere '/'.", 
    "New Department": "Nuovo Dipartimento", 
    "New Excel File": "Nuovo file Excel", 
    "New File": "Nuovo File", 
    "New Markdown File": "Nuovo file Markdown", 
    "New PowerPoint File": "Nuovo file di PowerPoint", 
    "New Sub-department": "Nuovo Sotto-dipartimento", 
    "New Word File": "Nuovo file Word", 
    "New directories": "Nuove cartelle", 
    "New files": "Nuovi file", 
    "New password is too short": "La nuova password \u00e8 troppo corta", 
    "New passwords don't match": "Le nuove password non corrispondono", 
    "Next (Right arrow key)": "Successivo (tasto freccia destra)", 
    "No matches": "Nessuna corrispondenza", 
    "Only an extension there, please input a name.": "Qui si pu\u00f2 utilizzare solo un'estensione, per favore inserisci un nome.", 
    "Open in New Tab": "Apri in una nuova scheda", 
    "Packaging...": "Creazione del file zip in corso...", 
    "Password is required.": "Password obbligatoria", 
    "Password is too short": "La password \u00e8 troppo corta", 
    "Passwords don't match": "Le Password non corrispondono", 
    "Permission error": "Errore di autorizzazione", 
    "Please check the network.": "Si prega di controllare la configurazione di rete.", 
    "Please choose a CSV file": "Si prega di scegliere un file in formato CSV", 
    "Please click and choose a directory.": "Si prega di fare clic e scegliere una cartella.", 
    "Please enter 1 or more character": "Prego inserire 1 o pi\u00f9 caratteri", 
    "Please enter a new password": "Si prega di inserire una nuova password", 
    "Please enter days.": "Si prega di inserire giorni.", 
    "Please enter password": "Per favore, inserisci la password", 
    "Please enter the new password again": "Si prega di inserire nuovamente la nuova password", 
    "Please enter the old password": "Si prega di inserire la vecchia password", 
    "Please enter the password again": "Si prega di inserire nuovamente la password", 
    "Please enter valid days": "Si prega di inserire giorni validi", 
    "Please input at least an email.": "Per favore inserisci almeno un'email.", 
    "Previous (Left arrow key)": "Precedente (tasto freccia sinistra)", 
    "Processing...": "In lavorazione...", 
    "Quit Group": "Esci dal gruppo", 
    "Read-Only": "Sola lettura", 
    "Read-Only library": "Libreria in Lettura-Scrittura", 
    "Read-Write": "Lettura-Scrittura", 
    "Read-Write library": "Libreria in Lettura-Scrittura", 
    "Really want to dismiss this group?": "Vuoi davvero eliminare questo gruppo?", 
    "Refresh": "Aggiornare", 
    "Removed all items from trash.": "Rimossi tutti gli elementi dal cestino.", 
    "Removed items older than {n} days from trash.": "Rimossi dal cestino gli elementi pi\u00f9 vecchi di {n} giorni.", 
    "Rename File": "File Rinominato", 
    "Rename Folder": "Cartella Rinominata", 
    "Renamed or Moved files": "File rinominati o spostati", 
    "Replace file {filename}?": "Sostituisci il file {filename}?", 
    "Restore Library": "Ripristina Libreria", 
    "Saving...": "Salvataggio...", 
    "Search groups": "Cerca gruppi", 
    "Search user or enter email and press Enter": "Cerca un utente o inserisci una email e premi Invio", 
    "Search users or enter emails and press Enter": "Cerca utenti o inserisci e-mail e premi Invio", 
    "Searching...": "Ricerca in corso...", 
    "Select a group": "Seleziona un gruppo", 
    "Select groups": "Seleziona i gruppi", 
    "Set {placeholder}'s permission": "Imposta i permessi di {placeholder}s", 
    "Share {placeholder}": "Condividi {placeholder}", 
    "Show": "Visualizza", 
    "Start": "Inizio", 
    "Success": "Successo", 
    "Successfully added label(s) for library {placeholder}": "Etichett(a/e) libreria {placeholder} aggiunta/e con successo", 
    "Successfully changed library password.": "Password della biblioteca modificata con successo.", 
    "Successfully clean all errors.": "Tutti gli errori sono stati risolti.", 
    "Successfully copied %(name)s": "Copiato con successo %(name)s", 
    "Successfully copied %(name)s and %(amount)s other items.": "%(name)s copiato con successo e %(amount)s altri articoli.", 
    "Successfully copied %(name)s and 1 other item.": "%(name)s copiato con successo e 1 altro elemento.", 
    "Successfully copied %(name)s.": "%(name)sCopiato con successo.", 
    "Successfully deleted %(name)s": "Eliminato con successo %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "%(name)s eliminato con successo e %(amount)s altri articoli.", 
    "Successfully deleted %(name)s and 1 other item.": "Eliminato con successo %(name)s e 1 altro elemento.", 
    "Successfully deleted %(name)s.": "%(name)s eliminato con successo.", 
    "Successfully deleted 1 item": "1 elemento rimosso con successo", 
    "Successfully deleted 1 item.": "1 oggetto Eliminato con successo.", 
    "Successfully deleted library {placeholder}": "Libreria cancellata con successo {placeholder}", 
    "Successfully deleted member {placeholder}": "Membro {placeholder} eliminato con successo ", 
    "Successfully deleted.": "Eliminato con successo.", 
    "Successfully imported.": "Importato con successo.", 
    "Successfully invited %(email) and %(num) other people.": "Invitato con successo %(email) e %(num) altre persone.", 
    "Successfully invited %(email).": "Invitato con successo %(email).", 
    "Successfully modified permission": "Autorizzazione modificata con successo", 
    "Successfully moved %(name)s": "Spostato con successo %(name)s", 
    "Successfully moved %(name)s and %(amount)s other items.": "%(name)s spostato con successo e %(amount)s altri articoli.", 
    "Successfully moved %(name)s and 1 other item.": "%(name)s spostato con successo e 1 altro elemento.", 
    "Successfully moved %(name)s.": "%(name)s spostato con successo. ", 
    "Successfully restored library {placeholder}": "Libreria {placeholder} ripristinata con successo ", 
    "Successfully sent to {placeholder}": "Inviato con successo a {placeholder}", 
    "Successfully set library history.": "Impostare correttamente la cronologia della libreria.", 
    "Successfully transferred the group.": "Gruppo trasferito con successo.", 
    "Successfully transferred the group. You are now a normal member of the group.": "Gruppo trasferito con successo. Ora sei un normale membro del gruppo.", 
    "Successfully transferred the library.": "Libreria trasferita con successo.", 
    "Successfully unlink %(name)s.": "Scollegato correttamente %(name)s.", 
    "Successfully unshared 1 item.": "Rimossa con successo la condivisione di 1 elemento.", 
    "Successfully unshared library {placeholder}": "Condivisione della libreria {placeholder} annullata con successo", 
    "Successfully unstared {placeholder}": "{placeholder} smarcata con successo", 
    "Tag should not include ','.": "Tag non dovrebbe includere ','.", 
    "Transfer Group": "Trasferisci Gruppo", 
    "Transfer Group {group_name} To": "Trasferisci il Gruppo {group_name} a", 
    "Transfer Library": "Trasferisci Libreria", 
    "Transfer Library {library_name} To": "Trasferisci libreria {library_name} a", 
    "Transferred group {group_name} from {user_from} to {user_to}": "Gruppo {group_name} trasferito da {user_from} a {user_to}", 
    "Transferred library {library_name} from {user_from} to {user_to}": "Libreria {library_name} trasferita da {user_from} a {user_to}", 
    "Unlink device": "Scollega dispositivo", 
    "Unshare Library": "Annulla condivisione libreria", 
    "Uploaded bytes exceed file size": "I byte caricati superano le dimensioni del file", 
    "You can only select 1 item": "\u00c8 possibile selezionare 1 solo elemento", 
    "You cannot select any more choices": "Non \u00e8 possibile selezionare altre opzioni", 
    "You have logged out.": "Sei uscito.", 
    "canceled": "cancellato", 
    "locked by {placeholder}": "bloccato da {placeholder}", 
    "uploaded": "caricato", 
    "{placeholder} Folder Permission": "{placeholder} Permesso cartella", 
    "{placeholder} History Setting": "{placeholder} Impostazione dello storico", 
    "{placeholder} Members": "Membri {placeholder}", 
    "{placeholder} Share Links": "{placeholder} Collegamenti Condivisi"
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
    "DATETIME_FORMAT": "l d F Y H:i", 
    "DATETIME_INPUT_FORMATS": [
      "%d/%m/%Y %H:%M:%S", 
      "%d/%m/%Y %H:%M:%S.%f", 
      "%d/%m/%Y %H:%M", 
      "%d/%m/%Y", 
      "%d/%m/%y %H:%M:%S", 
      "%d/%m/%y %H:%M:%S.%f", 
      "%d/%m/%y %H:%M", 
      "%d/%m/%y", 
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d", 
      "%d-%m-%Y %H:%M:%S", 
      "%d-%m-%Y %H:%M:%S.%f", 
      "%d-%m-%Y %H:%M", 
      "%d-%m-%Y", 
      "%d-%m-%y %H:%M:%S", 
      "%d-%m-%y %H:%M:%S.%f", 
      "%d-%m-%y %H:%M", 
      "%d-%m-%y"
    ], 
    "DATE_FORMAT": "d F Y", 
    "DATE_INPUT_FORMATS": [
      "%d/%m/%Y", 
      "%Y/%m/%d", 
      "%d-%m-%Y", 
      "%Y-%m-%d", 
      "%d-%m-%y", 
      "%d/%m/%y"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "1", 
    "MONTH_DAY_FORMAT": "j/F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "d/m/Y H:i", 
    "SHORT_DATE_FORMAT": "d/m/Y", 
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

