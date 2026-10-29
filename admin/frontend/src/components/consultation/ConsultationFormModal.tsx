import React from 'react';
import { ConsultationFormData } from '../../types/formTypes';
import { mockPreConsultationData } from '../../mockData/consultationFormData';
import { Sparkles } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

type Severity = 'Mild' | 'Moderate' | 'Severe';

interface ConsultationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
  formData: ConsultationFormData;
}

const isConsultationFormData = (data: any): data is ConsultationFormData => {
  return 'reasonForVisit' in data;
};

const ConsultationFormModal: React.FC<ConsultationFormModalProps> = ({
  isOpen,
  onClose,
  patientId,
  formData
}) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { sendMessage } = useChat();

  const handleAiSuggestion = () => {
    const formattedData = `
Patient Symptoms: ${formData.symptoms.list.map(s => s.answer).join(', ')}
Duration: ${formData.reasonForVisit.startDate.answer}
Severity: ${formData.reasonForVisit.severity.answer}
Additional Info: ${formData.reasonForVisit.additionalInfo.answer}

Medical History:
${Object.entries(formData.medicalHistory)
  .map(([key, value]) => `${value.question}: ${value.answer}${value.details ? ` - ${value.details}` : ''}`)
  .join('\n')}

Lifestyle Information:
${Object.entries(formData.lifestyle)
  .map(([key, value]) => `${value.question}: ${value.answer}`)
  .join('\n')}

Family History:
${Object.entries(formData.familyHistory)
  .map(([key, value]) => `${value.question}: ${value.answer}${value.details ? ` - ${value.details}` : ''}`)
  .join('\n')}

Recent Changes:
${Object.entries(formData.recentChanges)
  .map(([key, value]) => `${value.question}: ${value.answer}${('details' in value && value.details) ? ` - ${value.details}` : ''}`)
  .join('\n')}

Previous Treatments:
${Object.entries(formData.previousTreatments)
  .map(([key, value]) => `${value.question}: ${value.answer}${value.details ? ` - ${value.details}` : ''}`)
  .join('\n')}

Additional Information:
${formData.additionalInfo.answer}`;

    const message = "Based on the following pre-consultation form data, please analyze the information and provide your medical assessment:\n\n" + formattedData;

    // Close modal first
    onClose();
    
    // Navigate to chatbot
    navigate('/admin/chatbot', { 
      state: { messageToSend: message },
      replace: true 
    });
  };

  if (!isOpen || !isConsultationFormData(formData)) return null;

  return (
    <div className={`fixed inset-0 bg-white/60 backdrop-blur-2xl flex items-center justify-center animate-fadeIn z-[9999] ${
      theme === 'dark' ? 'dark:bg-gray-900/80' : ''
    }`}>
      <div className={`fixed inset-0 ${
        theme === 'dark' ? 'bg-black/30' : 'bg-black/10'
      }`} aria-hidden="true" />
      
      <div className={`relative p-12 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl mx-4 animate-slideUp ${
        theme === 'dark' 
          ? 'bg-gray-800 text-gray-100' 
          : 'bg-white/90 text-gray-900'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-3xl font-semibold">
            Pre-Consultation Form
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={handleAiSuggestion}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                theme === 'dark'
                  ? 'bg-orange-400/20 hover:bg-orange-400/30 text-orange-300'
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-600'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Suggestion
            </button>
            <button 
              onClick={onClose} 
              className={`rounded-full w-8 h-8 flex items-center justify-center transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <span>✕</span>
            </button>
          </div>
        </div>
        
        <div className="space-y-12">
          {/* Personal Info Section */}
          <section>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-6 flex items-center">
              <span className={`bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-orange-400/90 to-blue-400/90' 
                  : 'from-orange-500/90 to-blue-500/90'
              } w-7 h-7 rounded-lg flex items-center justify-center text-sm text-white mr-3`}>
                1
              </span>
              Personal & Contact Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[...Object.entries(formData.personalInfo), ...Object.entries(formData.contactInfo)].map(([key, value]) => (
                <div 
                  key={key} 
                  className={`group rounded-2xl p-6 transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-gray-700/50 hover:bg-gray-700'
                      : 'bg-gray-50/50 hover:bg-white'
                  } hover:shadow-lg`}
                >
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {value.question}
                  </div>
                  <div className="text-gray-900 dark:text-gray-100">
                    {value.answer}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Main Concerns Section */}
          <section>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-6 flex items-center">
              <span className={`bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-orange-400/90 to-blue-400/90' 
                  : 'from-orange-500/90 to-blue-500/90'
              } w-7 h-7 rounded-lg flex items-center justify-center text-sm text-white mr-3`}>
                2
              </span>
              Main Concerns
            </h3>
            <div className="space-y-4">
              <div className={`rounded-2xl p-6 transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-gray-700/50 hover:bg-gray-700'
                  : 'bg-gray-50/50 hover:bg-white'
              } hover:shadow-lg`}>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">Symptoms</div>
                <div className="flex flex-wrap gap-2">
                  {formData.symptoms.list.map((symptom, index) => (
                    <span key={index} className={`px-4 py-1.5 ${
                      theme === 'dark'
                        ? 'bg-blue-400/20 text-blue-300'
                        : 'bg-blue-100 text-blue-600'
                    } rounded-full text-sm`}>
                      {symptom.answer}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className={`rounded-2xl p-6 transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-gray-700/50 hover:bg-gray-700'
                    : 'bg-gray-50/50 hover:bg-white'
                } hover:shadow-lg`}>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Duration</div>
                  <div className="text-gray-900 dark:text-gray-100">{formData.reasonForVisit.startDate.answer}</div>
                </div>
                <div className={`rounded-2xl p-6 transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-gray-700/50 hover:bg-gray-700'
                    : 'bg-gray-50/50 hover:bg-white'
                } hover:shadow-lg`}>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Severity</div>
                  <span className={`px-4 py-1.5 ${
                    theme === 'dark'
                      ? 'bg-red-400/20 text-red-300 border-red-300'
                      : 'bg-red-100 text-red-600 border-red-200'
                  } rounded-full text-sm`}>
                    {formData.reasonForVisit.severity.answer}
                  </span>
                </div>
              </div>

              {/* Additional Info */}
              <div className={`rounded-2xl p-6 transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-gray-700/50 hover:bg-gray-700'
                  : 'bg-gray-50/50 hover:bg-white'
              } hover:shadow-lg`}>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{formData.reasonForVisit.additionalInfo.question}</div>
                <div className="text-gray-900 dark:text-gray-100">{formData.reasonForVisit.additionalInfo.answer}</div>
              </div>
            </div>
          </section>

          {/* Medical History Section */}
          <section>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-6 flex items-center">
              <span className={`bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-orange-400/90 to-blue-400/90' 
                  : 'from-orange-500/90 to-blue-500/90'
              } w-7 h-7 rounded-lg flex items-center justify-center text-sm text-white mr-3`}>
                3
              </span>
              Medical History
            </h3>
            <div className="space-y-4">
              {Object.entries(formData.medicalHistory).map(([key, value]) => (
                <div 
                  key={key} 
                  className={`rounded-2xl p-6 transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-gray-700/50 hover:bg-gray-700'
                      : 'bg-gray-50/50 hover:bg-white'
                  } hover:shadow-lg`}
                >
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {value.question}
                  </div>
                  <div className="space-y-2">
                    <span className={`px-4 py-1.5 rounded-full text-sm ${
                      value.answer === 'Yes' 
                        ? 'bg-blue-100 dark:bg-blue-400/20 text-blue-600 dark:text-blue-300' 
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      {value.answer}
                    </span>
                    {value.details && (
                      <div className="text-gray-700 dark:text-gray-300 mt-3">
                        {value.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Lifestyle Section */}
          <section>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-6 flex items-center">
              <span className={`bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-orange-400/90 to-blue-400/90' 
                  : 'from-orange-500/90 to-blue-500/90'
              } w-7 h-7 rounded-lg flex items-center justify-center text-sm text-white mr-3`}>
                4
              </span>
              Lifestyle Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(formData.lifestyle).map(([key, value]) => (
                <div 
                  key={key} 
                  className={`rounded-2xl p-6 transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-gray-700/50 hover:bg-gray-700'
                      : 'bg-gray-50/50 hover:bg-white'
                  } hover:shadow-lg`}
                >
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {value.question}
                  </div>
                  <div className="text-gray-900 dark:text-gray-100">
                    {value.answer}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Family History Section */}
          <section>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-6 flex items-center">
              <span className={`bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-orange-400/90 to-blue-400/90' 
                  : 'from-orange-500/90 to-blue-500/90'
              } w-7 h-7 rounded-lg flex items-center justify-center text-sm text-white mr-3`}>
                5
              </span>
              Family History
            </h3>
            <div className="space-y-4">
              {Object.entries(formData.familyHistory).map(([key, value]) => (
                <div 
                  key={key} 
                  className={`rounded-2xl p-6 transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-gray-700/50 hover:bg-gray-700'
                      : 'bg-gray-50/50 hover:bg-white'
                  } hover:shadow-lg`}
                >
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {value.question}
                  </div>
                  <div className="space-y-2">
                    <span className={`px-4 py-1.5 rounded-full text-sm ${
                      value.answer === 'Yes' 
                        ? 'bg-blue-100 dark:bg-blue-400/20 text-blue-600 dark:text-blue-300' 
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      {value.answer}
                    </span>
                    {value.details && value.answer && (
                      <div className="text-gray-700 dark:text-gray-300 mt-3">
                        {value.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Changes Section */}
          <section>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-6 flex items-center">
              <span className={`bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-orange-400/90 to-blue-400/90' 
                  : 'from-orange-500/90 to-blue-500/90'
              } w-7 h-7 rounded-lg flex items-center justify-center text-sm text-white mr-3`}>
                6
              </span>
              Recent Changes
            </h3>
            <div className="space-y-4">
              {Object.entries(formData.recentChanges).map(([key, value]) => (
                <div 
                  key={key} 
                  className={`rounded-2xl p-6 transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-gray-700/50 hover:bg-gray-700'
                      : 'bg-gray-50/50 hover:bg-white'
                  } hover:shadow-lg`}
                >
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {value.question}
                  </div>
                  <div className="space-y-2">
                    {'options' in value ? (
                      <>
                        <span className={`px-4 py-1.5 rounded-full text-sm ${
                          value.answer === 'Yes' 
                            ? 'bg-blue-100 dark:bg-blue-400/20 text-blue-600 dark:text-blue-300' 
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                        }`}>
                          {value.answer}
                        </span>
                        {value.details && (
                          <div className="text-gray-700 dark:text-gray-300 mt-3">
                            {value.details}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-900 dark:text-gray-100">
                        {value.answer}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Previous Treatments Section */}
          <section>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-6 flex items-center">
              <span className={`bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-orange-400/90 to-blue-400/90' 
                  : 'from-orange-500/90 to-blue-500/90'
              } w-7 h-7 rounded-lg flex items-center justify-center text-sm text-white mr-3`}>
                7
              </span>
              Previous Treatments
            </h3>
            <div className="space-y-4">
              {Object.entries(formData.previousTreatments).map(([key, value]) => (
                <div 
                  key={key} 
                  className={`rounded-2xl p-6 transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-gray-700/50 hover:bg-gray-700'
                      : 'bg-gray-50/50 hover:bg-white'
                  } hover:shadow-lg`}
                >
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {value.question}
                  </div>
                  <div className="space-y-2">
                    <span className={`px-4 py-1.5 rounded-full text-sm ${
                      value.answer === 'Yes' 
                        ? 'bg-blue-100 dark:bg-blue-400/20 text-blue-600 dark:text-blue-300' 
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      {value.answer}
                    </span>
                    {value.details && (
                      <div className="text-gray-700 dark:text-gray-300 mt-3">
                        {value.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Additional Information Section */}
          <section>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-6 flex items-center">
              <span className={`bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-orange-400/90 to-blue-400/90' 
                  : 'from-orange-500/90 to-blue-500/90'
              } w-7 h-7 rounded-lg flex items-center justify-center text-sm text-white mr-3`}>
                8
              </span>
              Additional Information
            </h3>
            <div className={`rounded-2xl p-6 transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-gray-700/50 hover:bg-gray-700'
                : 'bg-gray-50/50 hover:bg-white'
            } hover:shadow-lg`}>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Additional Information</div>
              <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {formData.additionalInfo.answer}
              </div>
            </div>
          </section>

          {/* Footer Actions */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className={`px-6 py-2.5 rounded-xl transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultationFormModal; 