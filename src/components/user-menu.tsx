import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { currentUser } from "@/lib/session";

export async function UserMenu() {
  const user = await currentUser();
  if (!user) return <Link className={buttonVariants({ variant: "ghost" })} href="/login"><LogIn /> Sign in</Link>;
  return (
    <>
      <div className="user-copy"><strong>{user.email.split("@")[0]}</strong><span>{user.role}</span></div>
      <Avatar><AvatarFallback>{user.email.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
      <form action="/api/auth/logout" method="post">
        <Button aria-label="Sign out" size="icon" variant="ghost"><LogOut /></Button>
      </form>
    </>
  );
}

export function UserMenuSkeleton() {
  return <><Skeleton className="hidden h-8 w-24 sm:block" /><Skeleton className="size-8 rounded-full" /></>;
}
