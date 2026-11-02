import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DictionaryObject, NameObject, TextStringObject, NumberObject

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'scripts/cms/pdf/pdf_structure.py'

class PdfInspectionTests(unittest.TestCase):
    def run_pdf(self, configure=lambda w: None, raw=None):
        with tempfile.TemporaryDirectory(prefix='cms-pdf-test-') as folder:
            source, destination = pathlib.Path(folder)/'source.pdf', pathlib.Path(folder)/'delivery.pdf'
            writer = PdfWriter(); writer.add_blank_page(width=595, height=842); configure(writer)
            if raw is None:
                with source.open('wb') as f: writer.write(f)
            else: source.write_bytes(raw)
            result = subprocess.run([sys.executable, str(SCRIPT), str(source), str(destination)], capture_output=True, timeout=40)
            body = json.loads(result.stdout)
            if result.returncode == 0:
                self.assertEqual(len(PdfReader(destination).pages), 1)
                self.assertEqual(destination.stat().st_mode & 0o777, 0o600)
            return result.returncode, body

    def test_static_pdf_preserves_page_and_metadata(self):
        code, body = self.run_pdf(lambda w: w.add_metadata({'/Title':'Client brochure'}))
        self.assertEqual(code, 0); self.assertEqual(body['pages'], 1)

    def test_scripts_attachments_forms_and_encryption_rejected(self):
        for configure in [lambda w:w.add_js('app.alert("hello")'), lambda w:w.add_attachment('test.txt',b'text'), lambda w:w.encrypt('password'), lambda w:w._root_object.update({NameObject('/AcroForm'):DictionaryObject()})]:
            with self.subTest(configure=configure):
                code, body=self.run_pdf(configure); self.assertNotEqual(code,0); self.assertEqual(body,{'error':'pdf_rejected'})

    def test_unreachable_action_and_malformed_bytes_rejected(self):
        code,_=self.run_pdf(lambda w:w._add_object(DictionaryObject({NameObject('/S'):NameObject('/Launch')})))
        self.assertNotEqual(code,0)
        for raw in [b'not a PDF', b'%PDF-1.7\n%%EOF', b'']:
            self.assertNotEqual(self.run_pdf(raw=raw)[0],0)

    def test_page_bounds_and_unsafe_links_rejected(self):
        self.assertNotEqual(self.run_pdf(lambda w:w.pages[0].update({NameObject('/UserUnit'):NumberObject(20)}))[0],0)
        def link(uri):
            return lambda w:w._root_object.update({NameObject('/Test'):DictionaryObject({NameObject('/S'):NameObject('/URI'),NameObject('/URI'):TextStringObject(uri)})})
        for uri in ['javascript:alert(1)','file:///private/file','https://user:secret@example.com']:
            self.assertNotEqual(self.run_pdf(link(uri))[0],0)
        self.assertEqual(self.run_pdf(link('https://example.com/brochure'))[0],0)

if __name__ == '__main__': unittest.main()
