export interface StructuredCV {
  header: {
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    website?: string;
    photoUrl?: string;
  };
  summary?: string;
  experiences: {
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    location?: string;
    bullets: string[];
  }[];
  education: {
    id: string;
    school: string;
    degree: string;
    startDate: string;
    endDate: string;
    description?: string;
  }[];
  skills: {
    category: string;
    items: string[];
  }[];
  languages: {
    name: string;
    level: string;
  }[];
  interests?: string[];
}
