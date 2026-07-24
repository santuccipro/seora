export interface TplExp {
  title: string;
  company: string;
  location: string;
  dates: string;
  bullets: string[];
  stack?: string;
}

export interface TplEdu {
  degree: string;
  school: string;
  location: string;
  dates: string;
  mention?: string;
}

export interface TplLang {
  name: string;
  level: string;
}

export interface TplData {
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  city: string;
  linkedin: string;
  portfolio?: string;
  photo: string;
  summary: string;
  experiences: TplExp[];
  educations: TplEdu[];
  skills: string[];
  languages: TplLang[];
  interests: string[];
  accent?: string;
  accentLight?: string;
  kpis?: Array<{ val: string; label: string }>;
  certifications?: string[];
  [key: string]: unknown;
}
