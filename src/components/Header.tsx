import { Button } from "@/components/ui/button";
import { Menu, X, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import logoAeC from "@/assets/logo-aec.webp";
import { supabase } from "@/lib/supabase";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        setIsAdmin(profile?.role === 'admin');
      }
    };

    checkAdmin();
  }, []);

  const menuItems = [
    { label: "Início", href: "/#inicio" },
    { label: "Sobre o Teste", href: "/#sobre" },
    { label: "Instruções", href: "/#instrucoes" },
    { label: "Contato", href: "/#contato" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src={logoAeC} alt="AeC" className="h-10 cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-cobalto hover:text-ceu transition-colors duration-200 font-myriad font-semibold"
              >
                {item.label}
              </a>
            ))}
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" className="gap-2 border-cobalto text-cobalto hover:bg-cobalto/10">
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-cobalto"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 py-4 animate-fade-in">
            <div className="flex flex-col space-y-4">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-cobalto hover:text-ceu transition-colors duration-200 px-4 py-2 font-myriad font-semibold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-cobalto hover:text-ceu transition-colors duration-200 px-4 py-2 font-myriad font-semibold flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
