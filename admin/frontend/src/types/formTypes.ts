type BaseQuestion = {
  question: string;
}

type SimpleQuestion = BaseQuestion & {
  answer: string;
}

type OptionsQuestion<T> = BaseQuestion & {
  options: readonly T[];
  answer: T;
}

type DetailedQuestion = BaseQuestion & {
  answer: string;
  details: string;
  options?: readonly ["Yes", "No"];
}

type SeverityQuestion = BaseQuestion & {
  options: readonly ["Mild", "Moderate", "Severe"];
  answer: "Mild" | "Moderate" | "Severe";
}

type Gender = "Male" | "Female" | "Other" | "Prefer not to say";

export type ConsultationFormData = {
  personalInfo: {
    firstName: SimpleQuestion;
    lastName: SimpleQuestion;
    dateOfBirth: SimpleQuestion;
    gender: OptionsQuestion<Gender>;
  };
  contactInfo: {
    phone: SimpleQuestion;
    email: SimpleQuestion;
    address: SimpleQuestion;
  };
  reasonForVisit: {
    mainIssue: SimpleQuestion;
    startDate: OptionsQuestion<readonly ["Less than a day ago", "1-3 days ago", "4-7 days ago", "1-2 weeks ago", "More than 2 weeks ago", "More than a month ago"]>;
    severity: SeverityQuestion;
    additionalInfo: SimpleQuestion;
  };
  symptoms: {
    list: SimpleQuestion[];
  };
  medicalHistory: {
    chronicConditions: DetailedQuestion;
    medications: DetailedQuestion;
    allergies: DetailedQuestion;
    recentHospitalizations: DetailedQuestion;
  };
  lifestyle: {
    smoking: OptionsQuestion<readonly ["Never", "Occasionally", "Regularly", "Former smoker"]>;
    alcohol: OptionsQuestion<readonly ["Never", "Occasionally", "Regularly"]>;
    exercise: OptionsQuestion<readonly ["Rarely", "Sometimes", "Regularly"]>;
  };
  familyHistory: {
    chronicConditions: DetailedQuestion;
    medications: DetailedQuestion;
    allergies: DetailedQuestion;
    recentHospitalizations: DetailedQuestion;
  };
  recentChanges: {
    majorChanges: SimpleQuestion;
    sickContact: DetailedQuestion;
  };
  previousTreatments: {
    priorTreatment: DetailedQuestion;
    remediesAttempted: DetailedQuestion;
  };
  additionalInfo: SimpleQuestion;
};