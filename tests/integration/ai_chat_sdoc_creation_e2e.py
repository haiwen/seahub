#!/usr/bin/env python3
"""Run a local, live-LLM AI Chat SDoc creation test against dev services."""

import argparse
import json
import os
import sys
import uuid
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


class E2EError(RuntimeError):
    pass


def required_env(name):
    value = os.getenv(name)
    if not value:
        raise E2EError('Missing environment variable %s' % name)
    return value


def request(method, url, token=None, payload=None, timeout=240):
    headers = {'Accept': 'application/json'}
    if token:
        headers['Authorization'] = 'Token %s' % token
    body = None
    if payload is not None:
        headers['Content-Type'] = 'application/json'
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    req = Request(url, data=body, headers=headers, method=method)
    try:
        return urlopen(req, timeout=timeout)
    except HTTPError as error:
        detail = error.read().decode('utf-8', errors='replace')
        raise E2EError('%s %s failed (%s): %s' % (method, url, error.code, detail)) from error
    except URLError as error:
        raise E2EError('%s %s failed: %s' % (method, url, error.reason)) from error


def request_json(method, url, token=None, payload=None):
    with request(method, url, token, payload) as response:
        raw = response.read().decode('utf-8')
        return json.loads(raw) if raw else None


def consume_chat_sse(url, token, payload):
    headers = {'Authorization': 'Token %s' % token, 'Content-Type': 'application/json', 'Accept': 'text/event-stream'}
    req = Request(url, data=json.dumps(payload, ensure_ascii=False).encode('utf-8'), headers=headers, method='POST')
    final_result = None
    done = False
    try:
        with urlopen(req, timeout=300) as response:
            for raw_line in response:
                line = raw_line.decode('utf-8').strip()
                if not line.startswith('data:'):
                    continue
                data = line[5:].strip()
                if data == '[DONE]':
                    done = True
                    break
                try:
                    event = json.loads(data)
                except json.JSONDecodeError:
                    continue
                if isinstance(event, dict) and isinstance(event.get('results'), dict):
                    final_result = event['results']
    except HTTPError as error:
        raise E2EError('Chat request failed (%s): %s' % (error.code, error.read().decode('utf-8', errors='replace'))) from error
    if not done or not final_result:
        raise E2EError('Chat SSE ended without a final result and [DONE].')
    return final_result


def walk(nodes):
    for node in nodes:
        yield node
        if isinstance(node, dict):
            yield from walk(node.get('children', []))


def verify_complex_document(content, marker):
    elements = content.get('elements')
    if content.get('format_version') != 4 or not isinstance(elements, list):
        raise E2EError('Downloaded file is not a valid format_version 4 SDoc.')
    nodes = list(walk(elements))
    text_nodes = [node for node in nodes if isinstance(node, dict) and isinstance(node.get('text'), str)]
    if marker not in ''.join(node['text'] for node in text_nodes):
        raise E2EError('Run marker is missing from the generated document.')
    types = [node.get('type') for node in nodes if isinstance(node, dict)]
    checks = {
        'rich text': any(any(key in node for key in ('bold', 'italic', 'underline', 'code', 'color')) for node in text_nodes),
        'inline link': 'link' in types,
        'blockquote or callout': 'blockquote' in types or 'callout' in types,
        'list': 'ordered_list' in types or 'unordered_list' in types,
        'multiline code': any(node.get('type') == 'code_block' and len(node.get('children', [])) >= 2 for node in nodes if isinstance(node, dict)),
        '2x2 table': any(node.get('type') == 'table' and len(node.get('children', [])) >= 2 and all(len(row.get('children', [])) >= 2 for row in node.get('children', [])[:2]) for node in nodes if isinstance(node, dict)),
        'multi-column': any(node.get('type') == 'multi_column' and len(node.get('children', [])) >= 2 for node in nodes if isinstance(node, dict)),
    }
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        raise E2EError('Generated document missed required complex structures: %s' % ', '.join(failed))
    return checks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo-id', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if not args.apply:
        parser.error('--apply is required because this test creates and deletes a real file')

    seahub_url = required_env('SEAHUB_URL').rstrip('/')
    seahub_token = required_env('SEAHUB_API_TOKEN')
    sdoc_server_url = required_env('SDOC_SERVER_URL').rstrip('/')
    run_id = uuid.uuid4().hex[:12]
    marker = 'AI-SDOC-E2E-%s' % run_id
    file_name = 'ai-sdoc-e2e-%s.sdoc' % run_id
    session_uuid = None
    artifact = None
    cleanup_errors = []

    try:
        session_data = request_json('POST', seahub_url + '/api/v2.1/ai/chat/sessions/', seahub_token, {
            'repo_id': args.repo_id,
            'session_name': marker,
        })
        session_uuid = session_data['session']['session_uuid']
        prompt = (
            'Create and save an SDoc named %s. Include the exact marker %s. '
            'Use rich text, an HTTPS inline link, a blockquote or callout, a list, '
            'a multiline code block, a formula, a 2 by 2 table, and a two-column layout.'
        ) % (file_name, marker)
        result = consume_chat_sse(seahub_url + '/api/v2.1/ai/chat/', seahub_token, {
            'repo_id': args.repo_id,
            'query': prompt,
            'session_uuid': session_uuid,
            'attachments': [],
        })
        artifacts = result.get('artifacts', [])
        artifact = next((item for item in artifacts if item.get('type') == 'sdoc' and item.get('status') == 'created'), None)
        if not artifact:
            raise E2EError('Chat did not return a created SDoc artifact: %s' % json.dumps(result, ensure_ascii=False))

        history = request_json('GET', seahub_url + '/api/v2.1/ai/chat/sessions/%s/messages/' % session_uuid, seahub_token)
        persisted = [item for message in history.get('messages', []) for item in message.get('artifacts', []) if item.get('doc_uuid') == artifact['doc_uuid']]
        if not persisted:
            raise E2EError('Created artifact was not persisted in Chat history.')

        download_response = request_json('GET', seahub_url + '/api2/repos/%s/file/?%s' % (
            artifact['repo_id'], urlencode({'p': artifact['path']})), seahub_token)
        download_url = download_response if isinstance(download_response, str) else download_response.get('url')
        with request('GET', download_url, seahub_token) as response:
            content = json.loads(response.read().decode('utf-8'))
        checks = verify_complex_document(content, marker)

        token_data = request_json('GET', seahub_url + '/api/v2.1/seadoc/access-token-by-uuid/%s/' % artifact['doc_uuid'], seahub_token)
        sdoc_req = Request(
            sdoc_server_url + '/api/v1/docs/%s/' % quote(artifact['doc_uuid'], safe=''),
            headers={'Authorization': 'Token %s' % token_data['access_token'], 'Accept': 'application/json'},
        )
        with urlopen(sdoc_req, timeout=120) as response:
            loaded = json.loads(response.read().decode('utf-8'))
        if not isinstance(loaded.get('elements'), list):
            raise E2EError('SDoc Server did not load the generated document.')
        print(json.dumps({'artifact': artifact, 'complex_format_checks': checks}, ensure_ascii=False, indent=2))
    finally:
        if artifact:
            try:
                request_json('DELETE', seahub_url + '/api2/repos/%s/file/?%s' % (
                    artifact['repo_id'], urlencode({'p': artifact['path']})), seahub_token)
            except Exception as error:
                cleanup_errors.append('Failed to delete generated file: %s' % error)
        if session_uuid:
            try:
                request_json('DELETE', seahub_url + '/api/v2.1/ai/chat/sessions/%s/' % session_uuid, seahub_token)
            except Exception as error:
                cleanup_errors.append('Failed to delete Chat session: %s' % error)
        if cleanup_errors:
            raise E2EError('; '.join(cleanup_errors))


if __name__ == '__main__':
    try:
        main()
    except E2EError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
