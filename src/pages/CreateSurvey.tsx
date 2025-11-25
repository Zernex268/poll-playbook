import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { z } from "zod";

const questionTypes = ["single", "multiple", "text"] as const;

interface Question {
  text: string;
  type: typeof questionTypes[number];
  options: string[];
}

const surveySchema = z.object({
  title: z.string().min(3, "Название должно содержать минимум 3 символа").max(200),
  description: z.string().max(1000).optional(),
  questions: z.array(z.object({
    text: z.string().min(3, "Вопрос должен содержать минимум 3 символа").max(500),
    type: z.enum(questionTypes),
    options: z.array(z.string().min(1).max(200)),
  })).min(1, "Добавьте хотя бы один вопрос"),
});

const CreateSurvey = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { text: "", type: "single", options: ["", ""] },
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  const addQuestion = () => {
    setQuestions([...questions, { text: "", type: "single", options: ["", ""] }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options.push("");
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const validated = surveySchema.parse({
        title,
        description,
        questions: questions.map(q => ({
          ...q,
          options: q.type === "text" ? [] : q.options.filter(o => o.trim()),
        })),
      });

      const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .insert({
          title: validated.title,
          description: validated.description || null,
          author_id: user.id,
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      for (let i = 0; i < validated.questions.length; i++) {
        const question = validated.questions[i];
        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .insert({
            survey_id: survey.id,
            question_text: question.text,
            question_type: question.type,
            order_number: i,
          })
          .select()
          .single();

        if (questionError) throw questionError;

        if (question.type !== "text" && question.options.length > 0) {
          const options = question.options.map((option, index) => ({
            question_id: questionData.id,
            option_text: option,
            order_number: index,
          }));

          const { error: optionsError } = await supabase
            .from("question_options")
            .insert(options);

          if (optionsError) throw optionsError;
        }
      }

      toast.success("Опрос успешно создан!");
      navigate(`/survey/${survey.id}`);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Ошибка создания опроса");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent">
            Создать опрос
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Основная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Название опроса *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: Опрос об удовлетворенности сервисом"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Краткое описание опроса"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {questions.map((question, qIndex) => (
              <Card key={qIndex}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Вопрос {qIndex + 1}</CardTitle>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Текст вопроса *</Label>
                    <Input
                      value={question.text}
                      onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                      placeholder="Введите ваш вопрос"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Тип вопроса</Label>
                    <Select
                      value={question.type}
                      onValueChange={(value) => updateQuestion(qIndex, "type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Один вариант</SelectItem>
                        <SelectItem value="multiple">Несколько вариантов</SelectItem>
                        <SelectItem value="text">Текстовый ответ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {question.type !== "text" && (
                    <div className="space-y-2">
                      <Label>Варианты ответов</Label>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            placeholder={`Вариант ${oIndex + 1}`}
                          />
                          {question.options.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOption(qIndex, oIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(qIndex)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить вариант
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Добавить вопрос
            </Button>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Создание...
                  </>
                ) : (
                  "Создать опрос"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/")} disabled={loading}>
                Отмена
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateSurvey;
