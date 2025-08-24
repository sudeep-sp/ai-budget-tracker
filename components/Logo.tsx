import React from "react";

function Logo() {
  return (
    <a
      href="/"
      className="flex items-center gap-2 transition-transform hover:scale-105"
    >
      <p className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-2xl md:text-3xl font-bold leading-tight tracking-tighter text-transparent">
        Fynixs
      </p>
    </a>
  );
}

function LogoMobile() {
  return (
    <a
      href="/"
      className="flex items-center gap-2 transition-transform hover:scale-105"
    >
      <p className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-xl md:text-2xl font-bold leading-tight tracking-tighter text-transparent">
        Fynixs
      </p>
    </a>
  );
}

export default Logo;
export { LogoMobile };
