var salt = sjcl.codec.bytes.toBits([0xda, 0x90, 0x45, 0xc3, 0x06, 0xc7, 0xcc, 0x26]);

// gen magic_str
function gen_magic_str(repo_id, passwd) {
    var magic_array = sjcl.misc.pbkdf2(repo_id + passwd, salt, 1000, 32*8, null);
    var magic_str = sjcl.codec.hex.fromBits(magic_array); //convert to hex
    return magic_str;
}

function FileKey(passwd) {
    this.passwd = passwd;
}
FileKey.prototype.pre = function() {
    var passwd = this.passwd;

    var key_array = sjcl.misc.pbkdf2(passwd, salt, 1000, 32*8, null);
    var iv_array = sjcl.misc.pbkdf2(key_array, salt, 10, 32*8, null);
    var key =  sjcl.codec.hex.fromBits(key_array);
    var iv = sjcl.codec.hex.fromBits(iv_array);
    
    return {key: key, iv:iv};
};
// generate an encrypted file key
FileKey.prototype.gen_enc = function() {
    var file_key_array;
    if (window.crypto && window.crypto.getRandomValues) {
        file_key_array = new Uint32Array(8);
        window.crypto.getRandomValues(file_key_array);
    } else {
        file_key_array = []; 
        for (var i = 0; i < 8; i++) {
            file_key_array.push(parseInt(Math.random() * Math.pow(2,32)));
        }
    }

    var pre = this.pre();
    var key = pre.key, iv = pre.iv;

    var encrypted_file_key_obj = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(file_key_array), CryptoJS.enc.Hex.parse(key), {iv: CryptoJS.enc.Hex.parse(iv)});
    var encrypted_file_key = encrypted_file_key_obj.ciphertext.toString(CryptoJS.enc.Hex); // convert to hex
    
    return encrypted_file_key;
};
FileKey.prototype.decrypt = function(encrypted_file_key) {
    var pre = this.pre();
    var key = pre.key, iv = pre.iv;

    var file_key_array = CryptoJS.AES.decrypt(CryptoJS.enc.Hex.parse(encrypted_file_key).toString(CryptoJS.enc.Base64), CryptoJS.enc.Hex.parse(key), {iv: CryptoJS.enc.Hex.parse(iv)});
    var file_key = file_key_array.toString(CryptoJS.enc.Hex);
    
    return file_key;
};

// gen key, iv: used in file encrypt/decrypt
function gen_enc_key_iv(file_key) {
    var enc_key_array = sjcl.misc.pbkdf2(sjcl.codec.hex.toBits(file_key), salt, 1000, 32*8, null);
    var enc_iv_array = sjcl.misc.pbkdf2(enc_key_array, salt, 10, 32*8, null);
    var enc_key = sjcl.codec.hex.fromBits(enc_key_array);
    var enc_iv = sjcl.codec.hex.fromBits(enc_iv_array);
    
    return {key: enc_key, iv:enc_iv}; 
}
