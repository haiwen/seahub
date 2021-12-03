import os
import sys
import subprocess
import shutil

def get_dependent_libs(executable):
    syslibs = ['libsearpc', 'libccnet', 'libseafile', 'libpthread.so', 'libc.so', 'libm.so', 'librt.so', 'libdl.so', 'libselinux.so', 'libresolv.so' ]
    def is_syslib(lib):
        for syslib in syslibs:
            if syslib in lib:
                return True
        return False

    ldd_output = subprocess.getoutput('ldd %s' % executable)
    ret = []
    for line in ldd_output.splitlines():
        tokens = line.split()
        if len(tokens) != 4:
            continue
        if is_syslib(tokens[0]):
            continue

        ret.append(tokens[2])

    return ret

def prepend_env_value(name, value, seperator=':'):
    '''append a new value to a list'''
    try:
        current_value = os.environ[name]
    except KeyError:
        current_value = ''

    new_value = value
    if current_value:
        new_value += seperator + current_value

    os.environ[name] = new_value

def main():
    prepend_env_value ('LD_LIBRARY_PATH',
                       '/tmp/seafile-pro-server-build/seafile-pro-server-1.6.5/seafile/lib')
    destdir = sys.argv[1]
    dest_libdir = os.path.join(destdir, 'lib')
    dest_bindir = os.path.join(destdir, 'bin')

    for d in (dest_bindir, dest_libdir):
        if not os.path.exists(d):
            os.makedirs(d)
        elif not os.path.isdir(d):
            raise RuntimeError('"%s" is not a directory!' % d)

    bindir = '/tmp/seafile-pro-server-build/seafile-pro-server-1.6.5/seafile/bin'
    httpserver = os.path.join(bindir, 'httpserver')
    pdf2htmlEX = os.path.join(bindir, 'pdf2htmlEX')

    httpserver_libs = get_dependent_libs(httpserver)
    pdf2htmlEX_libs = get_dependent_libs(pdf2htmlEX)

    needed_libs = set(pdf2htmlEX_libs) - set(httpserver_libs)
    for lib in needed_libs:
        dest = os.path.join(dest_libdir, os.path.basename(lib))
        if not os.path.exists(dest):
            shutil.copy(lib, dest)

    shutil.copy(pdf2htmlEX, dest_bindir)

if __name__ == '__main__':
    main()
