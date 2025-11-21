import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Header from '@/components/Header';

export default function Auth() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [userType, setUserType] = useState<'veterano' | 'novato'>('veterano');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [matricula, setMatricula] = useState('');
    const [cpf, setCpf] = useState('');

    // Simulação de auto-preenchimento por matrícula
    const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMatricula(value);

        // Simulação: se a matrícula tiver 6 dígitos, preenche nome e email
        if (value.length === 6) {
            setFullName('Usuário Exemplo da Silva');
            setEmail(`${value}@exemplo.com`);
            toast.info('Dados preenchidos automaticamente!');
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success('Login realizado com sucesso!');
                navigate('/teste');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            matricula: userType === 'veterano' ? matricula : null,
                            cpf: userType === 'novato' ? cpf : null,
                            user_type: userType,
                        },
                    },
                });
                if (error) throw error;

                toast.success('Cadastro realizado! Verifique seu email ou faça login.');
                setIsLogin(true);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Erro ao realizar autenticação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-cobalto/5 to-background">
            <Header />
            <div className="container mx-auto px-4 py-8 mt-16 flex items-center justify-center min-h-[calc(100vh-100px)]">
                <Card className="w-full max-w-md shadow-lg border-border">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center text-cobalto">
                            {isLogin ? 'Login' : 'Criar Conta'}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {isLogin
                                ? 'Entre para acessar os testes'
                                : 'Preencha seus dados para começar'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAuth} className="space-y-4">
                            {!isLogin && (
                                <>
                                    <div className="flex gap-4 mb-4">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="veterano"
                                                name="userType"
                                                value="veterano"
                                                checked={userType === 'veterano'}
                                                onChange={() => setUserType('veterano')}
                                                className="accent-cobalto"
                                            />
                                            <Label htmlFor="veterano">Veterano</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="novato"
                                                name="userType"
                                                value="novato"
                                                checked={userType === 'novato'}
                                                onChange={() => setUserType('novato')}
                                                className="accent-cobalto"
                                            />
                                            <Label htmlFor="novato">Novato</Label>
                                        </div>
                                    </div>

                                    {userType === 'veterano' ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="matricula">Matrícula</Label>
                                                <Input
                                                    id="matricula"
                                                    placeholder="Digite sua matrícula"
                                                    value={matricula}
                                                    onChange={handleMatriculaChange}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="fullName">Nome Completo</Label>
                                                <Input
                                                    id="fullName"
                                                    placeholder="Seu nome"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="cpf">CPF</Label>
                                                <Input
                                                    id="cpf"
                                                    placeholder="000.000.000-00"
                                                    value={cpf}
                                                    onChange={(e) => setCpf(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="fullName">Nome Completo</Label>
                                                <Input
                                                    id="fullName"
                                                    placeholder="Seu nome"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="******"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>

                            <Button type="submit" className="w-full bg-cobalto hover:bg-noite" disabled={loading}>
                                {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Button
                            variant="link"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm text-foreground/70"
                        >
                            {isLogin
                                ? 'Não tem uma conta? Cadastre-se'
                                : 'Já tem uma conta? Faça login'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
