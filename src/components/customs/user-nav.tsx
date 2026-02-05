import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

export const UserNav = () => {
    const { user, logout } = useAuth();

    return (
        <DropdownMenu >
            <DropdownMenuTrigger asChild suppressHydrationWarning>
              <Button variant="ghost" className="relative h-11 rounded-full px-3 hover:bg-primary/5 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 ring-2 ring-white">
                    <AvatarFallback className="bg-primary text-white font-semibold text-sm">
                      { `${user?.firstname && user?.firstname[0].toUpperCase()} ${user?.lastname && user?.lastname[0].toUpperCase()}` }
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <p className="text-sm text-white font-semibold leading-none">{user?.firstname}</p>
                    <p className="text-xs text-white-500 capitalize">{user?.role === 'employee' ? 'Employé' : user?.role === 'admin' ? 'Admin' : user?.role === 'manager' ? 'Manager' : user?.role === 'team_lead' ? 'Team Lead' : 'Unknown'}</p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 glass-effect animate-scale-in">
              <DropdownMenuLabel className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-primary text-white font-semibold">
                      { `${user?.firstname && user?.firstname[0].toUpperCase()} ${user?.lastname && user?.lastname[0].toUpperCase()}` }
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{user?.firstname} {user?.lastname}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                      {user?.role === 'employee' ? 'Employé' : user?.role === 'admin' ? 'Admin' : user?.role === 'manager' ? 'Manager' : user?.role === 'team_lead' ? 'Team Lead' : 'Unknown'}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
              )}
              {user && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
    )
}