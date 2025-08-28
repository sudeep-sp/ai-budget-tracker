"use client";

import React, { useState } from "react";
import Logo, { LogoMobile } from "./Logo";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "./ui/button";
import { UserButton } from "@clerk/nextjs";
import { ThemeSwitcherBtn } from "./ThemeSwitcherBtn";
import NotificationButton from "./NotificationButton";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Menu } from "lucide-react";

function Navbar() {
  return (
    <>
      <DesktopNavbar />
      <MobileNavbar />
    </>
  );
}

const items = [
  { label: "Dashboard", link: "/" },
  { label: "Transactions", link: "/transactions" },
  { label: "Shared", link: "/shared" },
  { label: "Manage", link: "/manage" },
];

function DesktopNavbar() {
  return (
    <div className="hidden border-separate border-b bg-background md:block">
      <nav className="container mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex h-[80px] min-h-[60px] items-center gap-x-6">
          <Logo />
          <div className="flex h-full items-center">
            {items.map((item) => (
              <NavbarItem
                key={item.label}
                label={item.label}
                link={item.link}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcherBtn />
          <NotificationButton />
          <UserButton afterSwitchSessionUrl="/sign-in" />
        </div>
      </nav>
    </div>
  );
}

function MobileNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="block border-separate border-b bg-background md:hidden">
      <nav className="container mx-auto flex items-center justify-between px-4 sm:px-6">
        <div className="flex h-[80px] min-h-[60px] items-center">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant={"ghost"} size={"icon"}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[300px] sm:w-[400px]" side="left">
              <SheetHeader>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              </SheetHeader>
              <Logo />
              <div className="flex flex-col gap-1 pt-4">
                {items.map((item) => (
                  <NavbarItem
                    key={item.label}
                    label={item.label}
                    link={item.link}
                    clickCallback={() => setIsOpen((prev) => !prev)}
                  />
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <div className="ml-4">
            <LogoMobile />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcherBtn />
          <NotificationButton />
          <UserButton afterSwitchSessionUrl="/sign-in" />
        </div>
      </nav>
    </div>
  );
}

function NavbarItem({
  label,
  link,
  clickCallback,
}: {
  label: string;
  link: string;
  clickCallback?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === link;

  return (
    <div className="relative flex items-center">
      <Link
        href={link}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "w-full justify-start text-base font-medium text-muted-foreground hover:text-foreground transition-colors",
          isActive && "text-foreground"
        )}
        onClick={() => {
          if (clickCallback) clickCallback();
        }}
      >
        {label}
      </Link>
      {isActive && (
        <div className="absolute -bottom-[1px] left-1/2 hidden h-[2px] w-[80%] -translate-x-1/2 rounded-xl bg-foreground md:block" />
      )}
    </div>
  );
}

export default Navbar;
