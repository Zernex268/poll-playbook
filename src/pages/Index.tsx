import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { SurveyCard } from "@/components/SurveyCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

const Index = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select(`
          id,
          title,
          description,
          created_at,
          profiles (
            full_name,
            email
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (error) {
      console.error("Error fetching surveys:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
              Добро пожаловать в SurveyHub
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Создавайте опросы, собирайте ответы, анализируйте результаты
            </p>
            <Button size="lg" asChild className="shadow-glow">
              <Link to="/create">
                <Plus className="h-5 w-5 mr-2" />
                Создать свой опрос
              </Link>
            </Button>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-6">Доступные опросы</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : surveys.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Пока нет доступных опросов
                </p>
                <Button asChild>
                  <Link to="/create">Создать первый опрос</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {surveys.map((survey) => (
                  <SurveyCard
                    key={survey.id}
                    id={survey.id}
                    title={survey.title}
                    description={survey.description}
                    authorName={survey.profiles.full_name || survey.profiles.email}
                    createdAt={survey.created_at}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
