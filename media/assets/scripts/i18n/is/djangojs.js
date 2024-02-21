

'use strict';
{
  const globals = this;
  const django = globals.django || (globals.django = {});

  
  django.pluralidx = function(n) {
    const v = (n % 10 != 1 || n % 100 == 11);
    if (typeof v === 'boolean') {
      return v ? 1 : 0;
    } else {
      return v;
    }
  };
  

  /* gettext library */

  django.catalog = django.catalog || {};
  
  const newcatalog = {
    "(current notification)": "(n\u00faverandi athugasemd)",
    "(current version)": "(n\u00faverandi \u00fatg\u00e1fa)",
    "1 month ago": "fyrir einum m\u00e1nu\u00f0i",
    "1 week ago": "fyrir einni viku",
    "3 days ago": "fyrir \u00feremur d\u00f6gum",
    "A file with the same name already exists in this folder.": "Sk\u00e1 me\u00f0 sama nafni er \u00feegar til \u00ed \u00feessarri m\u00f6ppu.",
    "About Us": "Um Okkur",
    "Access Log": "A\u00f0gangsskr\u00e1",
    "Actions": "A\u00f0ger\u00f0ir",
    "Active": "Virkt",
    "Active Users": "Virkir Notendur",
    "Activities": "Virkni",
    "Add": "B\u00e6ta vi\u00f0",
    "Add Admins": "B\u00e6ta vi\u00f0 Kerfisstj\u00f3rum",
    "Add Library": "B\u00e6ta vi\u00f0 Safni",
    "Add admin": "B\u00e6ta vi\u00f0 kerfisstj\u00f3ra",
    "Add auto expiration": "Setja sj\u00e1lfvirkan gildist\u00edma",
    "Add institution": "B\u00e6ta vi\u00f0 Stofnun",
    "Add new notification": "B\u00e6ta vi\u00f0 athugasemd",
    "Add password protection": "B\u00e6ta vi\u00f0 lykilor\u00f0av\u00f6rn",
    "Added": "B\u00e6tt vi\u00f0",
    "Admin": "Stj\u00f3rna",
    "Admins": "Kerfisstj\u00f3rar",
    "All": "Allt",
    "All Groups": "Allir H\u00f3par",
    "All Notifications": "Allar athugasemdir",
    "All Public Links": "Allir Opinberir Tenglar",
    "All file types": "Allar skr\u00e1arger\u00f0ir",
    "Anonymous User": "\u00d3\u00feekktur notandi",
    "Are you sure you want to clear trash?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir t\u00e6ma rusli\u00f0?",
    "Are you sure you want to delete %s ?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir ey\u00f0a %s ?",
    "Are you sure you want to restore this library?": "Ertu viss um a\u00f0 \u00fe\u00fa viljir endurvekja \u00feetta safn?",
    "Audio": "Hlj\u00f3\u00f0",
    "Avatar": "Sm\u00e1mynd",
    "Avatar:": "Sm\u00e1mynd:",
    "Back": "Til Baka",
    "Broken (please contact your administrator to fix this library)": "Bila\u00f0 (vinsamlegast haf\u00f0u samband vi\u00f0 kerfisstj\u00f3rann \u00feinn til a\u00f0 laga safni\u00f0)",
    "Can not copy directory %(src)s to its subdirectory %(des)s": "Get ekki afrita\u00f0 m\u00f6ppuna %(src)s \u00ed undirm\u00f6ppuna %(des)s",
    "Can not move directory %(src)s to its subdirectory %(des)s": "Get ekki flutt m\u00f6ppuna %(src)s \u00ed undirm\u00f6ppuna %(des)s",
    "Cancel": "H\u00e6tta vi\u00f0",
    "Cancel All": "H\u00e6tta vi\u00f0 allt",
    "Change": "Breyta",
    "Change Password": "Breyta Lykilor\u00f0i.",
    "Change Password of Library {placeholder}": "Breyta Lykilor\u00f0i Safns {placeholder}",
    "Clean": "Hreinsa",
    "Clear": "Hreinsa",
    "Clear Trash": "T\u00e6ma Rusli\u00f0",
    "Clear files in trash and history\uff1a": "Ey\u00f0a skr\u00e1m \u00ed rusli og s\u00f6gu :",
    "Clients": "Tengingar",
    "Close": "Loka",
    "Community Edition": "Samf\u00e9lag\u00fatg\u00e1fan",
    "Confirm Password": "Sta\u00f0festu lykilor\u00f0i\u00f0",
    "Contact Email:": "Netfang Tengili\u00f0s:",
    "Copy": "Afrita",
    "Copy selected item(s) to:": "Afrita merkt atri\u00f0i \u00ed:",
    "Count": "Fj\u00f6ldi",
    "Create": "B\u00faa til",
    "Created At": "B\u00fai\u00f0 til",
    "Created library": "Bj\u00f3 til safn",
    "Creator": "Stofnandi",
    "Current Library": "N\u00faverandi Safn",
    "Current Path: ": "N\u00faverandi Sl\u00f3\u00f0:",
    "Current Version": "N\u00faverandi \u00datg\u00e1fa",
    "Current path: ": "N\u00faverandi sl\u00f3\u00f0:",
    "Custom file types": "S\u00e9rst\u00e6\u00f0 skr\u00e1arger\u00f0",
    "Database": "Gagnagrunnur",
    "Date": "Dagsetning",
    "Default": "Sj\u00e1lfgefi\u00f0",
    "Delete": "Ey\u00f0a",
    "Delete Account": "Ey\u00f0a reikningi",
    "Delete Group": "Ey\u00f0a H\u00f3pi",
    "Delete Institution": "Ey\u00f0a Stofnun",
    "Delete Library": "Ey\u00f0a Safni",
    "Delete Member": "Ey\u00f0a F\u00e9laga",
    "Delete Notification": "Ey\u00f0a Athugasemd",
    "Delete Organization": "Ey\u00f0a Samf\u00e9lagi",
    "Delete Time": "Ey\u00f0a T\u00edma",
    "Delete User": "Ey\u00f0a Notanda",
    "Deleted": "Eytt",
    "Deleted Time": "Ey\u00f0slut\u00edmi",
    "Deleted directories": "Eyddar m\u00f6ppur",
    "Deleted files": "Eyddar skr\u00e1r",
    "Deleted library": "Eytt safn",
    "Description": "L\u00fdsing",
    "Description is required": "L\u00fdsing er \u00e1skilin",
    "Detail": "Sm\u00e1atri\u00f0i",
    "Details": "\u00cd hnotskurn",
    "Device Name": "Nafn T\u00e6kis",
    "Devices": "T\u00e6ki",
    "Directory": "Mappa",
    "Document convertion failed.": "Umskr\u00e1ning skjala mist\u00f3kst.",
    "Documents": "Lesefni",
    "Don't keep history": "Ekki skr\u00e1 s\u00f6gu",
    "Don't replace": "Ekki skipta \u00fat",
    "Download": "Ni\u00f0urhala",
    "Edit": "Breyta",
    "Edit succeeded": "Breyting t\u00f3kst",
    "Email": "Netfang",
    "Encrypt": "Dulk\u00f3\u00f0a",
    "Encrypted library": "Dulk\u00f3\u00f0a\u00f0 safn",
    "Error": "Villa",
    "Exit System Admin": "H\u00e6tta Kerfisstj\u00f3rnun",
    "Expiration": "Gildislok",
    "Expired": "\u00datrunni\u00f0",
    "Export Excel": "Flytja \u00fat \u00ed Excel skr\u00e1",
    "Failed": "Mist\u00f3kst",
    "Failed to copy %(name)s": "Mist\u00f3kst a\u00f0 afrita %(name)s",
    "Failed. Please check the network.": "Mist\u00f3kst. Vinsamlegast veldu netkerfi.",
    "File": "Skr\u00e1",
    "File Upload": "Skr\u00e1arupphle\u00f0sla",
    "File Uploading...": "Skr\u00e1 hle\u00f0st upp...",
    "File download is disabled: the share link traffic of owner is used up.": "Ni\u00f0urhal skr\u00e1a er \u00f3virkt: eigandi hlekks hefur kl\u00e1ra\u00f0 netumfer\u00f0arkv\u00f3tann sinn fyrir deilda hlekki.",
    "Files": "Skr\u00e1r",
    "Folder": "Mappa",
    "Folder Permission": "M\u00f6ppuheimild",
    "Folders": "M\u00f6ppur",
    "Generate": "Mynda",
    "Grid": "Reitir",
    "Group": "H\u00f3pur",
    "Group Permission": "R\u00e9ttindi H\u00f3ps",
    "Groups": "H\u00f3par",
    "Guest": "Gestur",
    "Handled": "Me\u00f0h\u00f6ndla\u00f0",
    "Help": "Hj\u00e1lp",
    "Hide": "Fela",
    "History": "Saga",
    "History Setting": "S\u00f6gustilling",
    "IP": "Au\u00f0kenni",
    "Image": "Mynd",
    "Images": "Myndir",
    "Import Members": "Flytja inn Me\u00f0limi",
    "In all libraries": "\u00cd \u00f6llum s\u00f6fnum",
    "Inactive": "\u00d3virkt",
    "Info": "Uppl\u00fdsingar",
    "Input file extensions here, separate with ','": "Settu inn skr\u00e1arendingar h\u00e9r, a\u00f0skildar me\u00f0 ','",
    "Institutions": "Stofnanir",
    "Internal Server Error": "Kerfisvilla",
    "Invalid destination path": "R\u00f6ng lokasl\u00f3\u00f0",
    "It is required.": "\u00deess er krafist.",
    "Keep full history": "Skr\u00e1 alla s\u00f6guna",
    "LDAP": "LDAP",
    "LDAP(imported)": "LDAP(innflutt)",
    "Language": "Tungum\u00e1l",
    "Language Setting": "Tungum\u00e1lastilling",
    "Last Access": "Seinast Sko\u00f0a\u00f0",
    "Last Login": "S\u00ed\u00f0asta Innskr\u00e1ning",
    "Last Update": "S\u00ed\u00f0asta Uppf\u00e6rsla",
    "Leave Share": "Yfirgefa Deilingu",
    "Libraries": "S\u00f6fn",
    "Library": "Safn",
    "Library Type": "Safnager\u00f0",
    "Limits": "Takm\u00f6rk",
    "Link": "Hlekkur",
    "Links": "Tenglar",
    "List": "Listi",
    "Lock": "L\u00e6sa",
    "Log out": "\u00datskr\u00e1",
    "Logs": "Kladdar",
    "Manage Members": "Stj\u00f3rna Me\u00f0limum",
    "Mark all read": "Merkja allt sem lesi\u00f0",
    "Member": "F\u00e9lagi",
    "Members": "F\u00e9lagar",
    "Message": "Skilabo\u00f0",
    "Message (optional):": "Skilabo\u00f0 (valfrj\u00e1lst):",
    "Modification Details": "Breytingarsm\u00e1atri\u00f0i",
    "Modified": "Breytt",
    "Modified files": "Breyttar skr\u00e1r",
    "Modifier": "Breytir",
    "Month:": "M\u00e1nu\u00f0ur:",
    "More": "Meira",
    "More Operations": "Fleiri a\u00f0ger\u00f0ir",
    "Move": "F\u00e6ra",
    "Move selected item(s) to:": "F\u00e6r\u00f0i merkt atri\u00f0i \u00ed:",
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
    "No result": "Engin ni\u00f0ursta\u00f0a",
    "None": "Ekkert",
    "Notification Detail": "Athugasemdir \u00cdtarefni",
    "Notifications": "Athugasemdir",
    "Number of groups": "Fj\u00f6ldi h\u00f3pa",
    "Old Password": "Gamla Lykilor\u00f0i\u00f0",
    "Only keep a period of history:": "Skr\u00e1 s\u00f6gu \u00ed \u00e1kve\u00f0inn t\u00edma",
    "Open via Client": "Opna me\u00f0 Bi\u00f0lara",
    "Operation": "A\u00f0ger\u00f0",
    "Operation succeeded.": "A\u00f0ger\u00f0 t\u00f3kst.",
    "Operations": "A\u00f0ger\u00f0ir",
    "Organization": "Samf\u00e9lag",
    "Organizations": "Samf\u00e9l\u00f6g",
    "Other Libraries": "\u00d6nnur S\u00f6fn",
    "Owner": "Eigandi",
    "Owner can use admin panel in an organization, must be a new account.": "Eigandi m\u00e1 nota kerfisstj\u00f3rastiku \u00ed samf\u00e9lagi, ver\u00f0ur a\u00f0 vera n\u00fdr f\u00e9lagi.",
    "Password": "Lykilor\u00f0",
    "Password again": "Lykilor\u00f0 aftur",
    "Password is too short": "Lykilor\u00f0i\u00f0 er of stutt",
    "Password:": "Lykilor\u00f0:",
    "Passwords don't match": "Lykilor\u00f0in stemma ekki",
    "Permission": "Leyfi",
    "Permission denied": "A\u00f0gangi hafna\u00f0",
    "Permission:": "R\u00e9ttindi:",
    "Platform": "Verkvangur",
    "Please check the network.": "Vinsamlegast athuga\u00f0u netkerfi\u00f0.",
    "Please enter 1 or more character": "Vinsamlegast sl\u00e1\u00f0u inn 1 e\u00f0a fleiri stafi",
    "Please enter a new password": "Vinsamlegast sl\u00e1\u00f0u inn n\u00fdja lykilor\u00f0i\u00f0",
    "Please enter days": "Vinsamlegast settu inn dagafj\u00f6lda ",
    "Please enter password": "Vinsamlegast sl\u00e1\u00f0u inn lykilor\u00f0",
    "Please enter the new password again": "Vinsamlegast sl\u00e1\u00f0u inn n\u00fdja lykilor\u00f0i\u00f0 aftur",
    "Please enter the old password": "Vinsamlegast sl\u00e1\u00f0u inn gamla lykilor\u00f0i\u00f0",
    "Please enter the password again": "Vinsamlegast sl\u00e1\u00f0u inn lykilor\u00f0i\u00f0 aftur",
    "Please input at least an email.": "Vindamlegast settu inn amk eitt netfang.",
    "Previous": "Fyrri",
    "Professional Edition": "S\u00e9r\u00fatg\u00e1fa",
    "Profile": "Pers\u00f3nuuppl\u00fdsingar",
    "Profile Setting": "Stillingar Pers\u00f3nuuppl\u00fdsinga",
    "Read-Only": "A\u00f0eins-Lesa",
    "Read-Only library": "A\u00f0eins-Lesa safn",
    "Read-Write": "Lesa-Skrifa",
    "Read-Write library": "Lesa-Skrifa safn",
    "Really want to delete your account?": "Viltu \u00ed alv\u00f6runni ey\u00f0a reikningnum \u00fe\u00ednum?",
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
    "Result": "Ni\u00f0ursta\u00f0a",
    "Revoke Admin": "Taka kerfisstj\u00f3rar\u00e9ttindi af",
    "Role": "Hlutverk",
    "Saving...": "Vista...",
    "Seafile": "Seafile",
    "Search": "Leita",
    "Search Files": "Leita a\u00f0 Skr\u00e1m",
    "Search files in this library": "Leita a\u00f0 skr\u00e1m \u00ed \u00feessu safni",
    "Search users...": "Leita a\u00f0 notendum...",
    "See All Notifications": "Sj\u00e1 Allar Athugasemdir",
    "Select a group": "Veldu gr\u00fappu",
    "Select libraries to share": "Veldu safn til a\u00f0 deila",
    "Send": "Senda",
    "Send to:": "Senda til:",
    "Sending...": "Sendi...",
    "Server Version: ": "\u00datg\u00e1fa \u00dej\u00f3ns:",
    "Set Admin": "Gera a\u00f0 Kerfisstj\u00f3ra",
    "Set Quota": "Setja Kv\u00f3ta",
    "Set to current": "Virkja",
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
    "Shared By": "Deilt af",
    "Shared Links": "Deildir Hlekkir",
    "Shared by: ": "Deilt af:",
    "Show": "S\u00fdna",
    "Size": "St\u00e6r\u00f0",
    "Space Used": "Nota\u00f0 Pl\u00e1ss",
    "Star": "Setja stj\u00f6rnu \u00e1",
    "Status": "Sta\u00f0a",
    "Submit": "Sam\u00feykkja",
    "Success": "T\u00f3kst",
    "Successfully changed library password.": "T\u00f3kst a\u00f0 skipta um lykilor\u00f0 safns.",
    "Successfully copied %(name)s and %(amount)s other items.": "T\u00f3kst a\u00f0 afrita %(name)s og %(amount)s \u00f6\u00f0rum atri\u00f0um.",
    "Successfully copied %(name)s and 1 other item.": "T\u00f3kst a\u00f0 afrita %(name)s og 1 \u00f6\u00f0ru atri\u00f0i.",
    "Successfully copied %(name)s.": "T\u00f3kst a\u00f0 afrita %(name)s.",
    "Successfully deleted %s": "T\u00f3kst a\u00f0 ey\u00f0a %s",
    "Successfully moved %(name)s and %(amount)s other items.": "T\u00f3kst a\u00f0 f\u00e6ra %(name)s og %(amount)s \u00f6\u00f0rum atri\u00f0um",
    "Successfully moved %(name)s and 1 other item.": "T\u00f3kst a\u00f0 f\u00e6ra %(name)s og 1 \u00f6\u00f0ru atri\u00f0i.",
    "Successfully moved %(name)s.": "T\u00f3kst a\u00f0 flytja %(name)s.",
    "Successfully reset password to %(passwd)s for user %(user)s.": "T\u00f3kst a\u00f0 endurstilla lykilor\u00f0i\u00f0 \u00ed %(passwd)s fyrir notandann %(user)s.",
    "Successfully revoke the admin permission of %s": "T\u00f3kst a\u00f0 taka kerfisstj\u00f3rar\u00e9ttindi af %s",
    "Successfully sent to {placeholder}": "T\u00f3kst a\u00f0 senda til {placeholder}",
    "Successfully set %s as admin.": "T\u00f3kst a\u00f0 gera %s a\u00f0 kerfisstj\u00f3ra.",
    "Successfully set library history.": "T\u00f3kst a\u00f0 virkja safnas\u00f6gu.",
    "Successfully transferred the library.": "T\u00f3kst a\u00f0 f\u00e6ra safni\u00f0.",
    "Sync": "Fasa",
    "System": "Kerfi",
    "System Admin": "Kerfisstj\u00f3rnun",
    "System Info": "Kerfisuppl\u00fdsingar",
    "Text files": "Textaskr\u00e1r",
    "The owner of this library has run out of space.": "Eigandi \u00feessa safns hefur fulln\u00fdtt pl\u00e1sskv\u00f3tann sinn.",
    "The password will be kept in the server for only 1 hour.": "Lykilor\u00f0i\u00f0 ver\u00f0ur a\u00f0eins geymt \u00ed eina klukkustund",
    "This library is password protected": "\u00deetta safn er vari\u00f0 me\u00f0 lykilor\u00f0i",
    "This operation will not be reverted. Please think twice!": "\u00dea\u00f0 er ekki h\u00e6gt a\u00f0 taka \u00feessa a\u00f0ger\u00f0 til baka. Vinsamlegast hugsa\u00f0u m\u00e1li\u00f0 aftur!",
    "Time": "T\u00edmi",
    "Tip: 0 means default limit": "Hint: 0 \u00fe\u00fd\u00f0ir sj\u00e1lfgefinn kv\u00f3ti",
    "Tip: a snapshot will be generated after modification, which records the library state after the modification.": "Hint: skyndimynd ver\u00f0ur b\u00fain til eftir breytingu, sem skr\u00e1ir safnast\u00f6\u00f0una eftir breytinguna.",
    "Tools": "T\u00e6ki",
    "Total Users": "Allir Notendur",
    "Traffic": "Umfer\u00f0",
    "Transfer": "Flytja",
    "Transfer Library": "F\u00e6ra safn",
    "Trash": "Ruslafata",
    "Type": "Ger\u00f0",
    "Unknown": "\u00d3\u00feekkt",
    "Unlink": "Aftengja",
    "Unlock": "Afl\u00e6sa",
    "Unshare": "Taka deilingu af",
    "Unshare Library": "H\u00e6tta deilingu Safns",
    "Unstar": "Taka stj\u00f6rnu af",
    "Update": "Uppf\u00e6ra",
    "Upgrade to Pro Edition": "Uppf\u00e6ra \u00ed S\u00e9r\u00fatg\u00e1fu",
    "Upload": "Hla\u00f0a upp",
    "Upload Files": "Hla\u00f0a upp Skr\u00e1",
    "Upload Folder": "Hla\u00f0a upp M\u00f6ppu",
    "Upload Link": "Upphle\u00f0slutengill",
    "Upload Links": "Upphle\u00f0slutenglar",
    "Upload file": "Hla\u00f0a upp skr\u00e1",
    "Used:": "Nota\u00f0:",
    "User": "Notandi",
    "User Permission": "Notendaleyfi",
    "Username:": "Notendanafn:",
    "Users": "Notendur",
    "Video": "Myndb\u00f6nd",
    "View": "Sko\u00f0a",
    "View Snapshot": "Sko\u00f0a Skyndimynd",
    "View profile and more": "Sko\u00f0a pers\u00f3nuupl\u00fdsingar og fleira",
    "Virus File": "Veiruskr\u00e1",
    "Virus Scan": "Veirusk\u00f6nnun",
    "Visits": "Heims\u00f3knir",
    "Wrong password": "Rangt lykilor\u00f0",
    "You can also add a user as a guest, who will not be allowed to create libraries and groups.": "\u00de\u00fa getur einnig b\u00e6tt vi\u00f0 notanda sem gesti, sem mun ekki geta b\u00fai\u00f0 til s\u00f6fn e\u00f0a h\u00f3pa.",
    "You can use this field at login.": "\u00de\u00fa getur nota\u00f0 \u00feennan reit vi\u00f0 innskr\u00e1ningu.",
    "Your notifications will be sent to this email.": "Tilkynningarnar til \u00fe\u00edn ver\u00f0a sendar \u00e1 \u00feetta netfang.",
    "ZIP": "ZIP",
    "all": "allt",
    "all members": "Allir f\u00e9lagar",
    "days": "dagar",
    "icon": "sm\u00e1mynd",
    "locked": "l\u00e6st",
    "name": "nafn",
    "shared by:": "deilt af:",
    "starred": "stj\u00f6rnumerkt",
    "to": "til",
    "unstarred": "Taka stj\u00f6rnu af",
    "you can also press \u2190 ": "\u00fe\u00fa getur einnig smellt \u00e1 \u2190 ",
    "{placeholder} Folder Permission": "{placeholder} M\u00f6ppu R\u00e9ttindi"
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
    "DATETIME_FORMAT": "N j, Y, P",
    "DATETIME_INPUT_FORMATS": [
      "%Y-%m-%d %H:%M:%S",
      "%Y-%m-%d %H:%M:%S.%f",
      "%Y-%m-%d %H:%M",
      "%m/%d/%Y %H:%M:%S",
      "%m/%d/%Y %H:%M:%S.%f",
      "%m/%d/%Y %H:%M",
      "%m/%d/%y %H:%M:%S",
      "%m/%d/%y %H:%M:%S.%f",
      "%m/%d/%y %H:%M"
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
    "FIRST_DAY_OF_WEEK": 0,
    "MONTH_DAY_FORMAT": "j. F",
    "NUMBER_GROUPING": 3,
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

