import React from 'react';

export function ReportContainer({ children, reportType }: { children: React.ReactNode, reportType: string }) {
  return (
    <div className="flex justify-center w-full min-h-screen bg-gray-300 py-8 overflow-auto">
      {/* We add a shadow wrapper just for preview */}
      <div className="shadow-2xl print:shadow-none bg-white">
        {children}
      </div>
    </div>
  );
}
