export const PHONE_HINT = "Include your country or area code, for example +91 98765 43210.";
export const PHONE_ERROR = "Please enter a phone number with 7–15 digits, including your country or area code (for example, +91 98765 43210).";

// A plausibility check only; this does not verify ownership or reachability.
// Keep the supplied formatting for storage. Extensions are separate from the
// 7–15 digit main number; 00 is accepted as an international dialling prefix.
export function getPhoneError(value: unknown): string {
  if (typeof value !== "string") return PHONE_ERROR;
  const phone = value.trim();
  if (!phone) return "Please enter your phone number.";
  if (value.length > 60 || /[\r\n\t]/.test(phone)) return PHONE_ERROR;
  const match = phone.match(/^(\+?[\d() .\u00a0\u202f-]+?)(?:\s*(?:ext\.?|x|#)\s*(\d{1,6}))?$/i);
  if (!match) return PHONE_ERROR;
  const main = match[1].trim();
  // Balanced digit groups allow formats such as +44 (0)20 7946 0123.
  if (!/^\+?(?:\d+|\(\d+\))(?:[ .\u00a0\u202f-]*(?:\d+|\(\d+\)))*$/.test(main)) return PHONE_ERROR;
  const digits = main.replace(/\D/g, "");
  const international = main.startsWith("+") || digits.startsWith("00");
  const number = !main.startsWith("+") && digits.startsWith("00") ? digits.slice(2) : digits;
  if (number.length < 7 || number.length > 15 || /^(\d)\1+$/.test(number) || (international && number.startsWith("0"))) return PHONE_ERROR;
  return "";
}
