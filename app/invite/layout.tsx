import Logo from "@/components/Logo";
import React, { ReactNode } from "react";

function layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header with Logo - responsive positioning */}
      <div className="relative z-10">
        <div className="flex justify-center pt-4 md:pt-8">
          <Logo />
        </div>
      </div>
      
      {/* Main content - responsive container */}
      <div className="flex flex-col items-center justify-center px-4 py-6 md:py-12">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-3xl">
          {children}
        </div>
      </div>
      
      {/* Background decoration - hidden on mobile for performance */}
      <div className="fixed inset-0 -z-10 hidden md:block">
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />
      </div>
    </div>
  );
}

export default layout;
