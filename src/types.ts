import React from 'react';

export type Difficulty = 'Facile' | 'Moyen' | 'Difficile';
export type Screen = 'setup' | 'quiz' | 'results';
export type QuestionType = 'qcm' | 'boolean' | 'input';

export type Question = {
  id: number;
  themeId: string;
  text: string;
  type?: QuestionType;
  options?: string[];
  correctAnswer: string;
  explanation: string;
};

export type Theme = {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgLight: string;
  accent: string;
  border: string;
  gradient: {
    from: string;
    to: string;
  };
};
