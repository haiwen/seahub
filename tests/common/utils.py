import random, string

def randomword(length):
  return ''.join(random.choice(string.lowercase) for i in range(length))
