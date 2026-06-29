import questionsData from "../data/questions.json";
import { Question } from "../types/question";

const questions = questionsData as Question[];

export function getRandomQuestionForUser(
  category: string,
  userUsedQuestionIds: string[] = []
) {
  const availableQuestions = questions.filter(
    (question) =>
      question.category === category &&
      question.isActive &&
      !userUsedQuestionIds.includes(question.id)
  );

  if (availableQuestions.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * availableQuestions.length);

  return availableQuestions[randomIndex];
}