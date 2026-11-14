import PhoneInputModule from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

/**
 * react-phone-input-2 is published as an old-style (CommonJS) package.
 * Depending on how Vite pre-bundles it, the default import is either the
 * component itself or an object wrapping it as `.default`. Rendering the
 * wrapper crashes React ("Element type is invalid … got: object"), so take
 * whichever one is the actual component.
 */
const PhoneInput = (
  (PhoneInputModule as unknown as { default?: typeof PhoneInputModule }).default ?? PhoneInputModule
) as typeof PhoneInputModule;

export default PhoneInput;
