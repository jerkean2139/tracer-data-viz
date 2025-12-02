import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/authUtils";
import { LogOut, User, Shield } from "lucide-react";

export function UserProfile() {
  const { user, isAdmin, isPartner, isAgent } = useAuth();

  if (!user) return null;

  const getRoleBadgeVariant = () => {
    if (isAdmin) return "default";
    if (isPartner) return "secondary";
    return "outline";
  };

  const getRoleIcon = () => {
    if (isAdmin) return <Shield className="w-3 h-3" />;
    return <User className="w-3 h-3" />;
  };

  const getInitials = () => {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2"
          data-testid="button-user-profile"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profileImageUrl || undefined} alt={user.email || 'User'} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <Badge variant={getRoleBadgeVariant()} className="gap-1">
            {getRoleIcon()}
            {user.role}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="p-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">
              Role
            </label>
            <Badge variant={getRoleBadgeVariant()} className="gap-1">
              {getRoleIcon()}
              {user.role}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isAdmin && "Full access to all revenue data"}
            {(isPartner || isAgent) && "Total revenue is hidden for your role"}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} data-testid="button-logout">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
