import { QuizRunner } from "@/features/test/quiz-runner";
import { currentJeune, quizQuestions } from "@/lib/mock-data";

export default function TestEnCoursPage() {
  return <QuizRunner questions={quizQuestions} filiere={currentJeune.filiere} />;
}
