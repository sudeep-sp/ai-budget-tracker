import Logo from "@/components/Logo";
import React, { ReactNode } from "react";

function layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center">
      <div className="absolute top-8">
        <Logo />
      </div>
      <div className="mt-12 w-full">{children}</div>
    </div>
  );
}

export default layout;
