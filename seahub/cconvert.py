# -*- coding: utf-8 -*- 
# ------------------------------------------------------------
# Script   Name: convert.py
# Creation Date: 2010-09-21  02:12
# Last Modified: 2011-11-12 18:38:13
# Copyright (c)2011, DDTCMS Project
# Purpose: This file used for DDTCMS Project
# ------------------------------------------------------------

#####################################
#   Written by caocao               #
#   Modified by huyoo353@126.com    #
#   caocao@eastday.com              #
#   http://nethermit.yeah.net       #
#####################################

# python.
import sys, os
import re
import string
class CConvert:
	def __init__(self):
		self.has_shengdiao = False
		self.just_shengmu  = False
		self.spliter = '-'
		"Load data table"
		try:
			fp=open(os.path.join(os.path.dirname(__file__), 'convert-utf-8.txt'), encoding='utf-8')
		except IOError:
			print("Can't load data from convert-utf-8.txt\nPlease make sure this file exists.")
			sys.exit(1)
		else:
			self.data=fp.read()  # decoded data to unicode
			fp.close()
	
	def convert1(self, strIn):
		"Convert Unicode strIn to PinYin"
		length, strOutKey, strOutValue, i=len(strIn), "", "", 0
		while i<length:
			code1 =ord(strIn[i:i+1])
			if code1>=0x4e02 and code1<=0xe863:
				strTemp   = self.getIndex(strIn[i:i+1])
				if not self.has_shengdiao:
					strTemp  = strTemp[:-1]
				strLength = len(strTemp)
				if strLength<1:strLength=1
				strOutKey   += string.center(strIn[i:i+1], strLength)+" "
				strOutValue += self.spliter + string.center(strTemp, strLength) + self.spliter
			else:#ascii code;
				strOutKey+=strIn[i:i+1]+" "
				strOutValue+=strIn[i:i+1] + ' '
			i+=1
			#############################
			#txlist = utf8String.split()
			#out=convert.convert(utf8String)
			#l=[]
			#for t in map(convert.convert, txlist):
			#	l.append(t[0])
			#v = '-'.join(l).replace(' ','').replace(u'--','-').strip('-')
			#############################
		return [strOutValue, strOutKey]
	
	def getIndex(self, strIn):
		"Convert single Unicode to PinYin from index"
		if strIn==' ':return self.spliter
		if set(strIn).issubset("'\"`~!@#$%^&*()=+[]{}\\|;:,.<>/?"):return self.spliter # or return ""
		if set(strIn).issubset("－—！#＃%％&＆（）*，、。：；？？　@＠＼{｛｜}｝~～‘’“”《》【】+＋=＝×￥·…　".decode("utf-8")):return ""
		pos=re.search("^"+strIn+"([0-9a-zA-Z]+)", self.data, re.M)
		if pos==None:
			return strIn
		else:
			if not self.just_shengmu:
				return pos.group(1)
			else:
				return pos.group(1)[:1]
	
	def convert(self, strIn):
		"Convert Unicode strIn to PinYin"
		if self.spliter != '-' and self.spliter !='_' and self.spliter != '' and self.spliter != ' ':
			self.spliter = '-'
		pinyin_list=[]
		for c in strIn :
			pinyin_list.append(self.getIndex(c))
		pinyin=''
		for p in pinyin_list:
			if p==' ':
				pinyin+= self.spliter
				continue
			if len(p)<2:# only shengmu,just get one char,or number
				#if p.isdigit():
				#	pinyin += p + ' '
				#else:
				#	pinyin += p + ' '
				pinyin += p + ' '
			else:
				if not self.has_shengdiao: p = p[:-1]
				pinyin += self.spliter + p + self.spliter
		pinyin = pinyin.replace(' ', '') \
				.replace(self.spliter+self.spliter, self.spliter) \
				.strip(self.spliter+' ').replace(self.spliter+self.spliter, self.spliter)
		return pinyin
