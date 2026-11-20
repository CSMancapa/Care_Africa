import { forwardRef, type SVGProps } from "react";

/**
 * A rand ("R") icon drawn in the same style as the lucide icons, for places
 * that used a dollar-sign icon (prices, sales totals).
 */
export const RandIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M7 20V4h5.5a4 4 0 0 1 0 8H7" />
      <path d="m12 12 5 8" />
    </svg>
  )
);
RandIcon.displayName = "RandIcon";
