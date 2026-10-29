import OpenAI from 'openai';
import { config } from '../config/openai';
import { Message, MessageType, MedicalResponse, DetailedItem } from '../types/index';

const openai = new OpenAI({
  apiKey: config.apiKey,
  dangerouslyAllowBrowser: true,
});

function parseAIResponse(completion: any): { type: MessageType; metadata: MedicalResponse } {
  try {
    let content;
    
    // Handle function call response
    if (completion.function_call?.arguments) {
      content = JSON.parse(completion.function_call.arguments.trim());
    } 
    // Handle direct content response
    else if (completion.content) {
      content = JSON.parse(completion.content.trim());
    }
    // Handle string response
    else if (typeof completion === 'string') {
      content = JSON.parse(completion.trim());
    }

    // Extract the content, handling both direct response and nested categories
    const responseData = content.categories || content;
    
    // Ensure the response matches the MedicalResponse type structure
    const medicalResponse: MedicalResponse = {
      patientProfile: {
        presentation: responseData.patientProfile?.presentation || '',
        relevantHistory: responseData.patientProfile?.relevantHistory || '',
        riskFactors: responseData.patientProfile?.riskFactors || []
      },
      summary: responseData.summary || '',
      symptoms: responseData.symptoms || [],
      possibleCauses: responseData.possibleCauses || [],
      diagnostics: responseData.diagnostics || [],
      treatment: {
        immediateAction: responseData.treatment?.immediateAction || [],
        longTerm: responseData.treatment?.longTerm || []
      },
      followUp: responseData.followUp || [],
      patientEducation: responseData.patientEducation || []
    };
    
    console.log("Parsed medical response:", medicalResponse);
    console.log("Possible causes in parsed response:", medicalResponse.possibleCauses);
    
    return {
      type: 'medical_response',
      metadata: medicalResponse
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    throw new Error('Failed to parse AI response');
  }
}

export async function getChatCompletion(messages: { role: 'user' | 'assistant'; content: string }[]) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: 'system',
          content: `You are a medical AI assistant for doctors, providing concise, accurate, and actionable responses to both patient-related and general medical inquiries. When uncertain or lacking sufficient information, ask clarifying questions to gain a better understanding of the situation.  

Your responses should prioritize clarity, relevance, and professionalism, delivering the most critical information in a way that aids decision-making. If the inquiry cannot be answered definitively, focus on guiding the doctor with next steps, including recommended tests, observations, or follow-ups.  

When addressing general queries, aim to provide clear explanations and, when necessary, suggest additional resources or avenues for further exploration. Always prioritize providing value through informed and precise recommendations, ensuring patient safety and care quality remain at the forefront.`
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const responseMessage = completion.choices[0]?.message;
    
    if (!responseMessage) {
      throw new Error('No response from AI assistant');
    }
    
    return {
      content: responseMessage.content || '',
      type: 'text',
      metadata: null
    };
    
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to get response from AI assistant');
  }
}