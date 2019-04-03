

(function(globals) {

  var django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    var v=(n % 10 != 1 || n % 100 == 11);
    if (typeof(v) == 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  var newcatalog = {
    "%curr% of %total%": "%curr% af %total%", 
    "<a href=\"%url%\" target=\"_blank\">The image</a> could not be loaded.": "<a href=\"%url%\" target=\"_blank\">Myndina</a> var ekki h\u00e6gt a\u00f0 hla\u00f0a inn.", 
    "A file with the same name already exists in this folder.": "Sk\u00e1 me\u00f0 sama nafni er \u00feegar til \u00ed \u00feessarri m\u00f6ppu.", 
    "About Us": "Um Okkur", 
    "Access Log": "A\u00f0gangsskr\u00e1", 
    "Actions": "A\u00f0ger\u00f0ir", 
    "Active": "Virkt", 
    "Active Users": "Virkir Notendur", 
    "Activities": "Virkni", 
    "Add Admins": "B\u00e6ta vi\u00f0 Kerfisstj\u00f3rum", 
    "Add Library": "B\u00e6ta vi\u00f0 Safni", 
    "Add Wiki": "B\u00e6ta vi\u00f0 Wiki", 
    "Add admin": "B\u00e6ta vi\u00f0 kerfisstj\u00f3ra", 
    "Add auto expiration": "Setja sj\u00e1lfvirkan gildist\u00edma", 
    "Add password protection": "B\u00e6ta vi\u00f0 lykilor\u00f0av\u00f6rn", 
    "Add user": "B\u00e6ta vi\u00f0 notanda", 
    "Admin": "Stj\u00f3rna", 
    "All": "Allt", 
    "All Groups": "Allir H\u00f3par", 
    "All Public Links": "Allir Opinberir Tenglar", 
    "Anonymous User": "\u00d3\u00feekktur notandi", 
    "Are you sure you want to clear trash?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir t\u00e6ma rusli\u00f0?", 
    "Are you sure you want to delete %s ?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir ey\u00f0a %s ?", 
    "Are you sure you want to delete %s completely?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir ey\u00f0a %s algj\u00f6rlega?", 
    "Are you sure you want to delete all %s's libraries?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir ey\u00f0a \u00f6llum s\u00f6fnum sem %s \u00e1?", 
    "Are you sure you want to delete these selected items?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir ey\u00f0a \u00feessum v\u00f6ldu atri\u00f0um?", 
    "Are you sure you want to quit this group?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir h\u00e6tta \u00ed \u00feessum h\u00f3pi?", 
    "Are you sure you want to restore %s?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir endurheimta %s?", 
    "Are you sure you want to unshare %s ?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir taka deilingu af %s ?", 
    "Avatar": "Sm\u00e1mynd", 
    "Back": "Til Baka", 
    "Broken (please contact your administrator to fix this library)": "Bila\u00f0 (vinsamlegast haf\u00f0u samband vi\u00f0 kerfisstj\u00f3rann \u00feinn til a\u00f0 laga safni\u00f0)", 
    "Can not copy directory %(src)s to its subdirectory %(des)s": "Get ekki afrita\u00f0 m\u00f6ppuna %(src)s \u00ed undirm\u00f6ppuna %(des)s", 
    "Can not move directory %(src)s to its subdirectory %(des)s": "Get ekki flutt m\u00f6ppuna %(src)s \u00ed undirm\u00f6ppuna %(des)s", 
    "Cancel": "H\u00e6tta vi\u00f0", 
    "Cancel All": "H\u00e6tta vi\u00f0 allt", 
    "Canceled.": "H\u00e6tt vi\u00f0", 
    "Change Password": "Breyta Lykilor\u00f0i.", 
    "Change Password of Library {placeholder}": "Breyta Lykilor\u00f0i Safns {placeholder}", 
    "Clear Trash": "T\u00e6ma Rusli\u00f0", 
    "Clients": "Tengingar", 
    "Close": "Loka", 
    "Close (Esc)": "Loka (Esc)", 
    "Confirm Password": "Sta\u00f0festu lykilor\u00f0i\u00f0", 
    "Copy": "Afrita", 
    "Copy selected item(s) to:": "Afrita merkt atri\u00f0i \u00ed:", 
    "Copy {placeholder} to:": "Afrita {placeholder} til:", 
    "Copying %(name)s": "Afrita %(name)s", 
    "Copying file %(index)s of %(total)s": "Afrita skr\u00e1 %(index)s af %(total)s", 
    "Count": "Fj\u00f6ldi", 
    "Create At / Last Login": "B\u00faa til \u00e1 / S\u00ed\u00f0asta Innskr\u00e1ning", 
    "Created At": "B\u00fai\u00f0 til", 
    "Created library": "Bj\u00f3 til safn", 
    "Creator": "Stofnandi", 
    "Current Library": "N\u00faverandi Safn", 
    "Date": "Dagsetning", 
    "Delete": "Ey\u00f0a", 
    "Delete Group": "Ey\u00f0a H\u00f3pi", 
    "Delete Items": "Eyddum atri\u00f0um", 
    "Delete Library": "Ey\u00f0a Safni", 
    "Delete Library By Owner": "Ey\u00f0a Safni Eftir Eiganda", 
    "Delete Member": "Ey\u00f0a F\u00e9laga", 
    "Delete User": "Ey\u00f0a Notanda", 
    "Delete failed": "Ey\u00f0sla mist\u00f3kst", 
    "Deleted Time": "Ey\u00f0slut\u00edmi", 
    "Deleted directories": "Eyddar m\u00f6ppur", 
    "Deleted files": "Eyddar skr\u00e1r", 
    "Deleted library": "Eytt safn", 
    "Details": "\u00cd hnotskurn", 
    "Device Name": "Nafn T\u00e6kis", 
    "Devices": "T\u00e6ki", 
    "Dismiss": "Loka", 
    "Dismiss Group": "Ey\u00f0a Gr\u00fappu", 
    "Document convertion failed.": "Umskr\u00e1ning skjala mist\u00f3kst.", 
    "Don't keep history": "Ekki skr\u00e1 s\u00f6gu", 
    "Don't replace": "Ekki skipta \u00fat", 
    "Download": "Ni\u00f0urhala", 
    "Edit": "Breyta", 
    "Edit Page": "Breyta S\u00ed\u00f0u", 
    "Edit failed": "Breyting mist\u00f3kst", 
    "Edit failed.": "Breyting mist\u00f3kst", 
    "Email": "Netfang", 
    "Empty file upload result": "Upphle\u00f0slusta\u00f0a t\u00f3mra skr\u00e1a", 
    "Encrypt": "Dulk\u00f3\u00f0a", 
    "Encrypted library": "Dulk\u00f3\u00f0a\u00f0 safn", 
    "Error": "Villa", 
    "Expiration": "Gildislok", 
    "Expired": "\u00datrunni\u00f0", 
    "Failed to copy %(name)s": "Mist\u00f3kst a\u00f0 afrita %(name)s", 
    "Failed to delete %(name)s and %(amount)s other items.": "Mist\u00f3kst a\u00f0 ey\u00f0a %(name)s og %(amount)s \u00f6\u00f0rum atri\u00f0um.", 
    "Failed to delete %(name)s and 1 other item.": "Mist\u00f3kst a\u00f0 ey\u00f0a %(name)s og einu \u00f6\u00f0ru atri\u00f0i.", 
    "Failed to delete %(name)s.": "Mist\u00f3kst a\u00f0 ey\u00f0a %(name)s.", 
    "Failed to move %(name)s": "Mist\u00f3kst a\u00f0 f\u00e6ra %(name)s", 
    "Failed to send to {placeholder}": "Mist\u00f3kst a\u00f0 senda til {placeholder}", 
    "Failed.": "Mist\u00f3kst.", 
    "Failed. Please check the network.": "Mist\u00f3kst. Vinsamlegast veldu netkerfi.", 
    "File": "Skr\u00e1", 
    "File Name": "Skr\u00e1arnafn", 
    "File Upload": "Skr\u00e1arupphle\u00f0sla", 
    "File Upload canceled": "H\u00e6tt vi\u00f0 upphle\u00f0slu skr\u00e1ar", 
    "File Upload complete": "Upphle\u00f0slu skr\u00e1ar loki\u00f0", 
    "File Upload failed": "Upphle\u00f0sla skr\u00e1ar mist\u00f3kst", 
    "File Uploading...": "Skr\u00e1 hle\u00f0st upp...", 
    "File download is disabled: the share link traffic of owner is used up.": "Ni\u00f0urhal skr\u00e1a er \u00f3virkt: eigandi hlekks hefur kl\u00e1ra\u00f0 netumfer\u00f0arkv\u00f3tann sinn fyrir deilda hlekki.", 
    "File is locked": "Skr\u00e1 er l\u00e6st", 
    "File is too big": "Skr\u00e1 er of st\u00f3r", 
    "File is too small": "Skr\u00e1 er of sm\u00e1", 
    "Files": "Skr\u00e1r", 
    "Filetype not allowed": "Skr\u00e1arger\u00f0 er ekki leyf\u00f0", 
    "Folder": "Mappa", 
    "Folder Permission": "M\u00f6ppuheimild", 
    "Folders": "M\u00f6ppur", 
    "Generate": "Mynda", 
    "Group": "H\u00f3pur", 
    "Groups": "H\u00f3par", 
    "Help": "Hj\u00e1lp", 
    "Hide": "Fela", 
    "History": "Saga", 
    "History Setting": "S\u00f6gustilling", 
    "IP": "Au\u00f0kenni", 
    "Inactive": "\u00d3virkt", 
    "Info": "Uppl\u00fdsingar", 
    "Institutions": "Stofnanir", 
    "Internal error. Failed to copy %(name)s and %(amount)s other item(s).": "kerfisvilla. Mist\u00f3kst a\u00f0 afrita %(name)s og %(amount)s \u00f6\u00f0ru(m) atri\u00f0i/atri\u00f0um.", 
    "Internal error. Failed to copy %(name)s.": "Kerfisvilla. Mist\u00f3kst a\u00f0 afrita %(name)s.", 
    "Internal error. Failed to move %(name)s and %(amount)s other item(s).": "Kerfisvilla. Mist\u00f3kst a\u00f0 f\u00e6ra %(name)s og %(amount)s \u00f6\u00f0ru(m) atri\u00f0i/atri\u00f0um.", 
    "Internal error. Failed to move %(name)s.": "Kerfisvilla. Mist\u00f3kst a\u00f0 f\u00e6ra %(name)s.", 
    "Invalid destination path": "R\u00f6ng lokasl\u00f3\u00f0", 
    "It is required.": "\u00deess er krafist.", 
    "Just now": "R\u00e9tt \u00ed \u00feessu", 
    "Keep full history": "Skr\u00e1 alla s\u00f6guna", 
    "Last Access": "Seinast Sko\u00f0a\u00f0", 
    "Last Update": "S\u00ed\u00f0asta Uppf\u00e6rsla", 
    "Leave Share": "Yfirgefa Deilingu", 
    "Libraries": "S\u00f6fn", 
    "Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.": "Notendur sem hafa a\u00f0gang a\u00f0 s\u00f6fnum sem hefur veri\u00f0 deilt me\u00f0 skrifr\u00e9ttindum geta hala\u00f0 \u00feeim ni\u00f0ur og gert breytingar. Notendur sem hafa a\u00f0gang a\u00f0 s\u00f6fnum sem hefur veri\u00f0 deilt a\u00f0eins me\u00f0 lesr\u00e9ttindum geta hala\u00f0 \u00feeim ni\u00f0ur en ekki gert breytingar e\u00f0a sett inn n\u00fdjar skr\u00e1r \u00ed \u00feau s\u00f6fn.", 
    "Library": "Safn", 
    "Library Type": "Safnager\u00f0", 
    "Limits": "Takm\u00f6rk", 
    "Link": "Hlekkur", 
    "Links": "Tenglar", 
    "List": "Listi", 
    "Loading failed": "Hle\u00f0sla mist\u00f3kst", 
    "Loading...": "Hle\u00f0...", 
    "Lock": "L\u00e6sa", 
    "Log out": "\u00datskr\u00e1", 
    "Logs": "Kladdar", 
    "Manage Members": "Stj\u00f3rna Me\u00f0limum", 
    "Member": "F\u00e9lagi", 
    "Members": "F\u00e9lagar", 
    "Modification Details": "Breytingarsm\u00e1atri\u00f0i", 
    "Modified files": "Breyttar skr\u00e1r", 
    "More": "Meira", 
    "More Operations": "Fleiri a\u00f0ger\u00f0ir", 
    "Move": "F\u00e6ra", 
    "Move selected item(s) to:": "F\u00e6r\u00f0i merkt atri\u00f0i \u00ed:", 
    "Move {placeholder} to:": "F\u00e6ara {placeholder} til:", 
    "Moving %(name)s": "F\u00e6ri %(name)s", 
    "Moving file %(index)s of %(total)s": "F\u00e6ri skr\u00e1 %(index)s af %(total)s", 
    "My Groups": "H\u00f3parnir m\u00ednir", 
    "Name": "Nafn", 
    "Name is required": "Nafn er skilyr\u00f0i", 
    "Name is required.": "Nafn er \u00e1skili\u00f0", 
    "Name(optional)": "Nafn (valkv\u00e6mt)", 
    "New File": "N\u00fd Skr\u00e1", 
    "New Folder": "N\u00fd Mappa", 
    "New Group": "N\u00fdr H\u00f3pur", 
    "New Library": "N\u00fdtt Safn", 
    "New Password": "N\u00fdtt Lykilor\u00f0", 
    "New Password Again": "Endurtaktu N\u00fdja Lykilor\u00f0i\u00f0", 
    "New directories": "N\u00fdjar m\u00f6ppur", 
    "New files": "N\u00fdjar skr\u00e1r", 
    "New password is too short": "N\u00fdja lykilor\u00f0i\u00f0 er of stutt", 
    "New passwords don't match": "N\u00fdju lykilor\u00f0in stemma ekki", 
    "Next": "N\u00e6sta", 
    "Next (Right arrow key)": "N\u00e6sta (h\u00e6gri \u00f6rvalykill)", 
    "No library is shared to this group": "\u00fea\u00f0 er engu safni deilt me\u00f0 \u00feessum h\u00f3pi", 
    "No matches": "Engin samsv\u00f6run", 
    "Notifications": "Athugasemdir", 
    "Old Password": "Gamla Lykilor\u00f0i\u00f0", 
    "Only an extension there, please input a name.": "H\u00e9r er a\u00f0eins nafnaukinn, vinsamlegast sl\u00e1\u00f0u inn nafn.", 
    "Only keep a period of history:": "Skr\u00e1 s\u00f6gu \u00ed \u00e1kve\u00f0inn t\u00edma", 
    "Open in New Tab": "Opna \u00ed n\u00fdjum flipa", 
    "Open via Client": "Opna me\u00f0 Bi\u00f0lara", 
    "Operations": "A\u00f0ger\u00f0ir", 
    "Organization": "Samf\u00e9lag", 
    "Organizations": "Samf\u00e9l\u00f6g", 
    "Other Libraries": "\u00d6nnur S\u00f6fn", 
    "Owner": "Eigandi", 
    "Pages": "S\u00ed\u00f0ur", 
    "Password": "Lykilor\u00f0", 
    "Password again": "Lykilor\u00f0 aftur", 
    "Password is required.": "Lykilor\u00f0s er krafist.", 
    "Password is too short": "Lykilor\u00f0i\u00f0 er of stutt", 
    "Passwords don't match": "Lykilor\u00f0in stemma ekki", 
    "Permission": "Leyfi", 
    "Permission denied": "A\u00f0gangi hafna\u00f0", 
    "Permission error": "R\u00e9ttindavilla", 
    "Platform": "Verkvangur", 
    "Please check the network.": "Vinsamlegast athuga\u00f0u netkerfi\u00f0.", 
    "Please choose a CSV file": "Vinsamlegast veldu CSV skr\u00e1", 
    "Please click and choose a directory.": "Vinsamlegast smelltu og veldu m\u00f6ppu.", 
    "Please enter 1 or more character": "Vinsamlegast sl\u00e1\u00f0u inn 1 e\u00f0a fleiri stafi", 
    "Please enter a new password": "Vinsamlegast sl\u00e1\u00f0u inn n\u00fdja lykilor\u00f0i\u00f0", 
    "Please enter days.": "Vinsamlegast sl\u00e1\u00f0u inn daga.", 
    "Please enter password": "Vinsamlegast sl\u00e1\u00f0u inn lykilor\u00f0", 
    "Please enter the new password again": "Vinsamlegast sl\u00e1\u00f0u inn n\u00fdja lykilor\u00f0i\u00f0 aftur", 
    "Please enter the old password": "Vinsamlegast sl\u00e1\u00f0u inn gamla lykilor\u00f0i\u00f0", 
    "Please enter the password again": "Vinsamlegast sl\u00e1\u00f0u inn lykilor\u00f0i\u00f0 aftur", 
    "Please enter valid days": "Vinsamlegast sl\u00e1\u00f0u inn l\u00f6glega daga", 
    "Please input at least an email.": "Vindamlegast settu inn amk eitt netfang.", 
    "Previous": "Fyrri", 
    "Previous (Left arrow key)": "Fyrri (vinstri \u00f6rvalykill)", 
    "Processing...": "Vinnsla...", 
    "Quit Group": "H\u00e6tta \u00ed H\u00f3pi", 
    "Read-Only": "A\u00f0eins-Lesa", 
    "Read-Only library": "A\u00f0eins-Lesa safn", 
    "Read-Write": "Lesa-Skrifa", 
    "Read-Write library": "Lesa-Skrifa safn", 
    "Really want to dismiss this group?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir ey\u00f0a \u00feessum h\u00f3pi?", 
    "Remove": "Fjarl\u00e6gja", 
    "Rename": "Skipta um nafn", 
    "Rename File": "Endurnefna Skr\u00e1", 
    "Rename Folder": "Endurnefna M\u00f6ppu", 
    "Renamed or Moved files": "Endurnefndi e\u00f0a F\u00e6r\u00f0i skr\u00e1r", 
    "Replace": "Skipta \u00fat", 
    "Replace file {filename}?": "Skipta \u00fat skr\u00e1nni {filename}?", 
    "Replacing it will overwrite its content.": "\u00datskipting mun yfirskrifa efni \u00feess.", 
    "Reset Password": "Endursetja Lykilor\u00f0", 
    "ResetPwd": "Endursetja Lykilor\u00f0", 
    "Restore": "Endurheimta", 
    "Restore Library": "Endurvekja Safn", 
    "Revoke Admin": "Taka kerfisstj\u00f3rar\u00e9ttindi af", 
    "Role": "Hlutverk", 
    "Saving...": "Vista...", 
    "Seafile": "Seafile", 
    "Seafile Wiki enables you to organize your knowledge in a simple way. The contents of wiki is stored in a normal library with pre-defined file/folder structure. This enables you to edit your wiki in your desktop and then sync back to the server.": "Seafile Wiki gerir \u00fe\u00e9r kleift a\u00f0 skipuleggja hugmyndir \u00fe\u00ednar \u00e1 au\u00f0veldan m\u00e1ta.  Efni\u00f0 \u00ed hverju wiki er geymt \u00ed venjulegu safni me\u00f0 fyrirfram skilgreindri skipan.  \u00deetta gerir \u00fe\u00e9r kleift a\u00f0 skrifa \u00ed \u00fea\u00f0 \u00ed \u00feeim ritli sem \u00fe\u00fa k\u00fdst a\u00f0 nota og hla\u00f0a \u00fev\u00ed svo upp \u00e1 \u00fej\u00f3ninn.", 
    "Search Files": "Leita a\u00f0 Skr\u00e1m", 
    "Search files in this library": "Leita a\u00f0 skr\u00e1m \u00ed \u00feessu safni", 
    "Search user or enter email and press Enter": "Leita a\u00f0 notanda e\u00f0a sl\u00e1\u00f0u inn netfang og sl\u00e1\u00f0u \u00e1 Enter", 
    "Search users or enter emails and press Enter": "Leita a\u00f0 notendum e\u00f0a netf\u00f6ngum og sl\u00e1\u00f0u \u00e1 Enter", 
    "Searching...": "Leita...", 
    "See All Notifications": "Sj\u00e1 Allar Athugasemdir", 
    "Select a group": "Veldu gr\u00fappu", 
    "Select groups": "Veldu h\u00f3pa", 
    "Select libraries to share": "Veldu safn til a\u00f0 deila", 
    "Server Version: ": "\u00datg\u00e1fa \u00dej\u00f3ns:", 
    "Set Quota": "Setja Kv\u00f3ta", 
    "Set {placeholder}'s permission": "Setja r\u00e9ttindi {placeholder}", 
    "Settings": "Stillingar", 
    "Share": "Deila", 
    "Share Admin": "Stj\u00f3rnun deilinga", 
    "Share From": "Deilt af", 
    "Share Links": "Deilihlekkir", 
    "Share To": "Deila me\u00f0", 
    "Share existing libraries": "Deila tilb\u00fanum s\u00f6fnum", 
    "Share to group": "Deila me\u00f0 h\u00f3pi", 
    "Share to user": "Deila me\u00f0 notanda", 
    "Share {placeholder}": "Deila {placeholder}", 
    "Show": "S\u00fdna", 
    "Size": "St\u00e6r\u00f0", 
    "Space Used": "Nota\u00f0 Pl\u00e1ss", 
    "Start": "Byrja", 
    "Status": "Sta\u00f0a", 
    "Submit": "Sam\u00feykkja", 
    "Success": "T\u00f3kst", 
    "Successfully changed library password.": "T\u00f3kst a\u00f0 skipta um lykilor\u00f0 safns.", 
    "Successfully copied %(name)s": "T\u00f3kst a\u00f0 afrita %(name)s", 
    "Successfully copied %(name)s and %(amount)s other items.": "T\u00f3kst a\u00f0 afrita %(name)s og %(amount)s \u00f6\u00f0rum atri\u00f0um.", 
    "Successfully copied %(name)s and 1 other item.": "T\u00f3kst a\u00f0 afrita %(name)s og 1 \u00f6\u00f0ru atri\u00f0i.", 
    "Successfully copied %(name)s.": "T\u00f3kst a\u00f0 afrita %(name)s.", 
    "Successfully deleted %(name)s": "Giftursamlega eyddi %(name)s", 
    "Successfully deleted %(name)s and %(amount)s other items.": "T\u00f3kst a\u00f0 ey\u00f0a %(name)s og %(amount)s \u00f6\u00f0rum atri\u00f0um.", 
    "Successfully deleted %(name)s and 1 other item.": "T\u00f3kst a\u00f0 ey\u00f0a %(name)s og 1 \u00f6\u00f0ru atri\u00f0i.", 
    "Successfully deleted %(name)s.": "T\u00f3kst a\u00f0 ey\u00f0a %(name)s.", 
    "Successfully deleted %s": "T\u00f3kst a\u00f0 ey\u00f0a %s", 
    "Successfully deleted.": "Giftursamlega eytt", 
    "Successfully imported.": "T\u00f3kst a\u00f0 flytja inn", 
    "Successfully moved %(name)s": "T\u00f3kst a\u00f0 f\u00e6ra %(name)s", 
    "Successfully moved %(name)s and %(amount)s other items.": "T\u00f3kst a\u00f0 f\u00e6ra %(name)s og %(amount)s \u00f6\u00f0rum atri\u00f0um", 
    "Successfully moved %(name)s and 1 other item.": "T\u00f3kst a\u00f0 f\u00e6ra %(name)s og 1 \u00f6\u00f0ru atri\u00f0i.", 
    "Successfully moved %(name)s.": "T\u00f3kst a\u00f0 flytja %(name)s.", 
    "Successfully reset password to %(passwd)s for user %(user)s.": "T\u00f3kst a\u00f0 endurstilla lykilor\u00f0i\u00f0 \u00ed %(passwd)s fyrir notandann %(user)s.", 
    "Successfully revoke the admin permission of %s": "T\u00f3kst a\u00f0 taka kerfisstj\u00f3rar\u00e9ttindi af %s", 
    "Successfully sent to {placeholder}": "T\u00f3kst a\u00f0 senda til {placeholder}", 
    "Successfully set %s as admin.": "T\u00f3kst a\u00f0 gera %s a\u00f0 kerfisstj\u00f3ra.", 
    "Successfully set library history.": "T\u00f3kst a\u00f0 virkja safnas\u00f6gu.", 
    "Successfully transferred the library.": "T\u00f3kst a\u00f0 f\u00e6ra safni\u00f0.", 
    "Successfully unlink %(name)s.": "T\u00f3kst a\u00f0 aftengja %(name)s.", 
    "Successfully unstared {placeholder}": "T\u00f3kst a\u00f0 taka stj\u00f6rnu af {placeholder}", 
    "System Admin": "Kerfisstj\u00f3rnun", 
    "The password will be kept in the server for only 1 hour.": "Lykilor\u00f0i\u00f0 ver\u00f0ur a\u00f0eins geymt \u00ed eina klukkustund", 
    "This library is password protected": "\u00deetta safn er vari\u00f0 me\u00f0 lykilor\u00f0i", 
    "Time": "T\u00edmi", 
    "Tip: libraries deleted 30 days ago will be cleaned automatically.": "Hint: s\u00f6fnum sem eytt var fyrir 30 d\u00f6gum ver\u00f0a hreinsu\u00f0 \u00far kerfinu sj\u00e1lfkrafa.", 
    "Tools": "T\u00e6ki", 
    "Total Users": "Allir Notendur", 
    "Transfer": "Flytja", 
    "Transfer Library": "F\u00e6ra safn", 
    "Transfer Library {library_name} To": "F\u00e6ra Safn {library_name} Til", 
    "Trash": "Ruslafata", 
    "Type": "Ger\u00f0", 
    "Unlink": "Aftengja", 
    "Unlock": "Afl\u00e6sa", 
    "Unshare": "Taka deilingu af", 
    "Unshare Library": "H\u00e6tta deilingu Safns", 
    "Unstar": "Taka stj\u00f6rnu af", 
    "Update": "Uppf\u00e6ra", 
    "Upload": "Hla\u00f0a upp", 
    "Upload Files": "Hla\u00f0a upp Skr\u00e1", 
    "Upload Folder": "Hla\u00f0a upp M\u00f6ppu", 
    "Upload Link": "Upphle\u00f0slutengill", 
    "Upload Links": "Upphle\u00f0slutenglar", 
    "Uploaded bytes exceed file size": "Upphl\u00f6\u00f0num b\u00e6tum skr\u00e1arst\u00e6r\u00f0ar n\u00e1\u00f0", 
    "Used:": "Nota\u00f0:", 
    "User": "Notandi", 
    "Users": "Notendur", 
    "View": "Sko\u00f0a", 
    "Virus Scan": "Veirusk\u00f6nnun", 
    "Visits": "Heims\u00f3knir", 
    "Wrong password": "Rangt lykilor\u00f0", 
    "You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.": "\u00de\u00fa getur b\u00fai\u00f0 til safn til a\u00f0 skipuleggja skr\u00e1rnar \u00fe\u00ednar.  Til d\u00e6mis \u00fe\u00e1 getur \u00fe\u00fa b\u00fai\u00f0 til eitt fyrir hvert verkefni.  Hverju safni er h\u00e6gt a\u00f0 samstilla og deila sj\u00e1lfst\u00e6tt.", 
    "You can only select 1 item": "\u00de\u00fa getur a\u00f0eins vali\u00f0 1 atri\u00f0i", 
    "You can share a single folder with a registered user if you don't want to share a whole library.": "\u00de\u00fa getur deilt einni m\u00f6ppu me\u00f0 skr\u00e1\u00f0um notanda ef \u00fe\u00fa vilt ekki deila \u00f6llu safninu.", 
    "You can share libraries by clicking the \"New Library\" button above or the \"Share\" icon on your libraries list.": "\u00de\u00fa getur deilt safni me\u00f0 \u00fev\u00ed a\u00f0 smella \u00e1 \"N\u00fdtt Safn\" takkann h\u00e9r a\u00f0 ofan e\u00f0a \u00e1 \"Deila\" sm\u00e1myndina \u00ed safnalistanum \u00fe\u00ednum.", 
    "You can share the generated link to others and then they can upload files to this directory via the link.": "\u00de\u00fa getur deilt tenglinum me\u00f0 \u00f6\u00f0ru f\u00f3lki og \u00fea\u00f0 getur nota\u00f0 hann til a\u00f0 hla\u00f0a upp skr\u00e1m \u00ed \u00feessa m\u00f6ppu.", 
    "You cannot select any more choices": "\u00de\u00fa getur ekki merkt vi\u00f0 fleiri valm\u00f6guleika", 
    "You have not created any libraries": "\u00de\u00fa hefur ekki b\u00fai\u00f0 til nein s\u00f6fn", 
    "all members": "Allir f\u00e9lagar", 
    "canceled": "h\u00e6tt vi\u00f0", 
    "days": "dagar", 
    "icon": "sm\u00e1mynd", 
    "locked": "l\u00e6st", 
    "locked by {placeholder}": "l\u00e6st af {placeholder}", 
    "name": "nafn", 
    "starred": "stj\u00f6rnumerkt", 
    "unstarred": "Taka stj\u00f6rnu af", 
    "uploaded": "hla\u00f0i\u00f0 upp", 
    "you can also press \u2190 ": "\u00fe\u00fa getur einnig smellt \u00e1 \u2190 ", 
    "{placeholder} Folder Permission": "{placeholder} M\u00f6ppu R\u00e9ttindi", 
    "{placeholder} History Setting": "{placeholder} S\u00f6gustilling", 
    "{placeholder} Members": "{placeholder} Me\u00f0limir", 
    "{placeholder} Share Links": "{placeholder} Deilihlekkir"
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
    "DATETIME_FORMAT": "N j, Y, P", 
    "DATETIME_INPUT_FORMATS": [
      "%Y-%m-%d %H:%M:%S", 
      "%Y-%m-%d %H:%M:%S.%f", 
      "%Y-%m-%d %H:%M", 
      "%Y-%m-%d", 
      "%m/%d/%Y %H:%M:%S", 
      "%m/%d/%Y %H:%M:%S.%f", 
      "%m/%d/%Y %H:%M", 
      "%m/%d/%Y", 
      "%m/%d/%y %H:%M:%S", 
      "%m/%d/%y %H:%M:%S.%f", 
      "%m/%d/%y %H:%M", 
      "%m/%d/%y"
    ], 
    "DATE_FORMAT": "j. F Y", 
    "DATE_INPUT_FORMATS": [
      "%Y-%m-%d", 
      "%m/%d/%Y", 
      "%m/%d/%y", 
      "%b %d %Y", 
      "%b %d, %Y", 
      "%d %b %Y", 
      "%d %b, %Y", 
      "%B %d %Y", 
      "%B %d, %Y", 
      "%d %B %Y", 
      "%d %B, %Y"
    ], 
    "DECIMAL_SEPARATOR": ",", 
    "FIRST_DAY_OF_WEEK": "0", 
    "MONTH_DAY_FORMAT": "j. F", 
    "NUMBER_GROUPING": "3", 
    "SHORT_DATETIME_FORMAT": "m/d/Y P", 
    "SHORT_DATE_FORMAT": "j.n.Y", 
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

