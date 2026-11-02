# Image inspection worker

`lib/cms/image-inspection.ts` implements the byte-processing step for future quarantined uploads. It requires an explicit malware-scanner adapter; no default adapter reports files clean.

The worker compares the filename extension and declared MIME type against JPEG/PNG/WebP/AVIF signatures, checks the 25 MB byte limit, invokes the scanner with an abort signal and 30-second deadline, and then decodes using Sharp. Unsupported active formats, mismatches, corrupt files, multiple frames, dimensions over 20,000 pixels or input images over 40 million pixels fail inspection. Decoder errors are mapped to safe messages. Deployment resource limits and concurrency controls are still required.

Successful inspection returns two byte buffers: the exact original for private retention, and a newly encoded WebP for delivery. The derivative respects orientation, fits within 2400×2400 without enlargement, and omits original metadata. Both have hashes and independently measured dimensions/sizes. Caller-owned and scanner buffers cannot mutate the retained original. Catalog rows should describe the exact stored object bytes, not conflate original and derivative hashes or dimensions.

The implementation uses the existing installed Sharp 0.34.5 as an explicit dependency. Options were checked against the official [constructor](https://sharp.pixelplumbing.com/api-constructor/) and [output](https://sharp.pixelplumbing.com/api-output/) documentation. A dependency declaration is not a security clearance or guarantee that all deployment native binaries are patched.

## Integration still required

No upload endpoint or storage write is connected yet. The caller must retain originals in a private quarantine area, run inspection in an isolated worker, persist immutable objects, verify storage writes, record inspection provenance, and advance catalog state only after successful acknowledgement. The pipeline must separately collect usage rights, and must not serve originals as public images. Scanner failures must remain quarantined with a retry state; rejected files must not become ready. This module does not grant publication or usage rights.

Production malware scanning, timeout/process termination in a deployed worker, animated-image fixtures, object storage, upload authorization/rate limits, logical versions, variants/crops and UI remain pending.

Verification: six tests use actual generated JPEG, PNG, WebP and AVIF bytes. They check signature/type/extension mismatches, paths and size limits, corrupt decode, scanner verdict/error handling, buffer isolation, excessive dimensions, EXIF removal and orientation correction. Scanner adapters are test doubles; no actual malware detection claim is made.
