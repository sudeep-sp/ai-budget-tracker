import React from "react";
import Link from "next/link";

function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 transition-transform hover:scale-105"
    >
      <p className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-2xl md:text-3xl font-bold leading-tight tracking-tighter text-transparent">
        Budgetly
      </p>
    </Link>
  );
}

function LogoMobile() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 transition-transform hover:scale-105"
    >
      <p className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-xl md:text-2xl font-bold leading-tight tracking-tighter text-transparent">
        Budgetly
      </p>
    </Link>
  );
}

export default Logo;
export { LogoMobile };
