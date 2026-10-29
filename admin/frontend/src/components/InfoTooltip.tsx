interface InfoTooltipProps {
  text: string;
}

export const InfoTooltip = ({ text }: InfoTooltipProps) => (
  <div className="group relative inline-block ml-1">
    <svg className="w-4 h-4 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div className="invisible group-hover:visible absolute z-50 w-48 p-2 mt-1 text-sm text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-1/2 left-1/2">
      {text}
    </div>
  </div>
); 