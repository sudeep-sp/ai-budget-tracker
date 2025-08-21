import React, { ReactNode } from "react";

function layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      {children}
    </div>
  );
}

export default layout;
