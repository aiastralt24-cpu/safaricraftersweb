"""Private worker subprocess. Never invoke with user-controlled paths or arguments.
This parser gate is not a malware scanner or a replacement for worker isolation.
"""
import json
import math
import os
import sys


def inspect(source, destination):
    import pypdf
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject, StreamObject
    import pypdf.filters

    # Bound the common compressed-stream decoder as well as total decoded bytes.
    pypdf.filters.ZLIB_MAX_OUTPUT_LENGTH = 25_000_000
    if not 1 <= os.stat(source).st_size <= 25_000_000:
        raise ValueError('file_size')
    with open(source, 'rb') as stream:
        if not stream.read(9).startswith((b'%PDF-1.', b'%PDF-2.')):
            raise ValueError('signature')
    reader = PdfReader(source, strict=True)
    if reader.is_encrypted:
        raise ValueError('encrypted')
    pages = len(reader.pages)
    if not 1 <= pages <= 300:
        raise ValueError('page_limit')
    for page in reader.pages:
        for box in (page.mediabox, page.cropbox):
            if any(not math.isfinite(float(n)) for n in box):
                raise ValueError('page_geometry')
            if not 0 < float(box.width) <= 14400 or not 0 < float(box.height) <= 14400:
                raise ValueError('page_geometry')
        if float(page.get('/UserUnit', 1)) != 1:
            raise ValueError('page_geometry')
    forbidden_keys = {'/JS', '/JavaScript', '/AA', '/OpenAction', '/AcroForm', '/XFA',
                      '/EmbeddedFiles', '/EF', '/AF', '/RichMediaContent', '/RichMediaSettings',
                      '/Collection', '/NeedsRendering', '/ByteRange', '/PresSteps'}
    forbidden_types = {'/EmbeddedFile', '/Filespec', '/Sig', '/RichMedia', '/Movie', '/Sound', '/Screen', '/3D', '/FileAttachment'}
    visited = set()
    decoded = 0
    nodes = 0

    def visit(obj, depth=0):
        nonlocal decoded, nodes
        if depth > 100:
            raise ValueError('object_depth')
        if isinstance(obj, IndirectObject):
            identity = (obj.idnum, obj.generation)
            if identity in visited:
                return
            visited.add(identity)
            obj = obj.get_object()
        nodes += 1
        if nodes > 100000:
            raise ValueError('object_limit')
        if isinstance(obj, DictionaryObject):
            if any(key in obj for key in forbidden_keys):
                raise ValueError('active_content')
            if str(obj.get('/Type')) in forbidden_types or str(obj.get('/Subtype')) in forbidden_types:
                raise ValueError('active_content')
            # /S also appears in non-action structures (e.g. tagged content).
            action = str(obj.get('/S'))
            if str(obj.get('/Type')) == '/Action' and action not in {'/URI', '/GoTo'}:
                raise ValueError('active_content')
            for action_key in ('/A', '/Next'):
                candidate = obj.get(action_key)
                if candidate is not None:
                    candidate = candidate.get_object()
                    actions = candidate if isinstance(candidate, ArrayObject) else [candidate]
                    for action_object in actions:
                        action_object = action_object.get_object()
                        if isinstance(action_object, DictionaryObject) and '/S' in action_object and str(action_object.get('/S')) not in {'/URI', '/GoTo'}:
                            raise ValueError('active_content')
            if action in {'/JavaScript', '/Launch', '/GoToR', '/GoToE', '/SubmitForm', '/ResetForm', '/ImportData', '/Rendition', '/Movie', '/Sound', '/Hide', '/SetOCGState', '/Thread', '/Trans', '/GoTo3DView'}:
                raise ValueError('active_content')
            if action == '/URI':
                from urllib.parse import urlsplit
                uri = str(obj.get('/URI', ''))
                parsed = urlsplit(uri)
                if parsed.scheme not in ('https', 'http', 'mailto', 'tel') or any(ord(c) < 32 for c in uri):
                    raise ValueError('unsafe_link')
                if parsed.scheme in ('https', 'http') and (not parsed.hostname or parsed.username or parsed.password):
                    raise ValueError('unsafe_link')
            if isinstance(obj, StreamObject):
                if '/F' in obj:
                    raise ValueError('external_stream')
                data = obj.get_data()
                decoded += len(data)
                if len(data) > 25000000 or decoded > 100000000:
                    raise ValueError('decoded_limit')
            for value in obj.values():
                visit(value, depth + 1)
        elif isinstance(obj, ArrayObject):
            for value in obj:
                visit(value, depth + 1)

    visit(reader.trailer)
    # Inspect unreachable objects too: a clean visible page is insufficient.
    entries = [(number, generation) for generation, values in reader.xref.items()
               if generation != 65535 for number in values if number != 0]
    entries += [(number, 0) for number in reader.xref_objStm]
    if len(entries) > 50000:
        raise ValueError('object_limit')
    for number, generation in entries:
        visit(IndirectObject(number, generation, reader))
    writer = PdfWriter(clone_from=reader)
    with open(destination, 'xb') as output:
        os.chmod(destination, 0o600)
        writer.write(output)
    if not 1 <= os.stat(destination).st_size <= 25000000:
        raise ValueError('delivery_size')
    # Reparse serialized output before reporting success.
    delivered = PdfReader(destination, strict=True)
    if delivered.is_encrypted or len(delivered.pages) != pages:
        raise ValueError('delivery_mismatch')
    return {'pages': pages, 'parserVersion': pypdf.__version__, 'inspectionVersion': 'pdf-structure-1'}


if __name__ == '__main__':
    try:
        # Limits supplement (not replace) the deployment's isolated worker container.
        import resource
        resource.setrlimit(resource.RLIMIT_CPU, (30, 30))
        resource.setrlimit(resource.RLIMIT_FSIZE, (25000001, 25000001))
        if sys.platform.startswith('linux'):
            resource.setrlimit(resource.RLIMIT_AS, (1024 * 1024 * 1024, 1024 * 1024 * 1024))
        if len(sys.argv) != 3:
            raise ValueError('arguments')
        print(json.dumps(inspect(sys.argv[1], sys.argv[2])))
    except Exception:
        # No input paths, PDF contents or parser diagnostics in worker responses.
        print(json.dumps({'error': 'pdf_rejected'}))
        sys.exit(1)
