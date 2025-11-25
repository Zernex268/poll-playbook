import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  order_number: number;
  question_options: {
    id: string;
    option_text: string;
    order_number: number;
  }[];
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

const TakeSurvey = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [sessionId] = useState(uuidv4());
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user);
    });

    fetchSurvey();
  }, [id]);

  const fetchSurvey = async () => {
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select(`
          id,
          title,
          description,
          profiles (
            full_name,
            email
          )
        `)
        .eq("id", id)
        .single();

      if (surveyError) throw surveyError;
      setSurvey(surveyData);

      const { data: questionsData, error: questionsError } = await supabase
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
      setQuestions(questionsData || []);
    } catch (error) {
      console.error("Error fetching survey:", error);
      toast.error("Ошибка загрузки опроса");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const responses = [];

      for (const question of questions) {
        const answer = answers[question.id];

        if (!answer) {
          toast.error(`Пожалуйста, ответьте на все вопросы`);
          setSubmitting(false);
          return;
        }

        if (question.question_type === "text") {
          responses.push({
            survey_id: survey!.id,
            question_id: question.id,
            respondent_id: user?.id || null,
            session_id: sessionId,
            text_answer: answer,
          });
        } else if (question.question_type === "single") {
          responses.push({
            survey_id: survey!.id,
            question_id: question.id,
            respondent_id: user?.id || null,
            session_id: sessionId,
            selected_option_id: answer,
          });
        } else if (question.question_type === "multiple") {
          for (const optionId of answer) {
            responses.push({
              survey_id: survey!.id,
              question_id: question.id,
              respondent_id: user?.id || null,
              session_id: sessionId,
              selected_option_id: optionId,
            });
          }
        }
      }

      const { error } = await supabase.from("responses").insert(responses);

      if (error) throw error;

      toast.success("Спасибо за участие в опросе!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Ошибка отправки ответов");
    } finally {
      setSubmitting(false);
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
        <div className="max-w-3xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-3xl">{survey.title}</CardTitle>
              {survey.description && (
                <CardDescription className="text-base">{survey.description}</CardDescription>
              )}
              <p className="text-sm text-muted-foreground">
                Автор: {survey.profiles.full_name || survey.profiles.email}
              </p>
            </CardHeader>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question, index) => (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="text-xl">
                    {index + 1}. {question.question_text}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {question.question_type === "single" && (
                    <RadioGroup
                      value={answers[question.id]}
                      onValueChange={(value) =>
                        setAnswers({ ...answers, [question.id]: value })
                      }
                    >
                      {question.question_options
                        .sort((a, b) => a.order_number - b.order_number)
                        .map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.id} id={option.id} />
                            <Label htmlFor={option.id} className="cursor-pointer">
                              {option.option_text}
                            </Label>
                          </div>
                        ))}
                    </RadioGroup>
                  )}

                  {question.question_type === "multiple" && (
                    <div className="space-y-2">
                      {question.question_options
                        .sort((a, b) => a.order_number - b.order_number)
                        .map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={option.id}
                              checked={(answers[question.id] || []).includes(option.id)}
                              onCheckedChange={(checked) => {
                                const current = answers[question.id] || [];
                                setAnswers({
                                  ...answers,
                                  [question.id]: checked
                                    ? [...current, option.id]
                                    : current.filter((id: string) => id !== option.id),
                                });
                              }}
                            />
                            <Label htmlFor={option.id} className="cursor-pointer">
                              {option.option_text}
                            </Label>
                          </div>
                        ))}
                    </div>
                  )}

                  {question.question_type === "text" && (
                    <Textarea
                      value={answers[question.id] || ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [question.id]: e.target.value })
                      }
                      placeholder="Введите ваш ответ"
                      rows={4}
                    />
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  "Отправить ответы"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                disabled={submitting}
              >
                Отмена
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default TakeSurvey;
