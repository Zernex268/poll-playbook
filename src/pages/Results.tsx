import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QuestionResult {
  id: string;
  question_text: string;
  question_type: string;
  options: {
    id: string;
    option_text: string;
    count: number;
  }[];
  textAnswers: string[];
  totalResponses: number;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
}

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("id, title, description, author_id")
        .eq("id", id)
        .single();

      if (surveyError) throw surveyError;

      if (surveyData.author_id !== session.user.id) {
        toast.error("У вас нет доступа к результатам этого опроса");
        navigate("/");
        return;
      }

      setSurvey(surveyData);

      const { data: sessionsData } = await supabase
        .from("responses")
        .select("session_id")
        .eq("survey_id", id);

      const uniqueSessions = new Set(sessionsData?.map((r) => r.session_id) || []);
      setTotalSessions(uniqueSessions.size);

      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select(`
          id,
          question_text,
          question_type,
          order_number,
          question_options (
            id,
            option_text,
            order_number
          )
        `)
        .eq("survey_id", id)
        .order("order_number");

      if (questionsError) throw questionsError;

      const resultsData: QuestionResult[] = [];

      for (const question of questions || []) {
        const questionResult: QuestionResult = {
          id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          options: [],
          textAnswers: [],
          totalResponses: uniqueSessions.size,
        };

        if (question.question_type === "text") {
          const { data: textResponses } = await supabase
            .from("responses")
            .select("text_answer")
            .eq("question_id", question.id)
            .not("text_answer", "is", null);

          questionResult.textAnswers = textResponses?.map((r) => r.text_answer) || [];
        } else {
          for (const option of question.question_options.sort(
            (a, b) => a.order_number - b.order_number
          )) {
            const { count } = await supabase
              .from("responses")
              .select("*", { count: "exact", head: true })
              .eq("question_id", question.id)
              .eq("selected_option_id", option.id);

            questionResult.options.push({
              id: option.id,
              option_text: option.option_text,
              count: count || 0,
            });
          }
        }

        resultsData.push(questionResult);
      }

      setResults(resultsData);
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error("Ошибка загрузки результатов");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Header />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!survey) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-3xl">{survey.title}</CardTitle>
              {survey.description && (
                <CardDescription className="text-base">{survey.description}</CardDescription>
              )}
              <p className="text-lg font-semibold text-primary">
                Всего ответов: {totalSessions}
              </p>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {results.map((result, index) => (
              <Card key={result.id}>
                <CardHeader>
                  <CardTitle className="text-xl">
                    {index + 1}. {result.question_text}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.question_type === "text" ? (
                    <div className="space-y-2">
                      {result.textAnswers.length === 0 ? (
                        <p className="text-muted-foreground">Пока нет ответов</p>
                      ) : (
                        result.textAnswers.map((answer, i) => (
                          <Card key={i} className="bg-muted/50">
                            <CardContent className="pt-4">
                              <p>{answer}</p>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {result.options.map((option) => {
                        const percentage =
                          result.totalResponses > 0
                            ? (option.count / result.totalResponses) * 100
                            : 0;

                        return (
                          <div key={option.id} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{option.option_text}</span>
                              <span className="text-muted-foreground">
                                {option.count} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Results;
