# coding: UTF-8

from upgrade_common import upgrade_db

def main():
    try:
        upgrade_db('1.8.0')
    except Exception, e:
        print 'Error:\n', e
    else:
        print '\ndone\n'
    finally:
        print '\nprint ENTER to exit\n'
        raw_input()

if __name__ == '__main__':
    main()
