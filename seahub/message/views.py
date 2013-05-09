import simplejson as json
from django.http import HttpResponse, HttpResponseBadRequest, \
    HttpResponseRedirect , Http404
from django.shortcuts import render_to_response, Http404
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.core.paginator import EmptyPage, InvalidPage
from django.contrib import messages 
from django.utils.translation import ugettext as _


from models import UserMessage, MessageAddForm
from message import msg_info_list
from seahub.base.accounts import User
from seahub.views import is_registered_user
from seahub.contacts.models import Contact
from seahub.utils.paginator import Paginator
from seahub.utils import render_error ,string2list
from form   import MessageForm, ToEmailForm , CheckEmail



        
# how many you don't read  list of all person
@login_required
def message_list(request):
    messages = UserMessage.objects.filter(Q(to_email=request.user.username)|Q(from_email=request.user.username)).order_by('to_email')
    
    contacts = [ c for c in Contact.objects.filter(user_email=request.user.username) \
                         if is_registered_user(c.contact_email) ]

    msgs = msg_info_list(messages,request.user.username)

    return render_to_response('message/all_msg_list.html', 
        {
        'msgs': msgs,
        'contacts': contacts
        },
        context_instance=RequestContext(request))







#the message list of one person 
@login_required
def msg_list(request):
    msgs = None

    email_form = CheckEmail({ 'check_email':request.GET.get('to_email') })
    if( not email_form.is_valid() or request.GET.get('to_email')==request.user.username) :
        raise Http404
    
    form   = MessageForm()
    to_email = email_form.cleaned_data['check_email']
    from_email = request.user.username
    
    msgs = UserMessage.objects.filter( (Q(from_email=from_email)&Q(to_email=to_email))\
            | (Q(from_email=to_email)&Q(to_email=from_email)) ).order_by('-timestamp')

    UserMessage.objects.filter( Q(from_email=to_email)&Q(to_email=from_email)&Q(ifread=0) ).update(ifread=1)

    if not is_registered_user(to_email) :
        to_email = None      
    if not to_email and not msgs:
        raise Http404
    elif  msgs  :
        paginator = Paginator(msgs, 15)
        # Make sure page request is an int. If not, deliver first page.
        try:
            page = int(request.GET.get('page', '1'))
        except ValueError:
            page = 1

    # If page request (9999) is out of range, deliver last page of results.
        try:
            person_msgs = paginator.page(page)
        except (EmptyPage, InvalidPage):
            person_msgs = paginator.page(paginator.num_pages)
        person_msgs.page_range = paginator.get_page_range(person_msgs.number)      
        person_msgs.object_list = list(person_msgs.object_list)

        return render_to_response("message/msg_of_person.html", {
        "form": form,
        "person_msgs": person_msgs,
        "to_email": to_email
        }, context_instance=RequestContext(request))
    
    else:
        return render_to_response("message/msg_of_person.html", {
            "form": form,
            "to_email": to_email
            }, context_instance=RequestContext(request)) 





@login_required
def message_send(request):
    url = "/message/msg_list?to_email="
    if request.method == 'POST':
        one_email = MessageForm(request.POST)

        if one_email.is_valid() and is_registered_user(email):
            message = UserMessage()
            msg = one_email.cleaned_data['message']
            message.to_email = one_email.cleaned_data['to_email']
            message.from_email = request.user.username
            message.message = msg
            message.ifread = 0

            if not is_registered_user( message.to_email ):
                raise Http404

            message.save()
            form = MessageForm()
            return HttpResponseRedirect(url + message.to_email)
        
        if request.POST.get('to_email') and not request.POST.get('message') :
            return HttpResponseRedirect(url + request.POST.get('to_email'))

        mass_form = ToEmailForm(request.POST)
        if mass_form.is_valid():
            emails = string2list( mass_form.cleaned_data['mass_email'] )
            for email in emails :
                if CheckEmail({'check_email':email}).is_valid() and is_registered_user(email):
                    msg = mass_form.cleaned_data['mass_msg']
                    message = UserMessage()
                    message.to_email = email
                    message.from_email = request.user.username
                    message.message = msg
                    message.ifread = 0
                    message.save()
            return HttpResponseRedirect(reverse("message_list") )
    
    return HttpResponseRedirect(reverse( "message_list") )



@login_required
def msg_count(request):
    result = {}
    result['count'] = 0
    content_type = 'application/json; charset=utf-8'
    if request.method != 'GET':
        raise Http404
    count = UserMessage.objects.filter(to_email=request.user.username,ifread=0).count()
    result['count'] = count
    return HttpResponse(json.dumps(result), content_type=content_type)
