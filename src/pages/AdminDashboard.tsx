import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, AlertTriangle } from "lucide-react";

interface TestResult {
  id: string;
  created_at: string;
  test_type: string;
  difficulty: string;
  wpm: number;
  accuracy: number;
  errors_count: number;
  duration_seconds: number;
  profiles: {
    full_name: string;
    email: string;
    matricula: string;
    cpf: string;
  } | null;
}

const AdminDashboard = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("typing_test_results")
        .select(`
          *,
          profiles (
            full_name,
            email,
            matricula,
            cpf
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setResults(data || []);
    } catch (err: any) {
      console.error("Error fetching results:", err);
      setError("Erro ao carregar resultados. Verifique suas permissões.");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "facil":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "medio":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "dificil":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              Painel Administrativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Identificação</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Dificuldade</TableHead>
                    <TableHead>WPM</TableHead>
                    <TableHead>Precisão</TableHead>
                    <TableHead>Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Nenhum resultado encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          {format(new Date(result.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {result.profiles?.full_name || "N/A"}
                          <div className="text-xs text-muted-foreground">
                            {result.profiles?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {result.profiles?.matricula ? (
                            <div>
                              <span className="text-xs font-semibold">Matrícula:</span>{" "}
                              {result.profiles.matricula}
                            </div>
                          ) : (
                            <div>
                              <span className="text-xs font-semibold">CPF:</span>{" "}
                              {result.profiles?.cpf || "N/A"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{result.test_type}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={getDifficultyColor(result.difficulty)}
                          >
                            {result.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold">{result.wpm}</TableCell>
                        <TableCell>{result.accuracy}%</TableCell>
                        <TableCell>{result.errors_count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
