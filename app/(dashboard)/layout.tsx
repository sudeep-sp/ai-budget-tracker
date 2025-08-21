import Navbar from "@/components/Navbar";
import React, { ReactNode } from "react";

function layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <Navbar />
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}

export default layout;
