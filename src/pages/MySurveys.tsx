import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { SurveyCard } from "@/components/SurveyCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
  responseCount: number;
}

const MySurveys = () => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchMySurveys(session.user.id);
      }
    });
  }, [navigate]);

  const fetchMySurveys = async (userId: string) => {
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
        .eq("author_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const surveysWithCounts = await Promise.all(
        (data || []).map(async (survey) => {
          const { data: responses } = await supabase
            .from("responses")
            .select("session_id")
            .eq("survey_id", survey.id);

          const uniqueSessions = new Set(responses?.map((r) => r.session_id) || []);

          return {
            ...survey,
            responseCount: uniqueSessions.size,
          };
        })
      );

      setSurveys(surveysWithCounts);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      toast.error("Ошибка загрузки опросов");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    try {
      const { error } = await supabase
        .from("surveys")
        .delete()
        .eq("id", surveyId);

      if (error) throw error;

      setSurveys(surveys.filter((s) => s.id !== surveyId));
      toast.success("Опрос успешно удален");
    } catch (error) {
      console.error("Error deleting survey:", error);
      toast.error("Ошибка при удалении опроса");
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Мои опросы
            </h1>
            <Button asChild>
              <Link to="/create">
                <Plus className="h-4 w-4 mr-2" />
                Создать опрос
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                У вас пока нет созданных опросов
              </p>
              <Button asChild>
                <Link to="/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать первый опрос
                </Link>
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
                  responseCount={survey.responseCount}
                  isOwner={true}
                  onDelete={handleDeleteSurvey}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MySurveys;
