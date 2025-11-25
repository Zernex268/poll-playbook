import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BarChart3, User, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SurveyCardProps {
  id: string;
  title: string;
  description: string | null;
  authorName: string;
  createdAt: string;
  responseCount?: number;
  isOwner?: boolean;
  onDelete?: (id: string) => void;
}

export const SurveyCard = ({
  id,
  title,
  description,
  authorName,
  createdAt,
  responseCount = 0,
  isOwner = false,
  onDelete,
}: SurveyCardProps) => {
  return (
    <Card className="hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
      <CardHeader>
        <CardTitle className="line-clamp-2">{title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {description || "Без описания"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{authorName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(createdAt), "d MMM yyyy", { locale: ru })}</span>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            <span>{responseCount} {responseCount === 1 ? "ответ" : "ответов"}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link to={`/survey/${id}`}>Пройти опрос</Link>
          </Button>
          {isOwner && (
            <>
              <Button variant="outline" asChild>
                <Link to={`/results/${id}`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Результаты
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить опрос?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие нельзя отменить. Опрос и все его ответы будут удалены навсегда.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete?.(id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
