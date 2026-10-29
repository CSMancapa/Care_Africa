// Type definitions
type Gender = "Male" | "Female" | "Other" | "Prefer not to say";
type StartDateOption = "Less than a day ago" | "1-3 days ago" | "4-7 days ago" | "1-2 weeks ago" | "More than 2 weeks ago" | "More than a month ago";
type Severity = "Mild" | "Moderate" | "Severe";
type SmokingStatus = "Never" | "Occasionally" | "Regularly" | "Former smoker";
type Frequency = "Never" | "Occasionally" | "Regularly" | "Rarely" | "Sometimes";
type YesNo = "Yes" | "No";

// Interface definitions
interface BaseQuestion<T = string> {
  question: string;
  answer: T;
}

interface OptionsQuestion<T> extends BaseQuestion<T> {
  options: readonly T[];
}

interface DetailedQuestion extends BaseQuestion {
  answer: YesNo;
  details: string;
}

interface DetailedQuestionWithOptions extends DetailedQuestion {
  options: readonly YesNo[];
}

export interface ConsultationFormData {
  personalInfo: {
    firstName: BaseQuestion;
    lastName: BaseQuestion;
    dateOfBirth: BaseQuestion;
    gender: OptionsQuestion<Gender>;
  };
  contactInfo: {
    phone: BaseQuestion;
    email: BaseQuestion;
    address: BaseQuestion;
  };
  reasonForVisit: {
    mainIssue: BaseQuestion;
    startDate: OptionsQuestion<StartDateOption>;
    severity: OptionsQuestion<Severity>;
    additionalInfo: BaseQuestion;
  };
  symptoms: {
    list: BaseQuestion[];
  };
  medicalHistory: {
    chronicConditions: DetailedQuestion;
    medications: DetailedQuestion;
    allergies: DetailedQuestion;
    recentHospitalizations: DetailedQuestion;
  };
  lifestyle: {
    smoking: OptionsQuestion<SmokingStatus>;
    alcohol: OptionsQuestion<Frequency>;
    exercise: OptionsQuestion<Frequency>;
  };
  recentChanges: {
    majorChanges: BaseQuestion;
    sickContact: DetailedQuestionWithOptions;
  };
  previousTreatments: {
    priorTreatment: DetailedQuestionWithOptions;
    remediesAttempted: DetailedQuestionWithOptions;
  };
  familyHistory: {
    general: {
      question: "Do you have any relevant family medical history?",
      answer: "No",
      details: null
    }
  },
  additionalInfo: BaseQuestion;
}

export const mockPreConsultationData: ConsultationFormData = {
  // Your existing data stays exactly the same...
  personalInfo: {
    firstName: {
      question: "First Name",
      answer: "John",
    },
    lastName: {
      question: "Last Name",
      answer: "Doe",
    },
    dateOfBirth: {
      question: "Date of Birth",
      answer: "1985-06-15",
    },
    gender: {
      question: "Gender",
      options: ["Male", "Female", "Other", "Prefer not to say"] as const,
      answer: "Male",
    },
  },
  contactInfo: {
    phone: {
      question: "Phone Number",
      answer: "555-123-4567",
    },
    email: {
      question: "Email Address",
      answer: "john.doe@email.com",
    },
    address: {
      question: "Home Address",
      answer: "456 Elm Street, Springfield, State 54321",
    },
  },
  reasonForVisit: {
    mainIssue: {
      question: "What is the main issue or symptom you are experiencing?",
      answer: "Frequent headaches and fatigue.",
    },
    startDate: {
      question: "When did this issue start?",
      options: [
        "Less than a day ago",
        "1-3 days ago",
        "4-7 days ago",
        "1-2 weeks ago",
        "More than 2 weeks ago",
        "More than a month ago",
      ] as const,
      answer: "More than 2 weeks ago",
    },
    severity: {
      question: "How severe is the symptom?",
      options: ["Mild", "Moderate", "Severe"] as const,
      answer: "Moderate",
    },
    additionalInfo: {
      question: "Is there anything else you'd like the doctor to know before your consultation?",
      answer: "I experience difficulty focusing during the day due to the fatigue.",
    },
  },
  symptoms: {
    list: [
      {
        question: "Symptom",
        answer: "Headache",
      },
      {
        question: "Symptom",
        answer: "Fatigue",
      },
      {
        question: "Symptom",
        answer: "Blurred vision occasionally.",
      },
    ],
  },
  medicalHistory: {
    chronicConditions: {
      question: "Do you have any chronic conditions?",
      answer: "Yes",
      details: "Mild hypertension diagnosed 5 years ago.",
    },
    medications: {
      question: "Are you currently taking any medications?",
      answer: "Yes",
      details: "Lisinopril 10mg daily for hypertension.",
    },
    allergies: {
      question: "Do you have any known allergies?",
      answer: "Yes",
      details: "Allergic to penicillin and certain nuts.",
    },
    recentHospitalizations: {
      question: "Have you had any surgeries or hospitalizations in the past year?",
      answer: "No",
      details: "",
    },
  },
  lifestyle: {
    smoking: {
      question: "Do you smoke or use tobacco products?",
      options: ["Never", "Occasionally", "Regularly", "Former smoker"] as const,
      answer: "Never",
    },
    alcohol: {
      question: "How often do you consume alcohol?",
      options: ["Never", "Occasionally", "Regularly"] as const,
      answer: "Occasionally",
    },
    exercise: {
      question: "Do you exercise?",
      options: ["Never", "Occasionally", "Regularly"] as const,
      answer: "Rarely",
    },
  },
  recentChanges: {
    majorChanges: {
      question: "Have you experienced any major changes recently (e.g., stress, travel, diet)?",
      answer: "Started a demanding new job, leading to irregular meals and increased stress.",
    },
    sickContact: {
      question: "Have you been in contact with someone who is sick?",
      answer: "No",
      options: ["Yes", "No"] as const,
      details: "",
    },
  },
  previousTreatments: {
    priorTreatment: {
      question: "Have you already sought treatment for this issue?",
      answer: "No",
      options: ["Yes", "No"] as const,
      details: "",
    },
    remediesAttempted: {
      question: "Have you taken any medication or tried any remedies for this problem?",
      answer: "Yes",
      options: ["Yes", "No"] as const,
      details: "Used over-the-counter ibuprofen and rested more, but symptoms persist.",
    },
  },
  familyHistory: {
    general: {
      question: "Do you have any relevant family medical history?",
      answer: "No",
      details: null
    }
  },
  additionalInfo: {
    question: "Is there anything else you’d like the doctor to know before your consultation?",
    answer: "I experience difficulty focusing during the day due to the fatigue.",
  },
};