import { Linkedin, Youtube, Mail, Instagram, Facebook } from "lucide-react";
import logoAeC from "@/assets/logo-aec.webp";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Linkedin, href: "https://br.linkedin.com/company/aec", label: "LinkedIn" },
    { icon: Facebook, href: "https://www.facebook.com/aecbpo", label: "Facebook" },
    { icon: Instagram, href: "https://www.instagram.com/eusouaec/", label: "Instagram" },
    { icon: Youtube, href: "https://www.youtube.com/user/AeCful", label: "YouTube" },
    { icon: Mail, href: "mailto:contato@aec.com.br", label: "E-mail" },
  ];

  const footerLinks = [
    { title: "Sobre", href: "#sobre" },
    { title: "Instruções", href: "#instrucoes" },
    { title: "Site", href: "https://www.aec.com.br/" },
    { title: "Privacidade", href: "#" },
    { title: "Termos de Uso", href: "#" },
  ];

  return (
    <footer id="contato" className="bg-noite text-primary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center mb-4">
              <img
                src={logoAeC}
                alt="AeC"
                className="h-10"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <p className="text-primary-foreground/80 text-sm font-myriad mb-2">
              Teste de Digitação e Português AeC
            </p>
            <p className="text-primary-foreground/60 text-xs font-myriad italic">
              Desenvolvido por Mickael Bandeira | Analista de Conteúdo
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-bold mb-4 text-lg">Links Úteis</h3>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.title}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/80 hover:text-ceu transition-colors duration-200 text-sm font-myriad"
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-bold mb-4 text-lg">Redes Sociais</h3>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 bg-primary-foreground/10 hover:bg-ceu rounded-lg flex items-center justify-center transition-all duration-200 hover-lift"
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 pt-8 text-center">
          <p className="text-primary-foreground/70 text-sm font-myriad">
            © {currentYear} AeC. Todos os direitos reservados.
          </p>
          <p className="text-primary-foreground/50 text-xs mt-2 font-myriad">
            Desenvolvido por Mickael Bandeira | Analista de Conteúdo
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
