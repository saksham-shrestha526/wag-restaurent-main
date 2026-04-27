import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu as MenuIcon, X, LogOut, LayoutDashboard, ChefHat, UserCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { useCart } from '@/lib/cart-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { items } = useCart();
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Menu', path: '/menu' },
    { name: 'Reservations', path: '/reservations' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarUrl = user?.avatar_url && user?.avatar_url !== '' ? user.avatar_url : null;

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10">
      <div className="w-full px-4 sm:px-6 lg:px-12">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="h-8 w-8 rounded-lg gold-gradient flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary tracking-tighter">{settings.restaurantName?.split(' ')[0] || 'WAG'}</span>
          </Link>

          {/* Desktop Nav - gold text animation on hover only */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-5 py-2 text-sm font-bold transition-all duration-300 rounded-xl focus:outline-none focus:ring-0 ${
                  location.pathname === link.path 
                    ? 'text-white after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-6 after:h-0.5 after:bg-gradient-to-r after:from-amber-500 after:to-amber-600 after:rounded-full' 
                    : 'text-gray-400 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-amber-400 hover:to-amber-600'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link to="/cart" className="focus:outline-none focus:ring-0">
              <Button variant="ghost" size="icon" className="relative focus:outline-none focus:ring-0">
                <ShoppingCart className="h-5 w-5 text-white" />
                {items.length > 0 && (
                  <Badge className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center p-0 bg-primary text-primary-foreground text-[10px] translate-x-1/3 -translate-y-1/3">
                    {items.length}
                  </Badge>
                )}
              </Button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="relative h-10 w-10 rounded-full hover:bg-white/10 group p-0 focus:outline-none focus:ring-0"
                  >
                    <Avatar className="h-10 w-10 border-2 border-primary/50 group-hover:border-primary">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={user.name} className="object-cover" />}
                      <AvatarFallback className="gold-gradient text-primary-foreground font-bold text-sm">
                        {getInitials(user?.name || 'User')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent 
                  className="w-72 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl"
                  align="end"
                  sideOffset={8}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-4 p-4 border-b border-white/10">
                      <Avatar className="h-14 w-14 border-2 border-primary">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={user.name} className="object-cover" />}
                        <AvatarFallback className="gold-gradient text-primary-foreground text-lg font-bold">
                          {getInitials(user?.name || 'User')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1">
                        <p className="text-base font-bold leading-none text-white">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-400">{user?.email || 'user@example.com'}</p>
                        {user?.role === 'admin' && (
                          <Badge className="w-fit mt-1 bg-primary/20 text-primary border-primary/30 text-[10px] px-2 py-0">
                            Administrator
                          </Badge>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  
                  <div className="p-2">
                    <DropdownMenuItem 
                      onClick={() => handleNavigation('/account')}
                      className="cursor-pointer hover:bg-white/10 rounded-xl py-2.5 focus:outline-none focus:ring-0"
                    >
                      <UserCircle className="mr-3 h-4 w-4 text-gray-300" />
                      <span className="font-medium text-white">My Account</span>
                    </DropdownMenuItem>
                    
                    {user?.role === 'admin' && (
                      <DropdownMenuItem 
                        onClick={() => handleNavigation('/admin')}
                        className="cursor-pointer hover:bg-white/10 rounded-xl py-2.5 focus:outline-none focus:ring-0"
                      >
                        <LayoutDashboard className="mr-3 h-4 w-4 text-primary" />
                        <span className="font-medium text-white">Admin Dashboard</span>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator className="bg-white/10 my-2" />
                    
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="cursor-pointer text-red-500 hover:bg-red-500/10 rounded-xl py-2.5 focus:outline-none focus:ring-0"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      <span className="font-medium">Logout</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login" state={{ from: location.pathname }} className="focus:outline-none focus:ring-0">
                <Button className="gold-gradient text-primary-foreground font-semibold focus:outline-none focus:ring-0">
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <Link to="/cart" className="focus:outline-none focus:ring-0">
              <Button variant="ghost" size="icon" className="relative h-10 w-10 focus:outline-none focus:ring-0">
                <ShoppingCart className="h-5 w-5 text-white" />
                {items.length > 0 && (
                  <Badge className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center p-0 bg-primary text-primary-foreground text-[10px] translate-x-1/3 -translate-y-1/3">
                    {items.length}
                  </Badge>
                )}
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(!isOpen)}
              className="h-10 w-10 relative z-[60] hover:bg-white/10 focus:outline-none focus:ring-0"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6 text-white" /> : <MenuIcon className="h-6 w-6 text-white" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-3xl border-b border-white/10 overflow-hidden">
          <div className="px-4 pt-2 pb-8 space-y-1">
            {user && (
              <div className="px-3 py-6 border-b border-white/5 mb-4 flex items-center space-x-4">
                <Avatar className="h-14 w-14 border-2 border-primary">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={user.name} />}
                  <AvatarFallback className="gold-gradient text-primary-foreground text-lg font-bold">
                    {getInitials(user?.name || 'User')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-base font-bold text-white leading-none mb-1">{user.name}</div>
                  <div className="text-[10px] text-primary-foreground bg-primary/20 px-2 py-0.5 rounded-full inline-block font-bold uppercase tracking-widest">
                    {user.role} Member
                  </div>
                </div>
              </div>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-4 text-base font-bold focus:outline-none focus:ring-0 ${
                  location.pathname === link.path ? 'text-white' : 'text-gray-400 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-amber-400 hover:to-amber-600'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {user && (
              <>
                <Link
                  to="/account"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 px-3 py-4 text-base font-bold text-gray-400 hover:text-white focus:outline-none focus:ring-0"
                >
                  <UserCircle className="h-5 w-5" />
                  <span>My Account</span>
                </Link>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 px-3 py-4 text-base font-bold text-white hover:opacity-80 focus:outline-none focus:ring-0"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
              </>
            )}

            <div className="pt-6 flex items-center gap-3 px-3">
              <Link to="/cart" onClick={() => setIsOpen(false)} className="flex-1 focus:outline-none focus:ring-0">
                <Button variant="outline" className="w-full border-white/10 h-12 font-bold text-white focus:outline-none focus:ring-0">
                  Cart ({items.length})
                </Button>
              </Link>
              {user ? (
                <Button variant="destructive" onClick={() => { logout(); setIsOpen(false); }} className="flex-1 h-12 font-bold focus:outline-none focus:ring-0">
                  Logout
                </Button>
              ) : (
                <Link to="/login" onClick={() => setIsOpen(false)} className="flex-1 focus:outline-none focus:ring-0">
                  <Button className="w-full gold-gradient text-primary-foreground font-bold h-12 focus:outline-none focus:ring-0">
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;